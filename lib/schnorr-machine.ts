import { SCHNORR_GROUP, type JointSchnorrTranscript } from './schnorr';

type Ledger = { alice: Map<number, Set<number>>; bob: Map<number, Set<number>> };
type Base = { aliceSecret: number; bobSecret: number; usedNonces: Ledger };
export type SchnorrState = Base & (
  | { phase: 'idle' }
  | { phase: 'running'; id: number; aliceNonce: number; bobNonce: number }
  | { phase: 'complete'; transcript: JointSchnorrTranscript }
  | { phase: 'error'; message: string }
);
export type SchnorrAction =
  | { type: 'change'; participant: 'alice' | 'bob'; value: number }
  | { type: 'start'; id: number; aliceNonce: number; bobNonce: number }
  | { type: 'complete'; id: number; transcript: JointSchnorrTranscript }
  | { type: 'failed'; id: number }
  | { type: 'selection-failed' };

export function initialSchnorrState(): SchnorrState {
  return { phase: 'idle', aliceSecret: 3, bobSecret: 7, usedNonces: { alice: new Map(), bob: new Map() } };
}

export function schnorrReducer(state: SchnorrState, action: SchnorrAction): SchnorrState {
  const { aliceSecret, bobSecret, usedNonces } = state;
  switch (action.type) {
    case 'change':
      if (state.phase === 'running' || !Number.isInteger(action.value) || action.value < 1 || action.value >= Number(SCHNORR_GROUP.q)) return state;
      return { phase: 'idle', aliceSecret: action.participant === 'alice' ? action.value : aliceSecret,
        bobSecret: action.participant === 'bob' ? action.value : bobSecret, usedNonces };
    case 'start': {
      const q = Number(SCHNORR_GROUP.q);
      if (state.phase === 'running' || (aliceSecret + bobSecret) % q === 0
        || !Number.isInteger(action.aliceNonce) || !Number.isInteger(action.bobNonce)
        || action.aliceNonce < 1 || action.aliceNonce >= q || action.bobNonce < 1 || action.bobNonce >= q
        || (action.aliceNonce + action.bobNonce) % q === 0
        || usedNonces.alice.get(aliceSecret)?.has(action.aliceNonce)
        || usedNonces.bob.get(bobSecret)?.has(action.bobNonce)) return state;
      const alice = new Map(usedNonces.alice);
      const bob = new Map(usedNonces.bob);
      alice.set(aliceSecret, new Set([...(alice.get(aliceSecret) ?? []), action.aliceNonce]));
      bob.set(bobSecret, new Set([...(bob.get(bobSecret) ?? []), action.bobNonce]));
      return { phase: 'running', id: action.id, aliceNonce: action.aliceNonce, bobNonce: action.bobNonce, aliceSecret, bobSecret, usedNonces: { alice, bob } };
    }
    case 'complete':
      return state.phase === 'running' && state.id === action.id
        && action.transcript.alice.secret === BigInt(aliceSecret) && action.transcript.bob.secret === BigInt(bobSecret)
        && action.transcript.alice.nonce === BigInt(state.aliceNonce) && action.transcript.bob.nonce === BigInt(state.bobNonce)
        ? { phase: 'complete', transcript: action.transcript, aliceSecret, bobSecret, usedNonces } : state;
    case 'failed':
      return state.phase === 'running' && state.id === action.id
        ? { phase: 'error', message: 'Transcript generation failed. Try again with fresh nonces.', aliceSecret, bobSecret, usedNonces } : state;
    case 'selection-failed':
      return state.phase !== 'running'
        ? { phase: 'error', message: 'Could not choose fresh nonces. Try again.', aliceSecret, bobSecret, usedNonces } : state;
  }
}
