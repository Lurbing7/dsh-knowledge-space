import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SpaceDb } from '../host/db.js';
import { runIngest } from '../host/ingest.js';
import { searchSpace } from '../host/search.js';
import { readZip } from '../host/zip.js';
import { createZip } from './helpers.js';

async function makeSpace() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ks-space-'));
  await mkdir(path.join(root, 'docs'), { recursive: true });
  await mkdir(path.join(root, 'private'), { recursive: true });
  await writeFile(path.join(root, 'docs', 'transactions.md'), '# Spring\n\n事务传播行为决定方法调用时事务如何嵌套。\n', 'utf8');
  await writeFile(path.join(root, 'docs', 'redis.md'), '# Redis\n\n缓存穿透、击穿、雪崩的处理方式。\n', 'utf8');
  await writeFile(path.join(root, 'private', 'resume.md'), '# 简历\n\n个人简历与项目经历。\n', 'utf8');
  return {
    root,
    space: {
      id: 'test',
      name: 'test',
      root,
      includeExts: ['md', 'txt'],
      excludeDirs: ['.git', 'node_modules'],
      sensitivePaths: ['private'],
      includeSensitive: true,
      uploadDir: '_knowledge-space/uploads',
    },
  };
}

test('ingest builds an index, writes the manifest and reuses it incrementally', async () => {
  const { root, space } = await makeSpace();
  const dbDir = await mkdtemp(path.join(os.tmpdir(), 'ks-db-'));
  const db = new SpaceDb(path.join(dbDir, 'index.db'));

  const first = await runIngest(space, db, { mode: 'full' });
  assert.equal(first.added, 3);
  assert.equal(first.failed, 0);
  assert.ok(db.countChunks() > 0);

  const manifest = JSON.parse(await readFile(path.join(root, '.dsh-knowledge-space', 'manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 3);
  assert.match(manifest.files[0].sha, /^[0-9a-f]{64}$/);

  const second = await runIngest(space, db, { mode: 'incremental' });
  assert.equal(second.skipped, 3);
  assert.equal(second.added, 0);

  await writeFile(path.join(root, 'docs', 'redis.md'), '# Redis\n\n新的内容：布隆过滤器。\n', 'utf8');
  const third = await runIngest(space, db, { mode: 'incremental' });
  assert.equal(third.updated, 1);

  await unlink(path.join(root, 'docs', 'redis.md'));
  const fourth = await runIngest(space, db, { mode: 'incremental' });
  assert.equal(fourth.removed, 1);
  assert.equal(db.listDocs().total, 2);

  db.close();
  await rm(root, { recursive: true, force: true });
  await rm(dbDir, { recursive: true, force: true });
});

test('search ranks text matches above path-only matches', async () => {
  const { root, space } = await makeSpace();
  const dbDir = await mkdtemp(path.join(os.tmpdir(), 'ks-db-'));
  const db = new SpaceDb(path.join(dbDir, 'index.db'));
  await runIngest(space, db, { mode: 'full' });

  const result = searchSpace(db, '事务传播', {
    limit: 5,
    isSensitive: (rel) => rel.startsWith('private/'),
  });
  assert.ok(result.results.length > 0);
  assert.equal(result.results[0].rel, 'docs/transactions.md');
  assert.equal(result.results[0].sensitive, false);

  const sensitive = searchSpace(db, '简历', { limit: 3, isSensitive: (rel) => rel.startsWith('private/') });
  assert.equal(sensitive.results[0].rel, 'private/resume.md');
  assert.equal(sensitive.results[0].sensitive, true);

  db.close();
  await rm(root, { recursive: true, force: true });
  await rm(dbDir, { recursive: true, force: true });
});

test('sensitive paths can be excluded from the index', async () => {
  const { root, space } = await makeSpace();
  const dbDir = await mkdtemp(path.join(os.tmpdir(), 'ks-db-'));
  const db = new SpaceDb(path.join(dbDir, 'index.db'));
  await runIngest({ ...space, includeSensitive: false }, db, { mode: 'full' });
  assert.equal(db.countDocs(), 2);
  db.close();
  await rm(root, { recursive: true, force: true });
  await rm(dbDir, { recursive: true, force: true });
});

test('an incompatible index schema is dropped instead of migrated', async () => {
  const dbDir = await mkdtemp(path.join(os.tmpdir(), 'ks-db-'));
  const file = path.join(dbDir, 'index.db');
  const first = new SpaceDb(file);
  first.upsertDoc({ rel: 'a.md', chunks: 1, sha: 'x' });
  first.setMeta('schemaVersion', '1');
  first.close();

  const second = new SpaceDb(file);
  assert.equal(second.countDocs(), 0);
  second.close();
  await rm(dbDir, { recursive: true, force: true });
});

test('zip limits stop oversized archives', () => {
  const zip = createZip({ 'a.txt': 'a', 'b.txt': 'b', 'c.txt': 'c' });
  assert.throws(() => readZip(zip, { maxEntries: 2 }), /entries|limit/i);
});
