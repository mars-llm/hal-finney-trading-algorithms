/* eslint-disable @typescript-eslint/no-unused-expressions */
async page => {
  const base = page.url().replace(/\/$/, '');
  const open = async slug => page.goto(`${base}/work/${slug}/`, { waitUntil: 'load' });
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const delayDigests = async () => page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    crypto.subtle.digest = async (...args) => {
      const result = await original(...args);
      await new Promise(resolve => setTimeout(resolve, 300));
      return result;
    };
  });

  await open('post-quantum');
  await page.getByRole('button', { name: 'GENERATE ONE-TIME KEY', exact: true }).click();
  await page.getByRole('button', { name: 'SIGN ONCE / DISCARD PRIVATE KEY' }).waitFor();
  await delayDigests();
  await page.getByRole('button', { name: 'SIGN ONCE / DISCARD PRIVATE KEY' }).click();
  check(await page.getByRole('textbox', { name: 'Message to sign or verify' }).isDisabled(), 'Message must be locked during signing');
  await page.getByText(/VALID: ALL 256/).waitFor({ timeout: 15000 });
  await page.getByRole('textbox', { name: 'Message to sign or verify' }).fill('ALTERED');
  check(await page.getByText(/VALID: ALL 256/).count() === 0, 'Editing must clear the old verification');
  await page.getByRole('button', { name: 'VERIFY CURRENT MESSAGE' }).click();
  check(await page.getByRole('textbox', { name: 'Message to sign or verify' }).isDisabled(), 'Message must be locked during verification');
  await page.getByText(/INVALID: THE MESSAGE/).waitFor({ timeout: 15000 });

  await open('post-quantum');
  await page.getByRole('button', { name: 'GENERATE ONE-TIME KEY', exact: true }).click();
  await page.getByRole('button', { name: 'SIGN ONCE / DISCARD PRIVATE KEY' }).waitFor();
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let failed = false;
    crypto.subtle.digest = async (...args) => {
      if (!failed && args[1].byteLength === 8192) { failed = true; throw new Error('Injected fingerprint failure'); }
      return original(...args);
    };
  });
  await page.getByRole('button', { name: 'SIGN ONCE / DISCARD PRIVATE KEY' }).click();
  await page.getByText('Signing failed. Generate a fresh key before trying again.').waitFor();
  check(await page.getByRole('button', { name: 'SIGN ONCE / DISCARD PRIVATE KEY' }).count() === 0, 'A consumed key must not be offered again');
  check(await page.getByRole('button', { name: 'GENERATE ONE-TIME KEY', exact: true }).isEnabled(), 'A fresh key must be available after failure');

  await open('schnorr');
  await delayDigests();
  await page.getByRole('button', { name: 'RUN JOINT TRANSCRIPT' }).click();
  check(await page.getByRole('slider', { name: 'Alice secret scalar' }).isDisabled(), 'Schnorr inputs must be locked while running');
  await page.getByText(/gˢ = R.*VERIFIED/).waitFor();
  check(await page.getByRole('slider', { name: 'Alice secret scalar' }).inputValue() === '3', 'The displayed secret must match the transcript');
  check(await page.getByText('X = gˣ = 8', { exact: true }).count() > 0, 'The transcript must show the public key for secret 3');

  await open('avalanche');
  await page.getByRole('grid', { name: /256 input bits/ }).waitFor();
  await delayDigests();
  await page.getByPlaceholder('Enter seed text...').fill('NEW');
  check(await page.getByRole('button', { name: 'Invert', exact: true }).isDisabled(), 'Inversion must be locked while the seed is initializing');
  await page.getByRole('button', { name: 'Invert', exact: true }).waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('button:disabled') || !Array.from(document.querySelectorAll('button')).some(button => button.textContent.trim() === 'Invert' && button.disabled));
  const firstByte = () => page.locator('[role="gridcell"]').evaluateAll(cells => cells.slice(0, 8).map(cell => cell.getAttribute('aria-label').slice(-1)).join(''));
  check(await firstByte() === '01001110', 'The grid must correspond to the new seed');
  await page.getByRole('button', { name: 'Invert', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#input-bit-0')?.getAttribute('aria-label') === 'Bit 0: 1');
  check(await firstByte() === '11001110', 'The inversion must apply to the new seed');

  await open('proof-of-work');
  await page.evaluate(() => { crypto.subtle.digest = async () => { throw new Error('Injected digest failure'); }; });
  await page.getByRole('button', { name: 'BEGIN WORK' }).click();
  await page.getByText('Hashing failed. Try again.').waitFor();
  check(await page.locator('#pow-block-data').isEnabled(), 'A failed mining run must release its inputs');
  check(await page.getByRole('button', { name: 'BEGIN WORK' }).isEnabled(), 'A failed mining run must allow retry');

  await open('one-way');
  await page.getByRole('button', { name: 'Hash current digest' }).waitFor();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const original = crypto.subtle.digest.bind(crypto.subtle);
    let failed = false;
    crypto.subtle.digest = async (...args) => { if (!failed) { failed = true; throw new Error('Injected digest failure'); } return original(...args); };
  });
  await page.getByRole('button', { name: 'Hash current digest' }).click();
  await page.getByRole('alert').filter({ hasText: 'Hashing failed.' }).waitFor();
  await page.getByRole('button', { name: 'Try again' }).click();
  await page.getByRole('button', { name: 'Hash current digest' }).waitFor();
  check(await page.getByRole('button', { name: 'Hash current digest' }).isEnabled(), 'Hash chain must recover after an error');
  return 'All browser state regressions passed';
}
