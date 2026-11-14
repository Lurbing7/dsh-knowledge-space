import { readFile } from 'node:fs/promises';
import { decodeText, fail } from './util.js';
import { decodeXml, readZip, zipText } from './zip.js';

const TEXT_EXTS = new Set(['md', 'markdown', 'txt']);
const MAX_SHEET_ROWS = 4000;
const MAX_CELL_CHARS = 300;
const MAX_PAGES_DEFAULT = 2000;
const MAX_CHARS_DEFAULT = 2_000_000;

/**
 * Turn one file into indexable sections.
 * Markdown-like formats return a single section; PDF returns one per page so
 * citations can carry a page number.
 */
export async function extractDocument(absPath, ext, limits = {}) {
  const maxChars = Number(limits.maxDocChars) || MAX_CHARS_DEFAULT;
  if (TEXT_EXTS.has(ext)) {
    const buffer = await readFile(absPath);
    const text = decodeText(buffer);
    return { sections: [{ locator: '', text: cap(stripFrontmatter(text), maxChars) }] };
  }
  if (ext === 'pdf') return extractPdf(absPath, { ...limits, maxChars });
  if (ext === 'docx') return extractDocx(absPath, maxChars);
  if (ext === 'xlsx') return extractXlsx(absPath, maxChars);
  if (ext === 'doc' || ext === 'xls' || ext === 'ppt' || ext === 'pptx') {
    const suggestion = ext === 'xls' ? 'xlsx' : ext === 'ppt' || ext === 'pptx' ? 'pdf' : 'docx';
    throw fail('legacy_format', `Legacy .${ext} is not supported; save it as .${suggestion} and retry`);
  }
  throw fail('unsupported_format', `Unsupported extension .${ext}`);
}

function cap(text, maxChars) {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n…[truncated at ${maxChars} characters]`;
}

/** Remove a leading YAML frontmatter block from a Markdown note. */
export function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return text;
  const after = text.indexOf('\n', end + 4);
  return after === -1 ? '' : text.slice(after + 1).replace(/^[\r\n]+/, '');
}

async function extractPdf(absPath, limits) {
  const maxPages = Number(limits.maxPdfPages) || MAX_PAGES_DEFAULT;
  const { extractText, getDocumentProxy } = await import('unpdf');
  const bytes = new Uint8Array(await readFile(absPath));
  const pdf = await getDocumentProxy(bytes);
  const result = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(result.text) ? result.text : [String(result.text ?? '')];
  const kept = pages.slice(0, maxPages);
  const sections = kept
    .map((text, index) => ({ locator: `p.${index + 1}`, text: cap(normalizePdfText(text), limits.maxChars) }))
    .filter((section) => section.text.trim() !== '');
  return { sections, pageCount: kept.length, truncated: pages.length > kept.length };
}

function normalizePdfText(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function extractDocx(absPath, maxChars) {
  const entries = readZip(await readFile(absPath));
  const xml = zipText(entries, 'word/document.xml');
  if (!xml) throw fail('docx_invalid', 'DOCX is missing word/document.xml');
  const text = docxToText(xml);
  if (text.trim() === '') throw fail('docx_empty', 'DOCX contains no extractable text (images only?)');
  return { sections: [{ locator: '', text: cap(text, maxChars) }] };
}

const WORD_BLOCK = /<w:tbl>[\s\S]*?<\/w:tbl>|<w:p\b[^>]*?\/>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;

function docxToText(xml) {
  const out = [];
  for (const block of xml.match(WORD_BLOCK) ?? []) {
    if (block.startsWith('<w:tbl')) {
      const table = tableToMarkdown(block);
      if (table) out.push(table);
      continue;
    }
    const paragraph = paragraphOf(block);
    if (paragraph.text === '') continue;
    if (paragraph.level > 0) out.push(`${'#'.repeat(Math.min(6, paragraph.level))} ${paragraph.text}`);
    else if (paragraph.list) out.push(`- ${paragraph.text}`);
    else out.push(paragraph.text);
  }
  return out.join('\n\n').trim();
}

function tableToMarkdown(tableXml) {
  const rows = [];
  for (const row of tableXml.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/g) ?? []) {
    const cells = [];
    for (const cell of row.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/g) ?? []) {
      const parts = [];
      for (const paragraph of cell.match(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g) ?? []) {
        const text = paragraphOf(paragraph).text;
        if (text) parts.push(text);
      }
      cells.push(parts.join(' ').replace(/\|/g, '\\|'));
    }
    if (cells.some((cell) => cell !== '')) rows.push(`| ${cells.join(' | ')} |`);
  }
  return rows.join('\n');
}

function paragraphOf(xml) {
  const style = xml.match(/<w:pStyle w:val="([^"]+)"/)?.[1] ?? '';
  const outline = xml.match(/<w:outlineLvl w:val="(\d+)"/)?.[1];
  let level = 0;
  const heading = style.match(/^Heading(\d)$/i);
  if (heading) level = Number(heading[1]);
  else if (/^[1-9]$/.test(style)) level = Number(style);
  else if (outline !== undefined) level = Number(outline) + 1;

  const list = /<w:numPr>/.test(xml);
  const withBreaks = xml.replace(/<w:tab\b[^>]*\/>/g, '\t').replace(/<w:br\b[^>]*\/>/g, '\n');
  const runs = [];
  for (const match of withBreaks.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)) runs.push(decodeXml(match[1]));
  return { text: runs.join('').replace(/\s+/g, ' ').trim(), level, list };
}

async function extractXlsx(absPath, maxChars) {
  const entries = readZip(await readFile(absPath));
  const workbook = zipText(entries, 'xl/workbook.xml');
  if (!workbook) throw fail('xlsx_invalid', 'XLSX is missing xl/workbook.xml');
  const rels = parseRels(zipText(entries, 'xl/_rels/workbook.xml.rels') ?? '');
  const shared = parseSharedStrings(zipText(entries, 'xl/sharedStrings.xml') ?? '');

  const blocks = [];
  for (const match of workbook.matchAll(/<sheet\b([^>]*)\/>/g)) {
    const attrs = parseAttrs(match[1]);
    const name = decodeXml(attrs.name ?? 'Sheet');
    const target = attrs['r:id'] ? rels.get(attrs['r:id']) : undefined;
    const sheetPath = target ? normalizeSheetPath(target) : `xl/worksheets/sheet${blocks.length + 1}.xml`;
    const xml = zipText(entries, sheetPath);
    blocks.push(xml ? `## Sheet: ${name}\n\n${sheetToText(xml, shared)}` : `## Sheet: ${name}\n(unreadable)`);
  }
  if (blocks.length === 0) throw fail('xlsx_invalid', 'XLSX contains no worksheets');
  return { sections: [{ locator: '', text: cap(blocks.join('\n\n'), maxChars) }] };
}

