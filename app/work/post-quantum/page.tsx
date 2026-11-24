'use client';

import { useReducer, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import { bytesToHex } from '../../../lib/crypto';
import {
  digestBits,
  generateLamportKeyPair,
  hashMessage,
  lamportPublicKeyFingerprint,
  lamportSignatureFingerprint,
  signLamportMessage,
  verifyLamportSignature,
} from '../../../lib/lamport';
import { lamportReducer } from '../../../lib/lamport-machine';

export default function PostQuantum() {
  const [message, setMessage] = useState('HASH');
  const [state, dispatch] = useReducer(lamportReducer, { phase: 'empty' });
  const busyRef = useRef(false);
  const isWorking = state.phase === 'generating' || state.phase === 'signing' || state.phase === 'verifying';
  const signed = state.phase === 'signed' || state.phase === 'verifying' ? state.data : null;
  const publicFingerprint = state.phase === 'ready' || state.phase === 'signing' ? state.publicFingerprint : signed?.publicFingerprint ?? '';
  const verification = signed?.verification ?? null;

  const generateKey = async () => {
    if (busyRef.current || (state.phase !== 'empty' && state.phase !== 'signed' && state.phase !== 'error')) return;
    busyRef.current = true;
    dispatch({ type: 'generate' });
    try {
      const keyPair = await generateLamportKeyPair();
      const fingerprint = await lamportPublicKeyFingerprint(keyPair.publicKey);
      dispatch({ type: 'generated', ...keyPair, publicFingerprint: fingerprint });
    } catch {
      dispatch({ type: 'failed', message: 'Key generation failed. Try again.' });
    } finally {
      busyRef.current = false;
    }
  };

  const signOnce = async () => {
    if (busyRef.current || state.phase !== 'ready') return;
    busyRef.current = true;
    const { privateKey, publicKey } = state;
    const signedMessage = message;
    dispatch({ type: 'sign', message: signedMessage });
    try {
      const result = await signLamportMessage(privateKey, signedMessage);
      const isValid = await verifyLamportSignature(publicKey, signedMessage, result.signature);
      const fingerprint = await lamportSignatureFingerprint(result.signature);
      dispatch({ type: 'signed', signature: result.signature, signatureFingerprint: fingerprint, signedDigest: result.digest, digest: bytesToHex(result.digest), valid: isValid });
    } catch {
      dispatch({ type: 'failed', message: 'Signing failed. Generate a fresh key before trying again.' });
    } finally {
      busyRef.current = false;
    }
  };

  const verifyCurrentMessage = async () => {
    if (busyRef.current || state.phase !== 'signed') return;
    busyRef.current = true;
    const { publicKey, signature } = state.data;
    const checkedMessage = message;
    dispatch({ type: 'verify', message: checkedMessage });
    try {
      const digest = await hashMessage(checkedMessage);
      const valid = await verifyLamportSignature(publicKey, checkedMessage, signature);
      dispatch({ type: 'verified', digest: bytesToHex(digest), valid });
    } catch {
      dispatch({ type: 'failed', message: 'Verification failed. Generate a fresh key to start again.' });
    } finally {
      busyRef.current = false;
    }
  };

  const bits = signed ? digestBits(signed.signedDigest) : [];

  return (
    <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-6 md:p-12 py-12 relative min-h-max">
      <div className="w-full max-w-4xl flex flex-col items-center gap-8 md:gap-10">
        <header className="w-full max-w-md text-center">
          <input
            type="text"
            value={message}
            maxLength={32}
            disabled={isWorking}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, 32));
              dispatch({ type: 'edit' });
            }}
            placeholder="Message to sign"
            className="w-full bg-transparent border-b border-white/20 text-center font-mono text-xl py-2 focus:outline-none focus:border-white transition-colors"
            aria-label="Message to sign or verify"
          />
          <p className="font-mono text-[10px] text-ink-muted uppercase mt-3">
            UTF-8 Message · Maximum 32 Characters
          </p>
        </header>

        <div className="grid w-full gap-6">
          <div className="flex flex-col justify-center gap-3 sm:order-1 sm:flex-row">
            {state.phase !== 'ready' && state.phase !== 'signing' ? (
              <button
                onClick={generateKey}
                disabled={isWorking}
                className="px-7 py-3 border border-white/30 text-white font-mono text-xs tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {state.phase === 'generating' ? 'GENERATING 512 HASHES…' : signed ? 'GENERATE FRESH ONE-TIME KEY' : 'GENERATE ONE-TIME KEY'}
              </button>
            ) : (
              <button
                onClick={signOnce}
                disabled={isWorking}
                className="px-7 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50"
              >
                {state.phase === 'signing' ? 'SIGNING…' : 'SIGN ONCE / DISCARD PRIVATE KEY'}
              </button>
            )}
            {signed && (
              <button
                onClick={verifyCurrentMessage}
                disabled={isWorking}
                className="px-7 py-3 border border-white/30 text-white font-mono text-xs tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {state.phase === 'verifying' ? 'VERIFYING 256 BLOCKS…' : 'VERIFY CURRENT MESSAGE'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10 font-mono text-[10px]">
            <div className="bg-[#0a0a0a] p-5 space-y-2 min-w-0">
              <p className="text-ink-muted uppercase tracking-widest">Public Key</p>
              <p className="text-white break-all">
                {publicFingerprint ? `${publicFingerprint.slice(0, 32)}…` : 'NOT GENERATED'}
              </p>
              <p className="text-ink-muted opacity-50">512 SHA-256 HASH BLOCKS</p>
            </div>
            <div className="bg-[#0a0a0a] p-5 space-y-2 min-w-0">
              <p className="text-ink-muted uppercase tracking-widest">One-Time Signature</p>
              <p className="text-white break-all">
                {signed ? `${signed.signatureFingerprint.slice(0, 32)}…` : 'NOT CREATED'}
              </p>
              <p className="text-ink-muted opacity-50">256 REVEALED SECRET BLOCKS</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between font-mono text-[9px] text-ink-muted uppercase tracking-widest">
              <span>Signed SHA-256 Digest</span>
              <span>{bits.length ? '256 selected key halves' : 'Awaiting signature'}</span>
            </div>
            <div
              className="grid grid-cols-[repeat(16,minmax(0,1fr))] sm:grid-cols-[repeat(32,minmax(0,1fr))] gap-[2px] p-2 bg-[#0a0a0a] border border-white/5"
              aria-label={bits.length ? 'The 256 digest bits selecting Lamport secret blocks' : 'No signed digest'}
            >
              {Array.from({ length: 256 }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={bits.length ? { opacity: 0 } : false}
                  animate={{ opacity: bits.length ? 1 : 0.12 }}
                  transition={{ delay: bits.length ? Math.floor(index / 32) * 0.025 : 0 }}
                  className={`aspect-square ${
                    bits[index] === true
                      ? 'bg-white'
                      : bits[index] === false
                        ? 'bg-[#3B82F6]'
                        : 'bg-white/20'
                  }`}
                  title={bits.length ? `Digest bit ${index}: ${bits[index] ? 1 : 0}` : undefined}
                />
              ))}
            </div>
            <div className="flex justify-between font-mono text-[8px] text-ink-muted uppercase">
              <span>0 · blue</span>
              <span>255</span>
              <span>1 · white</span>
            </div>
          </div>

          <div className="min-h-14 text-center font-mono text-[10px] tracking-wider uppercase space-y-2 sm:order-2">
            {verification && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={verification.valid ? 'text-white' : 'text-[#ef4444]'}
              >
                {verification.valid
                  ? 'VALID: ALL 256 REVEALED BLOCKS MATCH THE PUBLIC KEY'
                  : 'INVALID: THE MESSAGE DIGEST SELECTS DIFFERENT PUBLIC BLOCKS'}
              </motion.p>
            )}
            {verification && (
              <p className="text-ink-muted opacity-50 break-all">
                CURRENT H(M): {verification.digest.slice(0, 40)}…
              </p>
            )}
            {signed && (
              <p className="text-[#ef4444] opacity-80">
                PRIVATE KEY DISCARDED AFTER USE · GENERATE A FRESH KEY TO SIGN AGAIN
              </p>
            )}
            {state.phase === 'error' && <p role="alert" className="text-[#ef4444]">{state.message}</p>}
          </div>
        </div>
      </div>

      <InfoPanel
        references={[
          {
            title: 'Lamport Signatures',
            url: 'https://en.wikipedia.org/wiki/Lamport_signature',
            summary: 'The construction of a one-time signature from pairs of secret values and a one-way hash function.',
          },
          {
            title: 'NIST FIPS 205: Stateless Hash-Based Digital Signature Standard',
            url: 'https://csrc.nist.gov/pubs/fips/205/final',
            summary: 'The standardized SLH-DSA hash-based signature system, derived from SPHINCS+ and designed for practical many-message use.',
          },
        ]}
        title="Lamport One-Time Signature"
        year={1979}
        process="Hash-Based One-Time Signing"
        proposition="Each bit of a message digest selects one secret from a pair; verification hashes every revealed secret against the corresponding public value."
        technicalRecord={{
          algorithm: 'Lamport OTS with SHA-256',
          seed: 'Web Crypto random 256-bit secret blocks',
          renderer: 'React/Web Crypto digest matrix',
        }}
      >
        <p>
          A Lamport key has 256 pairs of independent 32-byte secrets. Hashing all 512 secrets with SHA-256
          produces the public key. To sign, SHA-256 reduces the message to 256 bits; each digest bit selects
          one secret from its corresponding pair, producing a 256-block signature.
        </p>
        <p>
          The verifier hashes the current message, then hashes every revealed signature block and compares it
          with the selected public-key block. Change the message after signing and the digest selects different
          halves, so verification fails.
        </p>
        <p>
          Revealing half of every secret pair makes key reuse unsafe: signatures on different digests expose both
          alternatives at some positions. This work discards the private key after one signature. Production
          stateless hash-based systems such as SLH-DSA combine one-time and few-time signatures with Merkle trees.
        </p>
      </InfoPanel>
    </div>
  );
}
