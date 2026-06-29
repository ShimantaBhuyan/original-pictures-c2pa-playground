import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { UPLOADS_DIR } from '@/server/config';
import { sha256File } from './hash';
import { extractApp11Segments, injectApp11Segments } from './jpegSurgery';
import { extractC2paChunks, injectC2paChunks } from './pngSurgery';

export type TamperMethod = 'pixel_text' | 'crop' | 'manifest_strip';

export interface TamperResult {
  tamperedFilePath: string;
  tamperedFileHash: string;
  method: TamperMethod;
}

function getFormatFromPath(filePath: string): 'jpeg' | 'png' | 'webp' {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'png';
  if (ext === '.webp') return 'webp';
  return 'jpeg';
}

function getOutputExt(format: 'jpeg' | 'png' | 'webp'): string {
  if (format === 'png') return 'png';
  if (format === 'webp') return 'webp';
  return 'jpg';
}

export async function tamperImage(
  evidenceId: string,
  signedFilePath: string,
  method: TamperMethod,
  params: Record<string, unknown> = {},
): Promise<TamperResult> {
  const format = getFormatFromPath(signedFilePath);
  const ext = getOutputExt(format);
  const outputDir = path.join(UPLOADS_DIR, 'tampered');
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${evidenceId}_${method}.${ext}`);

  // Methods that visually alter pixels but should keep the C2PA manifest
  // so verification reports "tampered" instead of "manifest_missing".
  const preserveManifest = method === 'pixel_text' || method === 'crop';

  switch (method) {
    case 'pixel_text': {
      const text = (params.text as string) || 'TAMPERED — FOR TESTING';
      const metadata = await sharp(signedFilePath).metadata();
      const width = metadata.width ?? 800;
      const height = metadata.height ?? 600;
      const fontSize = Math.max(20, Math.floor(Math.min(width, height) / 10));
      const overlay = Buffer.from(`
        <svg width="${width}" height="${height}">
          <rect width="100%" height="100%" fill="rgba(255,0,0,0.3)"/>
          <text x="50%" y="50%" text-anchor="middle" fill="red"
                font-size="${fontSize}" font-family="Arial" font-weight="bold"
                dominant-baseline="middle">${escapeXml(text)}</text>
        </svg>
      `);

      const tempPath = `${outputPath}.tmp`;
      const pipeline = sharp(signedFilePath)
        .composite([{ input: overlay, top: 0, left: 0 }])
        .withMetadata();

      if (format === 'png') await pipeline.png().toFile(tempPath);
      else if (format === 'webp') await pipeline.webp().toFile(tempPath);
      else await pipeline.jpeg().toFile(tempPath);

      if (preserveManifest) {
        await preserveC2paManifest(signedFilePath, tempPath, outputPath, format);
        await fs.unlink(tempPath);
      } else {
        await fs.rename(tempPath, outputPath);
      }
      break;
    }

    case 'crop': {
      const metadata = await sharp(signedFilePath).metadata();
      const w = metadata.width ?? 0;
      const h = metadata.height ?? 0;
      const margin = Math.floor(Math.min(w, h) * 0.1);

      const tempPath = `${outputPath}.tmp`;
      const pipeline = sharp(signedFilePath)
        .extract({
          left: margin,
          top: margin,
          width: w - margin * 2,
          height: h - margin * 2,
        })
        .withMetadata();

      if (format === 'png') await pipeline.png().toFile(tempPath);
      else if (format === 'webp') await pipeline.webp().toFile(tempPath);
      else await pipeline.jpeg().toFile(tempPath);

      if (preserveManifest) {
        await preserveC2paManifest(signedFilePath, tempPath, outputPath, format);
        await fs.unlink(tempPath);
      } else {
        await fs.rename(tempPath, outputPath);
      }
      break;
    }

    case 'manifest_strip': {
      const pipeline = sharp(signedFilePath);
      if (format === 'png') await pipeline.png().toFile(outputPath);
      else if (format === 'webp') await pipeline.webp().toFile(outputPath);
      else await pipeline.jpeg().toFile(outputPath);
      break;
    }

    default:
      throw new Error(`Unknown tamper method: ${method}`);
  }

  const tamperedFileHash = await sha256File(outputPath);

  return {
    tamperedFilePath: outputPath,
    tamperedFileHash,
    method,
  };
}

async function preserveC2paManifest(
  signedFilePath: string,
  tempPath: string,
  outputPath: string,
  format: 'jpeg' | 'png' | 'webp',
): Promise<void> {
  if (format === 'jpeg') {
    const segments = await extractApp11Segments(signedFilePath);
    await injectApp11Segments(tempPath, segments, outputPath);
    return;
  }

  if (format === 'png') {
    const chunks = await extractC2paChunks(signedFilePath);
    await injectC2paChunks(tempPath, chunks, outputPath);
    return;
  }

  // WebP: C2PA chunk structure is not reliably documented/supported by the
  // current tooling, so we fall back to copying the re-encoded file without
  // the manifest. Hash-based detection still identifies lab-generated tampers.
  await fs.rename(tempPath, outputPath);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
