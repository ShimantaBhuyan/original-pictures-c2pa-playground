import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { UPLOADS_DIR } from '@/server/config';
import { signImage } from '@/server/services/c2paSigner';
import { extractManifest, extractManifestJson } from '@/server/services/c2paReader';
import { sha256File } from '@/server/services/hash';
import { insertRecord } from '@/server/services/recordsDb';
import { getEvidenceJson } from '@/server/services/evidenceJsonDb';
import type { EvidenceRecord, EvidenceJson } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { evidenceId } = body;

    if (!evidenceId || typeof evidenceId !== 'string') {
      return NextResponse.json({ error: 'evidenceId is required' }, { status: 400 });
    }

    const evidenceJson = getEvidenceJson(evidenceId);
    if (!evidenceJson) {
      return NextResponse.json({ error: 'Evidence not found' }, { status: 404 });
    }

    const originalsDir = path.join(UPLOADS_DIR, 'originals');
    const files = await fs.readdir(originalsDir);
    let originalPath: string | null = null;
    for (const file of files) {
      const filePath = path.join(originalsDir, file);
      const hash = await sha256File(filePath);
      if (hash === evidenceJson.media.sha256) {
        originalPath = filePath;
        break;
      }
    }

    if (!originalPath) {
      return NextResponse.json({ error: 'Original file not found by hash' }, { status: 404 });
    }

    const signResult = await signImage(evidenceJson, originalPath);
    const signedHash = await sha256File(signResult.signedFilePath);
    const manifest = await extractManifest(signResult.signedFilePath);
    const manifestJson = await extractManifestJson(signResult.signedFilePath);

    const record: EvidenceRecord = {
      evidenceId,
      mode: evidenceJson.mode,
      originalFileHash: evidenceJson.media.sha256,
      signedFileHash: signedHash,
      signedFilePath: signResult.signedFilePath,
      manifestLabel: signResult.manifestLabel,
      claimGenerator: manifest?.claimGenerator ?? 'Original Pictures Evidence Agent',
      signatureStatus: manifest && manifest.isValid ? 'valid' : 'unknown',
      validationErrors: manifest?.errors ?? [],
      extractedEvidenceJson: evidenceJson,
      createdAt: new Date().toISOString(),
    };

    insertRecord(record);

    return NextResponse.json({
      evidenceId,
      signedFileHash: signedHash,
      signedFilePath: signResult.signedFilePath,
      manifestLabel: signResult.manifestLabel,
      manifestJson,
      evidenceJson,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
