'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const ALGORITHMS = [
  { href: '/work/avalanche', label: '01. Avalanche' },
  { href: '/work/one-way', label: '02. One Way' },
  { href: '/work/merkle', label: '03. Merkle' },
  { href: '/work/proof-of-work', label: '04. Proof of Work' },
  { href: '/work/elliptic-curve', label: '05. Elliptic Curve' },
  { href: '/work/zero-knowledge', label: '06. Zero Knowledge' },
  { href: '/work/schnorr', label: '07. Schnorr' },
  { href: '/work/post-quantum', label: '08. Post-Quantum' },
];

export function Nav() {
  const pathname = usePathname();
  const currentPath = pathname
    || (typeof window !== 'undefined' ? window.location.pathname : '');
  const normalizedPathname = currentPath.replace(/\/+$/, '') || '/';
  const currentWork = ALGORITHMS.find((algorithm) => normalizedPathname.includes(algorithm.href));
  const isColophon = normalizedPathname.includes('/colophon');
  const isHome = !currentWork && !isColophon;

  return (
    <header className="h-14 shrink-0 border-b border-white/10 bg-canvas text-ink z-40">
      <div className="h-full px-4 md:px-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="justify-self-start min-w-0">
          {isHome ? (
            <span className="font-serif text-xs sm:text-sm tracking-[0.18em] uppercase text-white">
              Cryptographic Arts
            </span>
          ) : (
            <Link
              href="/"
              className="flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-white transition-colors"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span className="hidden sm:inline">Index</span>
              <span className="sr-only sm:hidden">Return to index</span>
            </Link>
          )}
        </div>

        <p className="justify-self-center truncate font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-ink-muted" aria-live="polite">
          {currentWork?.label ?? (isColophon ? 'Colophon' : 'Exhibition index')}
        </p>

        <nav aria-label="Catalogue" className="justify-self-end">
          <Link
            href={isColophon ? '/' : '/colophon'}
            className="flex min-h-11 items-center font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-white transition-colors"
          >
            {isColophon ? 'Index' : 'Colophon'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
