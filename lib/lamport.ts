import { bytesToBits, bytesToHex, sha256 } from './crypto';

export const LAMPORT_DIGEST_BITS = 256;
export const LAMPORT_BLOCK_BYTES = 32;

export type LamportPair = readonly [Uint8Array, Uint8Array];
export type LamportPrivateKey = LamportPair[];
export type LamportPublicKey = LamportPair[];
export type LamportSignature = Uint8Array[];

export interface LamportKeyPair {
  privateKey: LamportPrivateKey;
  publicKey: LamportPublicKey;
}

export type RandomBytesSource = (length: number) => Uint8Array;

function secureRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function assertBlock(block: Uint8Array, label: string): void {
  if (block.length !== LAMPORT_BLOCK_BYTES) {
    throw new Error(`${label} must contain ${LAMPORT_BLOCK_BYTES} bytes`);
  }
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function hashMessage(message: string): Promise<Uint8Array> {
  return sha256(new TextEncoder().encode(message));
}

export function digestBits(digest: Uint8Array): boolean[] {
  if (digest.length !== LAMPORT_BLOCK_BYTES) {
    throw new Error(`Lamport signatures require a ${LAMPORT_DIGEST_BITS}-bit digest`);
  }
  return bytesToBits(digest);
}

export async function generateLamportKeyPair(
  randomBytes: RandomBytesSource = secureRandomBytes,
): Promise<LamportKeyPair> {
  const privateKey: LamportPrivateKey = Array.from(
    { length: LAMPORT_DIGEST_BITS },
    (_, index) => {
      const zero = randomBytes(LAMPORT_BLOCK_BYTES);
      const one = randomBytes(LAMPORT_BLOCK_BYTES);
      assertBlock(zero, `Private key block ${index}/0`);
      assertBlock(one, `Private key block ${index}/1`);
      return [new Uint8Array(zero), new Uint8Array(one)] as const;
    },
  );

  const publicBlocks = await Promise.all(
    privateKey.flatMap(([zero, one]) => [sha256(zero), sha256(one)]),
  );
  const publicKey: LamportPublicKey = Array.from(
    { length: LAMPORT_DIGEST_BITS },
    (_, index) => [publicBlocks[index * 2], publicBlocks[index * 2 + 1]] as const,
  );

  return { privateKey, publicKey };
}

export function signLamportDigest(
  privateKey: LamportPrivateKey,
  digest: Uint8Array,
): LamportSignature {
  if (privateKey.length !== LAMPORT_DIGEST_BITS) {
    throw new Error(`Lamport private key must contain ${LAMPORT_DIGEST_BITS} pairs`);
  }

  return digestBits(digest).map((bit, index) => {
    const block = privateKey[index]?.[bit ? 1 : 0];
    if (!block) throw new Error(`Missing private key block ${index}`);
    assertBlock(block, `Private key block ${index}`);
    return new Uint8Array(block);
  });
}

export async function signLamportMessage(
  privateKey: LamportPrivateKey,
  message: string,
): Promise<{ digest: Uint8Array; signature: LamportSignature }> {
  const digest = await hashMessage(message);
  return {
    digest,
    signature: signLamportDigest(privateKey, digest),
  };
}

export async function verifyLamportSignature(
  publicKey: LamportPublicKey,
  message: string,
  signature: LamportSignature,
): Promise<boolean> {
  if (
    publicKey.length !== LAMPORT_DIGEST_BITS
    || signature.length !== LAMPORT_DIGEST_BITS
  ) {
    return false;
  }

  const bits = digestBits(await hashMessage(message));
  const hashedSignature = await Promise.all(signature.map((block) => {
    if (block.length !== LAMPORT_BLOCK_BYTES) return Promise.resolve(null);
    return sha256(block);
  }));

  return hashedSignature.every((hashedBlock, index) => {
    if (!hashedBlock) return false;
    const expected = publicKey[index]?.[bits[index] ? 1 : 0];
    return expected ? equalBytes(hashedBlock, expected) : false;
  });
}

async function fingerprintBlocks(blocks: Uint8Array[]): Promise<string> {
  const totalLength = blocks.reduce((sum, block) => sum + block.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const block of blocks) {
    combined.set(block, offset);
    offset += block.length;
  }
  return bytesToHex(await sha256(combined));
}

export function lamportPublicKeyFingerprint(publicKey: LamportPublicKey): Promise<string> {
  return fingerprintBlocks(publicKey.flatMap(([zero, one]) => [zero, one]));
}

export function lamportSignatureFingerprint(signature: LamportSignature): Promise<string> {
  return fingerprintBlocks(signature);
}
