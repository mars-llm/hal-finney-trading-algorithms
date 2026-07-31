'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import { sha256, bytesToBits, flipBit } from '../../../lib/crypto';

export default function Avalanche() {
  const [seedText, setSeedText] = useState("CRYPTOGRAPHIC_ARTS");
  const [inputBytes, setInputBytes] = useState<Uint8Array | null>(null);
  const [outputBytes, setOutputBytes] = useState<Uint8Array | null>(null);
  const [inputBits, setInputBits] = useState<boolean[]>([]);
  const [outputBits, setOutputBits] = useState<boolean[]>([]);
  const [prevOutputBits, setPrevOutputBits] = useState<boolean[]>([]);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [activeBit, setActiveBit] = useState(0);
  const requestIdRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();

  const initialize = useCallback(async (text: string) => {
    const requestId = ++requestIdRef.current;
    const encoder = new TextEncoder();
    const bytes = encoder.encode(text);
    // Pad or truncate to exactly 32 bytes
    const padded = new Uint8Array(32);
    padded.set(bytes.slice(0, 32));
    
    const out = await sha256(padded);
    if (requestId !== requestIdRef.current) return;
    
    setInputBytes(padded);
    setOutputBytes(out);
    setInputBits(bytesToBits(padded));
    
    const outBits = bytesToBits(out);
    setOutputBits(outBits);
    setPrevOutputBits(outBits);
    setFlippedIndex(null);
    setActiveBit(0);
  }, []);

  useEffect(() => {
    initialize(seedText);
  }, [initialize, seedText]);

  const handleBitClick = async (index: number) => {
    if (!inputBytes) return;

    const requestId = ++requestIdRef.current;
    setFlippedIndex(index);
    setActiveBit(index);
    const newInputBytes = flipBit(inputBytes, index);
    setInputBytes(newInputBytes);
    setInputBits(bytesToBits(newInputBytes));

    const newOutputBytes = await sha256(newInputBytes);
    if (requestId !== requestIdRef.current) return;

    setPrevOutputBits(outputBits);
    setOutputBytes(newOutputBytes);
    setOutputBits(bytesToBits(newOutputBytes));
  };

  const moveActiveBit = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next = activeBit;
    if (event.key === 'ArrowLeft') next = Math.max(0, activeBit - 1);
    else if (event.key === 'ArrowRight') next = Math.min(255, activeBit + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, activeBit - 16);
    else if (event.key === 'ArrowDown') next = Math.min(255, activeBit + 16);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 255;
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void handleBitClick(activeBit);
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveBit(next);
  };

  const handleGridPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const column = Math.min(15, Math.max(0, Math.floor(((event.clientX - bounds.left) / bounds.width) * 16)));
    const row = Math.min(15, Math.max(0, Math.floor(((event.clientY - bounds.top) / bounds.height) * 16)));
    void handleBitClick(row * 16 + column);
  };

  if (!inputBytes || !outputBytes) return null;

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-4 py-10 pb-24 md:p-12 md:pb-24 relative">
      
      <div className="w-full max-w-sm mb-10 flex flex-col gap-2">
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

      <div className="w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16">
        {/* Input Grid */}
        <div className="w-full max-w-[20rem] flex flex-col items-center gap-5">
          <h2 className="font-mono text-xs tracking-widest text-ink-muted uppercase">Input (256 bits)</h2>
          <div
            role="grid"
            tabIndex={0}
            aria-label={`256 input bits. Bit ${activeBit} selected. Use arrow keys to move and Enter or Space to invert.`}
            aria-activedescendant={`input-bit-${activeBit}`}
            onKeyDown={moveActiveBit}
            onPointerUp={handleGridPointer}
            className="grid aspect-square w-full grid-cols-16 gap-[3px] bg-white/[0.04] p-3 cursor-crosshair touch-none"
          >
            {inputBits.map((bit, i) => (
              <span
                key={`in-${i}`}
                id={`input-bit-${i}`}
                role="gridcell"
                aria-label={`Bit ${i}: ${bit ? 1 : 0}`}
                aria-selected={activeBit === i}
                className={`aspect-square transition-colors duration-200 ${
                  bit ? 'bg-white opacity-85' : 'bg-white opacity-5'
                } ${flippedIndex === i ? 'bg-accent opacity-100' : ''} ${
                  activeBit === i ? 'ring-1 ring-accent ring-offset-1 ring-offset-canvas' : ''
                }`}
              />
            ))}
          </div>
          <div className="w-full flex items-end gap-3">
            <label className="min-w-0 flex-1 space-y-2 font-mono text-[9px] text-ink-muted uppercase tracking-widest">
              <span className="flex justify-between">
                <span>Selected bit</span>
                <output>{activeBit}</output>
              </span>
              <input
                type="range"
                min={0}
                max={255}
                value={activeBit}
                onChange={(event) => setActiveBit(Number(event.target.value))}
                className="w-full accent-[#3b82f6]"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleBitClick(activeBit)}
              className="min-h-11 shrink-0 border border-white/25 px-4 font-mono text-[9px] uppercase tracking-widest text-ink hover:border-white/60 hover:text-white transition-colors"
            >
              Invert
            </button>
          </div>
          <p className="font-mono text-[10px] text-ink-muted text-center">
            Tap the field or select an exact bit to invert.
          </p>
        </div>

        {/* Connection / Divider */}
        <div className="hidden lg:flex flex-col items-center gap-2 opacity-30">
          <div className="w-px h-12 bg-white" />
          <span className="font-mono text-xs rotate-90 my-4 text-white">SHA-256</span>
          <div className="w-px h-12 bg-white" />
        </div>
        <div className="lg:hidden flex items-center gap-2 opacity-30 my-1">
          <div className="h-px w-12 bg-white" />
          <span className="font-mono text-[10px] text-white">SHA-256</span>
          <div className="h-px w-12 bg-white" />
        </div>

        {/* Output Grid */}
        <div className="w-full max-w-[20rem] flex flex-col items-center gap-5">
          <h2 className="font-mono text-xs tracking-widest text-ink-muted uppercase">Output (256 bits)</h2>
          <div className="grid aspect-square w-full grid-cols-16 gap-[3px] bg-white/[0.04] p-3" aria-label="256-bit SHA-256 output">
            {outputBits.map((bit, i) => {
              const hasChanged = prevOutputBits.length > 0 && prevOutputBits[i] !== bit;
              return (
                <motion.div
                  key={`out-${i}-${bit}`} // Force remount on bit change for animation
                  aria-hidden="true"
                  initial={!shouldReduceMotion && hasChanged ? { scale: 0.5, backgroundColor: 'var(--color-accent)' } : false}
                  animate={{ scale: 1, backgroundColor: bit ? '#ffffff' : '#ffffff' }}
                  style={{ opacity: bit ? 0.85 : 0.05 }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: 'easeOut' }}
                  className="aspect-square"
                />
              );
            })}
          </div>
          <p className="font-mono text-[10px] text-ink-muted text-center max-w-[200px]">
            {flippedIndex !== null ? (
              <span>
                Changed bits: <span className="text-accent">{outputBits.filter((b, i) => b !== prevOutputBits[i]).length}</span> / 256
              </span>
            ) : (
              'Observe the avalanche effect.'
            )}
          </p>
        </div>
      </div>

      <InfoPanel
        references={[
  {
    title: "NIST FIPS 180-4 (Secure Hash Standard)",
    url: "https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf",
    summary: "The official NIST specification for the SHA-256 hash function."
  },
  {
    title: "Bitcoin Core: src/crypto/sha256.cpp",
    url: "https://github.com/bitcoin/bitcoin/blob/master/src/crypto/sha256.cpp",
    summary: "Implementation of SHA-256 used in the Bitcoin protocol."
  }
]} 
        title="Avalanche"
        year={2026}
        process="SHA-256 Hash Function"
        proposition="A minimal change in input state yields a catastrophic reorganization of output state."
        technicalRecord={{
          algorithm: "SHA-256",
          seed: "CRYPTOGRAPHIC_ARTS_AVALANCHE_SEED",
          renderer: "React/Motion 2D Grid"
        }}
      >
        <p>
          This work visualizes the cryptographic property known as the &quot;avalanche effect.&quot; 
          In a strong cryptographic hash function, flipping a single bit of the input should, 
          on average, cause exactly half of the output bits to flip.
        </p>
        <p>
          The left grid represents 256 bits of input data. The right grid represents the 256-bit 
          SHA-256 digest of that data. When you interact with the piece by inverting a single 
          input cell, the underlying mathematical structure cascades that change through multiple 
          rounds of non-linear transformations.
        </p>
        <p>
          The resulting visual explosion of changed bits demonstrates why it is computationally 
          infeasible to work backward from a hash to its source: continuity and locality are entirely destroyed.
        </p>
        </InfoPanel>
    </div>
  );
}
