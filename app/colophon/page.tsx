'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

export default function Colophon() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 md:p-12 md:py-24 space-y-24">
        
        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <h1 className="font-serif text-3xl tracking-wide text-white uppercase">Colophon</h1>
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#D4D4D4] opacity-80">
            <p>
              <strong>Cryptographic Arts</strong> is an online exhibition about the structure of
              cryptographic processes. It begins with Hal Finney&apos;s 1993 post, &quot;Crypto trading
              cards,&quot; which imagines cryptographic objects as things worth examining for the
              mathematical arrangements they contain.
            </p>
            <p>
              The exhibition is inspired by Finney&apos;s post and is not affiliated with him. It is not
              a collection of on-chain assets, NFTs, or Ordinals.
            </p>
            <p>
              The algorithms produce the displayed state. The visual treatment makes their internal
              relationships perceptible without replacing the computation.
            </p>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-6"
        >
          <h2 className="font-serif text-2xl tracking-wide text-white uppercase">Methodology &amp; Fidelity</h2>
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#D4D4D4] opacity-80">
            <p>
              The works use the browser&apos;s Web Crypto API for SHA-256 and secure random
              sampling. Small finite-group exhibits use exact modular arithmetic. Their values are
              intentionally inspectable and provide no production security.
            </p>
            <p>
              <strong>Avalanche</strong> maps a 256-bit input to its 256-bit digest.
              <strong> One Way</strong> advances an iterated SHA-256 chain.
              <strong> Merkle</strong> builds eight hashed leaves and verifies the selected
              leaf&apos;s sibling path against the root.
            </p>
            <p>
              <strong>Proof of Work</strong> tests successive decimal nonces against a chosen
              leading-zero-bit target. <strong>Elliptic Curve</strong> performs the group law on
              y² = x³ + 7 over the small field F₉₇, including the point at infinity.
            </p>
            <p>
              <strong>Zero Knowledge</strong> runs the interactive Schnorr identification
              protocol and lets a no-witness prover attempt the optimal challenge-guess strategy.
              <strong> Schnorr</strong> combines two participants&apos; values into one valid,
              educational transcript. It does not claim BIP 340 or MuSig2 compatibility.
              <strong> Post-Quantum</strong> generates, signs, and verifies a real Lamport
              one-time signature, then discards the used private key.
            </p>
            <p>
              Each interaction changes a valid input, selects evidence, or advances a protocol.
              Animation presents state transitions but never supplies a cryptographic result.
            </p>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <h2 className="font-serif text-2xl tracking-wide text-white uppercase">Source Material</h2>
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#D4D4D4] opacity-80 bg-white/5 p-6 border-l border-white/20">
            <pre className="font-mono text-[10px] whitespace-pre-wrap leading-relaxed overflow-x-auto">
{`To: CYPHERPUNKS <CYPHERPUNKS@TOAD.COM>
Subject: Crypto trading cards.
From: Hal <74076.1041@CompuServe.COM>
Date: 17 Jan 93 13:48:02 EST

Giving a little more thought to the idea of buying and selling digital cash, I thought of a way to present it. We're buying and selling "cryptographic trading cards". Fans of cryptography will love these fascinating examples of the cryptographic arts. Notice the fine way the bit patterns fit together - a mix of one-way functions and digital signatures, along with random blinding. What a perfect conversation piece to be treasured and shown to your friends and family.

Plus, your friends will undoubtedly love these cryptographic trading cards just as much. They'll be eager to trade for them. Collect a whole set! They come in all kinds of varieties, from the common 1's, to the rarer 50's, all the way up to the seldom-seen 1000's. Hours of fun can be had for all.

Your friendly cryptographic trading card dealer wants to join the fun, too. He'll be as interested in buying your trading cards back as in selling them.

Try this fascinating and timely new hobby today!

Hal`}
            </pre>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-6"
        >
          <h2 className="font-serif text-2xl tracking-wide text-white uppercase">Technical Record</h2>
          <ul className="font-mono text-xs space-y-2 text-ink-muted">
            <li className="grid grid-cols-3">
              <span>Architecture</span>
              <span className="col-span-2">React, TypeScript, Next.js</span>
            </li>
            <li className="grid grid-cols-3">
              <span>Cryptography</span>
              <span className="col-span-2">Web Crypto API, BigInt modular arithmetic</span>
            </li>
            <li className="grid grid-cols-3">
              <span>Animation</span>
              <span className="col-span-2">Motion</span>
            </li>
            <li className="grid grid-cols-3">
              <span>Typography</span>
              <span className="col-span-2">System Serif, System Sans, System Mono</span>
            </li>
            <li className="grid grid-cols-3">
              <span>Design System</span>
              <span className="col-span-2">Tailwind CSS v4</span>
            </li>
          </ul>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="space-y-6"
        >
          <h2 className="font-serif text-2xl tracking-wide text-white uppercase">Contact</h2>
          <div className="space-y-4 font-sans text-sm leading-relaxed text-[#D4D4D4] opacity-80">
            <p>
              Questions about the exhibition or its cryptographic structures are welcome through:
            </p>
            <ul className="font-mono text-xs space-y-2 mt-4 text-white">
              <li>
                <a href="https://x.com/marsmensch" target="_blank" rel="noreferrer" className="hover:opacity-70 transition-opacity underline decoration-white/30">
                  X (Twitter) / @marsmensch
                </a>
              </li>
              <li>
                <a href="mailto:marsmensch@pm.me" className="hover:opacity-70 transition-opacity underline decoration-white/30">
                  Email / marsmensch@pm.me
                </a>
              </li>
            </ul>
          </div>
        </motion.section>

        <motion.section 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="pt-12 border-t border-white/10"
        >
          <Link href="/" className="font-mono text-xs tracking-widest text-[#D4D4D4] hover:text-white transition-colors">
            ← RETURN TO INDEX
          </Link>
        </motion.section>

      </div>
    </div>
  );
}
