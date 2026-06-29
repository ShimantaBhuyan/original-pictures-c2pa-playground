'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import type { EvidenceRecord } from '@/lib/types';

export default function RecordsPage() {
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch('/api/records');
        if (!res.ok) throw new Error('Failed to fetch records');
        const data = await res.json();
        setRecords(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRecords();
  }, []);

  if (loading) {
    return <p className="text-mist">Loading records...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Evidence Records</h1>
        <p className="text-lg text-mist mt-2 font-[family-name:var(--font-sans)]">
          {records.length} record{records.length !== 1 ? 's' : ''} in the database.
        </p>
      </div>

      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}

      {records.length === 0 && !error && (
        <Card>
          <p className="text-mist">No evidence records found. Sign an image to create one.</p>
          <div className="mt-6">
            <Button onClick={() => router.push('/')}>Upload Image</Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {records.map((record) => (
          <Card key={record.evidenceId}>
            <div className="flex items-start justify-between">
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="!text-xl">{record.evidenceId}</h3>
                  <StatusBadge status={record.signatureStatus} />
                  <span className="text-xs uppercase tracking-[0.1em] text-mist font-[family-name:var(--font-sans)]">{record.mode}</span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm font-[family-name:var(--font-sans)]">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist font-[family-name:var(--font-display)]">Original Hash</dt>
                    <dd className="text-ink font-[family-name:var(--font-mono)] text-xs truncate">{record.originalFileHash}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist font-[family-name:var(--font-display)]">Signed Hash</dt>
                    <dd className="text-ink font-[family-name:var(--font-mono)] text-xs truncate">{record.signedFileHash}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist font-[family-name:var(--font-display)]">Claim Generator</dt>
                    <dd className="text-ink text-xs">{record.claimGenerator}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.05em] text-mist font-[family-name:var(--font-display)]">Created</dt>
                    <dd className="text-ink text-xs">{new Date(record.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-col gap-2 ml-6">
                <Button
                  variant="primary"
                  className="!px-4 !py-2 text-xs"
                  onClick={() => router.push(`/records/${record.evidenceId}`)}
                >
                  View
                </Button>
                <Button
                  variant="ghost"
                  className="!px-4 !py-2 text-xs"
                  onClick={() => router.push(`/tamper?evidenceId=${record.evidenceId}`)}
                >
                  Tamper
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
