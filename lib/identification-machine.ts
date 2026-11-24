import type { IdentificationPreparation, IdentificationRound, SchnorrProverMode } from './schnorr';

type HistoryEntry = { challenge: 0 | 1; verified: boolean };
type Base = { mode: SchnorrProverMode; history: HistoryEntry[] };
export type IdentificationState = Base & (
  | { phase: 'IDLE' }
  | { phase: 'COMMITMENT'; preparation: IdentificationPreparation }
  | { phase: 'CHALLENGE'; preparation: IdentificationPreparation; challenge: 0 | 1 }
  | { phase: 'RESPONSE' | 'VERIFIED'; round: IdentificationRound }
);
export type IdentificationAction =
  | { type: 'mode'; mode: SchnorrProverMode }
  | { type: 'commit'; preparation: IdentificationPreparation }
  | { type: 'challenge'; challenge: 0 | 1 }
  | { type: 'respond'; round: IdentificationRound }
  | { type: 'verify' }
  | { type: 'next' };

export const initialIdentificationState: IdentificationState = { phase: 'IDLE', mode: 'honest', history: [] };

export function identificationReducer(state: IdentificationState, action: IdentificationAction): IdentificationState {
  const { mode, history } = state;
  switch (action.type) {
    case 'mode': return state.phase === 'IDLE' || state.phase === 'VERIFIED'
      ? { phase: 'IDLE', mode: action.mode, history: [] } : state;
    case 'commit': return state.phase === 'IDLE' && action.preparation.mode === mode
      ? { phase: 'COMMITMENT', mode, history, preparation: action.preparation } : state;
    case 'challenge': return state.phase === 'COMMITMENT'
      ? { phase: 'CHALLENGE', mode, history, preparation: state.preparation, challenge: action.challenge } : state;
    case 'respond': return state.phase === 'CHALLENGE' && action.round.commitment === state.preparation.commitment
      && action.round.challenge === state.challenge && action.round.mode === mode
      ? { phase: 'RESPONSE', mode, history, round: action.round } : state;
    case 'verify': return state.phase === 'RESPONSE'
      ? { phase: 'VERIFIED', mode, history: [...history, { challenge: state.round.challenge, verified: state.round.verified }], round: state.round } : state;
    case 'next': return state.phase === 'VERIFIED' ? { phase: 'IDLE', mode, history } : state;
  }
}
