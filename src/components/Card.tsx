export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-cream border border-slate-200 rounded-lg p-8 ${className}`}>
      {children}
    </div>
  );
}
