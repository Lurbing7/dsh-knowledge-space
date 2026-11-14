import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { indexTokens } from './tokenize.js';

const SCHEMA_VERSION = 2;

/**
 * One SQLite file per knowledge space: document bookkeeping in `docs`,
 * chunk text in `chunks`, and a bigram FTS5 table for retrieval.
 *
 * The index is derived data, so an incompatible schema is dropped and rebuilt
 * instead of migrated.
 */
export class SpaceDb {
  constructor(file) {
    mkdirSync(path.dirname(file), { recursive: true });
    this.file = file;
    this.db = new DatabaseSync(file);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.db.exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
    this.resetIfIncompatible();
    this.createTables();
    this.setMeta('schemaVersion', String(SCHEMA_VERSION));
  }

  resetIfIncompatible() {
    const docs = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='docs'").get();
    if (!docs) return;
    const columns = this.db.prepare('PRAGMA table_info(docs)').all().map((row) => row.name);
    const version = Number(this.getMeta('schemaVersion') ?? 0);
    if (columns.includes('sensitive') && version === SCHEMA_VERSION) return;
    this.db.exec('DROP TABLE IF EXISTS fts');
    this.db.exec('DROP TABLE IF EXISTS chunks');
    this.db.exec('DROP TABLE IF EXISTS docs');
  }

  createTables() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS docs (
      rel TEXT PRIMARY KEY,
      ext TEXT NOT NULL DEFAULT '',
      bytes INTEGER NOT NULL DEFAULT 0,
      mtime INTEGER NOT NULL DEFAULT 0,
      sha TEXT NOT NULL DEFAULT '',
      chunks INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'ok',
      err TEXT,
      sensitive INTEGER NOT NULL DEFAULT 0,
      updated INTEGER NOT NULL DEFAULT 0
    )`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS chunks (
      id INTEGER PRIMARY KEY,
      rel TEXT NOT NULL,
      ord INTEGER NOT NULL,
      heading TEXT NOT NULL DEFAULT '',
      locator TEXT NOT NULL DEFAULT '',
      text TEXT NOT NULL
    )`);
    this.db.exec('CREATE INDEX IF NOT EXISTS chunks_rel_idx ON chunks(rel)');
    this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS fts USING fts5(
      title,
      body,
      tokenize = 'unicode61 remove_diacritics 2'
    )`);
  }

  close() {
    try {
      this.db.close();
    } catch {
      /* already closed */
    }
  }

  setMeta(key, value) {
    this.db
      .prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
      .run(key, String(value));
  }

  getMeta(key) {
    const row = this.db.prepare('SELECT v FROM meta WHERE k = ?').get(key);
    return row ? row.v : undefined;
  }

  docRow(rel) {
    return this.db.prepare('SELECT * FROM docs WHERE rel = ?').get(rel);
  }

  allDocs() {
    return this.db.prepare('SELECT rel, ext, bytes, mtime, sha, chunks, status, sensitive FROM docs').all();
  }

  countDocs() {
    return this.db.prepare("SELECT COUNT(*) AS n FROM docs WHERE status = 'ok'").get().n;
  }

  countChunks() {
    return this.db.prepare('SELECT COUNT(*) AS n FROM chunks').get().n;
  }

  countErrors() {
    return this.db.prepare("SELECT COUNT(*) AS n FROM docs WHERE status = 'error'").get().n;
  }

  upsertDoc(doc) {
    this.db
      .prepare(
        `INSERT INTO docs (rel, ext, bytes, mtime, sha, chunks, status, err, sensitive, updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(rel) DO UPDATE SET
           ext = excluded.ext, bytes = excluded.bytes, mtime = excluded.mtime,
           sha = excluded.sha, chunks = excluded.chunks, status = excluded.status,
           err = excluded.err, sensitive = excluded.sensitive, updated = excluded.updated`,
      )
      .run(
        doc.rel,
        doc.ext ?? '',
        doc.bytes ?? 0,
        doc.mtime ?? 0,
        doc.sha ?? '',
        doc.chunks ?? 0,
        doc.status ?? 'ok',
        doc.err ?? null,
        doc.sensitive ? 1 : 0,
        doc.updated ?? Date.now(),
      );
  }

  /** Replace every chunk of one document, keeping the FTS table in sync. */
  replaceChunks(rel, chunks) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM fts WHERE rowid IN (SELECT id FROM chunks WHERE rel = ?)').run(rel);
      this.db.prepare('DELETE FROM chunks WHERE rel = ?').run(rel);
      const insertChunk = this.db.prepare(
        'INSERT INTO chunks (rel, ord, heading, locator, text) VALUES (?, ?, ?, ?, ?)',
      );
      const insertFts = this.db.prepare('INSERT INTO fts (rowid, title, body) VALUES (?, ?, ?)');
      let ord = 0;
      for (const chunk of chunks) {
        const result = insertChunk.run(rel, ord, chunk.heading ?? '', chunk.locator ?? '', chunk.text);
        const id = Number(result.lastInsertRowid);
        insertFts.run(id, indexTokens(`${rel} ${chunk.heading ?? ''}`), indexTokens(chunk.text));
        ord += 1;
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  removeDoc(rel) {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM fts WHERE rowid IN (SELECT id FROM chunks WHERE rel = ?)').run(rel);
      this.db.prepare('DELETE FROM chunks WHERE rel = ?').run(rel);
      this.db.prepare('DELETE FROM docs WHERE rel = ?').run(rel);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  listDocs({ query = '', limit = 50, offset = 0, status = '' } = {}) {
    const where = [];
    const params = [];
    if (query) {
      where.push('rel LIKE ?');
      params.push(`%${query}%`);
    }
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = this.db.prepare(`SELECT COUNT(*) AS n FROM docs ${clause}`).get(...params).n;
    const rows = this.db
      .prepare(
        `SELECT rel, ext, bytes, mtime, chunks, status, err, sensitive FROM docs ${clause}
         ORDER BY rel LIMIT ? OFFSET ?`,
      )
      .all(...params, limit, offset);
    return { total, rows };
  }

  chunksOf(rel, limit = 400) {
    return this.db
      .prepare('SELECT id, ord, heading, locator, text FROM chunks WHERE rel = ? ORDER BY ord LIMIT ?')
      .all(rel, limit);
  }

  /** BM25 over the FTS table; returns the best `limit` rows, best first. */
  search(expression, limit) {
    return this.db
      .prepare(
        `SELECT c.id AS id, c.rel AS rel, c.ord AS ord, c.heading AS heading,
                c.locator AS locator, c.text AS text, bm25(fts, 2.5, 1.0) AS rank
         FROM fts JOIN chunks c ON c.id = fts.rowid
         WHERE fts MATCH ?
         ORDER BY rank
         LIMIT ?`,
      )
      .all(expression, limit);
  }

  /** Plain substring scan, used for queries the bigram index cannot express. */
  searchLike(terms, limit) {
    if (terms.length === 0) return [];
    const clause = terms.map(() => 'text LIKE ?').join(' AND ');
    return this.db
      .prepare(`SELECT id, rel, ord, heading, locator, text, 0 AS rank FROM chunks WHERE ${clause} LIMIT ?`)
      .all(...terms.map((term) => `%${term}%`), limit);
  }
}
