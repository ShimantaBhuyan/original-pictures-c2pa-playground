'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { FileDropZone } from '@/components/FileDropZone';
import { VerificationResult } from '@/components/VerificationResult';
import type { EvidenceRecord, TamperResponse, VerifyResult } from '@/lib/types';

const METHODS = [
  { value: 'pixel_text', label: 'Pixel Tamper (overlay text)', description: 'Overlays text on the image.' },
  { value: 'crop', label: 'Crop Borders (10%)', description: 'Crops 10% from each edge of the image.' },
  { value: 'manifest_strip', label: 'Strip Manifest (metadata removal)', description: 'Re-encodes the image without C2PA metadata. Manifest will be lost.' },
] as const;

function TamperContent() {
  const params = useSearchParams();
  const router = useRouter();
  const queryEvidenceId = params.get('evidenceId');

  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [source, setSource] = useState<'record' | 'upload'>(queryEvidenceId ? 'record' : 'record');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>(queryEvidenceId ?? '');

  const [method, setMethod] = useState<string>('pixel_text');
  const [text, setText] = useState('TAMPERED — FOR TESTING');

  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [tamperLoading, setTamperLoading] = useState(false);
  const [tamperError, setTamperError] = useState<string | null>(null);
  const [tamperResult, setTamperResult] = useState<TamperResponse | null>(null);

  useEffect(() => {
    fetch('/api/records')
      .then((res) => res.json())
      .then((data: EvidenceRecord[]) => {
        setRecords(data);
        if (queryEvidenceId && data.some((r) => r.evidenceId === queryEvidenceId)) {
          setSelectedEvidenceId(queryEvidenceId);
        } else if (data.length > 0 && !selectedEvidenceId) {
          setSelectedEvidenceId(data[0].evidenceId);
        }
      })
      .catch((err) => setVerifyError(err.message))
      .finally(() => setRecordsLoading(false));
  }, [queryEvidenceId, selectedEvidenceId]);

  const activeEvidenceId = source === 'upload' && verifyResult?.matchedEvidenceId
    ? verifyResult.matchedEvidenceId
    : selectedEvidenceId;

  const handleUploadVerify = async (file: File) => {
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);
    setTamperResult(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/verify', { method: 'POST', body: form });
      const data: VerifyResult = await res.json();
      setVerifyResult(data);
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleTamper = async () => {
    if (!activeEvidenceId) return;
    setTamperLoading(true);
    setTamperError(null);
    try {
      const body: Record<string, unknown> = { evidenceId: activeEvidenceId, method };
      if (method === 'pixel_text') {
        body.params = { text };
      }
      const res = await fetch('/api/tamper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Tampering failed');
      }
      const data: TamperResponse = await res.json();
      setTamperResult(data);
    } catch (err: any) {
      setTamperError(err.message);
    } finally {
      setTamperLoading(false);
    }
  };

  const canTamper = Boolean(activeEvidenceId);

  return (
    <div className="space-y-8">
      <div>
        <h1>Tamper Image</h1>
        <p className="text-lg text-mist mt-2 font-[family-name:var(--font-sans)]">
          Generate a tampered copy of a signed image to test C2PA verification.
        </p>
      </div>

      {!tamperResult ? (
        <>
          <Card>
            <h3>Select Source</h3>
            <div className="flex gap-4 mt-4">
              <button
                onClick={() => setSource('record')}
                className={`flex-1 p-4 rounded-md border text-left transition-colors duration-[var(--duration-default)] ${source === 'record' ? 'border-notary bg-notary/5' : 'border-slate-200 hover:bg-cream'}`}
              >
                <span className="text-sm font-semibold text-ink font-[family-name:var(--font-sans)]">From Evidence Records</span>
                <p className="text-xs text-mist mt-0.5 font-[family-name:var(--font-sans)]">Pick a previously signed record.</p>
              </button>
              <button
                onClick={() => setSource('upload')}
                className={`flex-1 p-4 rounded-md border text-left transition-colors duration-[var(--duration-default)] ${source === 'upload' ? 'border-notary bg-notary/5' : 'border-slate-200 hover:bg-cream'}`}
              >
                <span className="text-sm font-semibold text-ink font-[family-name:var(--font-sans)]">Upload Image</span>
                <p className="text-xs text-mist mt-0.5 font-[family-name:var(--font-sans)]">Upload a signed image; we will verify it first.</p>
              </button>
            </div>

            <div className="mt-6">
              {source === 'record' && (
                <div>
                  <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Evidence Record</label>
                  {recordsLoading ? (
                    <p className="text-mist text-sm">Loading records...</p>
                  ) : records.length === 0 ? (
                    <p className="text-mist text-sm">No signed records available. <Button className="!px-0" variant="ghost" onClick={() => router.push('/')}>Upload and sign an image first.</Button></p>
                  ) : (
                    <select
                      value={selectedEvidenceId}
                      onChange={(e) => setSelectedEvidenceId(e.target.value)}
                      className="w-full border border-slate-200 rounded-md px-4 py-2.5 text-sm text-ink bg-paper font-[family-name:var(--font-sans)] focus:outline-none focus:ring-2 focus:ring-notary/30 focus:border-notary"
                    >
                      {records.map((r) => (
                        <option key={r.evidenceId} value={r.evidenceId}>{r.evidenceId} — {r.mode}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {source === 'upload' && (
                <div className="space-y-4">
                  <FileDropZone onFile={handleUploadVerify} label="Drop a signed image here or click to browse" />
                  {verifyLoading && <p className="text-mist text-sm">Verifying uploaded image...</p>}
                  {verifyError && <p className="text-red-600 text-sm font-semibold">{verifyError}</p>}
                  {verifyResult && <VerificationResult result={verifyResult} onReset={() => { setVerifyResult(null); setVerifyError(null); }} />}
                </div>
              )}
            </div>
          </Card>

          {source !== 'upload' || (verifyResult?.uploadedFileStatus === 'verified' && verifyResult?.matchedEvidenceId) ? (
            <Card>
              <h3>Tamper Method</h3>
              <div className="space-y-4 mt-6">
                {METHODS.map((m) => (
                  <label key={m.value} className={`block p-4 rounded-md border cursor-pointer transition-colors duration-[var(--duration-default)] ${method === m.value ? 'border-notary bg-notary/5' : 'border-slate-200 hover:bg-cream'}`}>
                    <div className="flex items-start gap-3">
                      <input type="radio" name="method" value={m.value} checked={method === m.value} onChange={(e) => setMethod(e.target.value)} className="mt-1" />
                      <div>
                        <span className="text-sm font-semibold text-ink font-[family-name:var(--font-sans)]">{m.label}</span>
                        <p className="text-xs text-mist mt-0.5 font-[family-name:var(--font-sans)]">{m.description}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              {method === 'pixel_text' && (
                <div className="mt-6">
                  <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Overlay Text</label>
                  <input
                    type="text"
                    className="w-full border border-slate-200 rounded-md px-4 py-2.5 text-sm text-ink bg-paper font-[family-name:var(--font-sans)] focus:outline-none focus:ring-2 focus:ring-notary/30 focus:border-notary transition-colors duration-[var(--duration-default)]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              )}

              {method === 'manifest_strip' && (
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800 font-[family-name:var(--font-sans)]">
                    Warning: Stripping the manifest will remove all C2PA metadata. The resulting file will not be linkable to any evidence record.
                  </p>
                </div>
              )}

              {tamperError && <p className="text-red-600 text-sm font-semibold mt-4">{tamperError}</p>}

              <div className="mt-8">
                <Button onClick={handleTamper} disabled={!canTamper || tamperLoading}>
                  {tamperLoading ? 'Generating...' : 'Generate Tampered Image'}
                </Button>
              </div>
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Card>
            <h3>Tampered Image Generated</h3>
            <div className="flex flex-col md:flex-row gap-8 mt-6">
              <div className="md:w-1/2">
                <img
                  src={`/api/tamper/download/${activeEvidenceId}/${tamperResult.method}`}
                  alt={`Tampered image for ${activeEvidenceId}`}
                  className="w-full h-auto rounded-lg border border-slate-200"
                />
              </div>
              <div className="flex-1">
                <dl className="grid grid-cols-2 gap-4 text-sm font-[family-name:var(--font-sans)]">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Method</dt>
                    <dd className="text-ink font-[family-name:var(--font-mono)] text-xs">{tamperResult.method}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Evidence ID</dt>
                    <dd className="text-ink font-[family-name:var(--font-mono)] text-xs">{activeEvidenceId}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Tampered File Hash</dt>
                    <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{tamperResult.tamperedFileHash}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-3 mt-6">
                  <Button as="a" href={`/api/tamper/download/${activeEvidenceId}/${tamperResult.method}`} download>Download Tampered Image</Button>
                  <Button onClick={() => router.push(`/verify?evidenceId=${activeEvidenceId}&tamperMethod=${tamperResult.method}`)}>Verify This Image</Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex gap-4">
            <Button variant="ghost" onClick={() => { setTamperResult(null); setMethod('pixel_text'); }}>Create Another</Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TamperPage() {
  return (
    <Suspense fallback={<p className="text-mist">Loading...</p>}>
      <TamperContent />
    </Suspense>
  );
}
