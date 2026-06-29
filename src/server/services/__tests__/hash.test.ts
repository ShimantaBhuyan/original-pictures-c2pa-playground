import { describe, it, expect, beforeAll } from 'vitest';
import { sha256File } from '../hash';
import path from 'path';
import fs from 'fs';

describe('sha256File', () => {
  const filePath = path.resolve('uploads/originals/test.jpg');

  beforeAll(() => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'known test content');
  });

  it('computes the correct sha256 for a known file', async () => {
    const hash = await sha256File(filePath);
    expect(hash).toBe('7914fe7f48da9dac73c309b1012481bd3932da876438ca54bc3dd817a4514155');
  });

  it('rejects for a missing file', async () => {
    await expect(sha256File('/nonexistent/file.jpg')).rejects.toThrow();
  });
});
