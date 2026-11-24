import type { LamportPrivateKey, LamportPublicKey, LamportSignature } from './lamport';

export type LamportSigned = {
  publicKey: LamportPublicKey;
  publicFingerprint: string;
  signature: LamportSignature;
  signatureFingerprint: string;
  signedDigest: Uint8Array;
  verification: { message: string; digest: string; valid: boolean } | null;
};

export type LamportState =
  | { phase: 'empty' | 'generating' }
  | { phase: 'ready'; privateKey: LamportPrivateKey; publicKey: LamportPublicKey; publicFingerprint: string }
  | { phase: 'signing'; publicKey: LamportPublicKey; publicFingerprint: string; message: string }
  | { phase: 'signed'; data: LamportSigned }
  | { phase: 'verifying'; data: LamportSigned; message: string }
  | { phase: 'error'; message: string };

export type LamportAction =
  | { type: 'generate' }
  | { type: 'generated'; privateKey: LamportPrivateKey; publicKey: LamportPublicKey; publicFingerprint: string }
  | { type: 'sign'; message: string }
  | { type: 'signed'; signature: LamportSignature; signatureFingerprint: string; signedDigest: Uint8Array; digest: string; valid: boolean }
  | { type: 'verify'; message: string }
  | { type: 'verified'; digest: string; valid: boolean }
  | { type: 'edit' }
  | { type: 'failed'; message: string };

export function lamportReducer(state: LamportState, action: LamportAction): LamportState {
  switch (action.type) {
    case 'generate':
      return state.phase === 'empty' || state.phase === 'signed' || state.phase === 'error'
        ? { phase: 'generating' } : state;
    case 'generated':
      return state.phase === 'generating'
        ? { phase: 'ready', privateKey: action.privateKey, publicKey: action.publicKey, publicFingerprint: action.publicFingerprint } : state;
    case 'sign':
      return state.phase === 'ready'
        ? { phase: 'signing', publicKey: state.publicKey, publicFingerprint: state.publicFingerprint, message: action.message }
        : state;
    case 'signed':
      return state.phase === 'signing' ? {
        phase: 'signed', data: {
          publicKey: state.publicKey, publicFingerprint: state.publicFingerprint,
          signature: action.signature, signatureFingerprint: action.signatureFingerprint,
          signedDigest: action.signedDigest,
          verification: { message: state.message, digest: action.digest, valid: action.valid },
        },
      } : state;
    case 'verify':
      return state.phase === 'signed' ? { phase: 'verifying', data: state.data, message: action.message } : state;
    case 'verified':
      return state.phase === 'verifying' ? {
        phase: 'signed', data: { ...state.data, verification: { message: state.message, digest: action.digest, valid: action.valid } },
      } : state;
    case 'edit':
      return state.phase === 'signed' ? { ...state, data: { ...state.data, verification: null } } : state;
    case 'failed':
      return state.phase === 'generating' || state.phase === 'signing' || state.phase === 'verifying'
        ? { phase: 'error', message: action.message } : state;
  }
}
