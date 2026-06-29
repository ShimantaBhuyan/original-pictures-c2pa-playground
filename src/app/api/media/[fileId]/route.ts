import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { UPLOADS_DIR } from '@/server/config';
import { computeFileFacts } from '@/server/services/fileFacts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    const originalsDir = path.join(UPLOADS_DIR, 'originals');

    let savePath: string | null = null;
    for (const ext of EXTENSIONS) {
      const candidate = path.join(originalsDir, `${fileId}.${ext}`);
      try {
        await fs.access(candidate);
        savePath = candidate;
        break;
      } catch {
        // continue
      }
    }

    if (!savePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const media = await computeFileFacts(savePath);
    return NextResponse.json({ fileId, media });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
