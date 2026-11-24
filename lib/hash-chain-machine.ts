export type ChainData = { currentHash: Uint8Array; history: string[] };
export type ChainState =
  | { phase: 'initializing'; id: number; data: ChainData | null }
  | { phase: 'ready'; id: number; data: ChainData }
  | { phase: 'hashing'; id: number; data: ChainData }
  | { phase: 'error'; id: number; data: ChainData | null };
export type ChainAction =
  | { type: 'initialize'; id: number }
  | { type: 'initialized'; id: number; hash: Uint8Array }
  | { type: 'advance'; id: number }
  | { type: 'advanced'; id: number; hash: Uint8Array; previous: string }
  | { type: 'failed'; id: number };

export function chainReducer(state: ChainState, action: ChainAction): ChainState {
  switch (action.type) {
    case 'initialize': return { phase: 'initializing', id: action.id, data: state.data };
    case 'initialized': return state.phase === 'initializing' && state.id === action.id
      ? { phase: 'ready', id: action.id, data: { currentHash: action.hash, history: [] } } : state;
    case 'advance': return state.phase === 'ready' ? { phase: 'hashing', id: action.id, data: state.data } : state;
    case 'advanced': return state.phase === 'hashing' && state.id === action.id
      ? { phase: 'ready', id: action.id, data: { currentHash: action.hash, history: [...state.data.history, action.previous] } } : state;
    case 'failed': return (state.phase === 'hashing' || state.phase === 'initializing') && state.id === action.id
      ? { phase: 'error', id: action.id, data: state.data } : state;
  }
}
