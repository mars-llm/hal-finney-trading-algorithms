import { describe, expect, it } from 'vitest';
import { avalancheReducer, type AvalancheState } from '../lib/avalanche-machine';
import { chainReducer, type ChainState } from '../lib/hash-chain-machine';
import { identificationReducer, initialIdentificationState } from '../lib/identification-machine';
import { lamportReducer, type LamportState } from '../lib/lamport-machine';
import { workReducer, initialWorkState } from '../lib/proof-work-machine';
import { initialSchnorrState, schnorrReducer } from '../lib/schnorr-machine';
import { completeIdentification, createJointSchnorrTranscript, prepareIdentification, publicKeyFromSecret } from '../lib/schnorr';
import type { LamportPrivateKey, LamportPublicKey, LamportSignature } from '../lib/lamport';

const bytes = (value: number) => new Uint8Array([value]);
const privateKey = [] as LamportPrivateKey;
const publicKey = [] as LamportPublicKey;
const signature = [] as LamportSignature;

describe('Lamport exhibit state machine', () => {
  const ready = (): LamportState => lamportReducer(
    lamportReducer({ phase: 'empty' }, { type: 'generate' }),
    { type: 'generated', privateKey, publicKey, publicFingerprint: 'key' },
  );

  it('consumes the key before signing and does not restore it after a failure', () => {
    const signing = lamportReducer(ready(), { type: 'sign', message: 'original' });
    expect(signing.phase).toBe('signing');
    expect('privateKey' in signing).toBe(false);
    const failed = lamportReducer(signing, { type: 'failed', message: 'try again' });
    expect(failed.phase).toBe('error');
    expect(lamportReducer(failed, { type: 'sign', message: 'other' })).toEqual(failed);
    expect(lamportReducer(failed, { type: 'signed', signature, signatureFingerprint: 'sig', signedDigest: bytes(1), digest: '01', valid: true })).toEqual(failed);
  });

  it('binds verification to the message being checked and clears it on edit', () => {
    const signing = lamportReducer(ready(), { type: 'sign', message: 'original' });
    expect(lamportReducer(signing, { type: 'edit' })).toEqual(signing);
    const signed = lamportReducer(signing, { type: 'signed', signature, signatureFingerprint: 'sig', signedDigest: bytes(1), digest: '01', valid: true });
    expect(signed.phase === 'signed' && signed.data.verification?.message).toBe('original');
    const edited = lamportReducer(signed, { type: 'edit' });
    expect(edited.phase === 'signed' && edited.data.verification).toBeNull();
    const checking = lamportReducer(edited, { type: 'verify', message: 'other' });
    const checked = lamportReducer(checking, { type: 'verified', digest: '02', valid: false });
    expect(checked.phase === 'signed' && checked.data.verification).toEqual({ message: 'other', digest: '02', valid: false });
  });
});

describe('Schnorr exhibit state machine', () => {
  it('locks inputs during a transcript and ignores stale completions', async () => {
    const running = schnorrReducer(initialSchnorrState(), { type: 'start', id: 1, aliceNonce: 4, bobNonce: 9 });
    expect(running.phase).toBe('running');
    expect(schnorrReducer(running, { type: 'change', participant: 'alice', value: 4 })).toEqual(running);
    const transcript = await createJointSchnorrTranscript({ message: 'joint', aliceSecret: BigInt(3), bobSecret: BigInt(7), aliceNonce: BigInt(4), bobNonce: BigInt(9) });
    expect(schnorrReducer(running, { type: 'complete', id: 2, transcript })).toEqual(running);
    const wrongNonce = { ...transcript, alice: { ...transcript.alice, nonce: BigInt(5) } };
    expect(schnorrReducer(running, { type: 'complete', id: 1, transcript: wrongNonce })).toEqual(running);
    const complete = schnorrReducer(running, { type: 'complete', id: 1, transcript });
    expect(complete.phase).toBe('complete');
    expect(complete.aliceSecret).toBe(3);
  });

  it('reserves nonces before async work and does not reuse them after failure', () => {
    const running = schnorrReducer(initialSchnorrState(), { type: 'start', id: 1, aliceNonce: 4, bobNonce: 9 });
    const failed = schnorrReducer(running, { type: 'failed', id: 1 });
    expect(failed.phase).toBe('error');
    expect(schnorrReducer(failed, { type: 'start', id: 2, aliceNonce: 4, bobNonce: 8 })).toEqual(failed);
  });

  it('reports a nonce-selection failure without entering a running state', () => {
    const failed = schnorrReducer(initialSchnorrState(), { type: 'selection-failed' });
    expect(failed.phase).toBe('error');
    expect(failed.usedNonces.alice.size).toBe(0);
  });
});

