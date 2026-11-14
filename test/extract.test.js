import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { extractDocument } from '../host/extract.js';
import { docxFixture, pdfFixture, xlsxFixture } from './helpers.js';

async function fixture(name, content) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ks-extract-'));
  const file = path.join(dir, name);
  await writeFile(file, content);
  return file;
}

test('markdown drops frontmatter and keeps the body', async () => {
  const file = await fixture('note.md', '---\ntags: [a]\n---\n\n# Title\n\nBody text');
  const result = await extractDocument(file, 'md');
  assert.equal(result.sections.length, 1);
  assert.ok(result.sections[0].text.startsWith('# Title'));
  assert.ok(!result.sections[0].text.includes('tags:'));
});

test('plain text with a BOM is decoded as UTF-8', async () => {
  const file = await fixture('note.txt', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('中文内容', 'utf8')]));
  const result = await extractDocument(file, 'txt');
  assert.equal(result.sections[0].text, '中文内容');
});

test('invalid UTF-8 falls back to GB18030 instead of failing', async () => {
  const bytes = Buffer.from([0xd6, 0xd0, 0xce, 0xc4]);
  const file = await fixture('legacy.txt', bytes);
  const result = await extractDocument(file, 'txt');
  assert.ok(result.sections[0].text.length > 0);
});

test('binary content behind a text extension is rejected', async () => {
  const file = await fixture('fake.md', Buffer.from([0x00, 0x01, 0x02, 0x03]));
  await assert.rejects(() => extractDocument(file, 'md'), /binary/i);
});

test('docx keeps heading levels and paragraph text', async () => {
  const file = await fixture('doc.docx', docxFixture('段落正文', { heading: '标题一', level: 1 }));
  const result = await extractDocument(file, 'docx');
  const text = result.sections[0].text;
  assert.match(text, /^# 标题一/m);
  assert.match(text, /段落正文/);
});

test('xlsx exposes the worksheet name and rows', async () => {
  const file = await fixture(
    'sheet.xlsx',
    xlsxFixture('预算', [
      ['项目', '金额'],
      ['服务器', '12000'],
    ]),
  );
  const result = await extractDocument(file, 'xlsx');
  const text = result.sections[0].text;
  assert.match(text, /## Sheet: 预算/);
  assert.match(text, /row 2: 服务器 \| 12000/);
});

test('pdf extracts the text layer with a page locator', async () => {
  const file = await fixture('sample.pdf', pdfFixture('Hello knowledge space'));
  const result = await extractDocument(file, 'pdf');
  assert.ok(result.sections.length >= 1);
  assert.equal(result.sections[0].locator, 'p.1');
  assert.match(result.sections[0].text, /Hello knowledge space/);
});

test('legacy Office formats fail with a readable code', async () => {
  const file = await fixture('old.doc', Buffer.from('not really a doc'));
  await assert.rejects(() => extractDocument(file, 'doc'), /Legacy \.doc/);
});

test('document text is capped by maxDocChars', async () => {
  const file = await fixture('long.md', `# T\n\n${'x'.repeat(500)}`);
  const result = await extractDocument(file, 'md', { maxDocChars: 100 });
  assert.ok(result.sections[0].text.includes('truncated at 100 characters'));
});
