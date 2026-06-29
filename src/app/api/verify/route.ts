import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { UPLOADS_DIR } from '@/server/config';
import { verifyImage } from '@/server/services/c2paVerifier';
import { getTamperedImageByEvidenceIdAndMethod } from '@/server/services/tamperedImagesDb';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('image') as File | null;
    const evidenceId = formData.get('evidenceId') as string | null;
    const tamperMethod = formData.get('tamperMethod') as string | null;

    let savePath: string;

    if (evidenceId && tamperMethod) {
      const knownTamper = getTamperedImageByEvidenceIdAndMethod(evidenceId, tamperMethod);
      if (!knownTamper) {
        return NextResponse.json({ error: 'Tampered image not found for this record and method' }, { status: 404 });
      }
      savePath = knownTamper.tamperedFilePath;
    } else if (file) {
      const verifyDir = path.join(UPLOADS_DIR, 'verify');
      await fs.mkdir(verifyDir, { recursive: true });

      const fileId = uuidv4();
      const extMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
      };
      const ext = extMap[file.type] ?? 'jpg';
      savePath = path.join(verifyDir, `${fileId}.${ext}`);

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(savePath, buffer);
    } else {
      return NextResponse.json({ error: 'No file or evidenceId+tamperMethod provided' }, { status: 400 });
    }

    const result = await verifyImage(savePath);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
