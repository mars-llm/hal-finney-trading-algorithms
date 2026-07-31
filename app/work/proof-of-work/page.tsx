'use client';

import { useState, useRef, useEffect } from 'react';
import { InfoPanel } from '../../../components/InfoPanel';
import { countLeadingZeroBits, bytesToHex } from '../../../lib/crypto';

export default function ProofOfWork() {
  const [blockData, setBlockData] = useState('CRYPTOGRAPHIC_ARTS_BLOCK_DATA');
  const [targetBits, setTargetBits] = useState(12);
  const [nonce, setNonce] = useState(0);
  const [currentHash, setCurrentHash] = useState<Uint8Array | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [success, setSuccess] = useState(false);
  const miningRef = useRef(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    return () => {
      miningRef.current = false;
      runIdRef.current += 1;
    };
  }, []);

  const mine = async () => {
    if (miningRef.current) return;
    const runId = ++runIdRef.current;
    miningRef.current = true;
    setIsMining(true);
    setSuccess(false);
    
    let n = success ? nonce : 0;
    const encoder = new TextEncoder();
    const prefix = encoder.encode(blockData);
    
    const tick = async () => {
      if (!miningRef.current || runId !== runIdRef.current) return;
      
      let found = false;
      let hash = new Uint8Array(32);
      
      // Small batches keep the changing nonce perceptible and the halt control responsive.
      for (let i = 0; i < 64; i++) {
        if (!miningRef.current || runId !== runIdRef.current) return;
        n++;
        const nonceBytes = encoder.encode(n.toString());
        const combined = new Uint8Array(prefix.length + nonceBytes.length);
        combined.set(prefix);
        combined.set(nonceBytes, prefix.length);
        
        const h = await crypto.subtle.digest('SHA-256', combined);
        if (!miningRef.current || runId !== runIdRef.current) return;
        hash = new Uint8Array(h);
        
        if (countLeadingZeroBits(hash) >= targetBits) {
          found = true;
          break;
        }
      }

      if (!miningRef.current || runId !== runIdRef.current) return;
      
      setNonce(n);
      setCurrentHash(hash);
      
      if (found) {
        miningRef.current = false;
        setIsMining(false);
        setSuccess(true);
      } else {
        requestAnimationFrame(() => void tick());
      }
    };
    
    requestAnimationFrame(() => void tick());
  };

  const stop = () => {
    miningRef.current = false;
    runIdRef.current += 1;
    setIsMining(false);
  };

  const resetResult = () => {
    stop();
    setNonce(0);
    setCurrentHash(null);
    setSuccess(false);
  };

  const changeDifficulty = (nextDifficulty: number) => {
    setTargetBits(nextDifficulty);
    resetResult();
  };

  const renderBits = () => {
    if (!currentHash) return null;
    const hex = bytesToHex(currentHash);
    const bits = Array.from(hex).map(char => parseInt(char, 16).toString(2).padStart(4, '0')).join('');
    
    return (
      <div className="font-mono text-sm break-all leading-loose opacity-80 max-w-lg mx-auto tracking-widest text-center">
        {Array.from(bits).map((bit, i) => (
          <span key={i} className={i < targetBits && success ? 'text-accent font-bold' : (success ? 'opacity-30' : '')}>
            {bit}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col relative items-center justify-center px-5 py-10 pb-24 md:p-12 md:pb-24">
      
      <div className="w-full max-w-2xl space-y-9 md:space-y-12">
        <div className="mx-auto w-full max-w-md space-y-2">
          <label htmlFor="pow-block-data" className="block text-center font-mono text-[10px] text-ink-muted uppercase tracking-widest">
            Block data
          </label>
          <input
            id="pow-block-data"
            type="text"
            value={blockData}
            maxLength={64}
            disabled={isMining}
            onChange={(event) => {
              setBlockData(event.target.value);
              resetResult();
            }}
            className="w-full border-b border-white/20 bg-transparent pb-2 text-center font-mono text-xs text-white transition-colors focus:border-white/60 focus:outline-none disabled:opacity-40"
          />
        </div>
        
        <div className="text-center space-y-4">
          <p className="font-mono text-[10px] text-ink-muted uppercase tracking-widest">
            Target Constraint: {targetBits} Leading Zero Bits
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              aria-label="Decrease target by four leading zero bits"
              onClick={() => changeDifficulty(Math.max(8, targetBits - 4))}
              disabled={isMining || targetBits === 8}
              className="min-h-11 min-w-11 font-mono text-xs text-ink-muted hover:text-white disabled:opacity-20"
            >
              −4
            </button>
            <span className="min-w-10 font-mono text-xl" aria-live="polite">{targetBits}</span>
            <button
              type="button"
              aria-label="Increase target by four leading zero bits"
              onClick={() => changeDifficulty(Math.min(16, targetBits + 4))}
              disabled={isMining || targetBits === 16}
              className="min-h-11 min-w-11 font-mono text-xs text-ink-muted hover:text-white disabled:opacity-20"
            >
              +4
            </button>
          </div>
          <p className="font-mono text-[9px] text-ink-muted uppercase tracking-widest">
            Expected search: approximately 2^{targetBits} attempts
          </p>
        </div>

        <div className="min-h-40 md:h-48 flex items-center justify-center bg-[#0a0a0a] border border-white/5 p-5">
          {currentHash ? (
            renderBits()
          ) : (
            <span className="font-mono text-xs opacity-30">AWAITING COMPUTATION</span>
          )}
        </div>

        <div className="text-center space-y-2" aria-live="polite">
          <p className="font-mono text-xs opacity-40 uppercase tracking-widest">Current Nonce</p>
          <p className="font-mono text-2xl tracking-widest text-[#3B82F6]">{nonce}</p>
        </div>

        <div className="flex justify-center pt-8">
          {isMining ? (
            <button
              onClick={stop}
              className="px-8 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-sm tracking-widest hover:bg-white transition-colors border border-white/20 hover:border-white"
            >
              HALT
            </button>
          ) : (
            <button
              onClick={mine}
              className="px-8 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-sm tracking-widest hover:bg-white transition-colors border border-white/20 hover:border-white"
            >
              {success ? 'FIND NEXT VALID NONCE' : 'BEGIN WORK'}
            </button>
          )}
        </div>

      </div>

      <InfoPanel
        references={[
  {
    title: "Bitcoin Whitepaper (2008)",
    url: "https://bitcoin.org/bitcoin.pdf",
    summary: "Satoshi Nakamoto's original paper describing the Bitcoin system and its use of Proof-of-Work."
  },
  {
    title: "Bitcoin Core: src/pow.cpp",
    url: "https://github.com/bitcoin/bitcoin/blob/master/src/pow.cpp",
    summary: "Bitcoin's implementation of the Proof-of-Work difficulty adjustment and validation logic."
  }
]} 
        title="Proof of Work"
        year={2026}
        process="Leading-Zero Target Search"
        proposition="Asymmetric effort: computationally expensive to discover, trivial to verify."
        technicalRecord={{
          algorithm: "SHA-256",
          seed: "User-supplied block data + decimal nonce",
          renderer: "React/DOM Text Flow"
        }}
      >
        <p>
          Proof of Work relies on the unpredictability of cryptographic hash functions. By requiring a hash 
          output to begin with a specific number of zero bits, the system forces the prover to engage in 
          brute-force computation—iterating a &quot;nonce&quot; value until a rare, valid output is discovered.
        </p>
        <p>
          This asymmetry is the foundation of decentralized consensus. While it may take millions of iterations 
          to find a valid nonce, any observer can verify the solution instantly with a single hash computation.
        </p>
        <p>
          This browser-scale search demonstrates the same discovery-versus-verification asymmetry used by
          Hashcash (1997) and Bitcoin (2008). It does not reproduce Bitcoin block serialization, double SHA-256,
          or network difficulty.
        </p>
        </InfoPanel>
    </div>
  );
}
