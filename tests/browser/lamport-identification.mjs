export default async function checkLamportAndIdentification(page) {
  const base = page.url().replace(/\/$/, '');
  const probe = await page.context().newPage();
  const measurements = [];
  const failures = [];
  try {
    for (const [width, height] of [[320, 568], [390, 844], [1440, 900]]) {
      await probe.setViewportSize({ width, height });
      await probe.goto(base + '/work/post-quantum/');
      const generate = probe.getByRole('button', { name: 'GENERATE ONE-TIME KEY', exact: true });
      const [input, button, publicKey, grid] = await Promise.all([
        probe.getByRole('textbox').boundingBox(), generate.boundingBox(),
        probe.getByText('Public Key', { exact: true }).boundingBox(),
        probe.locator('[aria-label="No signed digest"]').boundingBox(),
      ]);
      const bottom = button.y + button.height;
      measurements.push({ width, buttonTop: Math.round(button.y), buttonBottom: Math.round(bottom) });
      const correct = width < 640
        ? button.y >= input.y + input.height && bottom <= height && bottom < publicKey.y
        : button.y >= grid.y + grid.height;
      if (!correct) failures.push('Incorrect initial Lamport button position at ' + width + 'px');
      await generate.click();
      await probe.getByRole('button', { name: 'SIGN ONCE / DISCARD PRIVATE KEY' }).click();
      await probe.getByText(/VALID: ALL 256/).waitFor();
      await probe.getByRole('textbox').fill('changed');
      await probe.getByRole('button', { name: 'VERIFY CURRENT MESSAGE' }).click();
      await probe.getByText(/INVALID: THE MESSAGE/).waitFor();
    }

    if (page.viewportSize()) await probe.setViewportSize(page.viewportSize());
    // Keep normal browser time and React tasks running. Only visual transitions stop.
    await probe.addInitScript(() => {
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => raf(time => {
        if (!window.holdVisuals) callback(time);
      });
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (...args) {
        const animation = animate.apply(this, args);
        if (window.holdVisuals) animation.pause();
        return animation;
      };
    });
    for (const guess of [false, true]) {
      await probe.goto(base + '/work/zero-knowledge/');
      await probe.getByRole('button', { name: 'PROVER GUESSES' }).click();
      await probe.getByText(/Without x, the prover must guess/).waitFor();
      if (!guess) await probe.getByRole('button', { name: 'PROVER KNOWS X' }).click();
      await probe.evaluate(guess => {
        if (guess) {
          // Force opposite guess and challenge bits; leave the random scalar untouched.
          const bits = [0, 1];
          const random = crypto.getRandomValues.bind(crypto);
          crypto.getRandomValues = array => array instanceof Uint8Array && array.length === 1 && bits.length
            ? array.fill(bits.shift()) : random(array);
        }
        window.holdVisuals = true;
        document.getAnimations().forEach(animation => animation.pause());
      }, guess);
      for (const name of ['Make commitment', 'Issue random challenge', 'Send response', 'Check equation']) {
        // Pointer-action stability checks themselves need animation frames.
        await probe.getByRole('button', { name, exact: true }).dispatchEvent('click');
      }
      const next = probe.getByRole('button', { name: 'Begin next round' });
      const expected = guess ? 'REJECTED' : 'ACCEPTED';
      const recorded = await probe.locator('[aria-label="Round results"] [title]').getAttribute('title');
      if (!(await next.count()) || !recorded.endsWith(': ' + expected.toLowerCase())) {
        throw new Error('Protocol did not record the expected ' + expected + ' round');
      }
      const verdict = probe.getByText('4. gˢ = t · yᶜ: ' + expected, { exact: true });
      const visible = await verdict.evaluateAll(nodes => nodes.length === 1 &&
        nodes[0].checkVisibility({ opacityProperty: true, visibilityProperty: true }));
      if (!visible) failures.push(expected + ' recorded but not visible while animations are paused');
      await next.dispatchEvent('click');
      if (await verdict.count()) failures.push('Previous verdict still shown in the new round');
    }
  } finally {
    await probe.close();
  }
  if (failures.length) throw new Error(failures.join('; ') + ' ' + JSON.stringify(measurements));
  return { measurements, identification: 'ACCEPTED and REJECTED visible without animation frames' };
}
