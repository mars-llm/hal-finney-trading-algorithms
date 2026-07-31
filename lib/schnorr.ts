import { bytesToHex, sha256 } from './crypto';

export const SCHNORR_GROUP = Object.freeze({
  p: BigInt(23),
  q: BigInt(11),
  g: BigInt(2),
});

export type SchnorrProverMode = 'honest' | 'no-witness';

export interface JointSchnorrTranscript {
  message: string;
  alice: {
    secret: bigint;
    publicKey: bigint;
    nonce: bigint;
    commitment: bigint;
    response: bigint;
  };
  bob: {
    secret: bigint;
    publicKey: bigint;
    nonce: bigint;
    commitment: bigint;
    response: bigint;
  };
  aggregatePublicKey: bigint;
  aggregateCommitment: bigint;
  challenge: bigint;
  aggregateResponse: bigint;
  verified: boolean;
  challengeDigest: string;
}

export interface IdentificationPreparation {
  mode: SchnorrProverMode;
  publicKey: bigint;
  commitment: bigint;
  nonce?: bigint;
  guessedChallenge?: 0 | 1;
  forgedResponse?: bigint;
}

export interface IdentificationRound extends IdentificationPreparation {
  challenge: 0 | 1;
  response: bigint;
  verified: boolean;
}

export function mod(value: bigint, modulus: bigint): bigint {
  const remainder = value % modulus;
  return remainder >= BigInt(0) ? remainder : remainder + modulus;
}

export function modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
  if (modulus <= BigInt(0)) throw new Error('Modulus must be positive');
  if (exponent < BigInt(0)) throw new Error('Exponent must be non-negative');

  let result = BigInt(1);
  let factor = mod(base, modulus);
  let power = exponent;

  while (power > BigInt(0)) {
    if (power % BigInt(2) === BigInt(1)) {
      result = mod(result * factor, modulus);
    }
    factor = mod(factor * factor, modulus);
    power /= BigInt(2);
  }

  return result;
}

export function modInverse(value: bigint, modulus: bigint): bigint {
  let oldR = mod(value, modulus);
  let r = modulus;
  let oldS = BigInt(1);
  let s = BigInt(0);

  while (r !== BigInt(0)) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }

  if (oldR !== BigInt(1)) throw new Error('Value has no modular inverse');
  return mod(oldS, modulus);
}

function assertNonZeroScalar(value: bigint, label: string): void {
  if (value <= BigInt(0) || value >= SCHNORR_GROUP.q) {
    throw new Error(`${label} must be in the range 1…q−1`);
  }
}

function assertChallenge(value: bigint): void {
  if (value < BigInt(0) || value >= SCHNORR_GROUP.q) {
    throw new Error('Challenge must be in the range 0…q−1');
  }
}

export function publicKeyFromSecret(secret: bigint): bigint {
  assertNonZeroScalar(secret, 'Secret');
  return modPow(SCHNORR_GROUP.g, secret, SCHNORR_GROUP.p);
}

export function commitmentFromNonce(nonce: bigint): bigint {
  assertNonZeroScalar(nonce, 'Nonce');
  return modPow(SCHNORR_GROUP.g, nonce, SCHNORR_GROUP.p);
}

export function schnorrResponse(secret: bigint, nonce: bigint, challenge: bigint): bigint {
  assertNonZeroScalar(secret, 'Secret');
  assertNonZeroScalar(nonce, 'Nonce');
  assertChallenge(challenge);
  return mod(nonce + challenge * secret, SCHNORR_GROUP.q);
}

export function verifySchnorrEquation(
  publicKey: bigint,
  commitment: bigint,
  challenge: bigint,
  response: bigint,
): boolean {
  assertChallenge(challenge);
  const left = modPow(SCHNORR_GROUP.g, mod(response, SCHNORR_GROUP.q), SCHNORR_GROUP.p);
  const right = mod(
    commitment * modPow(publicKey, challenge, SCHNORR_GROUP.p),
    SCHNORR_GROUP.p,
  );
  return left === right;
}

function digestToBigInt(digest: Uint8Array): bigint {
  let value = BigInt(0);
  for (const byte of digest) {
    value = (value << BigInt(8)) + BigInt(byte);
  }
  return value;
}

export async function deriveSchnorrChallenge(
  message: string,
  aggregatePublicKey: bigint,
  aggregateCommitment: bigint,
): Promise<{ challenge: bigint; digest: Uint8Array }> {
  const transcript = new TextEncoder().encode(
    `cryptographic-arts/schnorr/v1|${message}|${aggregatePublicKey}|${aggregateCommitment}`,
  );
  const digest = await sha256(transcript);
  return {
    challenge: mod(digestToBigInt(digest), SCHNORR_GROUP.q),
    digest,
  };
}

