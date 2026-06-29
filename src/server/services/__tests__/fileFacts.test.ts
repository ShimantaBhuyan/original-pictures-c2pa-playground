import { describe, it, expect, beforeAll } from 'vitest';
import { computeFileFacts } from '../fileFacts';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const TEST_JPEG = path.resolve('src/server/services/__tests__/__temp_test_image.jpg');

beforeAll(async () => {
  const img = sharp({ create: { width: 100, height: 80, channels: 3, background: { r: 200, g: 100, b: 50 } } });
  await img.jpeg().toFile(TEST_JPEG);
});

describe('computeFileFacts', () => {
  it('returns correct MediaFacts for a test JPEG', async () => {
    const facts = await computeFileFacts(TEST_JPEG);
    expect(facts.mimeType).toBe('image/jpeg');
    expect(facts.width).toBe(100);
    expect(facts.height).toBe(80);
    expect(facts.fileSizeBytes).toBeGreaterThan(0);
    expect(facts.sha256).toBeTruthy();
    expect(facts.sha256.length).toBe(64);
    expect(facts.exifTimestamp).toBeNull();
    expect(facts.exifGpsLat).toBeNull();
    expect(facts.exifGpsLng).toBeNull();
  });
});
