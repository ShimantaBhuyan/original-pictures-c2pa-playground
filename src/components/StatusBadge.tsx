const STATUS_STYLES: Record<string, string> = {
  verified: 'bg-green-100 text-green-800 border-green-300',
  tampered: 'bg-amber-100 text-amber-800 border-amber-300',
  manifest_missing: 'bg-red-100 text-red-800 border-red-300',
  manifest_invalid: 'bg-red-100 text-red-800 border-red-300',
  unknown: 'bg-slate-100 text-slate-600 border-slate-300',
};

export function StatusBadge({ status }: { status: string }) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.unknown;
  return (
    <span className={`inline-block text-xs font-medium uppercase tracking-[0.1em] px-3 py-1 rounded-md border font-[family-name:var(--font-sans)] ${styles}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
