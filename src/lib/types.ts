// ---- Evidence JSON ----
export interface EvidenceJson {
  evidenceId: string;
  mode: 'journalism' | 'inspection';
  media: MediaFacts;
  capture: CaptureInfo;
  journalism: JournalismBlock | null;
  inspection: InspectionBlock | null;
  integrity: IntegrityBlock;
}

export interface MediaFacts {
  sha256: string;
  mimeType: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  exifTimestamp: string | null;
  exifGpsLat: number | null;
  exifGpsLng: number | null;
}

export interface CaptureInfo {
  capturedAt: string | null;
  gps: {
    lat: number | null;
    lng: number | null;
    source: 'exif' | 'user' | 'unknown';
    confidence: 'high' | 'medium' | 'low' | 'none';
  };
  cameraHeadingDegrees: number | null;
  cameraDirectionText: string | null;
}

export interface JournalismBlock {
  reporterId: string;
  organization: string;
  sourceType: string;
  caption: string;
  publicInterestReason: string;
  safetyNotes: string[];
}

export interface InspectionBlock {
  inspectionId: string;
  claimId: string;
  inspectorId: string;
  assetId: string;
  damageType: string;
  observation: string;
  mapRequired: boolean;
}

export interface IntegrityBlock {
  schemaVersion: string;
  createdBy: string;
  createdAt: string;
}

// ---- Database Record ----
export interface EvidenceRecord {
  evidenceId: string;
  mode: 'journalism' | 'inspection';
  originalFileHash: string;
  signedFileHash: string;
  signedFilePath: string;
  manifestLabel: string;
  manifestJson?: object | null;
  claimGenerator: string;
  signatureStatus: 'valid' | 'invalid' | 'unknown';
  validationErrors: string[];
  extractedEvidenceJson: EvidenceJson | null;
  createdAt: string;
}

// ---- Verification Result ----
export type VerificationStatus = 'verified' | 'tampered' | 'manifest_missing' | 'manifest_invalid' | 'unknown';

export type ReasonCode =
  | 'C2PA_MANIFEST_MISSING'
  | 'C2PA_MANIFEST_PARSE_FAILED'
  | 'C2PA_SIGNATURE_INVALID'
  | 'C2PA_TRUST_UNVERIFIED'
  | 'HASH_ASSERTION_MISMATCH'
  | 'EVIDENCE_JSON_SCHEMA_INVALID'
  | 'EVIDENCE_ID_NOT_FOUND_IN_DB'
  | 'MATCHED_PRIOR_EVIDENCE_RECORD';

export interface VerifyResult {
  uploadedFileStatus: VerificationStatus;
  matchedEvidenceId: string | null;
  matchedOriginalRecord: boolean;
  reasonCodes: ReasonCode[];
  originalSignedFileHash: string | null;
  uploadedTamperedFileHash: string;
  tamperMethod?: string;
  message: string;
}

// ---- API Request/Response types ----
export interface UploadResponse {
  fileId: string;
  media: MediaFacts;
}

export interface SignResponse {
  evidenceId: string;
  signedFileHash: string;
  signedFilePath: string;
  manifestLabel: string;
  manifestJson: object | null;
  evidenceJson: EvidenceJson | null;
}

export interface TamperResponse {
  tamperedFilePath: string;
  tamperedFileHash: string;
  method: string;
}
