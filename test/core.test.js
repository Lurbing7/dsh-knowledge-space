import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMatchExpression, queryTerms, tokenize } from '../host/tokenize.js';
import { chunkText } from '../host/chunk.js';
import { stripFrontmatter } from '../host/extract.js';
import { isSensitivePath, matchPathPattern, normalizeRel } from '../host/util.js';

test('tokenize splits Chinese into overlapping bigrams', () => {
  assert.deepEqual(tokenize('事务传播'), ['事务', '务传', '传播']);
});

test('tokenize keeps a single Chinese character', () => {
  assert.deepEqual(tokenize('锁'), ['锁']);
});

test('tokenize lowercases Latin words and drops punctuation', () => {
  assert.deepEqual(tokenize('Spring 事务, DSH-Plugin!'), ['spring', '事务', 'dsh', 'plugin']);
});

test('buildMatchExpression ANDs the bigrams of one term', () => {
  const { expression } = buildMatchExpression('事务传播');
  assert.match(expression, /"事务" AND "务传" AND "传播"/);
});

test('buildMatchExpression uses a prefix for Latin words', () => {
  const { expression } = buildMatchExpression('spring');
  assert.equal(expression, '"spring"*');
});

test('buildMatchExpression flags single-character Chinese queries', () => {
  const { tooShort, expression } = buildMatchExpression('锁');
  assert.equal(tooShort, true);
  assert.equal(expression, '');
});

test('queryTerms is empty for a blank query', () => {
  assert.deepEqual(queryTerms('   '), []);
});

test('chunkText keeps every chunk under one heading', () => {
  const text = [
    '# Spring',
    '',
    'Intro paragraph.',
    '',
    '## Transactions',
    '',
    'Body about transactions.',
    '',
    '## Cache',
    '',
    'Body about cache.',
  ].join('\n');
  const chunks = chunkText(text);
  assert.deepEqual(
    chunks.map((chunk) => chunk.heading),
    ['Spring', 'Spring > Transactions', 'Spring > Cache'],
  );
});

test('chunkText splits an oversized section at sentence boundaries', () => {
  const sentence = `${'知识'.repeat(300)}。`;
  const chunks = chunkText(`# Big\n\n${sentence}${sentence}${sentence}`);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(chunk.text.length <= 1500);
});

test('chunkText carries the page locator', () => {
  const [chunk] = chunkText('page body', { locator: 'p.7' });
  assert.equal(chunk.locator, 'p.7');
});

test('stripFrontmatter removes a YAML block only when present', () => {
  const withFront = '---\ntags: [a]\n---\n\nBody';
  assert.equal(stripFrontmatter(withFront).trim(), 'Body');
  assert.equal(stripFrontmatter('Body Only'), 'Body Only');
});

test('matchPathPattern handles segments and wildcards', () => {
  assert.equal(matchPathPattern('private', 'private/secret.md'), true);
  assert.equal(matchPathPattern('private', 'domain/private/secret.md'), true);
  assert.equal(matchPathPattern('private', 'privated/secret.md'), false);
  assert.equal(matchPathPattern('*.pem', 'certs/server.pem'), true);
  assert.equal(matchPathPattern('.env*', 'app/.env.local'), true);
  assert.equal(matchPathPattern('a/b', 'a/b/c.md'), true);
});

test('isSensitivePath needs at least one matching pattern', () => {
  assert.equal(isSensitivePath(['private', '*.pem'], 'private/x.md'), true);
  assert.equal(isSensitivePath([], 'private/x.md'), false);
  assert.equal(isSensitivePath(['private'], 'domain/x.md'), false);
});

test('normalizeRel strips leading slashes and converts separators', () => {
  assert.equal(normalizeRel('\\a\\b.md'), 'a/b.md');
  assert.equal(normalizeRel('./a/b.md'), 'a/b.md');
});
