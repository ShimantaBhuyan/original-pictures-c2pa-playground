import { extractManifest } from './c2paReader';
import { sha256File } from './hash';
import { getRecordByEvidenceId } from './recordsDb';
import { getTamperedImageByHash } from './tamperedImagesDb';
import type { VerifyResult, VerificationStatus, ReasonCode } from '@/lib/types';

export async function verifyImage(filePath: string): Promise<VerifyResult> {
  const uploadedHash = await sha256File(filePath);
  const manifest = await extractManifest(filePath);

  if (!manifest) {
    const knownTamper = getTamperedImageByHash(uploadedHash);
    if (knownTamper) {
      return {
        uploadedFileStatus: 'tampered',
        matchedEvidenceId: knownTamper.evidenceId,
        matchedOriginalRecord: true,
        reasonCodes: ['C2PA_MANIFEST_MISSING', 'HASH_ASSERTION_MISMATCH'],
        originalSignedFileHash: null,
        uploadedTamperedFileHash: uploadedHash,
        tamperMethod: knownTamper.tamperMethod,
        message: `The C2PA manifest is missing and this file matches a known tampered copy generated with method '${knownTamper.tamperMethod}'.`,
      };
    }

    return {
      uploadedFileStatus: 'manifest_missing',
      matchedEvidenceId: null,
      matchedOriginalRecord: false,
      reasonCodes: ['C2PA_MANIFEST_MISSING'],
      originalSignedFileHash: null,
      uploadedTamperedFileHash: uploadedHash,
      message: 'No C2PA manifest was found. The file cannot be linked to a signed Original Pictures evidence record.',
    };
  }

  if (!manifest.evidenceId && !manifest.label) {
    return {
      uploadedFileStatus: 'manifest_invalid',
      matchedEvidenceId: null,
      matchedOriginalRecord: false,
      reasonCodes: ['C2PA_MANIFEST_PARSE_FAILED'],
      originalSignedFileHash: null,
      uploadedTamperedFileHash: uploadedHash,
      message: 'A C2PA manifest was found but could not be parsed. It may be malformed.',
    };
  }

  let status: VerificationStatus;
  const reasonCodes: ReasonCode[] = [];

  if (manifest.isValid) {
    status = 'verified';
  } else if (manifest.evidenceId) {
    status = 'tampered';
    reasonCodes.push('C2PA_SIGNATURE_INVALID');
    reasonCodes.push('HASH_ASSERTION_MISMATCH');
  } else {
    status = 'manifest_invalid';
    reasonCodes.push('C2PA_MANIFEST_PARSE_FAILED');
  }

  let matchedEvidenceId: string | null = null;
  let matchedOriginalRecord = false;
  let originalSignedFileHash: string | null = null;

  if (manifest.evidenceId) {
    const record = getRecordByEvidenceId(manifest.evidenceId);
    if (record) {
      matchedEvidenceId = record.evidenceId;
      matchedOriginalRecord = true;
      originalSignedFileHash = record.signedFileHash;
      reasonCodes.push('MATCHED_PRIOR_EVIDENCE_RECORD');
    } else {
      reasonCodes.push('EVIDENCE_ID_NOT_FOUND_IN_DB');
    }
  }

  const messages: Record<VerificationStatus, string> = {
    verified: 'The C2PA manifest is valid and the file content matches the signed record.',
    tampered: `This file appears to be derived from a previously signed Original Pictures evidence record (${matchedEvidenceId}), but the signed content no longer matches.`,
    manifest_missing: 'No C2PA manifest was found.',
    manifest_invalid: 'A C2PA manifest exists but is invalid or malformed.',
    unknown: 'The verifier could not confidently classify the result.',
  };

  return {
    uploadedFileStatus: status,
    matchedEvidenceId,
    matchedOriginalRecord,
    reasonCodes,
    originalSignedFileHash,
    uploadedTamperedFileHash: uploadedHash,
    message: messages[status],
  };
}
