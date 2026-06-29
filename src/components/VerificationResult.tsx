'use client';
import { StatusBadge } from '@/components/StatusBadge';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import type { VerifyResult, ReasonCode } from '@/lib/types';

const REASON_LABELS: Record<ReasonCode, string> = {
  C2PA_MANIFEST_MISSING: 'No C2PA manifest found in the file.',
  C2PA_MANIFEST_PARSE_FAILED: 'C2PA manifest exists but could not be parsed.',
  C2PA_SIGNATURE_INVALID: 'C2PA cryptographic signature is invalid.',
  C2PA_TRUST_UNVERIFIED: 'Signing credential is not trusted by this verifier.',
  HASH_ASSERTION_MISMATCH: 'File content hash does not match the signed assertion.',
  EVIDENCE_JSON_SCHEMA_INVALID: 'Embedded evidence JSON failed schema validation.',
  EVIDENCE_ID_NOT_FOUND_IN_DB: 'Evidence ID from manifest not found in local database.',
  MATCHED_PRIOR_EVIDENCE_RECORD: 'Matched a prior evidence record in the database.',
};

interface Props {
  result: VerifyResult;
  onReset?: () => void;
}

export function VerificationResult({ result, onReset }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between">
          <h3>Verification Status</h3>
          <StatusBadge status={result.uploadedFileStatus} />
        </div>
        <p className="mt-4 text-ink font-[family-name:var(--font-sans)]">{result.message}</p>
      </Card>

      <Card>
        <h3>File Hash</h3>
        <p className="mt-2 text-xs font-[family-name:var(--font-mono)] text-ink break-all">{result.uploadedTamperedFileHash}</p>
      </Card>

      <Card>
        <h3>Reason Codes</h3>
        <ul className="mt-4 space-y-2">
          {result.reasonCodes.map((code) => (
            <li key={code} className="text-sm text-ink font-[family-name:var(--font-sans)]">
              <span className="font-semibold uppercase tracking-[0.05em] text-mist text-xs">{code}</span>
              <p className="mt-0.5">{REASON_LABELS[code] ?? code}</p>
            </li>
          ))}
        </ul>
      </Card>

      {result.matchedEvidenceId && (
        <Card>
          <h3>Matched Evidence Record</h3>
          <dl className="grid grid-cols-2 gap-4 mt-4 text-sm font-[family-name:var(--font-sans)]">
            <div>
              <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Evidence ID</dt>
              <dd className="text-ink font-[family-name:var(--font-mono)] text-xs">{result.matchedEvidenceId}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Matched</dt>
              <dd className="text-ink font-[family-name:var(--font-mono)] text-xs">{result.matchedOriginalRecord ? 'Yes' : 'No'}</dd>
            </div>
            {result.tamperMethod && (
              <div>
                <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Tamper Method</dt>
                <dd className="text-ink font-[family-name:var(--font-mono)] text-xs">{result.tamperMethod}</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {onReset && (
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" onClick={onReset}>Verify Another File</Button>
          {result.matchedEvidenceId ? (
            <Button as="a" variant="ghost" href={`/records/${result.matchedEvidenceId}`}>View Matched Record</Button>
          ) : (
            <Button as="a" variant="ghost" href="/records">View Records</Button>
          )}
        </div>
      )}
    </div>
  );
}
