import { buildMatchExpression, queryTerms } from './tokenize.js';

const SNIPPET_RADIUS = 110;

/**
 * Hybrid-ish ranking: BM25 from FTS5, then small boosts when the query also
 * appears in the relative path or the heading path (title-like signals).
 */
export function searchSpace(db, query, { limit = 8, isSensitive = () => false } = {}) {
  const trimmed = String(query ?? '').trim();
  if (trimmed === '') return { query: trimmed, terms: [], results: [], mode: 'empty' };

  const terms = queryTerms(trimmed);
  const { expression } = buildMatchExpression(trimmed);
  const fetchLimit = Math.max(limit * 6, 30);
  let rows = [];
  let mode = 'fts';

  if (expression !== '') {
    try {
      rows = db.search(expression, fetchLimit);
    } catch {
      rows = [];
    }
  }
  if (rows.length === 0) {
    mode = 'like';
    const likeTerms = trimmed.split(/\s+/).filter(Boolean).slice(0, 6);
    rows = db.searchLike(likeTerms, fetchLimit);
  }

  const seen = new Set();
  const scored = [];
  for (const row of rows) {
    const key = `${row.rel}#${row.ord}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rank = Number(row.rank ?? 0);
    const base = mode === 'fts' ? -rank * 10 : 1;
    const text = String(row.text ?? '');
    const lowerText = text.toLowerCase();
    // A chunk that matched only through its file path is a weaker answer than
    // one whose own text contains the term; demote it instead of dropping it.
    const inText = terms.some((term) => lowerText.includes(term));
    scored.push({
      rel: row.rel,
      ord: row.ord,
      heading: row.heading ?? '',
      locator: row.locator ?? '',
      text,
      score: base * (inText ? 1 : 0.45) + boosts(row, terms),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const perDoc = new Map();
  const picked = [];
  for (const item of scored) {
    const used = perDoc.get(item.rel) ?? 0;
    if (used >= 2) continue;
    perDoc.set(item.rel, used + 1);
    picked.push(item);
    if (picked.length >= limit) break;
  }

  return {
    query: trimmed,
    terms,
    mode,
    results: picked.map((item) => ({
      rel: item.rel,
      heading: item.heading,
      locator: item.locator,
      score: Number(item.score.toFixed(3)),
      snippet: snippetOf(item.text, terms),
      sensitive: Boolean(isSensitive(item.rel)),
    })),
  };
}

function boosts(row, terms) {
  let bonus = 0;
  const relLower = String(row.rel ?? '').toLowerCase();
  const headingLower = String(row.heading ?? '').toLowerCase();
  for (const term of terms) {
    if (relLower.includes(term)) bonus += 3;
    if (headingLower.includes(term)) bonus += 1.2;
  }
  return bonus;
}

export function snippetOf(text, terms) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (flat === '') return '';
  let hit = -1;
  const lower = flat.toLowerCase();
  for (const term of terms) {
    const index = lower.indexOf(term.toLowerCase());
    if (index !== -1 && (hit === -1 || index < hit)) hit = index;
  }
  if (hit === -1) return flat.length > SNIPPET_RADIUS * 2 ? `${flat.slice(0, SNIPPET_RADIUS * 2)}…` : flat;
  const start = Math.max(0, hit - SNIPPET_RADIUS);
  const end = Math.min(flat.length, hit + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}
