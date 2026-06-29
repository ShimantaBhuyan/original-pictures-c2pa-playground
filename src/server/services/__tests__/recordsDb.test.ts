import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import type { EvidenceRecord } from '@/lib/types';

const TEST_DB = '/tmp/test_evidence_c2pa.db';

beforeAll(() => {
  process.env.DB_PATH = TEST_DB;
});

afterAll(() => {
  try { fs.unlinkSync(TEST_DB); } catch { /* ignore */ }
  try { fs.unlinkSync(TEST_DB + '-wal'); } catch { /* ignore */ }
  try { fs.unlinkSync(TEST_DB + '-shm'); } catch { /* ignore */ }
});

function makeRecord(evidenceId: string): EvidenceRecord {
  return {
    evidenceId,
    mode: 'journalism',
    originalFileHash: 'a'.repeat(64),
    signedFileHash: 'b'.repeat(64),
    signedFilePath: `/tmp/${evidenceId}.jpg`,
    manifestLabel: evidenceId,
    claimGenerator: 'Test/1.0',
    signatureStatus: 'valid',
    validationErrors: [],
    extractedEvidenceJson: null,
    createdAt: new Date().toISOString(),
  };
}

describe('recordsDb', () => {
  it('inserts a record and retrieves it by evidenceId', async () => {
    const { insertEvidenceJson } = await import('../evidenceJsonDb');
    const { insertRecord, getRecordByEvidenceId } = await import('../recordsDb');
    const evidenceId = 'ev_test_999';
    insertEvidenceJson(evidenceId, 'file_test_999', {
      mode: 'journalism',
      media: {
        sha256: 'a'.repeat(64),
        mimeType: 'image/jpeg',
        fileSizeBytes: 1000,
        width: 100,
        height: 100,
        exifTimestamp: null,
        exifGpsLat: null,
        exifGpsLng: null,
      },
      capture: {
        capturedAt: null,
        gps: { lat: null, lng: null, source: 'unknown', confidence: 'none' },
        device: null,
      },
      integrity: { originalHash: 'a'.repeat(64), algorithm: 'sha256' },
      journalism: {
        subject: 'Test subject',
        context: 'Test context',
        sourceStatement: 'Test source',
        verification: { witnessed: true, verifiedBy: 'Tester' },
      },
    });
    const rec = makeRecord(evidenceId);
    insertRecord(rec);
    const retrieved = getRecordByEvidenceId(evidenceId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.evidenceId).toBe(evidenceId);
    expect(retrieved!.mode).toBe('journalism');
    expect(retrieved!.originalFileHash).toBe('a'.repeat(64));
  });

  it('returns null for a non-existent evidenceId', async () => {
    const { getRecordByEvidenceId } = await import('../recordsDb');
    const retrieved = getRecordByEvidenceId('ev_nonexistent');
    expect(retrieved).toBeNull();
  });
});