export async function createJointSchnorrTranscript(input: {
  message: string;
  aliceSecret: bigint;
  bobSecret: bigint;
  aliceNonce: bigint;
  bobNonce: bigint;
}): Promise<JointSchnorrTranscript> {
  const alicePublicKey = publicKeyFromSecret(input.aliceSecret);
  const bobPublicKey = publicKeyFromSecret(input.bobSecret);
  const aggregatePublicKey = mod(alicePublicKey * bobPublicKey, SCHNORR_GROUP.p);
  if (aggregatePublicKey === BigInt(1)) {
    throw new Error('Participant keys cancel to the identity and cannot form a signing key');
  }
  const aliceCommitment = commitmentFromNonce(input.aliceNonce);
  const bobCommitment = commitmentFromNonce(input.bobNonce);
  const aggregateCommitment = mod(aliceCommitment * bobCommitment, SCHNORR_GROUP.p);
  if (aggregateCommitment === BigInt(1)) {
    throw new Error('Participant nonces cancel to the identity and must be regenerated');
  }
  const { challenge, digest } = await deriveSchnorrChallenge(
    input.message,
    aggregatePublicKey,
    aggregateCommitment,
  );
  const aliceResponse = schnorrResponse(input.aliceSecret, input.aliceNonce, challenge);
  const bobResponse = schnorrResponse(input.bobSecret, input.bobNonce, challenge);
  const aggregateResponse = mod(aliceResponse + bobResponse, SCHNORR_GROUP.q);

  return {
    message: input.message,
    alice: {
      secret: input.aliceSecret,
      publicKey: alicePublicKey,
      nonce: input.aliceNonce,
      commitment: aliceCommitment,
      response: aliceResponse,
    },
    bob: {
      secret: input.bobSecret,
      publicKey: bobPublicKey,
      nonce: input.bobNonce,
      commitment: bobCommitment,
      response: bobResponse,
    },
    aggregatePublicKey,
    aggregateCommitment,
    challenge,
    aggregateResponse,
    verified: verifySchnorrEquation(
      aggregatePublicKey,
      aggregateCommitment,
      challenge,
      aggregateResponse,
    ),
    challengeDigest: bytesToHex(digest),
  };
}

export function prepareIdentification(
  mode: SchnorrProverMode,
  publicKey: bigint,
  nonceOrResponse: bigint,
  guessedChallenge?: 0 | 1,
): IdentificationPreparation {
  assertNonZeroScalar(nonceOrResponse, mode === 'honest' ? 'Nonce' : 'Forged response');

  if (mode === 'honest') {
    return {
      mode,
      publicKey,
      nonce: nonceOrResponse,
      commitment: commitmentFromNonce(nonceOrResponse),
    };
  }

  if (guessedChallenge === undefined) {
    throw new Error('A no-witness prover must choose a challenge guess before committing');
  }

  const guessed = BigInt(guessedChallenge);
  const forgedResponse = nonceOrResponse;
  const commitment = mod(
    modPow(SCHNORR_GROUP.g, forgedResponse, SCHNORR_GROUP.p)
      * modInverse(modPow(publicKey, guessed, SCHNORR_GROUP.p), SCHNORR_GROUP.p),
    SCHNORR_GROUP.p,
  );

  return {
    mode,
    publicKey,
    commitment,
    guessedChallenge,
    forgedResponse,
  };
}

export function completeIdentification(
  preparation: IdentificationPreparation,
  challenge: 0 | 1,
  witness?: bigint,
): IdentificationRound {
  let response: bigint;

  if (preparation.mode === 'honest') {
    if (witness === undefined || preparation.nonce === undefined) {
      throw new Error('The honest prover requires its witness and nonce');
    }
    response = schnorrResponse(witness, preparation.nonce, BigInt(challenge));
  } else {
    if (preparation.forgedResponse === undefined) {
      throw new Error('The no-witness commitment is incomplete');
    }
    response = preparation.forgedResponse;
  }

  return {
    ...preparation,
    challenge,
    response,
    verified: verifySchnorrEquation(
      preparation.publicKey,
      preparation.commitment,
      BigInt(challenge),
      response,
    ),
  };
}

export function randomIntegerBelow(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('Random range must be a positive safe integer');
  }
  const sampleSpace = 0x1_0000_0000;
  const rejectionLimit = Math.floor(sampleSpace / maxExclusive) * maxExclusive;
  const sample = new Uint32Array(1);

  do {
    crypto.getRandomValues(sample);
  } while (sample[0] >= rejectionLimit);

  return sample[0] % maxExclusive;
}

export function randomScalar(): bigint {
  const range = Number(SCHNORR_GROUP.q - BigInt(1));
  return BigInt(randomIntegerBelow(range) + 1);
}

export function randomChallengeBit(): 0 | 1 {
  const sample = new Uint8Array(1);
  crypto.getRandomValues(sample);
  return (sample[0] & 1) as 0 | 1;
}
