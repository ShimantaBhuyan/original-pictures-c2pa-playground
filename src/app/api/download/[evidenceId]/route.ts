import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getRecordByEvidenceId } from '@/server/services/recordsDb';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  try {
    const { evidenceId } = await params;
    const record = getRecordByEvidenceId(evidenceId);
    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(record.signedFilePath);
    const filename = path.basename(record.signedFilePath);
    const contentType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

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
