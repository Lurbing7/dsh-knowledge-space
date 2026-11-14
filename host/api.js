import path from 'node:path';
import os from 'node:os';
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { clampInt, fail, normalizeRel, resolveInside, toPosix } from './util.js';

const PREFIX = '/dsh-knowledge-space';
const MAX_JSON_BYTES = 2 * 1024 * 1024;

/**
 * Raw HTTP handlers are used instead of WebResourceRoute because resources only
 * answer GET/HEAD, and the panel needs POST for space changes and uploads.
 */
export function registerApi(ctx, manager) {
  const handler = async (req, res) => {
    try {
      const method = (req.method ?? 'GET').toUpperCase();
      if (!localPeer(req)) {
        send(res, 403, { error: 'Local connections only', code: 'not_local' });
        return;
      }
      if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(req)) {
        send(res, 403, { error: 'Cross-origin request rejected', code: 'cross_origin' });
        return;
      }
      const url = new URL(req.url ?? '/', 'http://localhost');
      const route = url.pathname.replace(/^\/dsh-knowledge-space\/?/, '');
      const run = ROUTES[`${method} ${route}`];
      if (!run) {
        send(res, 404, { error: `Unknown endpoint: ${method} ${route}`, code: 'unknown_route' });
        return;
      }
      const result = await run({ req, res, url, manager, method });
      if (result !== undefined) send(res, 200, result);
    } catch (error) {
      const status = Number(error?.status) || (error?.code === 'index_in_progress' ? 409 : 400);
      try {
        send(res, status, { error: String(error?.message ?? error), code: error?.code ?? 'request_failed' });
      } catch {
        /* response already started */
      }
    }
  };

  const disposers = [
    ctx.webServer.register({ kind: 'prefix', path: PREFIX, handler }),
    ctx.webServer.register({ kind: 'prefix', path: `${PREFIX}/`, handler }),
  ];
  return () => {
    for (const dispose of disposers) dispose();
  };
}

function send(res, status, value) {
  const text = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.host ?? '');
  } catch {
    return false;
  }
}

/** The panel is a local-only surface; a tunneled request must not read notes. */
function localPeer(req) {
  const host = String(req.headers.host ?? '').toLowerCase().replace(/:\d+$/, '');
  const localHost = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1';
  const remote = String(req.socket?.remoteAddress ?? '');
  const localRemote =
    remote === '' || remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  return localHost || localRemote;
}

