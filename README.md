# Knowledge spaces

[![CI](https://github.com/Lurbing7/dsh-knowledge-space/actions/workflows/ci.yml/badge.svg)](https://github.com/Lurbing7/dsh-knowledge-space/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Turn **local folders** into searchable knowledge for DSH. Nothing is copied, rewritten, or uploaded: the plugin keeps a side index in SQLite, and you keep editing files in Obsidian, VS Code, or anything else. Re-index when you want the index to catch up.

## What it does

**Spaces** — a space is a folder. Point it at an Obsidian vault, a docs repository, a shared drive, or a folder of PDFs.

**Formats**

| Format | Parsing | Citation |
|---|---|---|
| `.md` / `.markdown` | text, YAML frontmatter stripped | heading path |
| `.txt` | text (UTF-8, falls back to GB18030) | — |
| `.pdf` | text layer, one section per page | heading path + `p.N` |
| `.docx` | OOXML, heading levels and tables preserved | heading path |
| `.xlsx` | one block per worksheet, rows kept | sheet name + row number |

Legacy `.doc` / `.xls` and scanned PDFs without a text layer are reported as parse errors, never silently dropped.

**Search** — SQLite FTS5 with BM25. Chinese is tokenized into overlapping bigrams, so a two-character query matches inside longer words; English words support prefixes. Path and heading matches are boosted. Results carry a heading path, a page or sheet locator, and a snippet.

**Agents** — `knowledge_search` and `knowledge_spaces` tools, plus an optional system-prompt section that tells the model the spaces exist. Auto-retrieval on every turn is deliberately not implemented.

**Privacy** — no network access at all. Paths matching the space’s sensitive patterns (default `private`, `.env*`, `*.pem`, `*.key`, `id_rsa*`, `*.kdbx`) are marked *sensitive* in results and can be excluded from the index entirely.

## Install

```sh
dsh plugin --profile <name> add dsh-knowledge-space
```

Then open **Plugins** and make sure `dsh-knowledge-space` is enabled, restart DSH, and use the **Knowledge spaces** entry in the left sidebar.

From a checkout instead:

```sh
dsh plugin --profile <name> add ./dsh-knowledge-space
```

A linked checkout resolves its own `node_modules`; run `pnpm install` inside it first so `unpdf` (and the optional `@deepseek-ai/schemastery` dev copy) are present.

## Configuration

Set these in the profile’s `cordis.patch.yml` under the `dsh-knowledge-space` row:

```yaml
- id: dsh-knowledge-space
  name: dsh-knowledge-space
  config:
    dataDir: ''
    defaultUploadDir: '_knowledge-space/uploads'
    defaultExcludeDirs: ['.git', '.obsidian', 'node_modules']
    maxFileMB: 30
    promptHint: true
```

Per-space settings (extensions, excluded folders, sensitive patterns, upload folder, auto-commit) live in the panel and are stored in `<space>/.dsh-knowledge-space/space.json`.

## Git

- `<space>/.dsh-knowledge-space/space.json` and `manifest.json` (paths + content hashes) are meant to be committed; they make the space reproducible on another machine.
- The SQLite index lives in `$DSH_HOME/knowledge-space/index/` and stays out of git — it changes completely on every rebuild.
- “Commit manifest after indexing” is off by default. When enabled it only runs `git add`/`git commit` on `.dsh-knowledge-space/`. It never pushes.

## Limits

- One index per space; files larger than `maxFileMB` (30 MB) are skipped, PDFs beyond `maxPdfPages`, text beyond `maxDocChars`.
- Lexical search only: “cache” does not find “缓存”. A vector backend is planned, not shipped.
- The panel’s HTTP endpoints accept loopback connections only.
- Requires Node 24+ (`node:sqlite` is unflagged there); DSH Desktop bundles it.

Full details: [docs/DETAIL.md](docs/DETAIL.md) · [中文说明](README.zh.md) · [roadmap](docs/ROADMAP.md)

## License

MIT
