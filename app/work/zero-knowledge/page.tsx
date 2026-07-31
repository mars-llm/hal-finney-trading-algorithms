'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import {
  IdentificationPreparation,
  IdentificationRound,
  SchnorrProverMode,
  completeIdentification,
  prepareIdentification,
  publicKeyFromSecret,
  randomChallengeBit,
  randomScalar,
} from '../../../lib/schnorr';

type Phase = 'IDLE' | 'COMMITMENT' | 'CHALLENGE' | 'RESPONSE' | 'VERIFIED';

const WITNESS = BigInt(6);
const PUBLIC_KEY = publicKeyFromSecret(WITNESS);

type HistoryEntry = {
  challenge: 0 | 1;
  verified: boolean;
};

export default function ZeroKnowledge() {
  const [mode, setMode] = useState<SchnorrProverMode>('honest');
  const [phase, setPhase] = useState<Phase>('IDLE');
  const [preparation, setPreparation] = useState<IdentificationPreparation | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<0 | 1 | null>(null);
  const [round, setRound] = useState<IdentificationRound | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const successfulStreak = useMemo(() => {
    let count = 0;
    for (let index = history.length - 1; index >= 0 && history[index].verified; index--) {
      count++;
    }
    return count;
  }, [history]);

  const confidence = successfulStreak > 0
    ? (1 - Math.pow(0.5, successfulStreak)) * 100
    : 0;

  const changeMode = (nextMode: SchnorrProverMode) => {
    setMode(nextMode);
    setPhase('IDLE');
    setPreparation(null);
    setPendingChallenge(null);
    setRound(null);
    setHistory([]);
  };

  const makeCommitment = () => {
    const hiddenGuess = mode === 'no-witness' ? randomChallengeBit() : undefined;
    setPreparation(prepareIdentification(
      mode,
      PUBLIC_KEY,
      randomScalar(),
      hiddenGuess,
    ));
    setPendingChallenge(null);
    setRound(null);
    setPhase('COMMITMENT');
  };

  const issueChallenge = () => {
    setPendingChallenge(randomChallengeBit());
    setPhase('CHALLENGE');
  };

  const sendResponse = () => {
    if (!preparation || pendingChallenge === null) return;
    setRound(completeIdentification(
      preparation,
      pendingChallenge,
      mode === 'honest' ? WITNESS : undefined,
    ));
    setPhase('RESPONSE');
  };

  const verifyRound = () => {
    if (!round) return;
    setHistory((previous) => [...previous, {
      challenge: round.challenge,
      verified: round.verified,
    }]);
    setPhase('VERIFIED');
  };

  const nextRound = () => {
    setPhase('IDLE');
    setPreparation(null);
    setPendingChallenge(null);
    setRound(null);
  };

  const action = {
    IDLE: { label: 'MAKE COMMITMENT', handler: makeCommitment },
    COMMITMENT: { label: 'ISSUE RANDOM CHALLENGE', handler: issueChallenge },
    CHALLENGE: { label: 'SEND RESPONSE', handler: sendResponse },
    RESPONSE: { label: 'CHECK VERIFIER EQUATION', handler: verifyRound },
    VERIFIED: { label: 'BEGIN INDEPENDENT ROUND', handler: nextRound },
  }[phase];

  return (
    <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-6 md:p-12 py-12 relative min-h-max">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8 md:gap-10">
        <header className="text-center space-y-2">
          <h2 className="font-mono text-xs tracking-widest text-ink-muted uppercase">
            Schnorr Identification Protocol
          </h2>
          <p className="font-mono text-[10px] text-ink-muted opacity-60">
            PUBLIC STATEMENT y = gˣ = {PUBLIC_KEY} · WITNESS x REMAINS WITH PROVER
          </p>
        </header>

        <div className="flex border border-white/20 font-mono text-[10px] tracking-widest">
          {[
            { value: 'honest' as const, label: 'HAS WITNESS' },
            { value: 'no-witness' as const, label: 'NO WITNESS / GUESS' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => changeMode(option.value)}
              disabled={phase !== 'IDLE' && phase !== 'VERIFIED'}
              className={`px-4 md:px-6 py-3 transition-colors disabled:cursor-not-allowed ${
                mode === option.value ? 'bg-white text-black' : 'text-white hover:bg-white/5'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-10 font-mono text-xs uppercase tracking-widest text-ink-muted">
          <div className="text-center space-y-3">
            <span className={phase !== 'IDLE' ? 'text-[#3B82F6]' : ''}>Prover</span>
            <div className="mx-auto w-16 h-16 border border-white/20 flex items-center justify-center bg-white/5">
              P
            </div>
          </div>
          <div className="w-3 h-3 bg-[#D4D4D4] opacity-50" aria-hidden="true" />
          <div className="text-center space-y-3">
            <span className={phase === 'CHALLENGE' || phase === 'VERIFIED' ? 'text-white' : ''}>
              Verifier
            </span>
            <div className="mx-auto w-16 h-16 border border-white/20 flex items-center justify-center bg-[#0a0a0a]">
              V
            </div>
          </div>
        </div>

        <div className="h-36 w-full border-y border-white/10 flex items-center justify-center text-center px-4">
          <AnimatePresence mode="wait">
            {phase === 'IDLE' && (
              <ProtocolMessage key="idle" muted>
                READY FOR AN INDEPENDENT ROUND
              </ProtocolMessage>
            )}
            {phase === 'COMMITMENT' && preparation && (
              <ProtocolMessage key="commitment" direction="right">
                COMMITMENT t = gʳ = {preparation.commitment} →
              </ProtocolMessage>
            )}
            {phase === 'CHALLENGE' && pendingChallenge !== null && (
              <ProtocolMessage key="challenge" direction="left">
                ← RANDOM CHALLENGE c = {pendingChallenge}
              </ProtocolMessage>
            )}
            {phase === 'RESPONSE' && round && (
              <ProtocolMessage key="response" direction="right">
                RESPONSE s = {round.response} →
              </ProtocolMessage>
            )}
            {phase === 'VERIFIED' && round && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="font-mono text-[10px] md:text-xs tracking-widest uppercase space-y-3"
              >
                <p className={round.verified ? 'text-white' : 'text-[#ef4444]'}>
                  gˢ = t · yᶜ: {round.verified ? 'ACCEPTED' : 'REJECTED'}
                </p>
                {round.mode === 'no-witness' && (
                  <p className="text-ink-muted opacity-60">
                    PRECOMMITTED GUESS {round.guessedChallenge} / VERIFIER CHOSE {round.challenge}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full max-w-md space-y-4">
          <div className="flex justify-between font-mono text-[10px] tracking-widest text-ink-muted uppercase">
            <span>Accepted streak: {successfulStreak}</span>
            <span>Knowledge confidence: {confidence.toFixed(2)}%</span>
          </div>
          <div className="flex gap-1 h-2 w-full bg-white/5 overflow-hidden" aria-label="Round results">
            {history.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`flex-1 ${entry.verified ? 'bg-[#D4D4D4]' : 'bg-[#ef4444]'}`}
                title={`Challenge ${entry.challenge}: ${entry.verified ? 'accepted' : 'rejected'}`}
              />
            ))}
          </div>
          <button
            onClick={action.handler}
            className="mt-4 w-full px-6 py-3 bg-[#D4D4D4] text-[#0E0E0E] font-mono text-xs tracking-widest hover:bg-white transition-colors border border-white/20"
          >
            {action.label}
          </button>
        </div>

        <p className="max-w-xl text-center font-mono text-[9px] leading-relaxed tracking-wider text-ink-muted opacity-60 uppercase">
          Confidence is 1 − 2⁻ⁿ after n consecutive accepted, independent binary-challenge rounds.
          A rejection resets the accepted streak.
        </p>
      </div>

      <InfoPanel
        references={[
          {
            title: 'Schnorr: Efficient Identification and Signatures',
            url: 'https://link.springer.com/article/10.1007/BF00196725',
            summary: 'The original identification and signature construction based on discrete logarithms.',
          },
          {
            title: 'RFC 8235: Schnorr Non-interactive Zero-Knowledge Proof',
            url: 'https://www.rfc-editor.org/rfc/rfc8235',
            summary: 'An IETF description of Schnorr proofs and their verifier equation in elliptic-curve groups.',
          },
        ]}
        title="Zero-Knowledge Identification"
        year={1991}
        process="Commitment · Random Challenge · Response"
        proposition="A prover demonstrates knowledge of a discrete logarithm with an equation the verifier can check, without sending the witness."
        technicalRecord={{
          algorithm: 'Interactive Schnorr Sigma protocol',
          seed: 'Web Crypto independent binary challenges',
          renderer: 'React/BigInt protocol state',
        }}
      >
        <p>
          The public value is y = gˣ; the honest prover alone has x. It samples r and commits t = gʳ before
          the verifier chooses c. It then returns s = r + cx mod q, which the verifier checks with
          gˢ = t · yᶜ mod p.
        </p>
        <p>
          &quot;No witness&quot; uses the best one-round impersonation strategy. Before seeing c, it guesses a bit,
          chooses s, and constructs t = gˢ · y⁻ᶜ. The equation succeeds only when the independent verifier
          challenge matches that hidden guess, giving a soundness error of 1/2 per round.
        </p>
        <p>
          After n consecutive accepted independent rounds, the chance that this guessing strategy passed every
          round is 2⁻ⁿ. The confidence display is its complement. It resets after rejection and does not claim
          absolute certainty. This small finite group is explanatory, not secure.
        </p>
      </InfoPanel>
    </div>
  );
}

function ProtocolMessage({
  children,
  direction,
  muted = false,
}: {
  children: React.ReactNode;
  direction?: 'left' | 'right';
  muted?: boolean;
}) {
  return (
    <motion.div
      initial={{ x: direction === 'left' ? 60 : direction === 'right' ? -60 : 0, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: direction === 'left' ? -60 : direction === 'right' ? 60 : 0, opacity: 0 }}
      className={`px-5 py-2 border font-mono text-[10px] tracking-widest uppercase ${
        muted
          ? 'border-white/5 text-ink-muted opacity-40'
          : direction === 'left'
            ? 'border-white/40 text-white'
            : 'border-[#3B82F6]/50 text-[#3B82F6]'
      }`}
    >
      {children}
    </motion.div>
  );
}
