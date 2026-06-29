'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import type { EvidenceRecord } from '@/lib/types';

export default function RecordDetailPage({ params }: { params: Promise<{ evidenceId: string }> }) {
  const [record, setRecord] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evidenceId, setEvidenceId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    params.then(({ evidenceId }) => {
      setEvidenceId(evidenceId);
      fetch(`/api/records/${evidenceId}`)
        .then(async (res) => {
          if (!res.ok) throw new Error('Record not found');
          return res.json();
        })
        .then((data: EvidenceRecord) => setRecord(data))
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    });
  }, [params]);

  if (loading) return <p className="text-mist">Loading record...</p>;
  if (error || !record) {
    return (
      <div className="space-y-8">
        <h1>Evidence Record</h1>
        <Card>
          <p className="text-mist">{error || 'Record not found.'}</p>
          <div className="mt-6">
            <Button onClick={() => router.push('/records')}>Back to Records</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Evidence Record</h1>
        <p className="text-lg text-mist mt-2 font-[family-name:var(--font-sans)]">
          Details for {record.evidenceId}
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-6">
          <h3 className="!text-2xl">{record.evidenceId}</h3>
          <StatusBadge status={record.signatureStatus} />
          <span className="text-xs uppercase tracking-[0.1em] text-mist font-[family-name:var(--font-sans)]">{record.mode}</span>
        </div>

        <dl className="grid grid-cols-2 gap-4 text-sm font-[family-name:var(--font-sans)]">
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Manifest Label</dt>
            <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{record.manifestLabel}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Original Hash</dt>
            <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{record.originalFileHash}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Signed Hash</dt>
            <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{record.signedFileHash}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Claim Generator</dt>
            <dd className="text-ink text-xs">{record.claimGenerator}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">Created</dt>
            <dd className="text-ink text-xs">{new Date(record.createdAt).toLocaleString()}</dd>
          </div>
        </dl>

        <div className="mt-8 space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button as="a" href={`/api/download/${record.evidenceId}`} download>Download Signed Image</Button>
            <Button onClick={() => router.push(`/tamper?evidenceId=${record.evidenceId}`)}>Tamper</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-[0.05em] text-mist font-[family-name:var(--font-display)]">Copy</span>
            <Button variant="ghost" className="!px-4 !py-2 text-xs" onClick={() => navigator.clipboard.writeText(JSON.stringify(record.manifestJson, null, 2))}>Manifest JSON</Button>
            <Button variant="ghost" className="!px-4 !py-2 text-xs" onClick={() => navigator.clipboard.writeText(JSON.stringify(record.extractedEvidenceJson, null, 2))}>Evidence JSON</Button>
          </div>
          <div className="pt-2">
            <Button variant="ghost" className="!px-4 !py-2 text-xs" onClick={() => router.push('/records')}>← Back to Records</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
