import { readFile, writeFile } from 'fs/promises';

/**
 * Extract every APP11 (0xFF EB) segment from a JPEG file.
 * C2PA manifest stores are embedded in APP11 markers.
 */
export async function extractApp11Segments(filePath: string): Promise<Buffer[]> {
  const buf = await readFile(filePath);
  const segments: Buffer[] = [];
  let i = 0;

  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error(`Not a JPEG file: ${filePath}`);
  }
  i = 2;

  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }

    // Stuffed 0xFF 00 bytes inside scan data are data, not markers.
    if (buf[i + 1] === 0x00) {
      i += 2;
      continue;
    }

    // Padding FFs.
    if (buf[i + 1] === 0xff) {
      i++;
      continue;
    }

    const marker = buf[i + 1];

    // Standalone markers.
    if (marker === 0xd8) {
      // SOI
      i += 2;
      continue;
    }
    if (marker === 0xd9) {
      // EOI
      break;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      // RST markers inside scan data.
      i += 2;
      continue;
    }

    if (i + 3 >= buf.length) break;
    const len = buf.readUInt16BE(i + 2);

    if (marker === 0xeb) {
      segments.push(buf.subarray(i, i + 2 + len));
    }

    if (marker === 0xda) {
      // SOS: skip the header, then the entropy-coded scan data.
      i += 2 + len;
      while (i < buf.length) {
        if (buf[i] === 0xff && buf[i + 1] !== 0x00 && buf[i + 1] !== 0xff) {
          break;
        }
        i++;
      }
    } else {
      i += 2 + len;
    }
  }

  return segments;
}

/**
 * Inject APP11 segments into a JPEG file just before the SOS (Start Of Scan)
 * marker. APP segments are required to appear between SOI and SOS, so this
 * is the safest insertion point.
 */
export async function injectApp11Segments(
  inputPath: string,
  segments: Buffer[],
  outputPath: string,
): Promise<void> {
  const buf = await readFile(inputPath);
  let i = 0;

  if (buf.length < 2 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error(`Not a JPEG file: ${inputPath}`);
  }
  i = 2;

  let insertAt = -1;

  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    if (buf[i + 1] === 0x00) {
      i += 2;
      continue;
    }
    if (buf[i + 1] === 0xff) {
      i++;
      continue;
    }

    const marker = buf[i + 1];

    if (marker === 0xd9) break; // EOI
    if (marker === 0xd8) {
      i += 2;
      continue;
    }
    if (marker >= 0xd0 && marker <= 0xd7) {
      i += 2;
      continue;
    }

    if (marker === 0xda) {
      insertAt = i;
      break;
    }

    if (i + 3 >= buf.length) break;
    const len = buf.readUInt16BE(i + 2);
    i += 2 + len;
  }

  if (insertAt === -1) {
    throw new Error(`No SOS marker found in ${inputPath}`);
  }

  const before = buf.subarray(0, insertAt);
  const after = buf.subarray(insertAt);
  const out = Buffer.concat([before, ...segments, after]);

  await writeFile(outputPath, out);
}
