const CJK = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af]/;
const WORD = /[a-z0-9_]/;

/**
 * Tokenize for the FTS5 index: Latin words stay words, CJK runs become
 * overlapping bigrams so two-character Chinese queries can hit the index.
 */
export function tokenize(text) {
  const out = [];
  if (!text) return out;
  const normalized = text.normalize('NFKC').toLowerCase();
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i];
    if (CJK.test(ch)) {
      let j = i;
      while (j < normalized.length && CJK.test(normalized[j])) j += 1;
      const run = normalized.slice(i, j);
      if (run.length === 1) out.push(run);
      else for (let k = 0; k < run.length - 1; k += 1) out.push(run.slice(k, k + 2));
      i = j;
      continue;
    }
    if (WORD.test(ch)) {
      let j = i;
      while (j < normalized.length && WORD.test(normalized[j])) j += 1;
      const word = normalized.slice(i, j);
      if (word.length <= 40) out.push(word);
      i = j;
      continue;
    }
    i += 1;
  }
  return out;
}

export function indexTokens(text) {
  return tokenize(text).join(' ');
}

const MAX_QUERY_WORDS = 12;

/**
 * Build an FTS5 MATCH expression. Each whitespace-separated segment of the
 * query must appear; a segment's own bigrams/words are ANDed, which makes a
 * multi-character Chinese term behave like a phrase search.
 */
export function buildMatchExpression(query) {
  const segments = query
    .normalize('NFKC')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_QUERY_WORDS);
  const groups = [];
  let tooShort = false;
  for (const segment of segments) {
    const tokens = tokenize(segment);
    if (tokens.length === 0) continue;
    const usable = [];
    for (const token of tokens) {
      if (token.length === 1 && CJK.test(token)) {
        tooShort = true;
        continue;
      }
      usable.push(token);
    }
    if (usable.length === 0) continue;
    const parts = usable.map((token) => {
      const isLatin = /^[a-z0-9_]+$/.test(token);
      const quoted = `"${token.replace(/"/g, '""')}"`;
      return isLatin && token.length >= 3 ? `${quoted}*` : quoted;
    });
    groups.push(parts.length > 1 ? `(${parts.join(' AND ')})` : parts[0]);
  }
  return { expression: groups.join(' AND '), tooShort };
}

/** Query terms used for snippet windows and client-side highlighting. */
export function queryTerms(query) {
  const terms = new Set();
  for (const segment of query.split(/\s+/)) {
    if (!segment) continue;
    for (const token of tokenize(segment)) {
      if (token.length >= 2 || /[a-z0-9]/.test(token)) terms.add(token);
    }
  }
  return [...terms].slice(0, 24);
}
