# Cryptographic Arts - Agent Instructions

## Project Vision & Aesthetic
"Cryptographic Arts" is a curated study of computational structure. It visualizes cryptographic primitives as objects of perception.
- **Aesthetic:** Minimalist, high-contrast, museum-catalogue aesthetic. No 3D walls, no frames.
- **Interactions:** Strictly limited and deliberate. The interaction should highlight the cryptographic concept (e.g., flipping a bit, selecting a leaf) without feeling like a toy.
- **Typography & Layout:** Uses a strict, limited palette (`#0E0E0E` canvas, `#D4D4D4` ink). Uses clean, structural layouts without skeuomorphic clichés or cyberpunk tropes.
- **Cryptography:** Uses actual Web Crypto API (`crypto.subtle`) for mathematically faithful execution. No fake or mock crypto unless explicitly simulating an algorithm not supported by the native API (e.g., Schnorr signatures, Post-Quantum).
- **Tone:** Objective, descriptive, and structural.

## Development Guidelines
- The project is built with **Next.js (App Router)** and **Tailwind CSS**.
- Animation is powered by **Motion for React**.
- Contextual information is kept hidden by default inside the `InfoPanel` component, accessed via the "Context / Info" button, to preserve the standalone visual experience.
- The `InfoPanel` contains references to the original cryptography concepts (e.g., BIPs, Wikipedia, Bitcoin Core codebase). 

## Deployment to GitHub Pages
This application is configured for static export (`output: 'export'` in `next.config.mjs`) to be deployed via GitHub Pages.
- When assisting the user in deploying, remember that the build artifact is located in the `out/` directory after running `npm run build`.
- If a GitHub Actions workflow is needed for deployment, it should run `npm ci`, `npm run build`, and deploy the `out` directory to GitHub Pages.

## Core Rules for Agents
1. **Maintain Scope:** Do not add unrelated features (like user accounts, databases, or complex navigation) unless explicitly requested.
2. **Preserve Design:** Respect the existing Tailwind classes, color scheme, and spacing.
3. **Reference Code:** Continue to reference actual implementation logic or real-world use cases (like Bitcoin Core) in the InfoPanel when adding new algorithms.
