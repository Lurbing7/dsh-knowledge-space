const TARGET_CHARS = 900;
const MAX_CHARS = 1500;

/**
 * Split Markdown-like text into heading-aligned chunks.
 * `locator` carries a page or sheet label; `heading` is the full heading path.
 */
export function chunkText(text, { locator = '' } = {}) {
  const lines = String(text ?? '').split(/\r?\n/);
  const chunks = [];
  let stack = [];
  let buffer = [];
  let bufferChars = 0;
  let block = [];

  const headingPath = () => stack.map((h) => h.text).join(' > ');

  const flush = () => {
    const body = buffer.join('\n').trim();
    buffer = [];
    bufferChars = 0;
    if (body === '') return;
    const heading = headingPath();
    for (const piece of splitLarge(body)) {
      chunks.push({ heading, locator, text: piece });
    }
  };

  const addBlock = () => {
    if (block.length === 0) return;
    const body = block.join('\n').trim();
    block = [];
    if (body === '') return;
    buffer.push(body);
    bufferChars += body.length + 1;
    if (bufferChars >= TARGET_CHARS) flush();
  };

  for (const line of lines) {
    if (line.trim() === '') {
      addBlock();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      addBlock();
      flush();
      const level = heading[1].length;
      stack = stack.filter((h) => h.level < level);
      stack.push({ level, text: heading[2].trim() });
      continue;
    }
    block.push(line);
  }
  addBlock();
  flush();
  return chunks;
}

function splitLarge(text) {
  if (text.length <= MAX_CHARS) return [text];
  const sentences = text.split(/(?<=[。！？!?；;\n])/);
  const pieces = [];
  let current = '';
  for (const sentence of sentences) {
    if (current.length + sentence.length > MAX_CHARS && current !== '') {
      pieces.push(current.trim());
      current = '';
    }
    if (sentence.length > MAX_CHARS) {
      for (let i = 0; i < sentence.length; i += MAX_CHARS) {
        pieces.push(sentence.slice(i, i + MAX_CHARS).trim());
      }
      continue;
    }
    current += sentence;
  }
  if (current.trim() !== '') pieces.push(current.trim());
  return pieces.filter(Boolean);
}
