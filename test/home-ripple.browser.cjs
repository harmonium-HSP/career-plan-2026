// Real Edge; set SWEEP_PREVIEW to a local static server.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

const EDGE = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';

async function goHome(page) {
  await page.waitForFunction(() => document.querySelector('#startup-wall').hidden && !document.querySelector('#chapter').hidden);
  await page.waitForFunction(() => getComputedStyle(document.querySelector('.opener-reveal')).opacity === '1');
  await page.locator('#back').click();
  await page.waitForFunction(() => !document.querySelector('#home').hidden && !document.querySelector('.expand-layer'));
  await page.waitForTimeout(150);
}

test('home background click ripples cards and text with zero white edge cutouts', { skip: !process.env.SWEEP_PREVIEW }, async t => {
  const browser = await chromium.launch({ executablePath: EDGE, args: ['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => sessionStorage.setItem('career-plan-2026-state', JSON.stringify({ index: 1 })));
  await page.coverage.startJSCoverage();
  await page.goto(process.env.SWEEP_PREVIEW);
  await goHome(page);

  const boxes = await page.evaluate(() => {
    const card = document.querySelectorAll('.photo-card')[1].getBoundingClientRect();
    const sentence = document.querySelector('#home-sentence').getBoundingClientRect();
    return {
      clickX: Math.round(card.left + card.width * 0.5),
      clickY: Math.round((card.bottom + sentence.top) / 2),
      card: [Math.floor(card.left), Math.floor(card.top), Math.ceil(card.right), Math.ceil(card.bottom)],
      text: [Math.floor(sentence.left), Math.floor(sentence.top), Math.ceil(sentence.right), Math.ceil(sentence.bottom)]
    };
  });

  // Click empty background between the center card and #home-sentence so the wave crosses both
  await page.mouse.click(boxes.clickX, boxes.clickY);
  await page.waitForSelector('html.home-ripple-active', { timeout: 3000 });

  // Wait ~320ms so the ripple ring crosses both the card and text, then freeze rAF to compare exact frames
  await page.waitForTimeout(320);
  await page.evaluate(() => {
    const orig = window.requestAnimationFrame;
    window._resumeRippleRaf = () => { window.requestAnimationFrame = orig; };
    window._frozenCbs = [];
    window.requestAnimationFrame = cb => { window._frozenCbs.push(cb); return 0; };
  });
  await page.waitForTimeout(50);

  const after = (await page.screenshot()).toString('base64');
  // Capture neutral reference on the exact same frozen frame
  await page.evaluate(() => {
    document.querySelectorAll('.home-ripple feDisplacementMap').forEach(n => n.setAttribute('scale', '0'));
    const glint = document.querySelector('.home-ripple-glint');
    if (glint) glint.style.visibility = 'hidden';
  });
  const before = (await page.screenshot()).toString('base64');

  const metrics = await page.evaluate(async ([beforeB64, afterB64, cardBox, textBox]) => {
    async function pixels(b64) {
      const im = new Image();
      im.src = 'data:image/png;base64,' + b64;
      await im.decode();
      const c = document.createElement('canvas');
      c.width = im.width; c.height = im.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(im, 0, 0);
      return ctx.getImageData(0, 0, c.width, c.height).data;
    }
    const [a, b] = await Promise.all([beforeB64, afterB64].map(pixels));
    function regionStats([l, top, r, bottom]) {
      let changed = 0, dispersed = 0;
      for (let y = Math.max(0, top); y < Math.min(700, bottom); y++) {
        for (let x = Math.max(0, l); x < Math.min(1000, r); x++) {
          const k = (1000 * y + x) * 4;
          const dr = Math.abs(a[k] - b[k]);
          const dg = Math.abs(a[k + 1] - b[k + 1]);
          const db = Math.abs(a[k + 2] - b[k + 2]);
          if (dr + dg + db > 18) changed++;
          if (Math.abs(dr - db) > 6) dispersed++;
        }
      }
      return { changed, dispersed };
    }
    let whiteEdgeHoles = 0;
    for (let y = 0; y < 700; y++) {
      for (const x of [0, 999]) {
        const k = (1000 * y + x) * 4;
        if (Math.max(a[k], a[k + 1], a[k + 2]) < 180 && b[k] === 255 && b[k + 1] === 255 && b[k + 2] === 255) {
          whiteEdgeHoles++;
        }
      }
    }
    return { card: regionStats(cardBox), text: regionStats(textBox), whiteEdgeHoles };
  }, [before, after, boxes.card, boxes.text]);

  t.diagnostic(JSON.stringify(metrics));
  assert.equal(metrics.whiteEdgeHoles, 0, 'ripple must not create white edge cutouts');
  assert.ok(metrics.card.changed > 80, `expected card pixels refracted, got ${JSON.stringify(metrics.card)}`);
  assert.ok(metrics.text.changed > 20, `expected text pixels refracted, got ${JSON.stringify(metrics.text)}`);
  assert.ok(metrics.card.dispersed > 15, `expected chromatic dispersion on card, got ${JSON.stringify(metrics.card)}`);

  // Resume animation and verify ripple cleans up naturally
  await page.evaluate(() => {
    const glint = document.querySelector('.home-ripple-glint');
    if (glint) glint.style.visibility = '';
    window._resumeRippleRaf();
    for (const cb of window._frozenCbs) requestAnimationFrame(cb);
  });
  await page.waitForFunction(() => !document.documentElement.classList.contains('home-ripple-active'), null, { timeout: 8000 });
  assert.equal(await page.locator('.home-ripple, .home-ripple-glint').count(), 0);

  const coverage = (await page.coverage.stopJSCoverage()).find(entry => entry.url.endsWith('/home-ripple.js'));
  assert.ok(coverage, 'home-ripple.js must be loaded');
  const hit = new Uint8Array(coverage.source.length);
  const ranges = coverage.functions.flatMap(fn => fn.ranges).sort((a, b) => (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
  for (const r of ranges) hit.fill(Number(r.count > 0), r.startOffset, r.endOffset);
  const percent = 100 * hit.reduce((sum, n) => sum + n, 0) / hit.length;
  t.diagnostic(`Edge executed ${percent.toFixed(1)}% of home-ripple.js source bytes`);
  assert.ok(percent >= 80, `coverage too low: ${percent.toFixed(1)}%`);
  assert.deepEqual(errors, []);
});

test('card click does not spawn ripple, active ripple survives zoom into full-screen, and chapter clicks do not ripple', { skip: !process.env.SWEEP_PREVIEW }, async t => {
  const browser = await chromium.launch({ executablePath: EDGE, args: ['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('career-plan-2026-state', JSON.stringify({ index: 1 }));
    window.splashes = [];
  });
  await page.route('**/home-ripple.js', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()) + `
      const createRipple = window.HomeRipple.create;
      window.HomeRipple.create = () => {
        const effect = createRipple();
        return { ...effect, splash(x, y) {
          window.splashes.push([x, y]);
          effect.splash(x, y);
        } };
      };` });
  });
  await page.goto(process.env.SWEEP_PREVIEW);
  await goHome(page);

  // Instrument active ripple spawns by watching html.home-ripple-active & data-ripple-spawns
  // 1. Clicking directly on a card must NOT spawn a ripple
  const cardCenter = await page.evaluate(() => {
    const r = document.querySelectorAll('.photo-card')[1].getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.click(cardCenter.x, cardCenter.y);
  await page.waitForFunction(() => document.querySelector('#home').hidden && !document.querySelector('.expand-layer'));
  assert.equal(await page.evaluate(() => Number(document.documentElement.dataset.rippleSpawns || 0)), 0, 'entering a card must not spawn a ripple');

  // 2. Clicking in full-screen chapter view must NOT spawn a ripple
  await page.mouse.click(120, 120);
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => Number(document.documentElement.dataset.rippleSpawns || 0)), 0, 'clicking in full-screen chapter must not spawn a ripple');

  // A background press spawns immediately, including when it becomes a drag.
  await page.locator('#back').click();
  await page.waitForFunction(() => !document.querySelector('#home').hidden && !document.querySelector('.expand-layer'));
  await page.waitForTimeout(150);
  await page.mouse.move(120, 120);
  await page.mouse.down();
  const count = () => page.evaluate(() => Number(document.documentElement.dataset.rippleSpawns || 0));
  assert.equal(await count(), 1, 'background pointerdown spawns before movement or release');
  await page.mouse.move(260, 120, { steps: 6 });
  await page.mouse.up();
  assert.equal(await count(), 1, 'dragging and releasing must not repeat the splash');

  const center = await page.locator('.photo-card').nth(1).boundingBox();
  const x = Math.round(center.x + center.width / 2);
  const y = Math.round(center.y + center.height / 2);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 8, y);
  assert.equal(await count(), 1, 'card press and eight pixels of movement are not a drag');
  await page.mouse.move(x + 9, y + 3);
  assert.equal(await count(), 2, 'crossing the existing threshold splashes once');
  assert.deepEqual(await page.evaluate(() => window.splashes), [[120, 120], [x, y]]);
  await page.mouse.move(x + 60, y + 30, { steps: 5 });
  await page.mouse.up();
  assert.equal(await count(), 2, 'further card movement and release must not repeat');
  assert.equal(await page.locator('#home').isVisible(), true);

  // A normal background click adds exactly one more wave.
  await page.mouse.click(120, 120);
  await page.waitForSelector('html.home-ripple-active', { timeout: 3000 });
  assert.equal(await count(), 3);
  // The transparent entry control can scroll the carousel but does not splash.
  const entry = await page.locator('#enter').boundingBox();
  const ex = Math.round(entry.x + entry.width / 2), ey = Math.round(entry.y + entry.height / 2);
  await page.mouse.move(ex, ey);
  await page.mouse.down();
  await page.mouse.move(ex + 25, ey + 10);
  assert.equal(await count(), 3, 'entry control must not spawn a ripple');
  await page.mouse.up();
  assert.equal(await page.locator('.expand-layer').count(), 0);

  await page.mouse.move(ex, ey);
  await page.mouse.down();
  await page.locator('#enter').dispatchEvent('pointercancel', { pointerId: 1, isPrimary: true });
  await page.mouse.up();
  assert.equal(await count(), 3);
  assert.equal(await page.locator('.expand-layer').count(), 0, 'cancelled press must not open a chapter');


  await page.waitForTimeout(150);
  const card2 = await page.evaluate(() => {
    const r = document.querySelectorAll('.photo-card')[1].getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.click(card2.x, card2.y);

  // Confirm during expand-layer flight: still only 1 splash, root ripple filter still active, glint canvas sits above expand-layer
  const duringZoom = await page.waitForFunction(() => {
    const expand = document.querySelector('.expand-layer');
    const glint = document.querySelector('.home-ripple-glint');
    if (!expand || !glint) return null;
    return {
      active: document.documentElement.classList.contains('home-ripple-active'),
      spawns: Number(document.documentElement.dataset.rippleSpawns || 0),
      expandZ: Number(getComputedStyle(expand).zIndex) || 0,
      glintZ: Number(getComputedStyle(glint).zIndex) || 0
    };
  }, null, { timeout: 4000 }).then(h => h.jsonValue());

  assert.equal(duringZoom.active, true, 'existing ripple must stay active while card expands');
  assert.equal(duringZoom.spawns, 3, 'clicking card mid-ripple must not spawn another ripple');
  assert.ok(duringZoom.glintZ > duringZoom.expandZ, `glint zIndex (${duringZoom.glintZ}) must be above expand-layer (${duringZoom.expandZ})`);

  // Wait for full-screen entry to complete and existing ripple to naturally finish
  await page.waitForFunction(() => document.querySelector('#home').hidden && !document.querySelector('.expand-layer'));
  await page.waitForFunction(() => !document.documentElement.classList.contains('home-ripple-active'), null, { timeout: 8000 });

  // 5. Back in full-screen chapter after ripple finishes: clicking still spawns no ripple
  await page.mouse.click(150, 150);
  await page.waitForTimeout(150);
  assert.equal(await count(), 3);

  // 6. Reduced motion disables ripples on home
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#back').click();
  await page.waitForFunction(() => !document.querySelector('#home').hidden);
  await page.mouse.click(120, 120);
  await page.waitForTimeout(150);
  assert.equal(await count(), 3);
  assert.deepEqual(errors, []);
});

test('home scrolling and card zoom remain smooth while ripple is active', { skip: !process.env.SWEEP_PREVIEW }, async t => {
  const browser = await chromium.launch({ executablePath: EDGE, args: ['--enable-unsafe-swiftshader'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  await page.addInitScript(() => sessionStorage.setItem('career-plan-2026-state', JSON.stringify({ index: 1 })));
  await page.goto(process.env.SWEEP_PREVIEW);
  await goHome(page);

  async function measureRaf(duration) {
    return page.evaluate(ms => new Promise(resolve => {
      const times = [];
      let last = performance.now();
      const end = last + ms;
      function step(now) {
        times.push(now - last);
        last = now;
        if (now < end) requestAnimationFrame(step);
        else {
          const avg = times.reduce((a, b) => a + b, 0) / times.length;
          resolve({ frames: times.length, avgMs: +avg.toFixed(1), maxMs: +Math.max(...times).toFixed(1) });
        }
      }
      requestAnimationFrame(step);
    }), duration);
  }

  await page.mouse.wheel(0, 300);
  const baseline = await measureRaf(600);

  await page.mouse.click(80, 120);
  await page.waitForSelector('html.home-ripple-active');
  await page.mouse.wheel(0, -300);
  const scrollWithRipple = await measureRaf(600);

  const card = await page.evaluate(() => {
    const r = document.querySelectorAll('.photo-card')[1].getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await page.mouse.click(card.x, card.y);
  const zoomWithRipple = await measureRaf(600);

  t.diagnostic(JSON.stringify({ baseline, scrollWithRipple, zoomWithRipple }));
  const limit = Math.max(12, baseline.avgMs * 1.85);
  assert.ok(scrollWithRipple.avgMs <= limit, `scroll slowed down: ${scrollWithRipple.avgMs}ms vs baseline ${baseline.avgMs}ms`);
  assert.ok(zoomWithRipple.avgMs <= limit, `zoom slowed down: ${zoomWithRipple.avgMs}ms vs baseline ${baseline.avgMs}ms`);
});
