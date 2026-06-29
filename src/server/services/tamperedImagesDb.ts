import { getDb } from '@/server/db/connection';

export interface TamperedImageRow {
  evidenceId: string;
  tamperedFilePath: string;
  tamperedFileHash: string;
  tamperMethod: string;
  tamperParams: string;
}

export function getTamperedImageByHash(hash: string): TamperedImageRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT evidence_id as evidenceId, tampered_file_path as tamperedFilePath,
              tampered_file_hash as tamperedFileHash, tamper_method as tamperMethod,
              tamper_params as tamperParams
       FROM tampered_images
       WHERE tampered_file_hash = ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(hash) as any;
  return row ?? null;
}

export function getTamperedImageByEvidenceIdAndMethod(
  evidenceId: string,
  method: string,
): TamperedImageRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT evidence_id as evidenceId, tampered_file_path as tamperedFilePath,
              tampered_file_hash as tamperedFileHash, tamper_method as tamperMethod,
              tamper_params as tamperParams
       FROM tampered_images
       WHERE evidence_id = ? AND tamper_method = ?
       ORDER BY id DESC LIMIT 1`,
    )
    .get(evidenceId, method) as any;
  return row ?? null;
}