function parseRels(xml) {
  const map = new Map();
  for (const match of xml.matchAll(/<Relationship\b([^>]*)\/>/g)) {
    const attrs = parseAttrs(match[1]);
    if (attrs.Id && attrs.Target) map.set(attrs.Id, attrs.Target);
  }
  return map;
}

function normalizeSheetPath(target) {
  return `xl/${target.replace(/^\/?xl\//, '').replace(/^\.\.\//, '')}`;
}

function parseSharedStrings(xml) {
  const list = [];
  for (const match of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const parts = [];
    for (const text of match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) parts.push(decodeXml(text[1]));
    list.push(parts.join(''));
  }
  return list;
}

function sheetToText(xml, shared) {
  const lines = [];
  let rows = 0;
  for (const rowMatch of xml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    if (rows >= MAX_SHEET_ROWS) {
      lines.push(`… (row limit ${MAX_SHEET_ROWS} reached)`);
      break;
    }
    const rowNumber = parseAttrs(rowMatch[1]).r;
    const cells = [];
    for (const cellMatch of rowMatch[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const value = cellValue(parseAttrs(cellMatch[1]), cellMatch[2], shared);
      if (value !== '') cells.push(value);
      if (cells.length >= 200) break;
    }
    if (cells.length === 0) continue;
    rows += 1;
    lines.push(`${rowNumber ? `row ${rowNumber}: ` : ''}${cells.join(' | ')}`);
  }
  return lines.join('\n') || '(empty sheet)';
}

function cellValue(attrs, inner, shared) {
  if (attrs.t === 'inlineStr') {
    const parts = [];
    for (const text of inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) parts.push(decodeXml(text[1]));
    return parts.join('').slice(0, MAX_CELL_CHARS).trim();
  }
  const value = inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
  if (value === undefined) return '';
  if (attrs.t === 's') return (shared[Number(value)] ?? '').slice(0, MAX_CELL_CHARS).trim();
  if (attrs.t === 'b') return value === '1' ? 'TRUE' : 'FALSE';
  return decodeXml(value).slice(0, MAX_CELL_CHARS).trim();
}

function parseAttrs(text) {
  const attrs = {};
  for (const match of text.matchAll(/([\w:.-]+)="([^"]*)"/g)) attrs[match[1]] = match[2];
  return attrs;
}
