# Cryptographic Arts: exhibition notes

## Curatorial premise

Cryptographic Arts treats a computational structure as the work itself. The interface does not imitate a gallery room and does not use frames, three-dimensional walls, cyberpunk ornament, or market imagery. Its visual language comes from a museum catalogue: measured spacing, restrained typography, a dark canvas, pale ink, and one blue accent for active evidence.

The project begins with Hal Finney's 1993 description of "cryptographic trading cards." It is inspired by that proposal but is not affiliated with Finney and is not a collection of tokens, NFTs, Ordinals, or other on-chain assets.

## Fidelity and interaction

Every interaction must alter a real input, select cryptographic evidence, or advance a valid protocol step. Animation can reveal a transition but cannot supply a result. The visitor should be able to influence an outcome when the mathematics permits it.

SHA-256 and secure random sampling use the browser's Web Crypto API. The finite-group exhibits use exact modular arithmetic over small stated groups. Small parameters make a complete transcript legible, but they provide no production security. The Context / Info panel identifies this boundary and links to primary specifications or practical implementations.

Explanatory text stays hidden until requested. The visual state must communicate the central relation without turning the work into a dashboard or a toy.

## Catalogue

### 01. Avalanche

- Proposition: a one-bit input change reorganizes a cryptographic digest.
- Basis: SHA-256 over an exact 32-byte input.
- Interaction: edit the seed or invert a bit in the input grid.
- Visual record: two 16 by 16 grids map the 256 input and output bits directly. Changed digest bits are counted after each inversion.

### 02. One Way

- Proposition: forward evaluation is practical while inversion from the current digest is not.
- Basis: an iterated SHA-256 hash chain.
- Interaction: choose the initial seed and advance the chain one state at a time.
- Visual record: 32 bars encode the digest bytes. Retained hexadecimal states form a faint history trace; they are records of prior computation, not reconstructed predecessors.

### 03. Merkle

- Proposition: a small proof can authenticate one member of a larger committed set.
- Basis: an eight-leaf SHA-256 Merkle tree.
- Interaction: select a leaf.
- Visual record: the selected leaf and its three sibling hashes remain prominent while unrelated nodes recede. The browser recomputes the root from the leaf and proof path and displays whether it matches the committed root.

### 04. Proof of Work

- Proposition: discovering a hash below a target requires repeated work, while checking a discovered nonce requires one hash.
- Basis: SHA-256 over a fixed prefix and successive nonce values.
- Interaction: supply block data, choose an 8, 12, or 16 leading-zero-bit target, and start or halt the search. After success, continue from that solution to find the next valid nonce. Editing the data or difficulty cancels the current run and invalidates its result.
- Visual record: the current nonce and digest bits expose the search and the target relation without substituting a simulated result.
- Boundary: browser-scale targets are intentionally smaller than production network difficulty.

### 05. Elliptic Curve

- Proposition: a finite scatter of points retains a closed algebraic addition law.
- Basis: `y² = x³ + 7 (mod 97)`.
- Interaction: select two valid points, including selecting the same point twice for doubling.
- Visual record: operands and their sum remain distinct. Inverse pairs and vertical tangents resolve to the point at infinity rather than a blank state.
- Boundary: this curve shares the equation form used by secp256k1 but operates over a different, very small prime field. It is not a scaled secp256k1 group.

### 06. Zero Knowledge

- Proposition: a prover can demonstrate knowledge of a discrete logarithm without sending the witness.
- Basis: the interactive Schnorr Sigma protocol in the subgroup with `p = 23`, `q = 11`, and `g = 2`.
- Interaction: choose an honest prover or a no-witness prover, then advance commitment, random challenge, response, and verification as separate steps.
- Honest transcript: `t = gʳ`, `c` is an independent random bit, `s = r + cx mod q`, and the verifier checks `gˢ = t yᶜ mod p`.
- No-witness transcript: the prover guesses the challenge before committing and constructs a response that works only when the verifier's independent challenge matches that guess.
- Visual record: accepted and rejected rounds remain visible. Confidence is `1 - 2^-n` after `n` consecutive accepted independent rounds and resets after rejection. It never claims certainty.

### 07. Schnorr

- Proposition: cooperative participants can aggregate public values and scalar responses into one verifiable Schnorr transcript.
- Basis: the prime-order subgroup with `p = 23`, `q = 11`, and `g = 2`, with a SHA-256 transcript challenge reduced modulo `q`.
- Interaction: choose Alice's and Bob's secret scalars, then run the transcript with fresh nonzero Web Crypto nonces.
- Visual record: each public key, nonce commitment, partial response, aggregate value, challenge, and verifier equation is inspectable.
- Boundary: the demonstration assumes cooperative, trusted or pre-registered keys. It omits the rogue-key defenses, nonce protocol, and participant checks required by MuSig2. It is not a BIP 340 implementation.

### 08. Post-Quantum

- Proposition: a signature can be constructed from hash preimages without relying on factoring or discrete logarithms.
- Basis: Lamport one-time signatures with SHA-256.
- Interaction: generate a key, sign one UTF-8 message, alter the message, and verify again.
- Visual record: key generation creates 256 secret pairs and hashes all 512 blocks into the public key. Each bit of the message digest selects one of its two secret blocks, so the signature contains 256 revealed blocks. A 16 by 16 matrix shows every selection.
- Boundary: the private key is discarded after signing because Lamport key reuse is unsafe. Production many-message hash-based systems, including SLH-DSA, add further one-time, few-time, and Merkle-tree constructions.

## Accessibility and responsive behavior

The index and exhibits scroll when their content exceeds the viewport. Navigation remains present throughout the exhibition, and each work has a visible identity and route back to the index. Touch targets and focus indicators remain visible against the limited palette.

The Context / Info control opens a semantic modal dialog. Focus moves into the panel, remains trapped there, returns to the opener on close, and Escape closes the panel. The rest of the document is inert while the dialog is open. Global CSS and Motion components respond to `prefers-reduced-motion`.

Large collections of equivalent controls avoid excessive tab sequences. Bit grids and finite-field points support grouped keyboard movement while retaining direct pointer selection.

## Technical architecture

- Framework: Next.js 15 App Router and React 19.
- Rendering: static export with one directory index per route.
- Styling: Tailwind CSS 4 with named canvas, ink, muted ink, and accent tokens.
- Cryptography: Web Crypto API for SHA-256 and random values; TypeScript `BigInt` and integer arithmetic for finite groups.
- Animation: Motion, limited to structural state changes.
- Tests: Vitest exercises hash-based signatures, finite-group equations, honest and cheating proof behavior, transcript tampering, and invalid aggregate states.

The production export is configured for the repository path `/hal-finney-trading-algorithms`. GitHub Pages publishes the `out/` directory only after lint, type checking, tests, and the static build pass.

## Review standard

A work is ready for publication when:

1. Its displayed result is produced by the stated computation.
2. User influence respects the algorithm's valid degrees of freedom.
3. Failure, identity, infinity, and reuse states are represented explicitly.
4. The interaction remains restrained and legible on keyboard, touch, and pointer input.
5. The Context / Info text states educational parameter choices and omitted production safeguards.
6. Lint, type checking, tests, static export, and direct-route checks pass.
