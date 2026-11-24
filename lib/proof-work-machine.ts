type Result = { nonce: number; hash: Uint8Array | null };
export type WorkState = Result & (
  | { phase: 'idle' | 'stopped' | 'found' | 'error' }
  | { phase: 'mining'; id: number }
);
export type WorkAction =
  | { type: 'reset' }
  | { type: 'start'; id: number }
  | { type: 'progress'; id: number; nonce: number; hash: Uint8Array; found: boolean }
  | { type: 'stop' }
  | { type: 'failed'; id: number };

export const initialWorkState: WorkState = { phase: 'idle', nonce: 0, hash: null };

export function workReducer(state: WorkState, action: WorkAction): WorkState {
  switch (action.type) {
    case 'reset': return initialWorkState;
    case 'start': return state.phase === 'mining' ? state : { ...state, phase: 'mining', id: action.id };
    case 'progress':
      return state.phase === 'mining' && state.id === action.id
        ? action.found ? { phase: 'found', nonce: action.nonce, hash: action.hash }
          : { ...state, nonce: action.nonce, hash: action.hash } : state;
    case 'stop': return state.phase === 'mining' ? { phase: 'stopped', nonce: state.nonce, hash: state.hash } : state;
    case 'failed': return state.phase === 'mining' && state.id === action.id ? { phase: 'error', nonce: state.nonce, hash: state.hash } : state;
  }
}
