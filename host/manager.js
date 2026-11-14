import { stat } from 'node:fs/promises';
import { SpaceDb } from './db.js';
import { SpaceStore } from './spaces.js';
import { runIngest } from './ingest.js';
import { gitStatus, gitCommitMeta } from './git.js';
import { searchSpace } from './search.js';
import { META_DIR, isSensitivePath, nowIso } from './util.js';
import { DEFAULT_SENSITIVE_PATHS } from './config.js';

const GIT_CACHE_MS = 4000;

export class KnowledgeManager {
  constructor(config = {}) {
    this.config = config;
    this.store = new SpaceStore({
      dataDir: config.dataDir,
      defaultIncludeExts: config.defaultIncludeExts,
      defaultExcludeDirs: config.defaultExcludeDirs,
      defaultSensitivePaths: config.defaultSensitivePaths,
      defaultUploadDir: config.defaultUploadDir,
    });
    this.limits = {
      maxFileMB: Number(config.maxFileMB) || 30,
      maxPdfPages: Number(config.maxPdfPages) || 2000,
      maxDocChars: Number(config.maxDocChars) || 2000000,
    };
    this.dbs = new Map();
    this.jobs = new Map();
    this.gitCache = new Map();
    this.ready = this.store.load().then(() => {
      if (config.promptHint === false) this.store.settings.promptHint = false;
      return this;
    });
  }

  async init() {
    await this.ready;
    return this;
  }

  dbOf(space) {
    const cached = this.dbs.get(space.id);
    if (cached) return cached;
    const db = new SpaceDb(this.store.indexFileOf(space.id));
    this.dbs.set(space.id, db);
    return db;
  }

  closeAll() {
    for (const db of this.dbs.values()) db.close();
    this.dbs.clear();
  }

  disposeSpace(id) {
    const db = this.dbs.get(id);
    if (db) {
      db.close();
      this.dbs.delete(id);
    }
  }

  sensitiveOf(space) {
    const patterns = space.sensitivePaths ?? DEFAULT_SENSITIVE_PATHS;
    return (rel) => isSensitivePath(patterns, rel);
  }

  async gitOf(space) {
    const cached = this.gitCache.get(space.id);
    if (cached && Date.now() - cached.at < GIT_CACHE_MS) return cached.value;
    const value = await gitStatus(space.root, META_DIR).catch((error) => ({
      available: false,
      reason: String(error?.message ?? error),
    }));
    this.gitCache.set(space.id, { at: Date.now(), value });
    return value;
  }

  async diskUsage(space) {
    try {
      return (await stat(this.store.indexFileOf(space.id))).size;
    } catch {
      return 0;
    }
  }

  jobOf(space) {
    return this.jobs.get(space.id) ?? { running: false };
  }

  async statusOf(space) {
    if (space.missing) {
      return {
        ...publicSpace(space),
        counts: { files: 0, chunks: 0, errors: 0 },
        job: this.jobOf(space),
        git: { available: false, reason: 'directory_missing' },
      };
    }
    const db = this.dbOf(space);
    return {
      ...publicSpace(space),
      counts: { files: db.countDocs(), chunks: db.countChunks(), errors: db.countErrors() },
      lastIndexedAt: db.getMeta('lastIndexedAt') ?? null,
      lastIndexMs: Number(db.getMeta('lastIndexMs') ?? 0),
      indexBytes: await this.diskUsage(space),
      job: this.jobOf(space),
      git: await this.gitOf(space),
    };
  }

  async listStatus() {
    await this.ready;
    const out = [];
    for (const space of this.store.list()) out.push(await this.statusOf(space));
    return out;
  }

  async createSpace(root, name) {
    await this.ready;
    return this.statusOf(await this.store.create(root, name));
  }

  async updateSpace(id, patch) {
    await this.ready;
    const space = await this.store.update(id, patch);
    this.gitCache.delete(id);
    return this.statusOf(space);
  }

  async updateSettings(patch) {
    await this.ready;
    return this.store.saveSettings(patch ?? {});
  }

  async forgetSpace(id) {
    await this.ready;
    const space = await this.store.forget(id);
    this.disposeSpace(id);
    this.jobs.delete(id);
    return { removed: space.id };
  }

  /**
   * Start an index run in the background; the caller polls status.
   * One run per space at a time.
   */
  async startIndex(id, mode = 'incremental') {
    await this.ready;
    const space = this.store.get(id);
    if (this.jobs.get(id)?.running) throw new Error('index_in_progress');
    const job = { running: true, mode, phase: 'queued', done: 0, total: 0, current: '', startedAt: nowIso() };
    this.jobs.set(id, job);
    const db = this.dbOf(space);
    runIngest(space, db, {
      mode,
      limits: this.limits,
      onProgress: (state) => Object.assign(job, state),
    })
      .then(async (result) => {
        job.running = false;
        job.phase = 'done';
        job.result = result;
        this.gitCache.delete(id);
        if (space.autoCommit) {
          try {
            job.commit = await gitCommitMeta(
              space.root,
              META_DIR,
              `chore(knowledge-space): reindex ${nowIso().slice(0, 19)}`,
            );
          } catch (error) {
            job.commitError = String(error?.message ?? error);
          }
        }
      })
      .catch((error) => {
        job.running = false;
        job.phase = 'error';
        job.error = String(error?.message ?? error);
      });
    return { ...job };
  }

  async commitMeta(id) {
    await this.ready;
    const space = this.store.get(id);
    const result = await gitCommitMeta(space.root, META_DIR, `chore(knowledge-space): update manifest ${nowIso().slice(0, 19)}`);
    this.gitCache.delete(id);
    return result;
  }

  async search(id, query, options = {}) {
    await this.ready;
    const space = this.store.get(id);
    const result = searchSpace(this.dbOf(space), query, {
      limit: options.limit ?? 8,
      isSensitive: this.sensitiveOf(space),
    });
    return { space: space.name, spaceId: space.id, ...result };
  }

  async searchAll(query, options = {}) {
    await this.ready;
    const results = [];
    for (const space of this.store.list()) {
      if (space.missing) continue;
      try {
        const found = await this.search(space.id, query, options);
        for (const item of found.results) results.push({ ...item, space: space.name, spaceId: space.id });
      } catch {
        /* one broken space must not break the rest */
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, options.limit ?? 8);
  }

  async docsOf(id, options = {}) {
    await this.ready;
    return this.dbOf(this.store.get(id)).listDocs(options);
  }

  async docOf(id, rel) {
    await this.ready;
    const db = this.dbOf(this.store.get(id));
    const doc = db.docRow(rel);
    if (!doc) throw new Error(`Document is not indexed: ${rel}`);
    return { doc, chunks: db.chunksOf(rel) };
  }
}

function publicSpace(space) {
  return {
    id: space.id,
    name: space.name,
    root: space.root,
    missing: Boolean(space.missing),
    includeExts: space.includeExts,
    excludeDirs: space.excludeDirs,
    sensitivePaths: space.sensitivePaths,
    includeSensitive: space.includeSensitive !== false,
    uploadDir: space.uploadDir,
    autoCommit: Boolean(space.autoCommit),
    createdAt: space.createdAt,
    updatedAt: space.updatedAt,
  };
}