describe('Avalanche exhibit state machine', () => {
  it('rejects inversion and old hash completions while a new seed initializes', () => {
    let state: AvalancheState = { phase: 'ready', id: 1, data: { input: bytes(67), output: bytes(1), previousOutput: bytes(1), flippedIndex: null } };
    state = avalancheReducer(state, { type: 'initialize', id: 2 });
    const initializing = state;
    expect(avalancheReducer(state, { type: 'invert', id: 3, input: bytes(195), index: 0 })).toEqual(initializing);
    expect(avalancheReducer(state, { type: 'initialized', id: 1, input: bytes(67), output: bytes(1) })).toEqual(initializing);
    state = avalancheReducer(state, { type: 'initialized', id: 2, input: bytes(78), output: bytes(2) });
    expect(state.phase === 'ready' && state.data.input[0]).toBe(78);
  });

  it('retains the last complete output for the changed-bit comparison', () => {
    const ready: AvalancheState = { phase: 'ready', id: 1, data: { input: bytes(1), output: bytes(2), previousOutput: bytes(2), flippedIndex: null } };
    const hashing = avalancheReducer(ready, { type: 'invert', id: 2, input: bytes(3), index: 0 });
    const result = avalancheReducer(hashing, { type: 'hashed', id: 2, output: bytes(4) });
    expect(result.phase === 'ready' && Array.from(result.data.previousOutput)).toEqual([2]);
  });
});

describe('proof-of-work and hash-chain states', () => {
  it('leaves mining on a hash failure and ignores cancelled work', () => {
    const mining = workReducer(initialWorkState, { type: 'start', id: 1 });
    expect(workReducer(mining, { type: 'failed', id: 1 }).phase).toBe('error');
    const stopped = workReducer(mining, { type: 'stop' });
    expect(workReducer(stopped, { type: 'progress', id: 1, nonce: 5, hash: bytes(0), found: true })).toEqual(stopped);
  });

  it('records hash-chain failures and ignores results for an older seed', () => {
    let state: ChainState = { phase: 'initializing', id: 1, data: null };
    state = chainReducer(state, { type: 'initialize', id: 2 });
    expect(chainReducer(state, { type: 'initialized', id: 1, hash: bytes(1) })).toEqual(state);
    state = chainReducer(state, { type: 'initialized', id: 2, hash: bytes(2) });
    state = chainReducer(state, { type: 'advance', id: 3 });
    expect(chainReducer(state, { type: 'failed', id: 3 }).phase).toBe('error');
  });
});

describe('identification protocol state machine', () => {
  it('requires each protocol step and records a verification only once', () => {
    const initial = initialIdentificationState;
    expect(identificationReducer(initial, { type: 'verify' })).toEqual(initial);
    const preparation = prepareIdentification('honest', publicKeyFromSecret(BigInt(6)), BigInt(8));
    const committed = identificationReducer(initial, { type: 'commit', preparation });
    expect(identificationReducer(committed, { type: 'mode', mode: 'no-witness' })).toEqual(committed);
    const challenged = identificationReducer(committed, { type: 'challenge', challenge: 1 });
    const round = completeIdentification(preparation, 1, BigInt(6));
    const response = identificationReducer(challenged, { type: 'respond', round });
    const verified = identificationReducer(response, { type: 'verify' });
    expect(verified.phase).toBe('VERIFIED');
    expect(verified.history).toHaveLength(1);
    expect(identificationReducer(verified, { type: 'verify' }).history).toHaveLength(1);
    expect(identificationReducer(verified, { type: 'next' }).phase).toBe('IDLE');
  });
});
