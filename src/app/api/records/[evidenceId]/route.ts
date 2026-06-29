import { NextRequest, NextResponse } from 'next/server';
import { getRecordByEvidenceId } from '@/server/services/recordsDb';
import { extractManifestJson } from '@/server/services/c2paReader';

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

    const manifestJson = record.signedFilePath
      ? await extractManifestJson(record.signedFilePath)
      : null;

    return NextResponse.json({ ...record, manifestJson });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
