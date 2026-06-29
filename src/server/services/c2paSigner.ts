import { Builder, LocalSigner, Reader } from '@contentauth/c2pa-node';
import fs from 'fs/promises';
import path from 'path';
import { CERTS_DIR, UPLOADS_DIR } from '@/server/config';
import { sha256File } from './hash';
import type { EvidenceJson } from '@/lib/types';

export interface SignResult {
  signedFileHash: string;
  signedFilePath: string;
  manifestLabel: string;
}

export async function signImage(
  evidenceJson: EvidenceJson,
  originalFilePath: string,
): Promise<SignResult> {
  const evidenceId = evidenceJson.evidenceId;

  const certBuf = await fs.readFile(path.join(CERTS_DIR, 'cert.pem'));
  const keyBuf = await fs.readFile(path.join(CERTS_DIR, 'private.key'));
  const signer = LocalSigner.newSigner(certBuf, keyBuf, 'es256');

  const mimeType = evidenceJson.media.mimeType;
  const formatMap: Record<string, string> = {
    'image/jpeg': 'image/jpeg',
    'image/png': 'image/png',
    'image/webp': 'image/webp',
  };
  const format = formatMap[mimeType] ?? 'image/jpeg';

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  const extension = extMap[format] ?? 'jpg';

  const builder = Builder.withJson({
    claim_generator_info: [{
      name: 'Original Pictures Evidence Agent',
      version: '1.0',
    }],
    format,
    assertions: [],
    resources: { resources: {} },
  });

  builder.addAssertion('c2pa.actions', { actions: [{ action: 'c2pa.created' }] });
  builder.addAssertion('org.originalpictures.evidence', evidenceJson);

  const outputDir = path.join(UPLOADS_DIR, 'signed');
  await fs.mkdir(outputDir, { recursive: true });
  const signedFilePath = path.join(outputDir, `${evidenceId}.${extension}`);

  await builder.sign(signer, { path: originalFilePath }, { path: signedFilePath });

  const signedFileHash = await sha256File(signedFilePath);

  const reader = await Reader.fromAsset({ path: signedFilePath });
  let manifestLabel = evidenceId;
  if (reader) {
    const active = reader.getActive();
    if (active?.label) {
      manifestLabel = active.label;
    }
  }

  return {
    signedFileHash,
    signedFilePath,
    manifestLabel,
  };
}
