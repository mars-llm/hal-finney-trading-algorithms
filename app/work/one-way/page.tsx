'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import { sha256 } from '../../../lib/crypto';

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

  return (
    <div className="flex-1 flex flex-col min-h-[38rem] relative pb-20">
      
      {/* History Trace (Top Barcode) */}
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

      {/* Main Visualization */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 pt-24 pb-8 md:p-12 z-10">
        <div className="w-full max-w-sm mb-10 flex flex-col gap-2 pointer-events-auto">
           <label className="font-mono text-[10px] text-ink-muted uppercase tracking-widest text-center">Initial State (Seed)</label>
           <input 
             type="text" 
             value={seedText}
             onChange={(e) => setSeedText(e.target.value)}
             className="bg-transparent border-b border-white/20 text-white font-mono text-xs text-center pb-2 focus:outline-none focus:border-white/50 transition-colors w-full"
             placeholder="Enter seed text..."
             maxLength={32}
           />
        </div>

        <div className="w-full max-w-4xl h-64 md:h-96 flex items-end justify-between gap-1 md:gap-2 pointer-events-none">
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
      </div>

      {/* Control */}
      <div className="p-6 md:p-12 flex flex-col items-center gap-4 z-10 bg-gradient-to-t from-[#0E0E0E] to-transparent">
        <button
          onClick={advance}
          disabled={isComputing}
          className="px-8 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-sm tracking-widest hover:bg-white transition-colors disabled:opacity-50 border border-white/20 hover:border-white"
        >
          {isComputing ? 'COMPUTING...' : 'TRANSFORM ( f(x) )'}
        </button>
        <p className="font-mono text-[10px] text-ink-muted text-center">
          Irreversible forward progression. Prior states cannot be recovered.
        </p>
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
