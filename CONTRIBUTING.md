# Contributing

Thanks for looking. This plugin is plain ESM — there is no build step, so what you edit is what DSH loads.

## Setup

```sh
git clone https://github.com/Lurbing7/dsh-knowledge-space
cd dsh-knowledge-space
pnpm install
pnpm check     # syntax, manifest, translation coverage
pnpm test      # node:test suite
```

Requires Node 24 or newer (`node:sqlite` is unflagged there).

To try it in a profile:

```sh
dsh plugin --profile dev add ./dsh-knowledge-space
dsh --profile dev
```

## Layout

```
index.js            host entry: wires config, routes, tools, prompt
client.js           browser half: panel + sidebar icon + dictionaries
host/
  api.js            loopback HTTP routes the panel calls
  chunk.js          heading-aligned chunking
  config.js         Config schema and deployment defaults
  db.js             the only module that knows node:sqlite
  extract.js        md/txt/pdf/docx/xlsx -> sections
  git.js            status and scoped commit (never pushes)
  ingest.js         walk, incremental index, manifest
  manager.js        space registry + index lifecycle
  search.js         BM25 post-ranking, snippets
  tokenize.js       CJK bigrams + Latin words, FTS query builder
  tools.js          knowledge_search / knowledge_spaces
  util.js           paths, hashing, encoding, sensitive patterns
  zip.js            minimal OOXML ZIP reader with limits
docs/               DETAIL (en/zh) and ROADMAP
test/               node:test suites and fixtures
```

## Expectations for a change

- Keep `core` behaviour (tokenizer, chunker, ranking, extraction) covered by `node:test`. A bug fix without a failing-then-passing test will be asked for one.
- Any new tunable belongs in `host/config.js` or the per-space settings, not in a constant.
- New user-visible text goes through the dictionaries in `client.js` (English and Chinese) and through `locale/*.json` for plugin metadata. `pnpm check` fails when a key is missing from the English dictionary.
- New formats get an `extract.js` branch, a limits check, and a test fixture.
- Do not add network calls. The plugin is local-only by design.

## Commits and releases

Use short imperative commit subjects (`fix: keep page locators after chunking`). Update `CHANGELOG.md` under `Unreleased`. Releases are tagged `vX.Y.Z` and published to npm from that tag.
