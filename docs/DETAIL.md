# Knowledge spaces

Turn a **local folder** into a DSH knowledge space. Files are neither copied nor rewritten: the plugin builds a side index in SQLite, so you keep editing in Obsidian or any editor and press **Incremental reindex** when you want the index to catch up.

## Concepts

A space is defined by a folder. Three files matter:

| Path | Purpose | In git |
|---|---|---|
| `<space>/.dsh-knowledge-space/space.json` | space settings (extensions, exclusions, sensitive patterns, upload dir) | yes |
| `<space>/.dsh-knowledge-space/manifest.json` | every indexed path + sha256 + chunk count | yes |
| `$DSH_HOME/knowledge-space/index/<id>.db` | the SQLite FTS5 index and per-file bookkeeping | no |

`manifest.json` is only rewritten when content changes, so a reindex with no edits produces no diff.

## Formats

| Format | How it is read | Citation |
|---|---|---|
| `.md` / `.markdown` | text, leading YAML frontmatter removed | heading path |
| `.txt` | UTF-8, falling back to GB18030 for legacy saves | — |
| `.pdf` | text layer via `unpdf`, one section per page (capped by `maxPdfPages`) | heading path + `p.N` |
| `.docx` | OOXML from the ZIP container; heading styles become Markdown headings, tables become rows | heading path |
| `.xlsx` | each worksheet becomes a block of `row N: cell | cell` lines | sheet name + row number |

Rejected on purpose: `.doc`, `.xls`, `.ppt`, `.pptx` (reported as `legacy_format`), scanned PDFs with no text layer (reported as an empty document), binary files with a misleading extension (NUL bytes in the first 8 KB).

## Indexing

- Incremental: skip by size + mtime, then by content hash; deleted files are removed from the index.
- Caps: `maxFileMB` per file (default 30), `maxPdfPages` (2000), `maxDocChars` per document (2 000 000), zip entries and inflated size for OOXML.
- The upload folder is always indexed even when a parent folder is excluded.
- Hidden files and folders (leading `.`) are never walked; symlinks are skipped.

Chunking is heading-aligned: a chunk never spans two headings, and oversized sections are split at sentence boundaries.

## Search

SQLite FTS5 over pre-tokenized text:

- CJK runs become overlapping **bigrams**, so `事务` matches inside `事务传播`; a single-character CJK query falls back to a substring scan.
- Latin runs stay words; queries of three or more characters use a prefix match.
- Two FTS columns: `title` (relative path + heading path, weight 2.5) and `body` (weight 1.0), ranked by BM25.
- Post-ranking: path/heading hits get a bonus, and a chunk that matched only through its path is demoted rather than dropped.
- At most two chunks per document in one result set, so one long file cannot fill the page.

## git

- Space settings and manifest are versioned with the folder’s repository, so another machine can reproduce the space.
- The index stays local: it is derived data and changes completely on rebuild.
- **Auto-commit** is off by default. When enabled, a finished index run runs `git add` and `git commit` limited to `.dsh-knowledge-space/`. It never pushes, resets, or cleans.
- The panel only reads `git status`; all write operations are the explicit buttons you press.

## Agent integration

- `knowledge_search` — ranked snippets with paths, heading, locator and sensitivity flag.
- `knowledge_spaces` — configured spaces with document/chunk counts and last index time.
- The system prompt gains a short section describing the spaces (toggle in Settings or with the `promptHint` config field). Automatic retrieval on every message is intentionally not implemented.

## Security and privacy

- No network requests. The plugin never calls an LLM or a remote index.
- The panel’s HTTP routes accept loopback connections only and reject cross-origin writes.
- Sensitive path patterns mark results; turn **Index sensitive paths** off to keep those files out entirely.
- Removing a space deletes its index and registry entry only. Files on disk and git history are untouched.

## Requirements

- DSH `0.2.2-rc.3` or newer within the `0.2` line.
- Node 24+ (`node:sqlite` is unflagged there); DSH Desktop bundles it.
- `unpdf` is the only runtime dependency.
