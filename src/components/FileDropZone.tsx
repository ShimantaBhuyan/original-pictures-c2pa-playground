'use client';
import { useCallback, useState, type DragEvent } from 'react';

interface Props {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
}

export function FileDropZone({ onFile, accept = 'image/jpeg,image/png,image/webp', label = 'Drop image here or click to browse' }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors duration-[var(--duration-default)] font-[family-name:var(--font-sans)] ${
        dragging ? 'border-notary bg-notary/5' : 'border-slate-200 hover:border-mist'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) onFile(file);
        };
        input.click();
      }}
    >
      <p className="text-mist text-base">{label}</p>
      <p className="text-mist/60 text-sm mt-2">JPEG, PNG or WebP, max 50MB</p>
    </div>
  );
}
