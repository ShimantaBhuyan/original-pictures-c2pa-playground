import { NextRequest, NextResponse } from 'next/server';
import { getRecordByEvidenceId } from '@/server/services/recordsDb';
import { tamperImage, type TamperMethod } from '@/server/services/tamperService';
import { getDb } from '@/server/db/connection';
import type { TamperResponse } from '@/lib/types';

const VALID_METHODS: TamperMethod[] = ['pixel_text', 'crop', 'manifest_strip'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { evidenceId, method, params } = body;

    if (!evidenceId || typeof evidenceId !== 'string') {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }

    if (!method || !VALID_METHODS.includes(method)) {
      return NextResponse.json({ error: `method must be one of: ${VALID_METHODS.join(', ')}` }, { status: 400 });
    }

    const record = getRecordByEvidenceId(evidenceId);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const result = await tamperImage(evidenceId, record.signedFilePath, method as TamperMethod, params ?? {});

    const db = getDb();
    db.prepare(
      `INSERT INTO tampered_images (evidence_id, tampered_file_path, tampered_file_hash, tamper_method, tamper_params)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(evidenceId, result.tamperedFilePath, result.tamperedFileHash, method, JSON.stringify(params ?? {}));

    const response: TamperResponse = {
      tamperedFilePath: result.tamperedFilePath,
      tamperedFileHash: result.tamperedFileHash,
      method: result.method,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
