'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { InfoPanel } from '../../../components/InfoPanel';
import { sha256, buildMerkleTree, bytesToHex, MerkleNode } from '../../../lib/crypto';

export default function Merkle() {
  const [levels, setLevels] = useState<MerkleNode[][]>([]);
  const [selectedLeaf, setSelectedLeaf] = useState<number | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    leaf: number;
    status: 'verified' | 'failed';
  } | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const initialize = useCallback(async () => {
    const encoder = new TextEncoder();
    const leaves = await Promise.all(
      Array.from({ length: 8 }).map((_, i) => sha256(encoder.encode(`CRYPTOGRAPHIC_ARTS_MERKLE_LEAF_${i}`)))
    );
    const tree = await buildMerkleTree(leaves);
    setLevels(tree.levels);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (selectedLeaf === null || levels.length === 0) return;

    let cancelled = false;
    const verify = async () => {
      let computedHash = levels[levels.length - 1][selectedLeaf].hash;
      let nodeIndex = selectedLeaf;

      for (let levelIndex = levels.length - 1; levelIndex > 0; levelIndex--) {
        const sibling = levels[levelIndex][nodeIndex ^ 1];
        const combined = new Uint8Array(computedHash.length + sibling.hash.length);
        if (nodeIndex % 2 === 0) {
          combined.set(computedHash);
          combined.set(sibling.hash, computedHash.length);
        } else {
          combined.set(sibling.hash);
          combined.set(computedHash, sibling.hash.length);
        }
        computedHash = await sha256(combined);
        nodeIndex = Math.floor(nodeIndex / 2);
      }

      if (!cancelled) {
        setVerificationResult({
          leaf: selectedLeaf,
          status: bytesToHex(computedHash) === bytesToHex(levels[0][0].hash) ? 'verified' : 'failed',
        });
      }
    };

    void verify();
    return () => {
      cancelled = true;
    };
  }, [levels, selectedLeaf]);

  const verification = selectedLeaf === null
    ? 'idle'
    : verificationResult?.leaf === selectedLeaf
      ? verificationResult.status
      : 'verifying';

  // If a leaf is selected, calculate which nodes are part of the proof
  const getNodeRole = (levelIndex: number, nodeIndex: number) => {
    if (selectedLeaf === null) return 'default'; // No selection
    
    // Total levels: for 8 leaves, it's 4 levels (0: root, 1: 2 nodes, 2: 4 nodes, 3: 8 leaves)
    const depth = levels.length - 1 - levelIndex; // 0 for leaves, 3 for root
    
    const activePathNodeIndex = selectedLeaf >> depth;
    const siblingNodeIndex = activePathNodeIndex ^ 1;

    if (nodeIndex === activePathNodeIndex) {
      // It's the computed node on the path to the root
      return depth === 0 ? 'target' : 'computed';
    }
    
    if (nodeIndex === siblingNodeIndex && depth < levels.length - 1) {
      // It's a sibling required for the proof (except at root level where there are no siblings)
      return 'proof';
    }

    return 'inactive';
  };

  if (levels.length === 0) return null;

  return (
    <div className="flex-1 flex flex-col relative items-center justify-center px-2 py-8 pb-24 sm:px-6 md:px-12">
      
      {/* Tree Visualization */}
      <div className="w-full max-w-5xl h-[32rem] sm:h-[36rem] relative">
        
        {/* Background SVG for Tree Lines */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {levels.map((level, levelIndex) => {
            if (levelIndex === levels.length - 1) return null; // No children for leaves
            
            const nextLevelCount = levels[levelIndex + 1].length;
            const currentLevelCount = level.length;
            
            const y1 = 10 + (levelIndex / (levels.length - 1)) * 80;
            const y2 = 10 + ((levelIndex + 1) / (levels.length - 1)) * 80;
            
            return level.map((node, nodeIndex) => {
              // Calculate X positions (from 0 to 1) using justify-around logic
              // justify-around puts space around items. 
              // n items divides space into n equal chunks. The center of chunk i is (i + 0.5) / n.
              const x1 = ((nodeIndex + 0.5) / currentLevelCount) * 100;
              const leftChildIndex = nodeIndex * 2;
              const rightChildIndex = leftChildIndex + 1;
              const x2Left = ((leftChildIndex + 0.5) / nextLevelCount) * 100;
              const x2Right = ((rightChildIndex + 0.5) / nextLevelCount) * 100;

              const lineStyle = (childIndex: number) => {
                if (selectedLeaf === null) {
                  return { color: 'rgba(255,255,255,0.4)', opacity: 0.22 };
                }
                const childRole = getNodeRole(levelIndex + 1, childIndex);
                if (childRole === 'proof') return { color: '#3b82f6', opacity: 1 };
                if (childRole === 'target' || childRole === 'computed') {
                  return { color: '#d4d4d4', opacity: 0.8 };
                }
                return { color: 'rgba(255,255,255,0.4)', opacity: 0.05 };
              };
              const leftLine = lineStyle(leftChildIndex);
              const rightLine = lineStyle(rightChildIndex);

              return (
                <g key={`lines-${levelIndex}-${nodeIndex}`}>
                  <line x1={x1} y1={y1} x2={x2Left} y2={y2} stroke={leftLine.color} strokeWidth="0.25" vectorEffect="non-scaling-stroke" strokeOpacity={leftLine.opacity} className="transition-opacity duration-300" />
                  <line x1={x1} y1={y1} x2={x2Right} y2={y2} stroke={rightLine.color} strokeWidth="0.25" vectorEffect="non-scaling-stroke" strokeOpacity={rightLine.opacity} className="transition-opacity duration-300" />
                </g>
              );
            });
          })}
        </svg>

        {levels.map((level, levelIndex) => (
          <div key={`level-${levelIndex}`} className="contents">
            {level.map((node, nodeIndex) => {
              const role = getNodeRole(levelIndex, nodeIndex);
              const hex = bytesToHex(node.hash);
              
              const isLeaf = levelIndex === levels.length - 1;
              const isRoot = levelIndex === 0;
              const x = ((nodeIndex + 0.5) / level.length) * 100;
              const y = 10 + (levelIndex / (levels.length - 1)) * 80;
              
              let bg = 'bg-[#0a0a0a] border border-white/20 text-ink-muted';
              let scale = 1;
              let opacity = 1;
              let textColor = 'text-ink-muted';

              if (role === 'default') {
                opacity = 0.8;
              } else if (role === 'target') {
                bg = 'bg-[#D4D4D4] text-[#0E0E0E] border-[#D4D4D4]';
                textColor = 'text-[#0E0E0E]';
                scale = 1.1;
              } else if (role === 'computed') {
                bg = 'bg-white/10 border-[#D4D4D4] text-white font-bold';
                textColor = 'text-white';
              } else if (role === 'proof') {
                bg = 'bg-[#3B82F6]/20 border-[#3B82F6] text-[#3B82F6]';
                textColor = 'text-[#3B82F6]';
                scale = 1.05;
              } else if (role === 'inactive') {
                opacity = 0.15;
              }

              return (
                <div
                  key={nodeIndex}
                  className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <motion.button
                    animate={{ scale, opacity }}
                    transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
                    onClick={() => isLeaf ? setSelectedLeaf(selectedLeaf === nodeIndex ? null : nodeIndex) : null}
                    disabled={!isLeaf}
                    aria-pressed={isLeaf ? selectedLeaf === nodeIndex : undefined}
                    className={`
                      relative flex items-center justify-center font-mono text-[10px] md:text-xs tracking-tighter
                      transition-colors duration-300
                      ${isRoot ? 'w-24 h-11 md:w-32 md:h-12' : ''}
                      ${!isRoot && !isLeaf ? 'w-14 h-10 md:w-24 md:h-10' : ''}
                      ${isLeaf ? 'w-10 h-14 sm:w-11 md:w-16 md:h-20 cursor-pointer hover:border-white/50' : 'cursor-default'}
                      ${bg}
                    `}
                    aria-label={isLeaf ? `Select leaf ${nodeIndex}, hash ${hex}` : undefined}
                  >
                    <span className={`${textColor} hidden sm:inline`}>{hex.substring(0, 8)}</span>
                    <span className={`${textColor} sm:hidden`}>{hex.substring(0, 4)}</span>
                  </motion.button>
                  
                  {isLeaf && (
                    <motion.div 
                      animate={{ opacity }} 
                      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[7px] md:text-[10px] text-ink-muted uppercase tracking-wider mt-2"
                    >
                      L{nodeIndex}
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="min-h-8 px-12 font-mono text-[10px] text-ink-muted text-center" aria-live="polite">
        {selectedLeaf === null && 'Select a leaf to reveal and verify its compact proof of inclusion.'}
        {selectedLeaf !== null && verification === 'verifying' && 'Recomputing the root from the selected leaf and three sibling hashes…'}
        {selectedLeaf !== null && verification === 'verified' && (
          <span>Proof verified. Recomputed root <span className="text-accent">{bytesToHex(levels[0][0].hash).substring(0, 8)}</span> matches.</span>
        )}
        {selectedLeaf !== null && verification === 'failed' && <span className="text-red-400">Proof rejected: reconstructed root differs.</span>}
      </div>

      <InfoPanel
        references={[
  {
    title: "Protocols for Public Key Cryptosystems (Ralph Merkle, 1980)",
    url: "https://www.merkle.com/papers/Protocols.pdf",
    summary: "The original paper introducing the concept of Merkle Trees."
  },
  {
    title: "Bitcoin Core: src/consensus/merkle.cpp",
    url: "https://github.com/bitcoin/bitcoin/blob/master/src/consensus/merkle.cpp",
    summary: "Bitcoin's implementation of Merkle root computation for blocks."
  }
]} 
        title="Merkle"
        year={2026}
        process="Merkle Tree & Inclusion Proof"
        proposition="A leaf and its sibling path can be enough to recompute a committed Merkle root."
        technicalRecord={{
          algorithm: "SHA-256 Merkle Tree (8 leaves)",
          seed: "CRYPTOGRAPHIC_ARTS_MERKLE_LEAF_n",
          renderer: "React/Motion Layout"
        }}
      >
        <p>
          A Merkle tree commits a collection of leaves to one root hash. To verify one leaf, a
          verifier needs the leaf and the sibling hash at each level on its route to that root.
        </p>
        <p>
          Select a leaf to isolate its three sibling hashes. The browser combines them in the proper
          left-or-right order and recomputes the root.
        </p>
        <p>
          A matching reconstructed root verifies the selected leaf against this tree. The same compact
          proof idea lets systems verify membership without sending every leaf.
        </p>
        </InfoPanel>
    </div>
  );
}
