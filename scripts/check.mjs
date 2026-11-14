import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

const sources = [
  'index.js',
  'client.js',
  'host/api.js',
  'host/chunk.js',
  'host/config.js',
  'host/db.js',
  'host/extract.js',
  'host/git.js',
  'host/ingest.js',
  'host/manager.js',
  'host/prompt.js',
  'host/search.js',
  'host/spaces.js',
  'host/tokenize.js',
  'host/tools.js',
  'host/util.js',
  'host/zip.js',
];

for (const file of sources) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  if (result.status !== 0) fail(`syntax: ${file}\n${result.stderr}`);
}

for (const file of ['locale/en.json', 'locale/zh.json', 'package.json']) {
  try {
    JSON.parse(await readFile(path.join(root, file), 'utf8'));
  } catch (error) {
    fail(`json: ${file}: ${error.message}`);
  }
}

const manifest = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
for (const field of ['name', 'version', 'description', 'license', 'engines', 'exports', 'files', 'dsh']) {
  if (manifest[field] === undefined) fail(`package.json is missing "${field}"`);
}
if (manifest.private === true) fail('package.json must not be private for publishing');
if (!manifest.engines?.dsh) fail('package.json must declare engines.dsh');
if (!manifest.dsh?.bundle?.patch) fail('package.json must declare dsh.bundle.patch');
if (!manifest.dsh?.client?.platform) fail('package.json must declare dsh.client.platform');

const client = await readFile(path.join(root, 'client.js'), 'utf8');
const enStart = client.indexOf('en: {');
const zhStart = client.indexOf('zh: {');
if (enStart < 0 || zhStart < 0) {
  fail('client.js: MESSAGES.en / MESSAGES.zh blocks not found');
} else {
  const enBlock = client.slice(enStart, zhStart);
  const used = new Set([...client.matchAll(/\bt\('([a-zA-Z0-9_.]+)'/g)].map((match) => match[1]));
  const dynamic = [...client.matchAll(/t\(`([a-zA-Z0-9_.]+)\.\$\{/g)].map((match) => match[1]);
  const declared = new Set([...enBlock.matchAll(/'([a-zA-Z0-9_.]+)':/g)].map((match) => match[1]));
  for (const key of used) {
    if (!declared.has(key)) fail(`client.js: missing en translation for "${key}"`);
  }
  for (const prefix of dynamic) {
    if (![...declared].some((key) => key.startsWith(`${prefix}.`))) fail(`client.js: missing en translations for prefix "${prefix}."`);
  }
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(enBlock)) fail('client.js: English dictionary contains CJK characters');
}

if (failures.length > 0) {
  console.error(`check failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`check ok (${sources.length} files, ${manifest.name}@${manifest.version})`);
