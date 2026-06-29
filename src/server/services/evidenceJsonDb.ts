import { getDb } from '@/server/db/connection';
import type { EvidenceJson } from '@/lib/types';

export function insertEvidenceJson(evidenceId: string, fileId: string, evidenceJson: EvidenceJson): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO evidence_json (evidence_id, file_id, mode, media, capture, journalism, inspection, integrity)
    VALUES (@evidenceId, @fileId, @mode, @media, @capture, @journalism, @inspection, @integrity)
  `).run({
    evidenceId,
    fileId,
    mode: evidenceJson.mode,
    media: JSON.stringify(evidenceJson.media),
    capture: JSON.stringify(evidenceJson.capture),
    journalism: evidenceJson.journalism ? JSON.stringify(evidenceJson.journalism) : null,
    inspection: evidenceJson.inspection ? JSON.stringify(evidenceJson.inspection) : null,
    integrity: JSON.stringify(evidenceJson.integrity),
  });
}

export function getEvidenceJson(evidenceId: string): EvidenceJson | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM evidence_json WHERE evidence_id = ?').get(evidenceId) as any;
  if (!row) return null;

  return {
    evidenceId: row.evidence_id,
    mode: row.mode,
    media: JSON.parse(row.media),
    capture: JSON.parse(row.capture),
    journalism: row.journalism ? JSON.parse(row.journalism) : null,
    inspection: row.inspection ? JSON.parse(row.inspection) : null,
    integrity: JSON.parse(row.integrity),
  };
}

export function getEvidenceJsonByFileId(fileId: string): EvidenceJson | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM evidence_json WHERE file_id = ? ORDER BY created_at DESC LIMIT 1').get(fileId) as any;
  if (!row) return null;

  return {
    evidenceId: row.evidence_id,
    mode: row.mode,
    media: JSON.parse(row.media),
    capture: JSON.parse(row.capture),
    journalism: row.journalism ? JSON.parse(row.journalism) : null,
    inspection: row.inspection ? JSON.parse(row.inspection) : null,
    integrity: JSON.parse(row.integrity),
  };
}
