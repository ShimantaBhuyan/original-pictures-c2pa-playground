'use client';
import { Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import type { SignResponse } from '@/lib/types';

function generateEvidenceId(): string {
  const year = new Date().getFullYear();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `ev_${year}_${num}`;
}

function toDatetimeLocal(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  if (value.includes('T')) {
    const [date, time] = value.split('T');
    return `${date}T${time}:00Z`;
  }
  return value;
}

type Mode = 'journalism' | 'inspection';

interface GPSInput {
  lat: string;
  lng: string;
  source: 'exif' | 'user' | 'unknown';
  confidence: 'high' | 'medium' | 'low' | 'none';
}

interface JournalForm {
  reporterId: string;
  organization: string;
  sourceType: string;
  caption: string;
  publicInterestReason: string;
  safetyNotes: string;
}

interface InspectForm {
  inspectionId: string;
  claimId: string;
  inspectorId: string;
  assetId: string;
  damageType: string;
  observation: string;
  mapRequired: boolean;
}

interface FormState {
  mode: Mode;
  evidenceId: string;
  capturedAt: string;
  gps: GPSInput;
  cameraHeadingDegrees: string;
  cameraDirectionText: string;
  journalism: JournalForm;
  inspection: InspectForm;
}

function EvidenceNewContent() {
  const params = useSearchParams();
  const router = useRouter();
  const fileId = params.get('fileId');

  const initJournal = (): JournalForm => ({
    reporterId: '', organization: '', sourceType: '', caption: '', publicInterestReason: '', safetyNotes: '',
  });

  const initInspect = (): InspectForm => ({
    inspectionId: '', claimId: '', inspectorId: '', assetId: '', damageType: '', observation: '', mapRequired: false,
  });

  const [form, setForm] = useState<FormState>({
    mode: 'journalism',
    evidenceId: generateEvidenceId(),
    capturedAt: '',
    gps: { lat: '', lng: '', source: 'unknown', confidence: 'none' },
    cameraHeadingDegrees: '',
    cameraDirectionText: '',
    journalism: initJournal(),
    inspection: initInspect(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [signResult, setSignResult] = useState<SignResponse | null>(null);

  useEffect(() => {
    if (!fileId) return;
    fetch(`/api/media/${fileId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load media facts');
        return res.json();
      })
      .then((data: { media: { exifTimestamp: string | null; exifGpsLat: number | null; exifGpsLng: number | null } }) => {
        const { exifTimestamp, exifGpsLat, exifGpsLng } = data.media;
        setForm((prev) => ({
          ...prev,
          capturedAt: exifTimestamp ? toDatetimeLocal(exifTimestamp) : '',
          gps: {
            lat: exifGpsLat != null ? String(exifGpsLat) : '',
            lng: exifGpsLng != null ? String(exifGpsLng) : '',
            source: exifGpsLat != null ? 'exif' : 'unknown',
            confidence: exifGpsLat != null ? 'high' : 'none',
          },
        }));
      })
      .catch((err) => setError(err.message));
  }, [fileId]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const jsonPreview = useMemo(() => {
    const gps = {
      lat: form.gps.lat ? parseFloat(form.gps.lat) : null,
      lng: form.gps.lng ? parseFloat(form.gps.lng) : null,
      source: form.gps.source,
      confidence: form.gps.confidence,
    };
    const capture = {
      capturedAt: form.capturedAt || null,
      gps,
      cameraHeadingDegrees: form.cameraHeadingDegrees ? parseFloat(form.cameraHeadingDegrees) : null,
      cameraDirectionText: form.cameraDirectionText || null,
    };
    const journalism = form.mode === 'journalism' ? {
      reporterId: form.journalism.reporterId,
      organization: form.journalism.organization,
      sourceType: form.journalism.sourceType,
      caption: form.journalism.caption,
      publicInterestReason: form.journalism.publicInterestReason,
      safetyNotes: form.journalism.safetyNotes.split('\n').filter(s => s.trim()),
    } : undefined;
    const inspection = form.mode === 'inspection' ? {
      inspectionId: form.inspection.inspectionId,
      claimId: form.inspection.claimId,
      inspectorId: form.inspection.inspectorId,
      assetId: form.inspection.assetId,
      damageType: form.inspection.damageType,
      observation: form.inspection.observation,
      mapRequired: form.inspection.mapRequired,
    } : undefined;
    return JSON.stringify({ fileId, evidenceId: form.evidenceId, mode: form.mode, capture, journalism, inspection }, null, 2);
  }, [form, fileId]);

  const handleSave = async () => {
    if (!fileId) return;
    setSaving(true);
    setError(null);
    try {
      const gps = {
        lat: form.gps.lat ? parseFloat(form.gps.lat) : null,
        lng: form.gps.lng ? parseFloat(form.gps.lng) : null,
        source: form.gps.source,
        confidence: form.gps.confidence,
      };
      const capture = {
        capturedAt: fromDatetimeLocal(form.capturedAt),
        gps,
        cameraHeadingDegrees: form.cameraHeadingDegrees ? parseFloat(form.cameraHeadingDegrees) : null,
        cameraDirectionText: form.cameraDirectionText || null,
      };
      const body: Record<string, unknown> = {
        fileId,
        evidenceId: form.evidenceId,
        mode: form.mode,
        capture,
      };
      if (form.mode === 'journalism') {
        body.journalism = {
          reporterId: form.journalism.reporterId,
          organization: form.journalism.organization,
          sourceType: form.journalism.sourceType,
          caption: form.journalism.caption,
          publicInterestReason: form.journalism.publicInterestReason,
          safetyNotes: form.journalism.safetyNotes.split('\n').filter(s => s.trim()),
        };
      } else {
        body.inspection = {
          inspectionId: form.inspection.inspectionId,
          claimId: form.inspection.claimId,
          inspectorId: form.inspection.inspectorId,
          assetId: form.inspection.assetId,
          damageType: form.inspection.damageType,
          observation: form.inspection.observation,
          mapRequired: form.inspection.mapRequired,
        };
      }
      const res = await fetch('/api/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save evidence');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    setSigning(true);
    setSignError(null);
    try {
      const res = await fetch('/api/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId: form.evidenceId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Signing failed');
      }
      const data: SignResponse = await res.json();
      setSignResult(data);
    } catch (err: any) {
      setSignError(err.message);
    } finally {
      setSigning(false);
    }
  };

  if (!fileId) {
    return (
      <div className="space-y-8">
        <h1>Create Evidence Record</h1>
        <Card>
          <p className="text-mist">No file selected. Please upload an image first.</p>
          <div className="mt-6">
            <Button onClick={() => router.push('/')}>Upload Image</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-8">
        <h1>Evidence Record Created</h1>
        {!signResult ? (
          <Card>
            <p className="text-ink font-[family-name:var(--font-sans)]">
              Evidence <span className="font-[family-name:var(--font-mono)]">{form.evidenceId}</span> has been saved successfully.
            </p>
            {signError && <p className="text-red-600 text-sm font-semibold mt-4">{signError}</p>}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button onClick={handleSign} disabled={signing}>
                {signing ? 'Creating manifest & signing...' : 'Sign with C2PA'}
              </Button>
              <Button variant="ghost" onClick={() => router.push('/')}>Upload Another</Button>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <h3>Signed Successfully</h3>
              <div className="flex flex-col md:flex-row gap-8 mt-6">
                <div className="md:w-1/2">
                  <img
                    src={`/api/download/${signResult.evidenceId}`}
                    alt={`Signed image for ${signResult.evidenceId}`}
                    className="w-full h-auto rounded-lg border border-slate-200"
                  />
                </div>
                <div className="flex-1">
                  <dl className="grid grid-cols-2 gap-4 text-sm font-[family-name:var(--font-sans)]">
                    <div>
                      <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Evidence ID</dt>
                      <dd className="text-ink font-[family-name:var(--font-mono)] text-xs">{signResult.evidenceId}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Manifest Label</dt>
                      <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{signResult.manifestLabel}</dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Signed File Hash</dt>
                      <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{signResult.signedFileHash}</dd>
                    </div>
                  </dl>
                  <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap gap-3">
                      <Button as="a" href={`/api/download/${signResult.evidenceId}`} download>Download Signed Image</Button>
                      <Button onClick={() => router.push(`/tamper?evidenceId=${signResult.evidenceId}`)}>Tamper Image</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs uppercase tracking-[0.05em] text-mist font-[family-name:var(--font-display)]">Copy</span>
                      <Button variant="ghost" className="!px-4 !py-2 text-xs" onClick={() => navigator.clipboard.writeText(JSON.stringify(signResult.manifestJson, null, 2))}>Manifest JSON</Button>
                      <Button variant="ghost" className="!px-4 !py-2 text-xs" onClick={() => navigator.clipboard.writeText(JSON.stringify(signResult.evidenceJson, null, 2))}>Evidence JSON</Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
            <div className="flex flex-wrap gap-4">
              <Button variant="ghost" onClick={() => router.push(`/records/${signResult.evidenceId}`)}>View Record</Button>
              <Button variant="ghost" onClick={() => router.push('/')}>Upload Another</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const inputCls = 'w-full border border-slate-200 rounded-md px-4 py-2.5 text-sm text-ink bg-paper font-[family-name:var(--font-sans)] focus:outline-none focus:ring-2 focus:ring-notary/30 focus:border-notary transition-colors duration-[var(--duration-default)]';

  return (
    <div className="space-y-8">
      <div>
        <h1>Create Evidence Record</h1>
        <p className="text-lg text-mist mt-2 font-[family-name:var(--font-sans)]">Fill in the details for this evidence record.</p>
      </div>

      <Card>
        <div className="flex items-center gap-4">
          <span className="text-sm text-mist font-[family-name:var(--font-sans)]">Evidence ID:</span>
          <span className="font-[family-name:var(--font-mono)] text-ink">{form.evidenceId}</span>
          <Button variant="ghost" className="text-xs !px-3 !py-1" onClick={() => update('evidenceId', generateEvidenceId())}>Regenerate</Button>
        </div>
      </Card>

      <Card>
        <h3>Mode</h3>
        <div className="flex gap-4 mt-4">
          <button
            className={`px-6 py-3 rounded-md text-sm font-semibold uppercase tracking-[0.05em] transition-colors duration-[var(--duration-default)] font-[family-name:var(--font-sans)] ${form.mode === 'journalism' ? 'bg-notary text-white' : 'bg-transparent text-mist border border-slate-200 hover:bg-cream'}`}
            onClick={() => update('mode', 'journalism')}
          >
            Journalism
          </button>
          <button
            className={`px-6 py-3 rounded-md text-sm font-semibold uppercase tracking-[0.05em] transition-colors duration-[var(--duration-default)] font-[family-name:var(--font-sans)] ${form.mode === 'inspection' ? 'bg-notary text-white' : 'bg-transparent text-mist border border-slate-200 hover:bg-cream'}`}
            onClick={() => update('mode', 'inspection')}
          >
            Inspection
          </button>
        </div>
      </Card>

      <Card>
        <h3>Capture Information</h3>
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Captured At</label>
            <input type="datetime-local" className={inputCls} value={form.capturedAt} onChange={(e) => update('capturedAt', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Direction Text</label>
            <input type="text" className={inputCls} placeholder="e.g. Facing north-east" value={form.cameraDirectionText} onChange={(e) => update('cameraDirectionText', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Heading (degrees)</label>
            <input type="number" className={inputCls} placeholder="0–360" value={form.cameraHeadingDegrees} onChange={(e) => update('cameraHeadingDegrees', e.target.value)} />
          </div>
        </div>

        <h4 className="text-sm font-semibold text-ink mt-8 mb-4 font-[family-name:var(--font-display)]">GPS Coordinates</h4>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Latitude</label>
            <input type="number" step="any" className={inputCls} placeholder="-90 to 90" value={form.gps.lat} onChange={(e) => update('gps', { ...form.gps, lat: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Longitude</label>
            <input type="number" step="any" className={inputCls} placeholder="-180 to 180" value={form.gps.lng} onChange={(e) => update('gps', { ...form.gps, lng: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Source</label>
            <select className={inputCls} value={form.gps.source} onChange={(e) => update('gps', { ...form.gps, source: e.target.value as GPSInput['source'] })}>
              <option value="unknown">Unknown</option>
              <option value="exif">EXIF</option>
              <option value="user">User Provided</option>
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Confidence</label>
            <select className={inputCls} value={form.gps.confidence} onChange={(e) => update('gps', { ...form.gps, confidence: e.target.value as GPSInput['confidence'] })}>
              <option value="none">None</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
      </Card>

      {form.mode === 'journalism' && (
        <Card>
          <h3>Journalism Details</h3>
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Reporter ID</label>
              <input type="text" className={inputCls} placeholder="e.g. REP-001" value={form.journalism.reporterId} onChange={(e) => update('journalism', { ...form.journalism, reporterId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Organization</label>
              <input type="text" className={inputCls} placeholder="e.g. The Guardian" value={form.journalism.organization} onChange={(e) => update('journalism', { ...form.journalism, organization: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Source Type</label>
              <select className={inputCls} value={form.journalism.sourceType} onChange={(e) => update('journalism', { ...form.journalism, sourceType: e.target.value })}>
                <option value="">Select...</option>
                <option value="staff">Staff Photographer</option>
                <option value="freelance">Freelance</option>
                <option value="citizen">Citizen Journalist</option>
                <option value="wire">Wire Service</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Caption</label>
            <textarea className={inputCls} rows={3} placeholder="Image caption..." value={form.journalism.caption} onChange={(e) => update('journalism', { ...form.journalism, caption: e.target.value })} />
          </div>
          <div className="mt-6">
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Public Interest Reason</label>
            <textarea className={inputCls} rows={3} placeholder="Why this image serves the public interest..." value={form.journalism.publicInterestReason} onChange={(e) => update('journalism', { ...form.journalism, publicInterestReason: e.target.value })} />
          </div>
          <div className="mt-6">
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Safety Notes (one per line)</label>
            <textarea className={inputCls} rows={3} placeholder="Enter safety notes, one per line..." value={form.journalism.safetyNotes} onChange={(e) => update('journalism', { ...form.journalism, safetyNotes: e.target.value })} />
          </div>
        </Card>
      )}

      {form.mode === 'inspection' && (
        <Card>
          <h3>Inspection Details</h3>
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Inspection ID</label>
              <input type="text" className={inputCls} placeholder="e.g. INS-001" value={form.inspection.inspectionId} onChange={(e) => update('inspection', { ...form.inspection, inspectionId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Claim ID</label>
              <input type="text" className={inputCls} placeholder="e.g. CL-001" value={form.inspection.claimId} onChange={(e) => update('inspection', { ...form.inspection, claimId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Inspector ID</label>
              <input type="text" className={inputCls} placeholder="e.g. INS-ADJ-001" value={form.inspection.inspectorId} onChange={(e) => update('inspection', { ...form.inspection, inspectorId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Asset ID</label>
              <input type="text" className={inputCls} placeholder="e.g. AST-001" value={form.inspection.assetId} onChange={(e) => update('inspection', { ...form.inspection, assetId: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Damage Type</label>
              <select className={inputCls} value={form.inspection.damageType} onChange={(e) => update('inspection', { ...form.inspection, damageType: e.target.value })}>
                <option value="">Select...</option>
                <option value="water_damage">Water Damage</option>
                <option value="fire_damage">Fire Damage</option>
                <option value="structural">Structural</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end pb-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-200 text-notary focus:ring-notary/30" checked={form.inspection.mapRequired} onChange={(e) => update('inspection', { ...form.inspection, mapRequired: e.target.checked })} />
                <span className="text-sm text-ink font-[family-name:var(--font-sans)]">Map Required</span>
              </label>
            </div>
          </div>
          <div className="mt-6">
            <label className="block text-xs uppercase tracking-[0.05em] text-mist mb-1.5 font-[family-name:var(--font-display)]">Observation</label>
            <textarea className={inputCls} rows={4} placeholder="Detailed observation notes..." value={form.inspection.observation} onChange={(e) => update('inspection', { ...form.inspection, observation: e.target.value })} />
          </div>
        </Card>
      )}

      <Card>
        <h3>JSON Preview</h3>
        <pre className="mt-4 bg-paper border border-slate-200 rounded-md p-4 text-xs font-[family-name:var(--font-mono)] text-ink overflow-x-auto">{jsonPreview}</pre>
      </Card>

      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Evidence & Continue'}
        </Button>
        <Button variant="ghost" onClick={() => router.push('/')}>Cancel</Button>
      </div>
    </div>
  );
}

export default function EvidenceNewPage() {
  return (
    <Suspense fallback={<p className="text-mist">Loading...</p>}>
      <EvidenceNewContent />
    </Suspense>
  );
}
