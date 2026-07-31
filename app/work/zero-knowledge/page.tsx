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

const PROTOCOL_STEPS = [
  { label: '1', title: 'Commit', detail: 'Prover fixes t before c exists.' },
  { label: '2', title: 'Challenge', detail: 'Verifier draws c = 0 or 1.' },
  { label: '3', title: 'Response', detail: 'Prover returns s.' },
  { label: '4', title: 'Check', detail: 'Verifier tests one equation.' },
];

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
    IDLE: { label: 'Make commitment', hint: 'The prover must commit before learning the challenge.', handler: makeCommitment },
    COMMITMENT: { label: 'Issue random challenge', hint: 'The verifier now chooses an independent bit.', handler: issueChallenge },
    CHALLENGE: { label: 'Send response', hint: 'The prover answers the challenge without sending x.', handler: sendResponse },
    RESPONSE: { label: 'Check equation', hint: 'The verifier checks whether gˢ = t · yᶜ.', handler: verifyRound },
    VERIFIED: { label: 'Begin next round', hint: 'A new round uses a fresh commitment and challenge.', handler: nextRound },
  }[phase];
  const activeStep = {
    IDLE: 0,
    COMMITMENT: 1,
    CHALLENGE: 2,
    RESPONSE: 3,
    VERIFIED: 4,
  }[phase];

  return (
    <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-6 md:p-12 py-12 relative min-h-max">
      <div className="w-full max-w-3xl flex flex-col items-center gap-7 md:gap-9">
        <header className="text-center space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Schnorr identification</p>
          <h2 className="font-serif text-2xl text-white">Prove you know x without sending x.</h2>
          <p className="font-sans text-sm text-ink-muted">The verifier sees y = gˣ = {PUBLIC_KEY}. The secret x stays with the prover.</p>
        </header>

        <div className="w-full max-w-xl">
          <div className="flex border border-white/20 font-mono text-[10px] tracking-widest">
          {[
            { value: 'honest' as const, label: 'PROVER KNOWS X' },
            { value: 'no-witness' as const, label: 'PROVER GUESSES' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => changeMode(option.value)}
              disabled={phase !== 'IDLE' && phase !== 'VERIFIED'}
              className={`min-h-12 flex-1 px-3 md:px-6 py-3 transition-colors disabled:cursor-not-allowed ${
                mode === option.value ? 'bg-white text-black' : 'text-white hover:bg-white/5'
              }`}
            >
              {option.label}
            </button>
          ))}
          </div>
          <p className="mt-3 text-center font-sans text-sm text-ink-muted">
            {mode === 'honest'
              ? 'With x, the prover can answer either challenge after committing.'
              : 'Without x, the prover must guess the challenge before committing. A wrong guess fails.'}
          </p>
        </div>

        <ol className="grid w-full grid-cols-2 border border-white/10 bg-white/5 sm:grid-cols-4">
          {PROTOCOL_STEPS.map((step, index) => {
            const complete = activeStep > index;
            const current = activeStep === index + 1;
            return (
              <li key={step.label} className={`min-h-20 border-b border-r border-white/10 px-3 py-3 last:border-r-0 sm:border-b-0 ${current ? 'bg-white text-black' : complete ? 'text-white' : 'text-ink-muted'}`}>
                <p className="font-mono text-[9px] uppercase tracking-widest">{step.label}. {step.title}</p>
                <p className={`mt-2 font-sans text-xs leading-snug ${current ? 'text-black/70' : 'text-ink-muted'}`}>{step.detail}</p>
              </li>
            );
          })}
        </ol>

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
                READY: THE VERIFIER HAS NO COMMITMENT TO CHECK YET
              </ProtocolMessage>
            )}
            {phase === 'COMMITMENT' && preparation && (
              <ProtocolMessage key="commitment" direction="right">
                1. PROVER COMMITS t = gʳ = {preparation.commitment} →
              </ProtocolMessage>
            )}
            {phase === 'CHALLENGE' && pendingChallenge !== null && (
              <ProtocolMessage key="challenge" direction="left">
                ← 2. VERIFIER CHOOSES c = {pendingChallenge}
              </ProtocolMessage>
            )}
            {phase === 'RESPONSE' && round && (
              <ProtocolMessage key="response" direction="right">
                3. PROVER RETURNS s = {round.response} →
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
                  4. gˢ = t · yᶜ: {round.verified ? 'ACCEPTED' : 'REJECTED'}
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
            <span>Accepted rounds: {successfulStreak}</span>
            <span>Evidence against guessing: {confidence.toFixed(2)}%</span>
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
        </div>

        <p className="max-w-xl text-center font-mono text-[9px] leading-relaxed tracking-wider text-ink-muted opacity-60 uppercase">
          After n accepted independent binary challenges, a guessing prover passes every round with probability 2⁻ⁿ.
          A rejection resets the count.
        </p>

        <div className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 border border-white/20 bg-canvas/95 p-2 shadow-2xl backdrop-blur-sm">
          <p className="px-3 pb-2 pt-1 text-center font-sans text-sm text-ink-muted">{action.hint}</p>
          <button
            onClick={action.handler}
            className="min-h-12 w-full bg-[#D4D4D4] px-6 font-mono text-xs uppercase tracking-widest text-[#0E0E0E] transition-colors hover:bg-white"
          >
            {action.label}
          </button>
        </div>
      </div>

      <InfoPanel
        actionOffset="raised"
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
