# Security policy

## Scope

`dsh-knowledge-space` runs inside the DSH host process and reads folders you point it at. It makes **no network requests**: PDF/Office parsing, tokenizing, indexing and search are all local.

The panel talks to the host over loopback-only HTTP routes (`/dsh-knowledge-space/*`). Those routes reject non-loopback peers and cross-origin writes; they are not exposed through DSH remote access.

## What counts as a vulnerability

- Reading or writing files outside the configured space root.
- Path traversal through uploads, the directory picker, or the manifest.
- Executing content from an indexed document (for example a DOCX macro or an embedded script).
- Denial of service that survives limits (zip bombs, pathological PDFs) — please include the file.
- Leaking indexed content to another origin, another user, or a network endpoint.
- Privilege escalation through the plugin's tools.

## Reporting

Open a private security advisory on GitHub (Security → Report a vulnerability) or email the maintainer listed in `package.json`. Please do not open a public issue for a working exploit.

We aim to acknowledge within a few days and to ship a patch release for confirmed issues.

## Supported versions

The latest minor version receives fixes. The plugin requires DSH `0.2.2-rc.3` or newer and Node 24 or newer.
