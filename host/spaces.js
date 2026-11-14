import path from 'node:path';
import { stat } from 'node:fs/promises';
import { sha1, dataRoot, META_DIR, readJson, writeJsonAtomic, nowIso, normalizeRel, toPosix, fail } from './util.js';
import { DEFAULT_EXCLUDE_DIRS, DEFAULT_INCLUDE_EXTS, DEFAULT_SENSITIVE_PATHS, DEFAULT_UPLOAD_DIR } from './config.js';

export { DEFAULT_EXCLUDE_DIRS, DEFAULT_INCLUDE_EXTS, DEFAULT_SENSITIVE_PATHS, DEFAULT_UPLOAD_DIR };

function slugify(name) {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii === '' ? 'space' : ascii.slice(0, 24);
}

export function metaDirOf(root) {
  return path.join(root, META_DIR);
}

export function spaceConfigPath(root) {
  return path.join(metaDirOf(root), 'space.json');
}

export function manifestPath(root) {
  return path.join(metaDirOf(root), 'manifest.json');
}

export class SpaceStore {
  constructor(options = {}) {
    this.dataDir = dataRoot(options.dataDir);
    this.defaults = {
      includeExts: options.defaultIncludeExts ?? [...DEFAULT_INCLUDE_EXTS],
      excludeDirs: options.defaultExcludeDirs ?? [...DEFAULT_EXCLUDE_DIRS],
      sensitivePaths: options.defaultSensitivePaths ?? [...DEFAULT_SENSITIVE_PATHS],
      uploadDir: options.defaultUploadDir ?? DEFAULT_UPLOAD_DIR,
    };
    this.spaces = new Map();
    this.settings = { promptHint: true };
  }

  indexFileOf(id) {
    return path.join(this.dataDir, 'index', `${id}.db`);
  }

  registryPath() {
    return path.join(this.dataDir, 'registry.json');
  }

  settingsPath() {
    return path.join(this.dataDir, 'settings.json');
  }

  async load() {
    const registry = await readJson(this.registryPath(), { spaces: [] });
    const settings = await readJson(this.settingsPath(), { promptHint: true });
    this.settings = { promptHint: settings.promptHint !== false };
    this.spaces.clear();
    for (const entry of registry.spaces ?? []) {
      if (!entry?.root) continue;
      const stored = await readJson(spaceConfigPath(entry.root), null);
      const space = this.normalize(stored ?? this.fresh(entry.root, entry.name ?? path.basename(entry.root), stored));
      space.missing = !(await exists(entry.root));
      this.spaces.set(space.id, space);
    }
    return this;
  }

  fresh(root, name, existing) {
    return {
      version: 1,
      id: existing?.id ?? `${slugify(name)}-${sha1(root).slice(0, 8)}`,
      name,
      root,
      includeExts: [...this.defaults.includeExts],
      excludeDirs: [...this.defaults.excludeDirs],
      sensitivePaths: [...this.defaults.sensitivePaths],
      includeSensitive: true,
      uploadDir: this.defaults.uploadDir,
      autoCommit: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  /** Fill fields added after a space was created, so old configs keep working. */
  normalize(space) {
    const base = this.fresh(space.root, space.name ?? path.basename(space.root), space);
    const merged = { ...base, ...space };
    if (!Array.isArray(merged.includeExts) || merged.includeExts.length === 0) merged.includeExts = base.includeExts;
    if (!Array.isArray(merged.excludeDirs)) merged.excludeDirs = base.excludeDirs;
    if (!Array.isArray(merged.sensitivePaths)) merged.sensitivePaths = base.sensitivePaths;
    if (merged.includeSensitive === undefined) merged.includeSensitive = merged.includePrivate !== false;
    delete merged.includePrivate;
    merged.uploadDir = normalizeRel(merged.uploadDir || DEFAULT_UPLOAD_DIR);
    return merged;
  }

  list() {
    return [...this.spaces.values()].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }

  get(id) {
    const space = this.spaces.get(id);
    if (!space) throw fail('space_not_found', `Knowledge space not found: ${id ?? '(empty)'}`);
    return space;
  }

  async saveSettings(patch) {
    if (typeof patch?.promptHint === 'boolean') this.settings.promptHint = patch.promptHint;
    await writeJsonAtomic(this.settingsPath(), this.settings);
    return this.settings;
  }

  async create(rootInput, nameInput) {
    const root = path.resolve(String(rootInput ?? '').trim());
    const info = await stat(root).catch(() => null);
    if (!info || !info.isDirectory()) throw fail('directory_missing', `Directory does not exist: ${root}`);
    for (const space of this.spaces.values()) {
      if (path.resolve(space.root).toLowerCase() === root.toLowerCase()) {
        throw fail('space_exists', `Directory is already a knowledge space: ${space.name}`);
      }
    }
    const name = (nameInput ?? '').trim() || path.basename(root) || root;
    const space = this.fresh(root, name);
    await writeJsonAtomic(spaceConfigPath(root), space);
    this.spaces.set(space.id, space);
    await this.persistRegistry();
    return space;
  }

  async update(id, patch) {
    const space = this.get(id);
    for (const key of ['includeExts', 'excludeDirs', 'sensitivePaths']) {
      if (Array.isArray(patch[key])) {
        space[key] = patch[key].map((value) => String(value).trim()).filter(Boolean);
      }
    }
    if (typeof patch.includeSensitive === 'boolean') space.includeSensitive = patch.includeSensitive;
    if (typeof patch.autoCommit === 'boolean') space.autoCommit = patch.autoCommit;
    if (typeof patch.name === 'string' && patch.name.trim() !== '') space.name = patch.name.trim();
    if (typeof patch.uploadDir === 'string' && patch.uploadDir.trim() !== '') {
      space.uploadDir = normalizeRel(patch.uploadDir.trim());
    }
    space.updatedAt = nowIso();
    await writeJsonAtomic(spaceConfigPath(space.root), space);
    this.spaces.set(space.id, space);
    return space;
  }

  async forget(id) {
    const space = this.get(id);
    this.spaces.delete(id);
    await this.persistRegistry();
    return space;
  }

  async persistRegistry() {
    const spaces = this.list().map((space) => ({ id: space.id, root: space.root, name: space.name }));
    await writeJsonAtomic(this.registryPath(), { spaces });
  }

  uploadDirOf(space) {
    const rel = normalizeRel(space.uploadDir || DEFAULT_UPLOAD_DIR);
    return rel === '' ? DEFAULT_UPLOAD_DIR : rel;
  }

  isUploadPath(space, rel) {
    return toPosix(rel).startsWith(`${this.uploadDirOf(space)}/`);
  }
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}
