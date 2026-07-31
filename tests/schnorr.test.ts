import { describe, expect, it } from 'vitest';
import {
  SCHNORR_GROUP,
  completeIdentification,
  createJointSchnorrTranscript,
  modPow,
  prepareIdentification,
  publicKeyFromSecret,
  randomScalar,
  verifySchnorrEquation,
} from '../lib/schnorr';

describe('finite-group Schnorr helpers', () => {
  it('uses a generator of the declared prime-order subgroup', () => {
    expect(modPow(SCHNORR_GROUP.g, SCHNORR_GROUP.q, SCHNORR_GROUP.p)).toBe(BigInt(1));
    expect(modPow(SCHNORR_GROUP.g, BigInt(1), SCHNORR_GROUP.p)).not.toBe(BigInt(1));
  });

  it('draws nonzero scalars from the subgroup range with Web Crypto', () => {
    for (let index = 0; index < 100; index++) {
      const scalar = randomScalar();
      expect(scalar).toBeGreaterThanOrEqual(BigInt(1));
      expect(scalar).toBeLessThan(SCHNORR_GROUP.q);
    }
  });

  it('builds a valid two-party aggregate transcript', async () => {
    const transcript = await createJointSchnorrTranscript({
      message: 'joint authorization',
      aliceSecret: BigInt(3),
      bobSecret: BigInt(7),
      aliceNonce: BigInt(4),
      bobNonce: BigInt(9),
    });

    expect(transcript.verified).toBe(true);
    expect(transcript.aggregatePublicKey).toBe(
      transcript.alice.publicKey * transcript.bob.publicKey % SCHNORR_GROUP.p,
    );
    expect(transcript.aggregateResponse).toBe(
      (transcript.alice.response + transcript.bob.response) % SCHNORR_GROUP.q,
    );
    expect(
      verifySchnorrEquation(
        transcript.aggregatePublicKey,
        transcript.aggregateCommitment,
        transcript.challenge,
        transcript.aggregateResponse + BigInt(1),
      ),
    ).toBe(false);
  });

  it('rejects participant keys or nonces that cancel to the group identity', async () => {
    await expect(createJointSchnorrTranscript({
      message: 'degenerate key',
      aliceSecret: BigInt(3),
      bobSecret: BigInt(8),
      aliceNonce: BigInt(4),
      bobNonce: BigInt(6),
    })).rejects.toThrow('identity');

    await expect(createJointSchnorrTranscript({
      message: 'degenerate nonce',
      aliceSecret: BigInt(3),
      bobSecret: BigInt(7),
      aliceNonce: BigInt(4),
      bobNonce: BigInt(7),
    })).rejects.toThrow('identity');
  });

  it('accepts every honest identification round', () => {
    const witness = BigInt(6);
    const preparation = prepareIdentification(
      'honest',
      publicKeyFromSecret(witness),
      BigInt(8),
    );

    expect(completeIdentification(preparation, 0, witness).verified).toBe(true);
    expect(completeIdentification(preparation, 1, witness).verified).toBe(true);
  });

  it('lets a no-witness prover answer only its precommitted challenge guess', () => {
    const preparation = prepareIdentification(
      'no-witness',
      publicKeyFromSecret(BigInt(6)),
      BigInt(8),
      1,
    );

    expect(completeIdentification(preparation, 1).verified).toBe(true);
    expect(completeIdentification(preparation, 0).verified).toBe(false);
  });
});
