'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropZone } from '@/components/FileDropZone';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import type { MediaFacts } from '@/lib/types';

export default function UploadPage() {
  const [media, setMedia] = useState<MediaFacts | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = async (file: File) => {
    setLoading(true);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }
      const data = await res.json();
      setMedia(data.media);
      setFileId(data.fileId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1>Upload Original Image</h1>
        <p className="text-lg text-mist mt-2 font-[family-name:var(--font-sans)]">
          Upload a JPEG or PNG image to begin the evidence workflow.
        </p>
      </div>

      <FileDropZone onFile={handleFile} />

      {loading && <p className="text-mist text-sm">Computing file facts...</p>}
      {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}

      {media && (
        <Card>
          <div className="flex flex-col md:flex-row gap-8">
            {previewUrl && (
              <div className="md:w-1/2">
                <img
                  src={previewUrl}
                  alt="Uploaded preview"
                  className="w-full h-auto rounded-lg border border-slate-200"
                />
              </div>
            )}
            <div className="flex-1">
              <h3>File Facts</h3>
              <dl className="grid grid-cols-2 gap-4 mt-6 text-sm font-[family-name:var(--font-sans)]">
                <Dt label="SHA-256" value={media.sha256} />
                <Dt label="MIME Type" value={media.mimeType} />
                <Dt label="File Size" value={`${(media.fileSizeBytes / 1024).toFixed(1)} KB`} />
                <Dt label="Dimensions" value={`${media.width} × ${media.height}`} />
                <Dt label="EXIF Timestamp" value={media.exifTimestamp || 'N/A'} />
                <Dt label="EXIF GPS" value={media.exifGpsLat != null && media.exifGpsLng != null ? `${media.exifGpsLat.toFixed(6)}, ${media.exifGpsLng.toFixed(6)}` : 'N/A'} />
              </dl>
              <div className="mt-8">
                <Button onClick={() => router.push(`/evidence/new?fileId=${fileId}`)}>
                  Create Evidence Record
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.05em] text-mist mb-1 font-[family-name:var(--font-display)]">{label}</dt>
      <dd className="text-ink font-[family-name:var(--font-mono)] text-xs break-all">{value}</dd>
    </div>
  );
}
