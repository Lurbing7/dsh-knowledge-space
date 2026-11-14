const SENSITIVE_NOTE =
  'Results marked "sensitive" match the space’s sensitive-path patterns (for example private/). Do not quote them unless the user asked about that material.';

function formatResults(payload) {
  const { query, results, space } = payload;
  if (!results || results.length === 0) {
    return `No matches for "${query}"${space ? ` in knowledge space "${space}"` : ''}. Try shorter keywords, or check that the document has been indexed.`;
  }
  const lines = [`${results.length} match(es) for "${query}" in the local knowledge spaces, best first:`];
  results.forEach((item, index) => {
    const location = [item.rel, item.locator].filter(Boolean).join(' · ');
    const heading = item.heading ? ` [${item.heading}]` : '';
    const flag = item.sensitive ? ' (sensitive)' : '';
    lines.push(`\n${index + 1}. ${location}${heading}${flag}  score ${item.score}`);
    lines.push(`   ${String(item.snippet).replace(/\s+/g, ' ')}`);
  });
  lines.push(
    `\nThese are snippets. Read the file by its path (relative to the space root) when you need the full context. ${SENSITIVE_NOTE}`,
  );
  return lines.join('\n');
}

export function registerTools(ctx, manager) {
  const disposers = [];

  disposers.push(
    ctx.tools.register({
      name: 'knowledge_search',
      description:
        "Search the user's local knowledge spaces (indexed Markdown/PDF/Word/Excel files) and return ranked snippets with file paths. Use it before answering questions about the user's own notes, projects, or documents.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Keywords or a short phrase. Chinese and English are both supported; shorter terms recall better than whole sentences.',
          },
          space: {
            type: 'string',
            description: 'Knowledge space name or id. Omit to search every space.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum snippets to return, 1-20. Default 6.',
          },
        },
        required: ['query'],
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
      },
      execute: async (args = {}) => {
        const query = String(args.query ?? '').trim();
        if (query === '') return 'query must not be empty.';
        const limit = Math.min(20, Math.max(1, Number(args.limit) || 6));
        await manager.init();
        const spaces = manager.store.list();
        if (spaces.length === 0) {
          return 'No knowledge space is configured yet. The user can add a local folder in the sidebar panel "Knowledge spaces" and run "Reindex".';
        }

        let targetId;
        const wanted = String(args.space ?? '').trim().toLowerCase();
        if (wanted !== '') {
          const match = spaces.find(
            (space) => space.id.toLowerCase() === wanted || space.name.toLowerCase() === wanted,
          );
          if (!match) {
            return `No knowledge space named "${args.space}". Available: ${spaces.map((s) => s.name).join(', ')}.`;
          }
          targetId = match.id;
        }

        if (targetId) return formatResults(await manager.search(targetId, query, { limit }));
        return formatResults({ query, results: await manager.searchAll(query, { limit }), space: '' });
      },
    }),
  );

  disposers.push(
    ctx.tools.register({
      name: 'knowledge_spaces',
      description:
        "List the user's configured knowledge spaces with their root directory, indexed file/chunk counts and last index time.",
      parameters: { type: 'object', properties: {} },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
      },
      execute: async () => {
        await manager.init();
        const spaces = await manager.listStatus();
        if (spaces.length === 0) return 'No knowledge space is configured.';
        const lines = ['Configured knowledge spaces:'];
        for (const space of spaces) {
          const counts = space.counts ?? { files: 0, chunks: 0 };
          const indexed = space.lastIndexedAt ? `last indexed ${space.lastIndexedAt}` : 'not indexed yet';
          const job = space.job?.running ? ', indexing now' : '';
          lines.push(
            `- ${space.name} (id: ${space.id})\n  root: ${space.root}\n  ${counts.files} documents / ${counts.chunks} chunks, ${indexed}${job}`,
          );
        }
        return lines.join('\n');
      },
    }),
  );

  return () => {
    for (const dispose of disposers) dispose();
  };
}
