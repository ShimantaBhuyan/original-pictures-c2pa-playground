'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VerificationResult } from '@/components/VerificationResult';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import type { VerifyResult } from '@/lib/types';

export default function VerifyResultPage() {
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [missing, setMissing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('verifyResult');
    if (stored) {
      try {
        setResult(JSON.parse(stored));
      } catch {
        setMissing(true);
      }
    } else {
      setMissing(true);
    }
  }, []);

  if (missing) {
    return (
      <div className="space-y-8">
        <h1>Verification Result</h1>
        <Card>
          <p className="text-mist font-[family-name:var(--font-sans)]">No verification result found. Please verify an image first.</p>
          <div className="mt-6">
            <Button onClick={() => router.push('/verify')}>Verify Image</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!result) {
    return <p className="text-mist">Loading result...</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1>Verification Result</h1>
      </div>
      <VerificationResult result={result} onReset={() => router.push('/verify')} />
    </div>
  );
}
