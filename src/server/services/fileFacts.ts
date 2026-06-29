import sharp from 'sharp';
import fs from 'fs/promises';
import * as ExifReader from 'exifreader';
import { sha256File } from './hash';
import type { MediaFacts } from '@/lib/types';

export async function computeFileFacts(filePath: string): Promise<MediaFacts> {
  const [sha256, stat, metadata, fileBuffer] = await Promise.all([
    sha256File(filePath),
    fs.stat(filePath),
    sharp(filePath).metadata(),
    fs.readFile(filePath),
  ]);

  const mimeMap: Record<string, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const mimeType = mimeMap[metadata.format ?? ''] ?? 'image/jpeg';

  const exif = extractExif(fileBuffer);

  return {
    sha256,
    mimeType,
    fileSizeBytes: stat.size,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    exifTimestamp: exif.timestamp,
    exifGpsLat: exif.gpsLat,
    exifGpsLng: exif.gpsLng,
  };
}

interface ParsedExif {
  timestamp: string | null;
  gpsLat: number | null;
  gpsLng: number | null;
}

interface ExifTag {
  value?: unknown;
  description?: unknown;
}

interface ExifReaderTags {
  exif?: Record<string, ExifTag>;
  gps?: { Latitude?: number; Longitude?: number };
}

function extractExif(buffer: Buffer): ParsedExif {
  try {
    const tags = ExifReader.load(buffer, { expanded: true }) as ExifReaderTags | null;
    console.log({tags});
    if (!tags || typeof tags !== 'object') {
      return { timestamp: null, gpsLat: null, gpsLng: null };
    }

    const timestamp = parseExifDate(getDescription(tags.exif?.DateTimeOriginal))
      ?? parseExifDate(getDescription(tags.exif?.DateTimeDigitized))
      ?? parseExifDate(getDescription(tags.exif?.DateTime))
      ?? null;

    const lat = typeof tags.gps?.Latitude === 'number' ? tags.gps.Latitude : null;
    const lng = typeof tags.gps?.Longitude === 'number' ? tags.gps.Longitude : null;

    return { timestamp, gpsLat: lat, gpsLng: lng };
  } catch {
    return { timestamp: null, gpsLat: null, gpsLng: null };
  }
}

function getDescription(tag: ExifTag | undefined): unknown {
  if (!tag) return undefined;
  if (tag.description !== undefined) return tag.description;
  return tag.value;
}

function parseExifDate(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`;
}
