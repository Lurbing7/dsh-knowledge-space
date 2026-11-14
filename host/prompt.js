/**
 * Optional prompt hint: tells the model which knowledge spaces exist and that
 * `knowledge_search` is the way in. Users can turn it off in the panel or with
 * the `promptHint` config field.
 */
export function registerPrompt(ctx, manager) {
  const systemPrompt = ctx.get?.('systemPrompt');
  if (!systemPrompt?.section) return () => {};

  return systemPrompt.section({
    name: 'knowledge-space',
    order: 760,
    text: () => {
      if (manager.store.settings?.promptHint === false) return '';
      const spaces = manager.store.list().filter((space) => !space.missing);
      if (spaces.length === 0) return '';
      const lines = ['# Local knowledge spaces', '', 'These local document libraries are indexed on this machine:'];
      for (const space of spaces) {
        const db = manager.dbs.get(space.id);
        let stats = '';
        try {
          if (db) stats = `, ${db.countDocs()} documents / ${db.countChunks()} chunks indexed`;
        } catch {
          /* stats are optional */
        }
        lines.push(`- ${space.name}: ${space.root}${stats}`);
      }
      lines.push(
        '',
        'When a question concerns the user’s own notes, projects or local documents, **call `knowledge_search` first**, then read the returned relative path for the full text. Do not guess what the library contains.',
        'When citing, give the relative path (and page/heading when available) and separate "the library says" from your own additions.',
        'Results marked sensitive (for example `private/`) are the user’s private material; do not surface them unless the user asked about that material.',
      );
      return lines.join('\n');
    },
  });
}
