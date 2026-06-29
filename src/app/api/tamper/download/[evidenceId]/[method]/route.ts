import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getDb } from '@/server/db/connection';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evidenceId: string; method: string }> },
) {
  try {
    const { evidenceId, method } = await params;
    const db = getDb();
    const row = db
      .prepare(
        `SELECT tampered_file_path FROM tampered_images
         WHERE evidence_id = ? AND tamper_method = ?
         ORDER BY id DESC LIMIT 1`,
      )
      .get(evidenceId, method) as { tampered_file_path: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Tampered image not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(row.tampered_file_path);
    const filename = path.basename(row.tampered_file_path);
    const contentType = filename.toLowerCase().endsWith('.png')
      ? 'image/png'
      : filename.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
