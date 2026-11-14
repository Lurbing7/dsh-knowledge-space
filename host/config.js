import Schema from '@deepseek-ai/schemastery';

/** File extensions indexed when a space is created. */
export const DEFAULT_INCLUDE_EXTS = ['md', 'markdown', 'txt', 'pdf', 'docx', 'xlsx'];

/**
 * Directories skipped by default. `.system`, `.archive` and `.inbox` follow the
 * Obsidian-vault convention this plugin was built for; the rest are generic.
 */
export const DEFAULT_EXCLUDE_DIRS = [
  '.git',
  '.obsidian',
  '.trash',
  '.playwright-mcp',
  '.system',
  '.archive',
  '.inbox',
  'node_modules',
  'dist',
  'build',
  'out',
];

/**
 * Paths whose content is marked "sensitive" in results. Matching paths are
 * still indexed unless `indexSensitive` is turned off for the space.
 */
export const DEFAULT_SENSITIVE_PATHS = ['private', '.env*', '*.pem', '*.key', 'id_rsa*', '*.kdbx'];

export const DEFAULT_UPLOAD_DIR = '_knowledge-space/uploads';

/**
 * Config is optional: when the host does not expose `@deepseek-ai/schemastery`
 * (for example a linked checkout without the dev copy) the plugin still loads
 * with the defaults below and simply cannot be tuned from cordis.patch.yml.
 */
let Config;
try {
  const { default: Schema } = await import('@deepseek-ai/schemastery');
  Config = Schema.object({
    dataDir: Schema.string()
      .description('Directory holding indexes and the space registry. Empty means $DSH_HOME/knowledge-space.')
      .default(''),
    defaultIncludeExts: Schema.array(Schema.string()).description('Extensions a new space indexes.').default(DEFAULT_INCLUDE_EXTS),
    defaultExcludeDirs: Schema.array(Schema.string()).description('Directories a new space skips.').default(DEFAULT_EXCLUDE_DIRS),
    defaultSensitivePaths: Schema.array(Schema.string())
      .description('Path patterns marked sensitive in a new space.')
      .default(DEFAULT_SENSITIVE_PATHS),
    defaultUploadDir: Schema.string()
      .description('Directory, relative to a space root, that receives uploaded files.')
      .default(DEFAULT_UPLOAD_DIR),
    maxFileMB: Schema.number().description('Largest file the indexer reads.').default(30),
    maxPdfPages: Schema.number().description('Pages read from one PDF.').default(2000),
    maxDocChars: Schema.number().description('Characters kept from one document.').default(2000000),
    promptHint: Schema.boolean().description('Tell the model which knowledge spaces exist.').default(true),
  });
} catch {
  Config = undefined;
}

export { Config };
