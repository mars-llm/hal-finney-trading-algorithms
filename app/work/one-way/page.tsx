'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import { bytesToHex, sha256 } from '../../../lib/crypto';

export default function OneWay() {
  const [seedText, setSeedText] = useState("CRYPTOGRAPHIC_ARTS");
  const [currentHash, setCurrentHash] = useState<Uint8Array | null>(null);
  const [history, setHistory] = useState<string[]>([]); // store hex strings of history
  const [isComputing, setIsComputing] = useState(false);
  const requestIdRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  const initialize = useCallback(async (text: string) => {
    const requestId = ++requestIdRef.current;
    setIsComputing(true);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    const padded = new Uint8Array(32);
    padded.set(bytes.slice(0, 32));
    
    const out = await sha256(padded);
    if (requestId !== requestIdRef.current) return;
    setCurrentHash(out);
    setHistory([]);
    setIsComputing(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initialize(seedText);
  }, [initialize, seedText]);

  const advance = async () => {
    if (!currentHash || isComputing) return;
    const requestId = ++requestIdRef.current;
    setIsComputing(true);
    
    // Convert current to hex for history trace
    const hex = Array.from(currentHash).map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Compute next
    const nextHash = await sha256(currentHash);
    if (requestId !== requestIdRef.current) return;
    
    setHistory(prev => [...prev, hex]);
    setCurrentHash(nextHash);
    setIsComputing(false);
  };

  if (!currentHash) return null;

  const currentHex = bytesToHex(currentHash);
  const previousHex = history.length > 0 ? history[history.length - 1] : null;
  const chainPosition = history.length + 1;

  return (
    <div className="flex-1 flex flex-col min-h-[38rem] relative px-4 py-8 pb-24 md:px-12 md:py-12 md:pb-24">
      <div className="absolute top-8 left-5 right-5 md:top-12 md:left-12 md:right-12 flex flex-col gap-[1px] opacity-20 pointer-events-none z-0" aria-hidden="true">
        {history.slice(-20).map((hex, i) => (
          <div key={`${hex}-${i}`} className="h-px w-full flex"> 
             {/* Render hex as a barcode line */}
             {Array.from(hex).map((char, j) => {
               const val = parseInt(char, 16);
               return (
                 <div 
                   key={j} 
                   className="flex-1 h-full" 
                   style={{ backgroundColor: val > 7 ? 'rgba(255,255,255,0.8)' : 'transparent' }}
                 />
               );
             })}
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center pt-16 md:pt-20">
        <header className="w-full max-w-2xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Iterated SHA-256</p>
          <h2 className="mt-3 font-serif text-2xl text-white">Each step hashes the digest in front of it.</h2>
          <p className="mt-2 text-sm text-ink-muted">The chain is deterministic. The arrow points only forward.</p>
        </header>

        <div className="mt-7 flex w-full max-w-2xl flex-col gap-3 border-y border-white/15 py-4 sm:flex-row sm:items-end sm:gap-5">
          <label className="min-w-0 flex-1 space-y-2 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
            <span className="block text-center sm:text-left">Seed text</span>
            <input
              type="text"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value)}
              className="w-full border-b border-white/20 bg-transparent pb-2 text-center font-mono text-xs text-white transition-colors focus:border-white/50 focus:outline-none sm:text-left"
              placeholder="Enter seed text"
              maxLength={32}
            />
          </label>
          <button
            type="button"
            onClick={advance}
            disabled={isComputing}
            className="min-h-12 shrink-0 border border-white/30 bg-[#D4D4D4] px-6 font-mono text-[10px] uppercase tracking-widest text-[#0E0E0E] transition-colors hover:bg-white disabled:opacity-50"
          >
            {isComputing ? 'Hashing' : 'Hash current digest'}
          </button>
        </div>

        <section className="mt-8 w-full max-w-2xl border border-white/10 bg-[#0a0a0a] px-5 py-5 text-center font-mono text-[10px] uppercase tracking-widest">
          <p className="text-ink-muted">Chain position</p>
          <p className="mt-2 text-xl text-white">H<sup>{chainPosition}</sup>(seed)</p>
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-left">
            <div className="min-w-0">
              <p className="text-[9px] text-ink-muted">{previousHex ? `H${chainPosition - 1}(seed)` : 'seed'}</p>
              <p className="mt-1 truncate text-white">{previousHex ? `${previousHex.slice(0, 16)}…` : `"${seedText || 'empty'}"`}</p>
            </div>
            <div className="text-accent">SHA-256 →</div>
            <div className="min-w-0 text-right">
              <p className="text-[9px] text-ink-muted">H{chainPosition}(seed)</p>
              <p className="mt-1 truncate text-white">{currentHex.slice(0, 16)}…</p>
            </div>
          </div>
        </section>

        <div className="mt-8 flex h-48 w-full max-w-4xl items-end justify-between gap-1 md:h-72 md:gap-2 pointer-events-none">
          {Array.from(currentHash).map((byte, i) => {
            const heightPct = (byte / 255) * 100;
            return (
              <motion.div
                key={`bar-${i}`}
                initial={shouldReduceMotion ? false : { height: 0 }}
                animate={{ height: `${heightPct}%` }}
                transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 20, stiffness: 100 }}
                className="flex-1 bg-[#D4D4D4] rounded-none opacity-80"
              />
            );
          })}
        </div>
        <p className="mt-5 max-w-xl text-center font-sans text-sm text-ink-muted">
          The bars are the current 32-byte digest. Earlier values stay in the trace for comparison, not because the current digest can reveal them.
        </p>
        {history.length > 0 && (
          <div className="mt-6 flex w-full max-w-2xl flex-wrap justify-center gap-x-4 gap-y-2 font-mono text-[9px] uppercase tracking-widest text-ink-muted">
            <span>Recent states</span>
            {history.slice(-4).map((digest, index) => <span key={`${digest}-${index}`}>H{Math.max(1, chainPosition - history.slice(-4).length + index)} {digest.slice(0, 8)}…</span>)}
          </div>
        )}
      </div>

      <InfoPanel
        references={[
  {
    title: "Cryptographic One-way Functions",
    url: "https://en.wikipedia.org/wiki/One-way_function",
    summary: "Mathematical functions that are easy to compute but hard to invert."
  },
  {
    title: "Bitcoin Core: src/crypto/sha256.cpp",
    url: "https://github.com/bitcoin/bitcoin/blob/master/src/crypto/sha256.cpp",
    summary: "Bitcoin's implementation of SHA-256 used as a one-way function in mining and address generation."
  }
]} 
        title="One Way"
        year={2026}
        process="Iterated Hash Chain"
        proposition="A hash chain is easy to advance and hard to reverse from its current digest alone."
        technicalRecord={{
          algorithm: "SHA-256(n-1)",
          seed: "CRYPTOGRAPHIC_ARTS_ONE_WAY_SEED",
          renderer: "React/Motion 32-Channel Amplitude"
        }}
      >
        <p>
          A one-way function is practical to evaluate in the forward direction and intended to be
          infeasible to invert. This work uses SHA-256 to make that direction visible.
        </p>
        <p>
          The 32 bars encode the current 32-byte digest. Each transformation hashes that digest to
          produce the next one. The display retains a faint trace of prior states, but the current
          digest alone does not reveal its predecessor.
        </p>
        <p>
          The chain is deterministic: the same seed produces the same sequence. The barcode records
          that sequence as it is generated. It is not an inversion of the current hash.
        </p>
        </InfoPanel>
    </div>
  );
}
