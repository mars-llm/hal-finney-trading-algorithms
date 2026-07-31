'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

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
  const currentWorkIndex = currentWork
    ? ALGORITHMS.findIndex((algorithm) => algorithm.href === currentWork.href)
    : -1;
  const currentWorkTitle = currentWork?.label.replace(/^\d+\.\s*/, '');
  const previousWork = currentWorkIndex > 0 ? ALGORITHMS[currentWorkIndex - 1] : null;
  const nextWork = currentWorkIndex >= 0 && currentWorkIndex < ALGORITHMS.length - 1
    ? ALGORITHMS[currentWorkIndex + 1]
    : null;
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
          ) : currentWork ? (
            <Link
              href="/"
              className="flex min-h-11 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-white transition-colors"
            >
              <ArrowLeft size={13} aria-hidden="true" />
              <span className="hidden sm:inline">All works</span>
              <span className="sr-only sm:hidden">Return to all works</span>
            </Link>
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
          {currentWork ? `${currentWorkIndex + 1} / ${ALGORITHMS.length} · ${currentWorkTitle}` : (isColophon ? 'Colophon' : 'Exhibition index')}
        </p>

        {currentWork ? (
          <nav aria-label="Work navigation" className="justify-self-end flex items-center gap-1">
            {previousWork ? (
              <Link
                href={previousWork.href}
                className="flex min-h-11 min-w-11 items-center justify-center text-ink-muted transition-colors hover:text-white"
                aria-label={`Previous work: ${previousWork.label}`}
              >
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="hidden md:inline font-mono text-[9px] uppercase tracking-[0.18em]">Previous</span>
              </Link>
            ) : (
              <span className="flex min-h-11 min-w-11 items-center justify-center text-ink-muted/30" aria-hidden="true">
                <ChevronLeft size={16} />
              </span>
            )}
            {nextWork ? (
              <Link
                href={nextWork.href}
                className="flex min-h-11 min-w-11 items-center justify-center text-ink-muted transition-colors hover:text-white"
                aria-label={`Next work: ${nextWork.label}`}
              >
                <span className="hidden md:inline font-mono text-[9px] uppercase tracking-[0.18em]">Next</span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <span className="flex min-h-11 min-w-11 items-center justify-center text-ink-muted/30" aria-hidden="true">
                <ChevronRight size={16} />
              </span>
            )}
          </nav>
        ) : (
          <nav aria-label="Catalogue" className="justify-self-end">
            <Link
              href={isColophon ? '/' : '/colophon'}
              className="flex min-h-11 items-center gap-2 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.18em] text-ink-muted hover:text-white transition-colors"
            >
              <span>{isColophon ? 'Index' : 'Colophon'}</span>
              {!isColophon && <ArrowRight size={13} aria-hidden="true" />}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
