import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <h1 className="font-serif text-3xl uppercase tracking-widest text-white">Work not found</h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-muted">
          This catalogue entry does not exist.
        </p>
      </div>
      <Link href="/" className="min-h-11 flex items-center border border-white/20 px-5 font-mono text-[10px] uppercase tracking-widest text-ink hover:border-white/50 hover:text-white transition-colors">
        Return to index
      </Link>
    </div>
  );
}