async function readBody(req, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw fail('payload_too_large', `Request body exceeds ${Math.round(limit / 1024 / 1024)}MB`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function jsonBody(req) {
  const buffer = await readBody(req, MAX_JSON_BYTES);
  if (buffer.length === 0) return {};
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    throw fail('invalid_json', 'Request body is not valid JSON');
  }
}

const ROUTES = {
  'GET api/ping': async () => ({ ok: true }),

  'GET api/settings': async ({ manager }) => ({
    dataDir: manager.store.dataDir,
    settings: manager.store.settings ?? { promptHint: true },
    defaults: manager.store.defaults,
    limits: manager.limits,
  }),

  'POST api/settings': async ({ req, manager }) => {
    const body = await jsonBody(req);
    return { settings: await manager.updateSettings(body) };
  },

  'GET api/spaces': async ({ manager }) => ({ spaces: await manager.listStatus() }),

  'POST api/spaces': async ({ req, manager }) => {
    const body = await jsonBody(req);
    const space = await manager.createSpace(body.path, body.name);
    // First index run starts right away so the panel shows progress instead of
    // an empty space that looks broken.
    await manager.startIndex(space.id, 'full').catch(() => undefined);
    return { space };
  },

  'POST api/spaces/update': async ({ req, manager }) => {
    const body = await jsonBody(req);
    if (!body.id) throw fail('missing_id', 'Missing space id');
    return { space: await manager.updateSpace(body.id, body.patch ?? body) };
  },

  'POST api/spaces/forget': async ({ req, manager }) => {
    const body = await jsonBody(req);
    if (!body.id) throw fail('missing_id', 'Missing space id');
    return manager.forgetSpace(body.id);
  },

  'POST api/spaces/reindex': async ({ req, manager }) => {
    const body = await jsonBody(req);
    if (!body.id) throw fail('missing_id', 'Missing space id');
    return { job: await manager.startIndex(body.id, body.mode === 'full' ? 'full' : 'incremental') };
  },

  'GET api/space/status': async ({ url, manager }) => {
    const id = url.searchParams.get('id');
    const spaces = await manager.listStatus();
    const space = id ? spaces.find((item) => item.id === id) : spaces[0];
    if (!space) throw fail('space_not_found', 'No knowledge space is configured');
    return { space };
  },

  'GET api/space/docs': async ({ url, manager }) => {
    const id = url.searchParams.get('id');
    const query = url.searchParams.get('q') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const limit = clampInt(url.searchParams.get('limit'), 80, 1, 500);
    const offset = clampInt(url.searchParams.get('offset'), 0, 0, 100000);
    return manager.docsOf(id, { query, status, limit, offset });
  },

  'GET api/space/doc': async ({ url, manager }) => {
    const rel = url.searchParams.get('rel');
    if (!rel) throw fail('missing_rel', 'Missing rel');
    return manager.docOf(url.searchParams.get('id'), rel);
  },

  'GET api/space/search': async ({ url, manager }) => {
    const limit = clampInt(url.searchParams.get('limit'), 8, 1, 50);
    return manager.search(url.searchParams.get('id'), url.searchParams.get('q') ?? '', { limit });
  },

  'POST api/space/upload': async ({ req, url, manager }) => {
    const id = url.searchParams.get('id');
    const relInput = url.searchParams.get('path');
    if (!id) throw fail('missing_id', 'Missing space id');
    if (!relInput) throw fail('missing_path', 'Missing file path');
    const space = manager.store.get(id);
    if (space.missing) throw fail('directory_missing', 'Space directory is missing');

    const uploadDir = normalizeRel(space.uploadDir);
    const rel = toPosix(normalizeRel(`${uploadDir}/${relInput}`));
    if (!rel.startsWith(`${uploadDir}/`)) throw fail('invalid_upload_path', 'Upload must stay inside the upload directory');
    const abs = resolveInside(space.root, rel);
    if (!toPosix(path.relative(space.root, abs)).startsWith(uploadDir)) throw fail('invalid_upload_path', 'Upload escapes the upload directory');

    const limit = Math.max(40, manager.limits.maxFileMB) * 1024 * 1024;
    const buffer = await readBody(req, limit);
    if (buffer.length === 0) throw fail('empty_file', 'File is empty');
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, buffer);
    await manager.startIndex(id, 'incremental').catch(() => undefined);
    return { rel, bytes: buffer.length, uploadDir };
  },

  'POST api/space/git-commit': async ({ req, manager }) => {
    const body = await jsonBody(req);
    if (!body.id) throw fail('missing_id', 'Missing space id');
    return manager.commitMeta(body.id);
  },

  'GET api/fs': async ({ url }) => {
    const input = (url.searchParams.get('path') ?? '').trim();
    if (input === '') return { path: '', parent: null, dirs: await roots() };
    const target = path.resolve(input);
    const info = await stat(target).catch(() => null);
    if (!info?.isDirectory()) throw fail('directory_missing', `Not a directory: ${target}`);
    const entries = await readdir(target, { withFileTypes: true });
    const dirs = entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => ({ name: entry.name, path: path.join(target, entry.name) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'))
      .slice(0, 400);
    const parent = path.dirname(target);
    const atRoot = parent === target;
    return { path: target, parent: atRoot ? '' : parent, dirs };
  },
};

/** Filesystem starting points the directory picker can show. */
async function roots() {
  if (process.platform === 'win32') {
    const drives = [];
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')) {
      const root = `${letter}:\\`;
      const info = await stat(root).catch(() => null);
      if (info?.isDirectory()) drives.push({ name: `${letter}:`, path: root });
    }
    return drives;
  }
  const list = [{ name: '/', path: '/' }];
  const home = os.homedir();
  if (home !== '/') list.push({ name: path.basename(home), path: home });
  return list;
}
