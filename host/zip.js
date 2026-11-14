import { inflateRawSync } from 'node:zlib';
import { fail } from './util.js';

const DEFAULT_LIMITS = {
  maxEntries: 4000,
  maxEntryBytes: 64 * 1024 * 1024,
  maxTotalBytes: 256 * 1024 * 1024,
};

/**
 * Minimal ZIP reader for OOXML containers (.docx/.xlsx): walks the central
 * directory and inflates the entries we need. Sizes are checked before
 * inflating so a zip bomb fails with a readable error instead of exhausting
 * memory. ZIP64 archives are rejected explicitly.
 */
export function readZip(buffer, limits = {}) {
  const { maxEntries, maxEntryBytes, maxTotalBytes } = { ...DEFAULT_LIMITS, ...limits };
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const eocd = findEndOfCentralDirectory(buf);
  if (eocd < 0) throw fail('invalid_zip', 'Not a valid ZIP/OOXML file (no central directory)');
  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff) throw fail('zip64_unsupported', 'ZIP64 archives are not supported');
  if (count > maxEntries) throw fail('zip_too_many_entries', `Archive declares ${count} entries (limit ${maxEntries})`);

  const entries = new Map();
  let total = 0;
  let p = cdOffset;
  for (let i = 0; i < count; i += 1) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const uncompressedSize = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');

    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff) {
      throw fail('zip64_unsupported', 'ZIP64 archives are not supported');
    }
    if (uncompressedSize > maxEntryBytes) {
      throw fail('zip_entry_too_large', `Archive entry ${name} expands to ${uncompressedSize} bytes`);
    }
    total += uncompressedSize;
    if (total > maxTotalBytes) throw fail('zip_too_large', 'Archive expands beyond the readable limit');

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) break;
    const localNameLen = buf.readUInt16LE(localOffset + 26);
    const localExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) {
      entries.set(name, raw);
    } else if (method === 8) {
      entries.set(name, inflateRawSync(raw, { maxOutputLength: maxEntryBytes }));
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function findEndOfCentralDirectory(buf) {
  const min = Math.max(0, buf.length - 66 * 1024);
  for (let i = buf.length - 22; i >= min; i -= 1) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

export function zipText(entries, name) {
  const bytes = entries.get(name);
  return bytes ? bytes.toString('utf8') : undefined;
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeXml(text) {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (whole, name) => ENTITIES[name] ?? whole);
}
