'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Info, X } from 'lucide-react';

export interface Reference {
  title: string;
  summary: string;
  url: string;
}

interface InfoPanelProps {
  title: string;
  year: number;
  process: string;
  proposition: string;
  children?: React.ReactNode;
  technicalRecord?: {
    algorithm: string;
    seed: string;
    renderer: string;
  };
  references?: Reference[];
}

export function InfoPanel({ title, year, process, proposition, children, technicalRecord, references }: InfoPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isOpen) return;

    const opener = openerRef.current;
    const backgroundState = Array.from(document.body.children)
      .filter((element): element is HTMLElement => (
        element instanceof HTMLElement && !element.hasAttribute('data-info-overlay')
      ))
      .map((element) => ({
        element,
        inert: element.inert,
        ariaHidden: element.getAttribute('aria-hidden'),
      }));

    backgroundState.forEach(({ element }) => {
      element.inert = true;
      element.setAttribute('aria-hidden', 'true');
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      backgroundState.forEach(({ element, inert, ariaHidden }) => {
        element.inert = inert;
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden');
        } else {
          element.setAttribute('aria-hidden', ariaHidden);
        }
      });
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [isOpen]);

  const close = () => setIsOpen(false);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('hidden'));

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          data-info-overlay
          initial={shouldReduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          className="fixed inset-0 z-[100] bg-canvas/85 backdrop-blur-sm flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            initial={shouldReduceMotion ? false : { y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { y: 32, opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 240 }}
            className="w-full sm:w-[600px] max-w-full max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-2rem)] bg-[#0a0a0a] border-t sm:border border-white/10 shadow-2xl overflow-y-auto overscroll-contain p-6 pb-10 md:p-10 relative"
            onKeyDown={handleDialogKeyDown}
          >
            <button
              ref={closeRef}
              onClick={close}
              className="absolute top-4 right-4 md:top-6 md:right-6 grid size-11 place-items-center text-ink-muted hover:text-white transition-colors"
              aria-label="Close contextual information"
            >
              <X size={24} strokeWidth={1.5} aria-hidden="true" />
            </button>

            <div className="space-y-10 mt-2">
              <header className="space-y-2 pr-12">
                <h2 id={titleId} className="font-serif text-3xl tracking-wide text-white">{title}</h2>
                <p className="font-mono text-xs text-ink-muted tracking-widest">{year}</p>
              </header>

              <div className="space-y-1">
                <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">Process</p>
                <p className="font-serif text-lg text-ink">{process}</p>
              </div>

              <div className="space-y-1">
                <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">Proposition</p>
                <p id={descriptionId} className="font-sans text-sm leading-relaxed text-ink">{proposition}</p>
              </div>

              {children && (
                <div className="space-y-4 font-sans text-sm leading-relaxed text-ink opacity-80">
                  {children}
                </div>
              )}

              {technicalRecord && (
                <div className="pt-8 border-t border-white/10 space-y-4">
                  <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">Technical Record</p>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-[10px] text-ink-muted break-words bg-white/5 p-4 border border-white/10">
                    <div className="flex flex-col gap-1">
                      <dt className="opacity-40 uppercase">Algorithm</dt>
                      <dd className="text-ink">{technicalRecord.algorithm}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="opacity-40 uppercase">Seed</dt>
                      <dd className="text-ink">{technicalRecord.seed}</dd>
                    </div>
                    <div className="flex flex-col gap-1">
                      <dt className="opacity-40 uppercase">Renderer</dt>
                      <dd className="text-ink">{technicalRecord.renderer}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {references && references.length > 0 && (
                <div className="pt-8 border-t border-white/10 space-y-4">
                  <p className="font-mono text-xs text-ink-muted uppercase tracking-wider">References in Practice</p>
                  <div className="flex flex-col gap-4">
                    {references.map((reference) => (
                      <div key={reference.url} className="p-4 border border-white/10 bg-white/5 flex flex-col gap-2">
                        <h3 className="font-mono text-xs text-white uppercase tracking-widest leading-relaxed">{reference.title}</h3>
                        <p className="font-sans text-xs text-ink opacity-80 leading-relaxed">{reference.summary}</p>
                        <a href={reference.url} target="_blank" rel="noreferrer" className="mt-2 min-h-11 flex items-center font-mono text-[10px] text-accent hover:text-white uppercase tracking-widest transition-colors w-fit underline decoration-white/30">
                          View Source &rarr;
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={openerRef}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-16 md:right-8 z-30 min-h-11 border border-white/25 bg-canvas/95 px-3 text-ink hover:border-white/60 hover:text-white transition-colors flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] uppercase"
        aria-label="View contextual information"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <Info size={17} strokeWidth={1.5} aria-hidden="true" />
        <span className="hidden sm:inline">Context / Info</span>
      </button>

      {typeof document !== 'undefined' ? createPortal(overlay, document.body) : null}
    </>
  );
}
