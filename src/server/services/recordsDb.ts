import { getDb } from '@/server/db/connection';
import type { EvidenceRecord } from '@/lib/types';

export function insertRecord(record: EvidenceRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO evidence_records (evidence_id, mode, original_file_hash, signed_file_hash,
      signed_file_path, manifest_label, claim_generator, signature_status,
      validation_errors, extracted_evidence_json)
    VALUES (@evidenceId, @mode, @originalFileHash, @signedFileHash,
      @signedFilePath, @manifestLabel, @claimGenerator, @signatureStatus,
      @validationErrors, @extractedEvidenceJson)
  `).run({
    ...record,
    validationErrors: JSON.stringify(record.validationErrors),
    extractedEvidenceJson: record.extractedEvidenceJson ? JSON.stringify(record.extractedEvidenceJson) : null,
  });
}

export function getAllRecords(): EvidenceRecord[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM evidence_records ORDER BY created_at DESC').all() as any[];
  return rows.map(rowToRecord);
}

export function getRecordByEvidenceId(evidenceId: string): EvidenceRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM evidence_records WHERE evidence_id = ?').get(evidenceId) as any;
  return row ? rowToRecord(row) : null;
}

function rowToRecord(row: any): EvidenceRecord {
  return {
    evidenceId: row.evidence_id,
    mode: row.mode,
    originalFileHash: row.original_file_hash,
    signedFileHash: row.signed_file_hash,
    signedFilePath: row.signed_file_path,
    manifestLabel: row.manifest_label,
    claimGenerator: row.claim_generator,
    signatureStatus: row.signature_status,
    validationErrors: JSON.parse(row.validation_errors),
    extractedEvidenceJson: row.extracted_evidence_json ? JSON.parse(row.extracted_evidence_json) : null,
    createdAt: row.created_at,
  };
}
