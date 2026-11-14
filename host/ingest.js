import path from 'node:path';
import { readdir, readFile, stat } from 'node:fs/promises';
import { chunkText } from './chunk.js';
import { extractDocument } from './extract.js';
import { extOf, isSensitivePath, normalizeRel, nowIso, readJson, sha256, toPosix, writeJsonAtomic } from './util.js';
import { manifestPath } from './spaces.js';

/**
 * Walk the space root, honouring the space's extension and directory filters.
 * The upload directory is always walked even when one of its parents is excluded.
 */
export async function collectFiles(space) {
  const include = new Set(space.includeExts.map((ext) => ext.toLowerCase()));
  const exclude = (space.excludeDirs ?? []).map((dir) => normalizeRel(dir).toLowerCase()).filter(Boolean);
  const uploadDir = normalizeRel(space.uploadDir ?? '').toLowerCase();
  const files = [];

  const isExcluded = (rel) => {
    const lower = rel.toLowerCase();
    if (uploadDir !== '' && (lower === uploadDir || lower.startsWith(`${uploadDir}/`))) return false;
    return exclude.some((dir) => lower === dir || lower.startsWith(`${dir}/`));
  };

  async function walk(absDir, relDir) {
    let entries;
    try {
      entries = await readdir(absDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = relDir === '' ? entry.name : `${relDir}/${entry.name}`;
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if (isExcluded(rel)) continue;
        await walk(path.join(absDir, entry.name), rel);
        continue;
      }
      if (!entry.isFile()) continue;
      if (isExcluded(rel)) continue;
      if (!include.has(extOf(entry.name))) continue;
      files.push({ rel: toPosix(rel), abs: path.join(absDir, entry.name), ext: extOf(entry.name) });
    }
  }

  await walk(space.root, '');
  files.sort((a, b) => a.rel.localeCompare(b.rel));
  return files;
}

export function isSensitiveRel(space, rel) {
  if (space.includeSensitive === false) return false;
  return isSensitivePath(space.sensitivePaths ?? [], rel);
}

/**
 * Incremental index run: unchanged files are skipped by (size, mtime), then by
 * content hash; missing files drop out of both the chunk table and the FTS index.
 */
export async function runIngest(space, db, { mode = 'incremental', limits = {}, onProgress = () => {}, signal } = {}) {
  const startedAt = Date.now();
  const maxBytes = (Number(limits.maxFileMB) || 30) * 1024 * 1024;
  const files = (await collectFiles(space)).filter(
    (file) => space.includeSensitive !== false || !isSensitivePath(space.sensitivePaths ?? [], file.rel),
  );
  const known = new Map(db.allDocs().map((row) => [row.rel, row]));
  const seen = new Set();
  const progress = {
    phase: 'scan',
    done: 0,
    total: files.length,
    current: '',
    added: 0,
    updated: 0,
    skipped: 0,
    removed: 0,
    failed: 0,
  };
  onProgress({ ...progress });

  for (const file of files) {
    if (signal?.aborted) throw new Error('Indexing cancelled');
    seen.add(file.rel);
    progress.current = file.rel;
    const previous = known.get(file.rel);
    let info;
    try {
      info = await stat(file.abs);
    } catch {
      continue;
    }
    const mtime = Math.trunc(info.mtimeMs);
    const size = info.size;

    if (mode !== 'full' && previous && previous.status !== 'error' && previous.mtime === mtime && previous.bytes === size) {
      progress.skipped += 1;
      progress.done += 1;
      onProgress({ ...progress });
      continue;
    }

    try {
      if (size > maxBytes) throw new Error(`File exceeds ${Math.round(maxBytes / 1024 / 1024)}MB limit`);
      const buffer = await readFile(file.abs);
      const hash = sha256(buffer);

      if (mode !== 'full' && previous && previous.sha === hash && previous.status !== 'error' && previous.chunks > 0) {
        db.upsertDoc({
          ...previous,
          bytes: size,
          mtime,
          sensitive: isSensitiveRel(space, file.rel),
          updated: Date.now(),
        });
        progress.skipped += 1;
      } else {
        const extracted = await extractDocument(file.abs, file.ext, limits);
        const chunks = [];
        for (const section of extracted.sections) {
          chunks.push(...chunkText(section.text, { locator: section.locator ?? '' }));
        }
        db.replaceChunks(file.rel, chunks);
        db.upsertDoc({
          rel: file.rel,
          ext: file.ext,
          bytes: size,
          mtime,
          sha: hash,
          chunks: chunks.length,
          status: 'ok',
          err: null,
          sensitive: isSensitiveRel(space, file.rel),
          updated: Date.now(),
        });
        if (previous) progress.updated += 1;
        else progress.added += 1;
      }
    } catch (error) {
      progress.failed += 1;
      db.upsertDoc({
        rel: file.rel,
        ext: file.ext,
        bytes: size,
        mtime,
        sha: previous?.sha ?? '',
        chunks: 0,
        status: 'error',
        err: String(error?.message ?? error).slice(0, 400),
        sensitive: isSensitiveRel(space, file.rel),
        updated: Date.now(),
      });
    }
    progress.done += 1;
    if (progress.done % 5 === 0 || progress.done === progress.total) onProgress({ ...progress });
  }

  for (const rel of known.keys()) {
    if (seen.has(rel)) continue;
    db.removeDoc(rel);
    progress.removed += 1;
  }

  const counts = {
    files: files.length,
    chunks: db.countChunks(),
    errors: db.countErrors(),
    removed: progress.removed,
  };
  db.setMeta('lastIndexedAt', nowIso());
  db.setMeta('lastIndexMs', String(Date.now() - startedAt));
  db.setMeta('counts', JSON.stringify(counts));

  progress.phase = 'manifest';
  onProgress({ ...progress });
  await writeManifest(space, db);

  progress.phase = 'done';
  progress.durationMs = Date.now() - startedAt;
  onProgress({ ...progress });
  return { ...progress, counts };
}

export async function writeManifest(space, db) {
  const docs = db.listDocs({ limit: 100000 }).rows;
  const shaByRel = new Map(db.allDocs().map((row) => [row.rel, row.sha]));
  const files = docs.map((doc) => ({
    rel: doc.rel,
    sha: shaByRel.get(doc.rel) ?? '',
    bytes: doc.bytes,
    chunks: doc.chunks,
    sensitive: doc.sensitive ? true : undefined,
    error: doc.status === 'error' ? doc.err ?? 'error' : undefined,
  }));

  const previous = await readJson(manifestPath(space.root), null);
  const body = files.map((file) => JSON.stringify(file)).join('\n');
  const previousBody = (previous?.files ?? []).map((file) => JSON.stringify(file)).join('\n');
  if (previous && body === previousBody && previous.counts?.chunks === db.countChunks()) return false;

  const manifest = {
    version: 1,
    space: space.name,
    root: space.root,
    generatedAt: nowIso(),
    counts: {
      files: files.length,
      chunks: db.countChunks(),
      errors: db.countErrors(),
    },
    files,
  };
  await writeJsonAtomic(manifestPath(space.root), manifest);
  return true;
}
