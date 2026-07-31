/**
 * Hashes a Uint8Array using SHA-256 and returns a Uint8Array.
 */
export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return new Uint8Array(hashBuffer);
}

/**
 * Counts the number of leading zero bits in a Uint8Array.
 */
export function countLeadingZeroBits(bytes: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      count += 8;
    } else {
      const b = bytes[i];
      for (let j = 7; j >= 0; j--) {
        if ((b & (1 << j)) === 0) count++;
        else return count;
      }
    }
  }
  return count;
}

/**
 * Converts a hex string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Extracts all 256 bits from a 32-byte Uint8Array as an array of booleans.
 */
export function bytesToBits(bytes: Uint8Array): boolean[] {
  const bits: boolean[] = [];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 7; j >= 0; j--) {
      bits.push((bytes[i] & (1 << j)) !== 0);
    }
  }
  return bits;
}

/**
 * Flips a specific bit in a 32-byte Uint8Array.
 * Mutates the array in place, but we usually clone it first.
 */
export function flipBit(bytes: Uint8Array, bitIndex: number): Uint8Array {
  const newBytes = new Uint8Array(bytes);
  const byteIndex = Math.floor(bitIndex / 8);
  const bitOffset = 7 - (bitIndex % 8);
  newBytes[byteIndex] ^= (1 << bitOffset);
  return newBytes;
}

export type MerkleNode = {
  hash: Uint8Array;
  left?: MerkleNode;
  right?: MerkleNode;
};

/**
 * Builds a Merkle tree from a list of leaf hashes.
 * Assumes number of leaves is a power of 2 for simplicity.
 */
export async function buildMerkleTree(leaves: Uint8Array[]): Promise<{ root: MerkleNode, levels: MerkleNode[][] }> {
  const levels: MerkleNode[][] = [];
  let currentLevel: MerkleNode[] = leaves.map(hash => ({ hash }));
  levels.push([...currentLevel]);

  while (currentLevel.length > 1) {
    const nextLevel: MerkleNode[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1];
      if (right) {
        const combined = new Uint8Array(left.hash.length + right.hash.length);
        combined.set(left.hash);
        combined.set(right.hash, left.hash.length);
        const hash = await sha256(combined);
        nextLevel.push({ hash, left, right });
      } else {
        const combined = new Uint8Array(left.hash.length * 2);
        combined.set(left.hash);
        combined.set(left.hash, left.hash.length);
        const hash = await sha256(combined);
        nextLevel.push({ hash, left, right: left });
      }
    }
    levels.push([...nextLevel]);
    currentLevel = nextLevel;
  }

  // levels array is currently [leaves, level_1, level_2, root]
  // reverse it so levels[0] is root, levels[3] is leaves
  return { root: currentLevel[0], levels: levels.reverse() };
}

/**
 * Generates an authentication path for a specific leaf index.
 */
export function getMerklePath(root: MerkleNode, leafIndex: number, totalLeaves: number): { hash: Uint8Array, isLeft: boolean }[] {
  const path: { hash: Uint8Array, isLeft: boolean }[] = [];
  
  function traverse(node: MerkleNode, targetIndex: number, levelSize: number): boolean {
    if (!node.left && !node.right) {
      return targetIndex === 0;
    }
    
    const half = Math.ceil(levelSize / 2);
    if (targetIndex < half) {
      if (node.left && traverse(node.left, targetIndex, half)) {
        if (node.right) path.push({ hash: node.right.hash, isLeft: false });
        return true;
      }
    } else {
      if (node.right && traverse(node.right, targetIndex - half, levelSize - half)) {
        if (node.left) path.push({ hash: node.left.hash, isLeft: true });
        return true;
      }
    }
    return false;
  }

  traverse(root, leafIndex, totalLeaves);
  return path;
}
