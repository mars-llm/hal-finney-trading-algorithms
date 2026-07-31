'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import { bytesToHex } from '../../../lib/crypto';
import {
  LamportPrivateKey,
  LamportPublicKey,
  LamportSignature,
  digestBits,
  generateLamportKeyPair,
  hashMessage,
  lamportPublicKeyFingerprint,
  lamportSignatureFingerprint,
  signLamportMessage,
  verifyLamportSignature,
} from '../../../lib/lamport';

type Verification = 'valid' | 'invalid' | null;

export default function PostQuantum() {
  const [message, setMessage] = useState('HASH');
  const [privateKey, setPrivateKey] = useState<LamportPrivateKey | null>(null);
  const [publicKey, setPublicKey] = useState<LamportPublicKey | null>(null);
  const [publicFingerprint, setPublicFingerprint] = useState('');
  const [signature, setSignature] = useState<LamportSignature | null>(null);
  const [signatureFingerprint, setSignatureFingerprint] = useState('');
  const [signedDigest, setSignedDigest] = useState<Uint8Array | null>(null);
  const [currentDigest, setCurrentDigest] = useState('');
  const [verification, setVerification] = useState<Verification>(null);
  const [isWorking, setIsWorking] = useState(false);

  const generateKey = async () => {
    setIsWorking(true);
    try {
      const keyPair = await generateLamportKeyPair();
      setPrivateKey(keyPair.privateKey);
      setPublicKey(keyPair.publicKey);
      setPublicFingerprint(await lamportPublicKeyFingerprint(keyPair.publicKey));
      setSignature(null);
      setSignatureFingerprint('');
      setSignedDigest(null);
      setCurrentDigest('');
      setVerification(null);
    } finally {
      setIsWorking(false);
    }
  };

  const signOnce = async () => {
    if (!privateKey || !publicKey) return;
    setIsWorking(true);
    try {
      const signed = await signLamportMessage(privateKey, message);
      const isValid = await verifyLamportSignature(publicKey, message, signed.signature);
      setSignature(signed.signature);
      setSignedDigest(signed.digest);
      setSignatureFingerprint(await lamportSignatureFingerprint(signed.signature));
      setCurrentDigest(bytesToHex(signed.digest));
      setVerification(isValid ? 'valid' : 'invalid');
      setPrivateKey(null);
    } finally {
      setIsWorking(false);
    }
  };

  const verifyCurrentMessage = async () => {
    if (!publicKey || !signature) return;
    setIsWorking(true);
    try {
      const digest = await hashMessage(message);
      setCurrentDigest(bytesToHex(digest));
      setVerification(
        await verifyLamportSignature(publicKey, message, signature)
          ? 'valid'
          : 'invalid',
      );
    } finally {
      setIsWorking(false);
    }
  };

  const bits = signedDigest ? digestBits(signedDigest) : [];

  return (
    <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-6 md:p-12 py-12 relative min-h-max">
      <div className="w-full max-w-4xl flex flex-col items-center gap-8 md:gap-10">
        <header className="w-full max-w-md text-center">
          <input
            type="text"
            value={message}
            maxLength={32}
            onChange={(event) => {
              setMessage(event.target.value.slice(0, 32));
              setCurrentDigest('');
              setVerification(null);
            }}
            placeholder="Message to sign"
            className="w-full bg-transparent border-b border-white/20 text-center font-mono text-xl py-2 focus:outline-none focus:border-white transition-colors"
            aria-label="Message to sign or verify"
          />
          <p className="font-mono text-[10px] text-ink-muted uppercase mt-3">
            UTF-8 Message · Maximum 32 Characters
          </p>
        </header>

        <div className="w-full space-y-6">
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
                {signatureFingerprint ? `${signatureFingerprint.slice(0, 32)}…` : 'NOT CREATED'}
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

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {!publicKey || !privateKey ? (
              <button
                onClick={generateKey}
                disabled={isWorking}
                className="px-7 py-3 border border-white/30 text-white font-mono text-xs tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isWorking ? 'GENERATING 512 HASHES…' : publicKey ? 'GENERATE FRESH ONE-TIME KEY' : 'GENERATE ONE-TIME KEY'}
              </button>
            ) : (
              <button
                onClick={signOnce}
                disabled={isWorking}
                className="px-7 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-xs tracking-widest hover:bg-white transition-colors disabled:opacity-50"
              >
                {isWorking ? 'SIGNING…' : 'SIGN ONCE / DISCARD PRIVATE KEY'}
              </button>
            )}
            {signature && (
              <button
                onClick={verifyCurrentMessage}
                disabled={isWorking}
                className="px-7 py-3 border border-white/30 text-white font-mono text-xs tracking-widest hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {isWorking ? 'VERIFYING 256 BLOCKS…' : 'VERIFY CURRENT MESSAGE'}
              </button>
            )}
          </div>

          <div className="min-h-14 text-center font-mono text-[10px] tracking-wider uppercase space-y-2">
            {verification && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={verification === 'valid' ? 'text-white' : 'text-[#ef4444]'}
              >
                {verification === 'valid'
                  ? 'VALID: ALL 256 REVEALED BLOCKS MATCH THE PUBLIC KEY'
                  : 'INVALID: THE MESSAGE DIGEST SELECTS DIFFERENT PUBLIC BLOCKS'}
              </motion.p>
            )}
            {currentDigest && (
              <p className="text-ink-muted opacity-50 break-all">
                CURRENT H(M): {currentDigest.slice(0, 40)}…
              </p>
            )}
            {signature && (
              <p className="text-[#ef4444] opacity-80">
                PRIVATE KEY DISCARDED AFTER USE · GENERATE A FRESH KEY TO SIGN AGAIN
              </p>
            )}
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
