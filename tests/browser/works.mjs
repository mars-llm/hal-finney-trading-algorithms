import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const digest = data => createHash('sha256').update(data).digest();
const bits = data => [...data].map(n => n.toString(2).padStart(8, '0')).join('');
const button = (page, name) => page.getByRole('button', { name, exact: true });

export const works = {
  async avalanche(page, press) {
    await page.getByRole('grid').waitFor();
    const bit = page.locator('#input-bit-0');
    const before = await bit.getAttribute('aria-label');
    await press(button(page, 'Invert'));
    await page.getByText(/Changed bits: \d+ \/ 256/).waitFor();
    assert.notEqual(await bit.getAttribute('aria-label'), before);
  },
  async 'one-way'(page, press) {
    await page.getByPlaceholder('Enter seed text', { exact: true }).fill('TEST');
    const input = Buffer.alloc(32); input.write('TEST');
    const first = digest(input);
    const shown = bytes => page.getByText(bytes.toString('hex').slice(0, 16) + '…', { exact: true });
    await shown(first).waitFor();
    await press(button(page, 'Hash current digest'));
    await shown(digest(first)).waitFor();
  },
  async merkle(page, press) {
    for (const leaf of ['L0', 'L7']) {
      await press(button(page, leaf));
      await page.getByText('Proof for leaf ' + leaf, { exact: true }).waitFor();
      await page.getByText('Root verified', { exact: true }).waitFor();
    }
  },
  async 'proof-of-work'(page, press) {
    const lower = button(page, 'Decrease target by four leading zero bits');
    await press(lower); // Default 12 bits; the minimum is 8.
    await page.locator('#pow-block-data').fill('DEMO');
    await press(button(page, 'BEGIN WORK'));
    await button(page, 'FIND NEXT VALID NONCE').waitFor();
    const nonce = await page.getByText('Current Nonce', { exact: true }).locator('..').locator('p').last().innerText();
    const hash = digest('DEMO' + nonce.trim());
    assert.equal(hash[0], 0);
    await page.getByText(bits(hash), { exact: true }).waitFor();
  },
  async 'elliptic-curve'(page, press) {
    await press(page.getByRole('button', { name: /^Double a point:/i }));
    const equation = await page.locator('div[aria-live="polite"] p').first().innerText();
    const coordinates = equation.match(/\d+/g)?.map(Number);
    assert.equal(coordinates?.length, 6, equation);
    const [x, y, qx, qy, rx, ry] = coordinates;
    assert.equal(x, qx); assert.equal(y, qy);
    const mod = n => (n % 97 + 97) % 97;
    const inverse = Array.from({ length: 97 }, (_, i) => i).find(i => mod(2 * y * i) === 1);
    const slope = mod(3 * x * x * inverse);
    assert.equal(rx, mod(slope * slope - 2 * x));
    assert.equal(ry, mod(slope * (x - rx) - y));
    await press(button(page, 'Clear selection'));
    await page.getByText('Choose P on the field, then choose Q.', { exact: true }).waitFor();
  },
  async 'zero-knowledge'(page, press) {
    for (const step of ['Make commitment', 'Issue random challenge', 'Send response', 'Check equation']) {
      await press(button(page, step));
    }
    await page.getByRole('status').getByText(/4\. gˢ = t · yᶜ: ACCEPTED/).waitFor();
    await press(button(page, 'Begin next round'));
    await button(page, 'Make commitment').waitFor();
  },
  async schnorr(page, press) {
    await press(button(page, 'RUN JOINT TRANSCRIPT'));
    await page.getByText(/gˢ = R.*VERIFIED/).waitFor();
    await page.getByText('X = gˣ = 8', { exact: true }).waitFor();
  },
  async 'post-quantum'(page, press) {
    await press(button(page, 'GENERATE ONE-TIME KEY'));
    await press(button(page, 'SIGN ONCE / DISCARD PRIVATE KEY'));
    await page.getByText(/VALID: ALL 256/).waitFor();
  },
};
