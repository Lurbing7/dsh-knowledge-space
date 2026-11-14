import { appendFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { KnowledgeManager } from './host/manager.js';
import { registerApi } from './host/api.js';
import { registerTools } from './host/tools.js';
import { registerPrompt } from './host/prompt.js';
import { Config, DEFAULT_EXCLUDE_DIRS, DEFAULT_INCLUDE_EXTS, DEFAULT_SENSITIVE_PATHS, DEFAULT_UPLOAD_DIR } from './host/config.js';

export const name = 'dsh-knowledge-space';
export const inject = ['tools', 'webServer'];
export { Config };

/**
 * Host half: owns the space registry, the per-space SQLite index, the HTTP
 * routes the panel talks to, the agent tools, and the optional prompt hint.
 */
export function apply(ctx, config = {}) {
  const settings = {
    dataDir: config.dataDir ?? '',
    defaultIncludeExts: config.defaultIncludeExts ?? DEFAULT_INCLUDE_EXTS,
    defaultExcludeDirs: config.defaultExcludeDirs ?? DEFAULT_EXCLUDE_DIRS,
    defaultSensitivePaths: config.defaultSensitivePaths ?? DEFAULT_SENSITIVE_PATHS,
    defaultUploadDir: config.defaultUploadDir ?? DEFAULT_UPLOAD_DIR,
    maxFileMB: config.maxFileMB,
    maxPdfPages: config.maxPdfPages,
    maxDocChars: config.maxDocChars,
    promptHint: config.promptHint,
  };

  const manager = new KnowledgeManager(settings);
  manager.init().catch((error) => report(manager, 'init', error));

  ctx.effect(() => {
    const disposers = [];
    const guard = (label, factory) => {
      try {
        const dispose = factory();
        if (typeof dispose === 'function') disposers.push(dispose);
      } catch (error) {
        report(manager, label, error);
      }
    };

    guard('http', () => registerApi(ctx, manager));
    guard('tools', () => registerTools(ctx, manager));
    guard('prompt', () => registerPrompt(ctx, manager));

    return () => {
      for (const dispose of disposers.reverse()) {
        try {
          dispose();
        } catch {
          /* ignore teardown failures */
        }
      }
      manager.closeAll();
    };
  });
}

/** Plugin errors otherwise only reach the app console; keep a copy on disk. */
function report(manager, stage, error) {
  const message = `[${new Date().toISOString()}] ${stage}: ${error?.stack ?? error}\n`;
  console.error('[dsh-knowledge-space]', message);
  try {
    const base = manager?.store?.dataDir;
    if (!base) return;
    mkdirSync(base, { recursive: true });
    appendFileSync(path.join(base, 'error.log'), message, 'utf8');
  } catch {
    /* logging must never break activation */
  }
}
