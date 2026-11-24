'use client';

import { useReducer, useRef } from 'react';
import { motion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  SCHNORR_GROUP,
  createJointSchnorrTranscript,
  randomIntegerBelow,
} from '../../../lib/schnorr';
import { initialSchnorrState, schnorrReducer } from '../../../lib/schnorr-machine';

const MESSAGE = 'JOINT AUTHORIZATION';

export default function SchnorrSignatures() {
  const [state, dispatch] = useReducer(schnorrReducer, undefined, initialSchnorrState);
  const busyRef = useRef(false);
  const requestId = useRef(0);
  const { aliceSecret, bobSecret, usedNonces } = state;
  const isRunning = state.phase === 'running';
  const transcript = state.phase === 'complete' ? state.transcript : null;
  const keysCancel = (aliceSecret + bobSecret) % Number(SCHNORR_GROUP.q) === 0;
  const aliceUsed = usedNonces.alice.get(aliceSecret) ?? new Set<number>();
  const bobUsed = usedNonces.bob.get(bobSecret) ?? new Set<number>();
  const availableNoncePairs = Array.from(
    { length: Number(SCHNORR_GROUP.q - BigInt(1)) },
    (_, index) => index + 1,
  ).flatMap((aliceNonce) => (
    aliceUsed.has(aliceNonce)
      ? []
      : Array.from(
        { length: Number(SCHNORR_GROUP.q - BigInt(1)) },
        (_, index) => index + 1,
      )
        .filter((bobNonce) => (
          !bobUsed.has(bobNonce)
          && (aliceNonce + bobNonce) % Number(SCHNORR_GROUP.q) !== 0
        ))
        .map((bobNonce) => [aliceNonce, bobNonce] as const)
  ));
  const nonceSpaceExhausted = availableNoncePairs.length === 0;

  const runTranscript = async () => {
    if (busyRef.current || isRunning || keysCancel || nonceSpaceExhausted) return;
    busyRef.current = true;
    const id = ++requestId.current;
    let started = false;
    try {
      const [aliceNonce, bobNonce] = availableNoncePairs[
        randomIntegerBelow(availableNoncePairs.length)
      ];
      dispatch({ type: 'start', id, aliceNonce, bobNonce });
      started = true;
      const result = await createJointSchnorrTranscript({
        message: MESSAGE,
        aliceSecret: BigInt(aliceSecret),
        bobSecret: BigInt(bobSecret),
        aliceNonce: BigInt(aliceNonce),
        bobNonce: BigInt(bobNonce),
      });
      dispatch({ type: 'complete', id, transcript: result });
    } catch {
      dispatch(started ? { type: 'failed', id } : { type: 'selection-failed' });
    } finally {
      busyRef.current = false;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-6 md:p-12 py-12 relative min-h-max">
      <div className="w-full max-w-4xl flex flex-col items-center gap-8 md:gap-10">
        <header className="text-center space-y-2">
          <h2 className="font-mono text-xs tracking-widest text-ink-muted uppercase">
            Two-Party Schnorr Transcript
          </h2>
          <p className="font-mono text-[10px] text-ink-muted opacity-60">
            PRIME-ORDER SUBGROUP · p=23 · q=11 · g=2
          </p>
        </header>

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/10 border border-white/10">
          {[
            { name: 'Alice', value: aliceSecret, key: 'alice' as const },
            { name: 'Bob', value: bobSecret, key: 'bob' as const },
          ].map((participant) => (
            <label
              key={participant.name}
              className="bg-[#0a0a0a] p-5 md:p-6 flex flex-col gap-4 font-mono"
            >
              <span className="flex justify-between text-[10px] tracking-widest uppercase">
                <span className="text-ink-muted">{participant.name} secret scalar</span>
                <span className="text-white">x = {participant.value}</span>
              </span>
              <input
                type="range"
                min="1"
                max={Number(SCHNORR_GROUP.q - BigInt(1))}
                value={participant.value}
                disabled={isRunning}
                onChange={(event) => {
                  dispatch({ type: 'change', participant: participant.key, value: Number(event.target.value) });
                }}
                className="w-full accent-white"
                aria-label={`${participant.name} secret scalar`}
              />
            </label>
          ))}
        </div>

        <div className="w-full min-h-64 border-y border-white/10 py-6 md:py-8">
          {!transcript ? (
            <div className="h-52 flex items-center justify-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted opacity-40">
              Awaiting fresh participant nonces
            </div>
          ) : (
            <motion.div
              key={transcript.challengeDigest}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-2 gap-6 md:gap-12">
                {[transcript.alice, transcript.bob].map((participant, index) => (
                  <div key={index} className="space-y-3 font-mono text-[10px]">
                    <p className="text-ink-muted uppercase tracking-widest">
                      {index === 0 ? 'Alice' : 'Bob'}
                    </p>
                    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                      <span className="text-ink-muted">PUBLIC</span>
                      <span className="text-right text-white">X = gˣ = {participant.publicKey}</span>
                      <span className="text-ink-muted">NONCE</span>
                      <span className="text-right text-white">r = {participant.nonce}</span>
                      <span className="text-ink-muted">COMMIT</span>
                      <span className="text-right text-white">R = gʳ = {participant.commitment}</span>
                      <span className="text-ink-muted">RESPONSE</span>
                      <span className="text-right text-[#3B82F6]">s = r + cx = {participant.response}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10 font-mono text-[10px]">
                {[
                  ['AGG. KEY', `X = ${transcript.aggregatePublicKey}`],
                  ['AGG. COMMIT', `R = ${transcript.aggregateCommitment}`],
                  ['CHALLENGE', `c = ${transcript.challenge}`],
                  ['AGG. RESPONSE', `s = ${transcript.aggregateResponse}`],
                ].map(([label, value]) => (
                  <div key={label} className="bg-[#0a0a0a] p-4 text-center space-y-1">
                    <p className="text-ink-muted">{label}</p>
                    <p className="text-white">{value}</p>
                  </div>
                ))}
              </div>

              <div className="text-center font-mono text-[10px] tracking-wider">
                <p className={transcript.verified ? 'text-white' : 'text-[#ef4444]'}>
                  gˢ = R · Xᶜ (mod p): {transcript.verified ? 'VERIFIED' : 'REJECTED'}
                </p>
                <p className="mt-2 text-ink-muted opacity-50">
                  H(message, X, R): {transcript.challengeDigest.slice(0, 20)}…
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <button
          onClick={runTranscript}
          disabled={isRunning || keysCancel || nonceSpaceExhausted}
          className="px-8 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-xs tracking-widest hover:bg-white transition-colors border border-white/20 disabled:opacity-50"
        >
          {keysCancel
            ? 'KEYS CANCEL TO IDENTITY'
            : nonceSpaceExhausted
              ? 'NONCE SPACE EXHAUSTED'
            : isRunning
              ? 'HASHING TRANSCRIPT…'
              : transcript
                ? 'FRESH NONCES / RUN AGAIN'
                : 'RUN JOINT TRANSCRIPT'}
        </button>

        {state.phase === 'error' && <p role="alert" className="text-sm text-[#ef4444]">{state.message}</p>}

        <p className="max-w-2xl text-center font-mono text-[9px] leading-relaxed tracking-wider text-ink-muted opacity-60 uppercase">
          {keysCancel
            ? 'The selected secret scalars sum to 0 mod q, producing the identity rather than a valid aggregate key.'
            : nonceSpaceExhausted
              ? 'All safe nonces for this selected key pair have been used. Change either participant scalar to continue without reuse.'
            : 'Educational finite group. Participant secrets and nonces are exposed here only to make the equation inspectable.'}
        </p>
      </div>

      <InfoPanel
        references={[
          {
            title: 'BIP 340: Schnorr Signatures for secp256k1',
            url: 'https://bips.xyz/340',
            summary: 'Bitcoin’s production single-signer Schnorr signature specification, including tagged hashing and nonce requirements.',
          },
          {
            title: 'BIP 327: MuSig2 for BIP 340',
            url: 'https://bips.xyz/327',
            summary: 'A key-aggregation and multisignature protocol that addresses rogue-key and nonce-handling risks omitted from this small demonstration.',
          },
          {
            title: 'Bitcoin Core: secp256k1/schnorrsig',
            url: 'https://github.com/bitcoin-core/secp256k1/tree/master/src/modules/schnorrsig',
            summary: 'The production secp256k1 implementation used for BIP 340 Schnorr signatures.',
          },
        ]}
        title="Schnorr Transcript"
        year={1989}
        process="Cooperative Schnorr Response Aggregation"
        proposition="Two participants combine public keys, nonce commitments, and responses into one transcript that satisfies the verifier equation."
        technicalRecord={{
          algorithm: 'Schnorr over subgroup q=11 of F₂₃*',
          seed: 'Web Crypto random nonces + SHA-256 challenge',
          renderer: 'React/BigInt transcript',
        }}
      >
        <p>
          This exhibit runs a complete two-party Schnorr transcript in the prime-order subgroup generated by
          2 modulo 23. Alice and Bob publish Xᵢ = gˣⁱ, commit fresh Rᵢ = gʳⁱ values, derive
          c = SHA-256(message, X, R) mod q, and return sᵢ = rᵢ + cxᵢ mod q. The combined values satisfy
          gˢ = R · Xᶜ mod p.
        </p>
        <p>
          The small group keeps every value visible. It is cryptographically insecure and is not a BIP 340
          implementation. This construction assumes trusted or pre-registered participant keys. Naively
          multiplying arbitrary keys invites rogue-key attacks, and careless nonce handling can expose secrets.
        </p>
        <p>
          Production multisignatures use a protocol such as MuSig2. BIP 327 specifies key coefficients,
          two-nonce commitments, transcript binding, and partial-signature checks so the final signature is
          compatible with BIP 340.
        </p>
      </InfoPanel>
    </div>
  );
}
