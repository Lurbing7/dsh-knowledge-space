# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Align the panel with the host's page language: 960px content column with clamp insets, 20px/500 page title, pill section tabs, hairline-divided sections, 36px controls with `--dsw-alias-border-l3`, 28px chips, host modal mask and elevation tokens.

## [0.1.0] - 2026-11-14

### Added

- Knowledge spaces: a local folder plus a side SQLite index, created and managed from a sidebar panel.
- Markdown, TXT, PDF, Word (`.docx`) and Excel (`.xlsx`) extraction, including per-page and per-sheet citations.
- Chinese bigram tokenizer with BM25 ranking over SQLite FTS5; path and heading boosts.
- Incremental reindexing by size/mtime then content hash; deleted files leave the index.
- File and folder uploads into the space's upload directory, indexed automatically.
- `knowledge_search` and `knowledge_spaces` agent tools, plus an optional system-prompt section.
- Per-space settings, sensitive-path marking, and optional commit of `.dsh-knowledge-space/`.
- Bilingual UI (English and Chinese) and bilingual plugin metadata.
- Hard limits for file size, PDF pages, document characters, and OOXML expansion.
- Cross-platform directory picker (Windows drives, POSIX roots).
- Tests for tokenizer, chunking, ranking, extraction and the client bundle, plus a GitHub Actions workflow.
