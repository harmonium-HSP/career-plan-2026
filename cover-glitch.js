(function () {
  const INTERVAL = 4000;
  const MAX_BANDS = 24;
  const MAX_BLOCKS = 6;
  const PADDING = 64;
  const NS = 'http://www.w3.org/2000/svg';
  const IDENTITY = [
    1, 0, 0, 0, 0,
    0, 1, 0, 0, 0,
    0, 0, 1, 0, 0,
    0, 0, 0, 1, 0
  ];
  const RGB_PERMUTATIONS = [
    [0, 1, 2], [2, 1, 0], [1, 0, 2],
    [2, 0, 1], [0, 2, 1], [1, 2, 0]
  ];
  const ARCHETYPES = ['chunky', 'razor', 'skew', 'focal'];
  const ENVELOPES = ['decay', 'double', 'surge', 'stepped'];
  const COLOR_MODES = {
    neutral: [1.06, 0, 0, 0, -0.02, 0, 1.06, 0, 0, -0.02, 0, 0, 1.06, 0, -0.02, 0, 0, 0, 1, 0],
    cyan: [0.80, 0.04, 0.04, 0, -0.01, 0.02, 1.08, 0.06, 0, 0.01, 0.04, 0.08, 1.18, 0, 0.03, 0, 0, 0, 1, 0],
    phosphor: [0.82, 0.06, 0, 0, -0.02, 0.04, 1.18, 0.04, 0, 0.03, 0, 0.06, 0.86, 0, -0.01, 0, 0, 0, 1, 0],
    magenta: [1.18, 0.04, 0.06, 0, 0.02, 0.02, 0.82, 0.02, 0, -0.02, 0.08, 0.02, 1.14, 0, 0.02, 0, 0, 0, 1, 0],
    amber: [1.18, 0.08, 0, 0, 0.02, 0.04, 1.04, 0, 0, 0.01, 0, 0.02, 0.76, 0, -0.02, 0, 0, 0, 1, 0],
    bleach: [0.92, 0.22, 0.14, 0, -0.05, 0.18, 0.94, 0.16, 0, -0.05, 0.16, 0.20, 0.96, 0, -0.04, 0, 0, 0, 1, 0]
  };
  const BLOCK_MODES = {
    cyanPop: [0.45, 0.15, 0.10, 0, 0, 0.10, 1.15, 0.15, 0, 0.04, 0.15, 0.20, 1.25, 0, 0.06, 0, 0, 0, 1, 0],
    greenSwap: [0.25, 0.55, 0.05, 0, 0, 0.30, 1.05, 0.10, 0, 0.05, 0.05, 0.25, 0.60, 0, 0, 0, 0, 0, 1, 0],
    magentaShift: [1.25, 0.10, 0.20, 0, 0.05, 0.15, 0.45, 0.15, 0, -0.02, 0.20, 0.10, 1.20, 0, 0.04, 0, 0, 0, 1, 0],
    amberCrush: [1.30, 0.20, 0, 0, 0.04, 0.15, 0.95, 0.05, 0, 0.01, 0.05, 0.05, 0.40, 0, -0.02, 0, 0, 0, 1, 0],
    channelFlip: [0.15, 0.10, 0.95, 0, 0, 0.10, 0.95, 0.10, 0, 0.02, 0.95, 0.10, 0.15, 0, 0, 0, 0, 0, 1, 0],
    coldStatic: [0.75, 0.25, 0.25, 0, 0.06, 0.25, 0.80, 0.25, 0, 0.06, 0.25, 0.25, 0.95, 0, 0.08, 0, 0, 0, 1, 0]
  };
  const COLOR_KEYS = Object.keys(COLOR_MODES);
  const BLOCK_KEYS = Object.keys(BLOCK_MODES);

  function clock(start) {
    let timer = null;
    function fire() { timer = setTimeout(fire, INTERVAL); start(); }
    return function (eligible) {
      if (eligible && timer === null) timer = setTimeout(fire, INTERVAL);
      if (!eligible && timer !== null) { clearTimeout(timer); timer = null; }
    };
  }

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function pick(list, rng) {
    return list[Math.floor(rng() * list.length) % list.length];
  }

  function buildSlices(archetype, focusY, rng) {
    let count;
    if (archetype === 'chunky') count = 10 + Math.floor(rng() * 5);
    else if (archetype === 'razor') count = 18 + Math.floor(rng() * 7);
    else count = 14 + Math.floor(rng() * 9);
    count = Math.min(MAX_BANDS, count);
    const weights = Array.from({ length: count }, (_, i) => {
      const pos = (i + 0.5) / count;
      if (archetype === 'chunky') return 0.35 + rng() * 2.4;
      if (archetype === 'razor') return rng() < 0.42 ? 0.14 + rng() * 0.22 : 0.9 + rng() * 1.8;
      if (archetype === 'focal') {
        const dist = Math.abs(pos - focusY);
        return (dist < 0.22 ? 0.28 : 0.95) + rng() * (dist < 0.22 ? 0.55 : 1.45);
      }
      return 0.3 + rng() * 1.9;
    });
    const total = weights.reduce((sum, w) => sum + w, 0);
    return weights.map(w => w / total);
  }

  function createBurstProfile(rng) {
    const rand = rng || Math.random;
    const archetype = pick(ARCHETYPES, rand);
    const colorMode = pick(COLOR_KEYS, rand);
    const blockMode = pick(BLOCK_KEYS, rand);
    const envelope = pick(ENVELOPES, rand);
    const focusY = 0.18 + rand() * 0.64;
    return {
      archetype,
      slices: buildSlices(archetype, focusY, rand),
      colorMode,
      colorMatrix: COLOR_MODES[colorMode].slice(),
      blockMode,
      blockMatrix: BLOCK_MODES[blockMode].slice(),
      gradeStrength: 0.35 + rand() * 0.45,
      rgbOrder: pick(RGB_PERMUTATIONS, rand).slice(),
      negSplit: 2 + Math.floor(rand() * 6),
      posSplit: 2 + Math.floor(rand() * 6),
      rgbDy: Math.floor(rand() * 5) - 2,
      envelope,
      duration: Math.round(340 + rand() * 120),
      fps: 18 + Math.floor(rand() * 13),
      maxShift: 18 + Math.floor(rand() * 17),
      skewDir: rand() < 0.5 ? -1 : 1,
      focusY,
      seed: rand() * 1000
    };
  }

  function blendMatrix(target, strength) {
    const k = Math.max(0, Math.min(1, strength));
    return IDENTITY.map((id, i) => (i >= 15 ? id : +(id + (target[i] - id) * k).toFixed(3))).join(' ');
  }

  function sampleEnvelope(profile, u, step) {
    if (step === 0) return 0.85 + 0.15 * hash(profile.seed + 1.3);
    const jitter = 0.72 + 0.28 * hash(profile.seed + step * 7.13);
    if (profile.envelope === 'double') {
      const first = Math.max(0, 1 - (u / 0.42) ** 2);
      const second = Math.exp(-(((u - 0.66) / 0.22) ** 2)) * 0.9;
      return Math.max(first, second) * jitter;
    }
    if (profile.envelope === 'surge') {
      const peak = u < 0.32 ? 0.75 + 0.25 * (u / 0.32) : Math.max(0, 1 - ((u - 0.32) / 0.68) ** 2);
      return peak * jitter;
    }
    if (profile.envelope === 'stepped') {
      const q = Math.floor(u * 5) / 5;
      return Math.max(0, 1 - q * 1.05) * (0.65 + 0.35 * hash(profile.seed + step * 19.1));
    }
    return Math.max(0, 1 - u * u) * jitter;
  }

  function bandShift(profile, index, count, step, amp) {
    const h1 = hash(profile.seed + step * 31.7 + index * 13.3);
    const h2 = hash(profile.seed + step * 17.9 + index * 29.1);
    const pos = (index + 0.5) / count;
    let dir = h2 < 0.5 ? -1 : 1;
    if (profile.archetype === 'skew') dir = h2 < 0.76 ? profile.skewDir : -profile.skewDir;
    let magnitude;
    if (profile.archetype === 'focal') {
      const near = Math.abs(pos - profile.focusY) < 0.24;
      magnitude = near ? 10 + h1 * (profile.maxShift - 8) : 3 + h1 * 9;
    } else if (profile.archetype === 'razor') {
      const thin = profile.slices[index] < 0.045;
      magnitude = thin ? 12 + h1 * (profile.maxShift - 8) : 3 + h1 * 10;
    } else if (profile.archetype === 'chunky') {
      magnitude = 5 + (h1 * h1) * (profile.maxShift - 4);
    } else {
      magnitude = 4 + (h1 ** 1.6) * (profile.maxShift - 3);
    }
    if (step > 0 && h1 < 0.26) return 0;
    const minShift = step === 0 ? 6 : 0;
    const px = Math.min(36, Math.max(minShift, Math.round(magnitude * amp)));
    return dir * px;
  }

  function svg(name, attributes, parent) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }

  // SourceGraphic is the live root composite, including fixed controls and any
  // transition canvases. A root filter does not re-parent fixed descendants.
  function compositor() {
    const layer = document.createElement('div');
    layer.className = 'cover-glitch'; layer.setAttribute('aria-hidden', 'true');
    const defs = svg('svg', { width: 0, height: 0 }, layer);
    const filter = svg('filter', {
      id: 'cover-viewport-slices',
      filterUnits: 'userSpaceOnUse',
      primitiveUnits: 'userSpaceOnUse',
      'color-interpolation-filters': 'sRGB'
    }, defs);
    const grade = svg('feColorMatrix', {
      in: 'SourceGraphic', type: 'matrix', values: IDENTITY.join(' '),
      result: 'graded', 'data-glitch-role': 'grade'
    }, filter);
    const split = [0, 1, 2].map(channel => {
      const values = Array.from({ length: 20 }, (_, i) => Number(i === channel * 6 || i === 18)).join(' ');
      svg('feColorMatrix', { in: 'graded', type: 'matrix', values, result: 'color' + channel }, filter);
      return svg('feOffset', { in: 'color' + channel, result: 'offset' + channel, 'data-glitch-role': 'rgb' }, filter);
    });
    svg('feBlend', { in: 'offset0', in2: 'offset1', mode: 'screen', result: 'rg' }, filter);
    svg('feBlend', { in: 'rg', in2: 'offset2', mode: 'screen', result: 'rgb' }, filter);
    const corrupt = svg('feColorMatrix', {
      in: 'rgb', type: 'matrix', values: IDENTITY.join(' '),
      result: 'corrupt', 'data-glitch-role': 'corrupt'
    }, filter);
    const bands = Array.from({ length: MAX_BANDS }, (_, i) =>
      svg('feOffset', { in: 'rgb', result: 'row' + i, 'data-glitch-role': 'band' }, filter)
    );
    const blocks = Array.from({ length: MAX_BLOCKS }, (_, i) =>
      svg('feOffset', { in: 'corrupt', result: 'blk' + i, 'data-glitch-role': 'block', width: 0, height: 0 }, filter)
    );
    const merge = svg('feMerge', {}, filter);
    svg('feMergeNode', { in: 'rgb' }, merge);
    bands.forEach((_, i) => svg('feMergeNode', { in: 'row' + i }, merge));
    blocks.forEach((_, i) => svg('feMergeNode', { in: 'blk' + i }, merge));

    let activeProfile = null;
    let lastTop = null, lastWidth = 0, lastHeight = 0;

    function layoutBands(profile, top, height) {
      let acc = 0;
      const count = profile.slices.length;
      for (let i = 0; i < MAX_BANDS; i += 1) {
        const band = bands[i];
        if (i >= count) {
          band.setAttribute('y', top);
          band.setAttribute('height', 0);
          continue;
        }
        const y0 = Math.round(acc * height);
        acc += profile.slices[i];
        const y1 = i === count - 1 ? height : Math.round(acc * height);
        band.setAttribute('y', top + y0);
        band.setAttribute('height', Math.max(1, y1 - y0));
      }
    }

    function alignViewport(force) {
      if (!activeProfile) return;
      const width = document.documentElement.clientWidth;
      const height = innerHeight;
      const top = scrollY;
      if (!force && top === lastTop && width === lastWidth && height === lastHeight) return;
      const deltaY = lastTop === null ? 0 : top - lastTop;
      lastTop = top; lastWidth = width; lastHeight = height;
      const box = { x: -PADDING, y: top - PADDING, width: width + 2 * PADDING, height: height + 2 * PADDING };
      for (const [k, v] of Object.entries(box)) filter.setAttribute(k, v);
      layoutBands(activeProfile, top, height);
      if (deltaY !== 0) {
        blocks.forEach(block => {
          if (Number(block.getAttribute('height')) > 0) {
            block.setAttribute('y', Number(block.getAttribute('y')) + deltaY);
          }
        });
      }
    }

    function paintBlocks(profile, step, amp, top, width, height) {
      const show = step > 0 && amp > 0.14;
      const activeCount = show ? 2 + Math.floor(hash(profile.seed + step * 43.1) * (MAX_BLOCKS - 1)) : 0;
      for (let i = 0; i < MAX_BLOCKS; i += 1) {
        const block = blocks[i];
        if (i >= activeCount) {
          block.setAttribute('x', 0); block.setAttribute('y', top);
          block.setAttribute('width', 0); block.setAttribute('height', 0);
          block.setAttribute('dx', 0); block.setAttribute('dy', 0);
          continue;
        }
        const base = profile.seed + step * 53.7 + i * 19.9;
        const isScanline = i === activeCount - 1 && hash(base + 1.1) < 0.55;
        const bw = Math.round(width * (isScanline ? 0.35 + hash(base + 2.3) * 0.58 : 0.06 + hash(base + 2.3) * 0.22));
        const bh = isScanline ? 2 + Math.floor(hash(base + 3.7) * 4) : Math.round(14 + hash(base + 3.7) * 52);
        const bx = Math.round(hash(base + 5.1) * Math.max(0, width - bw));
        const by = Math.round(hash(base + 7.3) * Math.max(0, height - bh));
        const dx = Math.round((hash(base + 9.7) * 2 - 1) * 32 * amp);
        const dy = isScanline ? 0 : Math.round((hash(base + 11.3) * 2 - 1) * 16 * amp);
        block.setAttribute('x', bx); block.setAttribute('y', top + by);
        block.setAttribute('width', bw); block.setAttribute('height', bh);
        block.setAttribute('dx', dx); block.setAttribute('dy', dy);
      }
    }

    function paint(profile, step, amp) {
      const changedProfile = activeProfile !== profile;
      activeProfile = profile;
      alignViewport(changedProfile);
      const top = lastTop, width = lastWidth, height = lastHeight;
      const neg = -Math.max(1, Math.ceil(amp * profile.negSplit));
      const pos = Math.max(1, Math.ceil(amp * profile.posSplit));
      const offsets = [neg, 0, pos];
      profile.rgbOrder.forEach((channel, slot) => {
        split[channel].setAttribute('dx', offsets[slot]);
        split[channel].setAttribute('dy', step > 0 && slot !== 1 ? Math.round(profile.rgbDy * amp * (slot === 0 ? -1 : 1)) : 0);
      });
      const flicker = step === 0 ? 1 : 0.65 + 0.35 * hash(profile.seed + step * 11.7);
      grade.setAttribute('values', blendMatrix(profile.colorMatrix, amp * profile.gradeStrength * flicker));
      corrupt.setAttribute('values', blendMatrix(profile.blockMatrix, Math.min(1, amp * 0.95)));
      const count = profile.slices.length;
      for (let i = 0; i < count; i += 1) {
        bands[i].setAttribute('dx', bandShift(profile, i, count, step, amp));
      }
      paintBlocks(profile, step, amp, top, width, height);
    }

    return { layer, paint, alignViewport };
  }

  function create(eligible) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const { layer, paint, alignViewport } = compositor();
    let raf = null;
    function stop() {
      cancelAnimationFrame(raf); raf = null;
      document.documentElement.classList.remove('cover-glitch-active'); layer.remove();
    }
    const allowed = () => !document.hidden && !motion.matches;
    const schedule = clock(() => {
      if (!allowed() || !eligible()) { sync(); return; }
      const profile = createBurstProfile();
      const start = performance.now();
      let previous = '';
      document.body.appendChild(layer);
      document.documentElement.classList.add('cover-glitch-active');
      function draw(now) {
        const elapsed = Math.max(0, now - start);
        if (elapsed >= profile.duration) { stop(); return; }
        const step = Math.floor(elapsed * profile.fps / 1000);
        const key = [step, scrollY, innerWidth, innerHeight].join(':');
        if (key !== previous) {
          previous = key;
          const amp = sampleEnvelope(profile, elapsed / profile.duration, step);
          paint(profile, step, amp);
        }
        raf = requestAnimationFrame(draw);
      }
      draw(start);
    });
    function sync() {
      if (!allowed() && raf !== null) stop();
      else if (raf !== null) alignViewport(false);
      schedule(allowed() && eligible());
    }
    document.addEventListener('visibilitychange', sync); motion.addEventListener('change', sync);
    return sync;
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { clock, createBurstProfile };
  else window.CoverGlitch = { create };
})();
