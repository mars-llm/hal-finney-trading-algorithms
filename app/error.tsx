'use client';
import Link from 'next/link';

export default function ErrorBoundary() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-12 gap-6 min-h-max">
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-mono text-2xl tracking-[0.2em] uppercase">Error</h2>
        <p className="font-mono text-xs text-ink-muted uppercase opacity-50 tracking-widest">Something went wrong</p>
      </div>
      <Link href="/" className="px-6 py-2 font-mono text-xs tracking-widest border border-white/20 hover:border-white/50 text-white hover:bg-white/5 transition-colors rounded-none">
        RETURN HOME
      </Link>
    </div>
  );
}
