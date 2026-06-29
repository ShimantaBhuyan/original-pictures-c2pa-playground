import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { UPLOADS_DIR } from '@/server/config';
import { evidenceRequestSchema } from '@/server/services/evidenceSchema';
import { computeFileFacts } from '@/server/services/fileFacts';
import { insertEvidenceJson } from '@/server/services/evidenceJsonDb';
import type { EvidenceJson, CaptureInfo } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = evidenceRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, { status: 400 });
    }

    const { fileId, evidenceId, mode, capture, journalism, inspection } = parsed.data;

    const originalsDir = path.join(UPLOADS_DIR, 'originals');
    let originalPath: string | null = null;
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];
    for (const ext of extensions) {
      const candidate = path.join(originalsDir, `${fileId}.${ext}`);
      try {
        await fs.access(candidate);
        originalPath = candidate;
        break;
      } catch {
        continue;
      }
    }

    if (!originalPath) {
      return NextResponse.json({ error: 'Original file not found' }, { status: 404 });
    }

    const media = await computeFileFacts(originalPath);

    const now = new Date().toISOString();

    const hasUserGps = capture?.gps?.lat != null && capture?.gps?.lng != null;
    const hasExifGps = media.exifGpsLat != null && media.exifGpsLng != null;

    const mergedCapture: CaptureInfo = {
      capturedAt: capture?.capturedAt ?? media.exifTimestamp ?? null,
      gps: {
        lat: capture?.gps?.lat ?? media.exifGpsLat ?? null,
        lng: capture?.gps?.lng ?? media.exifGpsLng ?? null,
        source: hasUserGps ? 'user' : hasExifGps ? 'exif' : 'unknown',
        confidence: hasUserGps ? 'high' : hasExifGps ? 'high' : 'none',
      },
      cameraHeadingDegrees: capture?.cameraHeadingDegrees ?? null,
      cameraDirectionText: capture?.cameraDirectionText ?? null,
    };

    const evidenceJson: EvidenceJson = {
      evidenceId,
      mode,
      media,
      capture: mergedCapture,
      journalism: mode === 'journalism' ? journalism! : null,
      inspection: mode === 'inspection' ? inspection! : null,
      integrity: {
        schemaVersion: '1.0',
        createdBy: 'Original Pictures Evidence Agent',
        createdAt: now,
      },
    };

    insertEvidenceJson(evidenceId, fileId, evidenceJson);

    return NextResponse.json(evidenceJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
