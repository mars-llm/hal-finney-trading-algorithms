export type AvalancheData = {
  input: Uint8Array;
  output: Uint8Array;
  previousOutput: Uint8Array;
  flippedIndex: number | null;
};
export type AvalancheState =
  | { phase: 'initializing'; id: number; data: AvalancheData | null }
  | { phase: 'ready'; id: number; data: AvalancheData }
  | { phase: 'hashing'; id: number; data: AvalancheData; input: Uint8Array; flippedIndex: number }
  | { phase: 'error'; id: number; data: AvalancheData | null };
export type AvalancheAction =
  | { type: 'initialize'; id: number }
  | { type: 'initialized'; id: number; input: Uint8Array; output: Uint8Array }
  | { type: 'invert'; id: number; input: Uint8Array; index: number }
  | { type: 'hashed'; id: number; output: Uint8Array }
  | { type: 'failed'; id: number };

export function avalancheReducer(state: AvalancheState, action: AvalancheAction): AvalancheState {
  switch (action.type) {
    case 'initialize':
      return { phase: 'initializing', id: action.id, data: state.data };
    case 'initialized':
      return state.phase === 'initializing' && state.id === action.id
        ? { phase: 'ready', id: action.id, data: { input: action.input, output: action.output, previousOutput: action.output, flippedIndex: null } } : state;
    case 'invert':
      return state.phase === 'ready'
        ? { phase: 'hashing', id: action.id, data: state.data, input: action.input, flippedIndex: action.index } : state;
    case 'hashed':
      return state.phase === 'hashing' && state.id === action.id
        ? { phase: 'ready', id: action.id, data: { input: state.input, output: action.output, previousOutput: state.data.output, flippedIndex: state.flippedIndex } } : state;
    case 'failed':
      return (state.phase === 'initializing' || state.phase === 'hashing') && state.id === action.id
        ? { phase: 'error', id: action.id, data: state.data } : state;
  }
}
