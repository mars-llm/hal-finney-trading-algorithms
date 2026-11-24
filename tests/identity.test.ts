import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('exhibition identity', () => {
  it('maps the first 64 SHA-256 bits of its name to the icon', () => {
    const digest = createHash('sha256').update('Cryptographic Arts').digest();
    const path = Array.from({ length: 64 }, (_, index) => {
      const bit = (digest[Math.floor(index / 8)] >> (7 - (index % 8))) & 1;
      return bit ? `M${8 + (index % 8) * 6} ${8 + Math.floor(index / 8) * 6}h4v4h-4z` : '';
    }).join('');
    const svg = readFileSync(new URL('../app/icon.svg', import.meta.url), 'utf8');

    expect(svg).toContain(`d="${path}"`);
  });
});
