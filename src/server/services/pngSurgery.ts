import { readFile, writeFile } from 'fs/promises';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const C2PA_CHUNK_TYPES = new Set(['caBX', 'C2PA', 'C2CI', 'C2CS']);

interface PngChunk {
  type: string;
  offset: number;
  bytes: Buffer;
}

function parsePngChunks(buf: Buffer): PngChunk[] {
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error('Not a PNG file');
  }

  const chunks: PngChunk[] = [];
  let i = 8;

  while (i < buf.length) {
    if (i + 12 > buf.length) break;
    const length = buf.readUInt32BE(i);
    const type = buf.toString('ascii', i + 4, i + 8);
    if (i + 12 + length > buf.length) break;
    chunks.push({
      type,
      offset: i,
      bytes: buf.subarray(i, i + 12 + length),
    });
    i += 12 + length;
  }

  return chunks;
}

/**
 * Extract every C2PA chunk (caBX, C2PA, C2CI, C2CS) from a PNG file.
 */
export async function extractC2paChunks(filePath: string): Promise<Buffer[]> {
  const buf = await readFile(filePath);
  const chunks = parsePngChunks(buf);
  return chunks.filter((c) => C2PA_CHUNK_TYPES.has(c.type)).map((c) => c.bytes);
}

/**
 * Inject C2PA chunks into a PNG file just before the first IDAT chunk.
 */
export async function injectC2paChunks(
  inputPath: string,
  chunks: Buffer[],
  outputPath: string,
): Promise<void> {
  const buf = await readFile(inputPath);
  const parsed = parsePngChunks(buf);

  const idatIndex = parsed.findIndex((c) => c.type === 'IDAT');
  if (idatIndex === -1) {
    throw new Error(`No IDAT chunk found in ${inputPath}`);
  }

  const insertAt = parsed[idatIndex].offset;
  const before = buf.subarray(0, insertAt);
  const after = buf.subarray(insertAt);
  const out = Buffer.concat([before, ...chunks, after]);

  await writeFile(outputPath, out);
}
