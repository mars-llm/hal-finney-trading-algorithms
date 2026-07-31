import { describe, expect, it } from 'vitest';
import {
  LAMPORT_BLOCK_BYTES,
  generateLamportKeyPair,
  signLamportMessage,
  verifyLamportSignature,
} from '../lib/lamport';

function deterministicBytes() {
  let counter = 0;
  return (length: number): Uint8Array => {
    const block = new Uint8Array(length);
    for (let index = 0; index < length; index++) {
      block[index] = (counter * LAMPORT_BLOCK_BYTES + index) % 256;
    }
    counter++;
    return block;
  };
}

describe('Lamport one-time signatures', () => {
  it('verifies the signed message and rejects a changed message', async () => {
    const keyPair = await generateLamportKeyPair(deterministicBytes());
    const { signature } = await signLamportMessage(keyPair.privateKey, 'HAL');

    await expect(
      verifyLamportSignature(keyPair.publicKey, 'HAL', signature),
    ).resolves.toBe(true);
    await expect(
      verifyLamportSignature(keyPair.publicKey, 'FINNEY', signature),
    ).resolves.toBe(false);
  });

  it('rejects a modified signature block', async () => {
    const keyPair = await generateLamportKeyPair(deterministicBytes());
    const { signature } = await signLamportMessage(keyPair.privateKey, 'HASH');
    const modifiedSignature = signature.map((block) => new Uint8Array(block));
    modifiedSignature[17][3] ^= 1;

    await expect(
      verifyLamportSignature(keyPair.publicKey, 'HASH', modifiedSignature),
    ).resolves.toBe(false);
  });
});
