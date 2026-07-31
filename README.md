# Cryptographic Arts

*Cryptographic structures rendered as objects of perception.*

Cryptographic Arts is a browser exhibition of eight computational processes. Each work gives the visitor a limited way to alter an input, select evidence, or advance a protocol. The resulting state comes from the algorithm itself.

[View the exhibition](https://mars-llm.github.io/hal-finney-trading-algorithms/)

## The works

| No. | Work | Computation and interaction |
| --- | --- | --- |
| 01 | Avalanche | SHA-256 maps a 256-bit input to a 256-bit digest. Edit the seed or invert an input bit to observe how many output bits change. |
| 02 | One Way | Repeated SHA-256 forms a hash chain. Advance one state at a time while prior digests remain as a visual trace. |
| 03 | Merkle | Eight SHA-256 leaves form a binary Merkle tree. Select a leaf to isolate its sibling path and recompute the root from that compact proof. |
| 04 | Proof of Work | Supply block data and choose an 8, 12, or 16 leading-zero-bit target. SHA-256 tests successive decimal nonces; after a solution, continue to the next valid nonce. |
| 05 | Elliptic Curve | Valid points on `y² = x³ + 7 (mod 97)` form a finite group. Select two points to compute their sum, including doubling and the point at infinity. |
| 06 | Zero Knowledge | An interactive Schnorr identification protocol runs over a small finite group. Compare a prover with the witness against a no-witness prover that must commit to a challenge guess in advance. |
| 07 | Schnorr | Two participants choose secret scalars, generate fresh nonces, aggregate their public values and responses, and submit one transcript to the verifier equation. |
| 08 | Post-Quantum | A Lamport one-time key contains 256 secret pairs. Sign a message once, change the message, and independently verify the 256 revealed blocks against the public key. |

The finite groups used by Elliptic Curve, Zero Knowledge, and Schnorr are intentionally small so every value can be inspected. Their arithmetic is exact, but their parameters are not secure. The Schnorr aggregation exhibit is an educational cooperative transcript, not an implementation of BIP 340 or MuSig2. Each work's Context / Info panel states its boundary and links to production specifications or source implementations.

## Design

The interface follows a museum-catalogue model: a dark canvas, a restricted palette, structural typography, and no simulated gallery architecture. Interaction is limited to operations that affect the underlying computation. Explanatory material stays in a modal context panel so the visual work remains primary.

Cryptographic operations use the browser's Web Crypto API where it provides the required primitive. Finite-group operations are implemented with exact modular arithmetic. Animation presents state changes but never determines a cryptographic result.

## Local development

Node.js 24 or newer and npm are required.

```bash
npm ci
npm run dev
```

The development server uses `/` as its base path and is available at `http://localhost:3000`.

Quality commands are separate so failures cannot be hidden inside the Next.js build:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
```

`npm run check` runs lint, TypeScript, Vitest, and the production static export in that order. The exported site is written to `out/`.

## GitHub Pages deployment

The production configuration targets this exact repository name:

```text
mars-llm/hal-finney-trading-algorithms
```

Next.js therefore builds links and assets beneath `/hal-finney-trading-algorithms`, which produces the public URL:

```text
https://mars-llm.github.io/hal-finney-trading-algorithms/
```

If the repository is renamed, update the production `basePath` in `next.config.mjs` before deployment.

To publish:

1. Create or rename the repository to `hal-finney-trading-algorithms` in the `mars-llm` organization.
2. In the repository's Pages settings, select **GitHub Actions** as the source.
3. Push to `main` or run the workflow manually.

The workflow installs from `package-lock.json`, runs every quality gate, builds the static export, and deploys `out/`. Trailing-slash output gives each route an `index.html`, so direct exhibit URLs work on static hosting.

## Accessibility

The application provides visible keyboard focus, a scrollable mobile layout, and controls sized for touch. The Context / Info panel has dialog semantics, traps focus while open, closes with Escape, restores focus to its opener, and makes the background inert. Motion follows the visitor's `prefers-reduced-motion` setting. Dense bit and point fields use grouped keyboard navigation where a long sequence of individual tab stops would obscure the work.

## Technical record

- Next.js 15 App Router with static export
- React 19 and TypeScript
- Tailwind CSS 4
- Motion for structural transitions
- Web Crypto API for SHA-256 and secure random values
- Vitest for cryptographic invariant tests

Inspired by Hal Finney's 1993 "cryptographic trading cards" message. Developed by Marsmensch, 2026.
