import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

/** Directory the plugin keeps its own bookkeeping in, inside the space root. */
export const META_DIR = '.dsh-knowledge-space';

export function dshHome() {
  const home = process.env.DSH_HOME;
  if (home && home.trim() !== '') return home;
  const profile = process.env.DSH_PROFILE_DIR;
  if (profile && profile.trim() !== '') return path.dirname(path.dirname(profile));
  return path.join(os.homedir(), '.dsh');
}

export function dataRoot(override) {
  if (typeof override === 'string' && override.trim() !== '') return path.resolve(override);
  return path.join(dshHome(), 'knowledge-space');
}

export function sha1(text) {
  return createHash('sha1').update(text).digest('hex');
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Forward-slash relative path, the form stored in the index and shown in the UI. */
export function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** Resolve `rel` inside `root`; throws when the result escapes the root. */
export function resolveInside(root, rel) {
  const abs = path.resolve(root, rel);
  const r = path.relative(path.resolve(root), abs);
  if (r === '' || (!r.startsWith('..') && !path.isAbsolute(r))) return abs;
  throw fail('path_outside_root', `Path escapes the space root: ${rel}`);
}

export async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeJsonAtomic(file, value, pretty = true) {
  await mkdir(path.dirname(file), { recursive: true });
  const text = pretty ? `${JSON.stringify(value, null, 2)}\n` : JSON.stringify(value);
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, text, 'utf8');
  await rename(tmp, file);
}

export async function pathExists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export function pathExistsSync(p) {
  return existsSync(p);
}

export function extOf(name) {
  return path.extname(name).slice(1).toLowerCase();
}

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeRel(rel) {
  return String(rel ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

export function clampInt(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

export function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** An Error carrying a stable code the UI can translate. */
export function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Match one sensitive-path pattern against a space-relative path.
 * A pattern with `/` is a path prefix; a bare pattern matches any path segment
 * and supports `*` (for example `.env*` or `*.pem`).
 */
export function matchPathPattern(pattern, rel) {
  const raw = String(pattern ?? '').trim().replace(/\\/g, '/').toLowerCase();
  if (raw === '') return false;
  const target = normalizeRel(rel).toLowerCase();
  if (raw.includes('/')) {
    return (
      target === raw ||
      target.startsWith(`${raw}/`) ||
      target.includes(`/${raw}/`) ||
      target.endsWith(`/${raw}`)
    );
  }
  const segments = target.split('/');
  if (!raw.includes('*')) return segments.includes(raw);
  const expression = new RegExp(`^${raw.split('*').map(escapeRegExp).join('.*')}$`);
  return segments.some((segment) => expression.test(segment));
}

/** Read a text file as UTF-8, falling back to GB18030 for legacy Chinese saves. */
export function decodeText(buffer) {
  if (buffer.subarray(0, 8192).includes(0)) throw fail('binary_file', 'File looks binary, not text');
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  } catch {
    const text = new TextDecoder('gb18030').decode(buffer);
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }
}

export function isSensitivePath(sensitivePaths, rel) {
  const list = Array.isArray(sensitivePaths) ? sensitivePaths : [];
  return list.some((pattern) => matchPathPattern(pattern, rel));
}
