(function () {
  const MAX_RIPPLES = 12;
  const BASE_SPEED = 340;
  const AMPLITUDE = 0.5;
  const WAVELENGTH = 80;
  const RINGS = 2;
  const RING_WIDTH = WAVELENGTH * RINGS * 0.5;
  const SPEED = 0.65;
  const SPEED_PX = BASE_SPEED * SPEED;
  const DECAY = 1;
  const REFRACTION = 68;
  const DISPERSION = 0.5;
  const SHINE = 0.5;
  const MAP_W = 88;
  const MAP_H = 88;
  const MAP_STEP_MS = 16;
  const NS = 'http://www.w3.org/2000/svg';

  const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform vec4 uRipples[12];
uniform int uCount;
uniform float uSpeed;
uniform float uWavelength;
uniform float uWidth;
uniform float uDecay;
uniform float uShine;
uniform float uDispersion;

void main () {
  vec2 frag = vec2(vUv.x, 1.0 - vUv.y) * uResolution;
  vec2 grad = vec2(0.0);
  float k = 6.28318530718 / uWavelength;
  float w2 = uWidth * uWidth;

  for (int i = 0; i < 12; i++) {
    if (i >= uCount) break;
    vec4 rp = uRipples[i];
    vec2 dv = frag - rp.xy;
    float r = length(dv);
    float front = uSpeed * rp.z;
    float s = r - front;
    float env = exp(-s * s / w2) * exp(-uDecay * rp.z) * rp.w;
    env *= smoothstep(0.0, 0.08, rp.z);
    env *= inversesqrt(1.0 + front / max(uWavelength, 1.0) * 0.2);
    if (env < 0.0015) continue;
    float dh = (k * cos(s * k) - 2.0 * s / w2 * sin(s * k)) * env;
    grad += dv / max(r, 1.0) * dh * uWavelength * 0.16;
  }

  float g = dot(grad, vec2(-0.55, -0.8));
  float glint = pow(clamp(g * 2.2, 0.0, 1.0), 2.0) * uShine;
  float shade = pow(clamp(-g * 1.6, 0.0, 1.0), 2.0) * uShine * 0.3;
  float slope = clamp(length(grad) * 1.8, 0.0, 1.0) * uDispersion;
  vec3 prism = vec3(
    glint * 0.9 + clamp(grad.x, 0.0, 1.0) * slope * 0.42,
    glint * 0.92 + clamp(-grad.y, 0.0, 1.0) * slope * 0.18,
    glint * 0.9 + clamp(-grad.x, 0.0, 1.0) * slope * 0.48
  );
  float a = clamp(glint * 0.9 + shade * 0.5 + slope * 0.22, 0.0, 0.85);
  outColor = vec4(clamp(prism, 0.0, 1.0), a);
}`;

  function smoothstep(a, b, x) {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function createField() {
    const ripples = [];
    const k = (Math.PI * 2) / WAVELENGTH;
    const w2 = RING_WIDTH * RING_WIDTH;

    function splash(x, y, strength) {
      const amp = strength === undefined ? 1 : strength;
      if (ripples.length >= MAX_RIPPLES) ripples.shift();
      ripples.push({ x, y, age: 0, amp });
    }

    function advance(delta, vw, vh) {
      const diag = Math.hypot(vw, vh);
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        const rp = ripples[i];
        rp.age += delta;
        const gone = rp.age * SPEED_PX > diag + RING_WIDTH * 3 || Math.exp(-DECAY * rp.age) * rp.amp < 0.012;
        if (gone) ripples.splice(i, 1);
      }
    }

    function bounds(vw, vh) {
      if (!ripples.length) return null;
      let minX = vw;
      let minY = vh;
      let maxX = 0;
      let maxY = 0;
      const margin = RING_WIDTH * 2.6;
      for (let i = 0; i < ripples.length; i += 1) {
        const rp = ripples[i];
        const radius = SPEED_PX * rp.age + margin;
        minX = Math.min(minX, rp.x - radius);
        minY = Math.min(minY, rp.y - radius);
        maxX = Math.max(maxX, rp.x + radius);
        maxY = Math.max(maxY, rp.y + radius);
      }
      const x = Math.max(0, Math.floor(minX));
      const y = Math.max(0, Math.floor(minY));
      const r = Math.min(vw, Math.ceil(maxX));
      const b = Math.min(vh, Math.ceil(maxY));
      return r > x && b > y ? { x, y, w: r - x, h: b - y } : null;
    }

    function gradientAt(x, y) {
      let gx = 0;
      let gy = 0;
      for (let i = 0; i < ripples.length; i += 1) {
        const rp = ripples[i];
        const dx = x - rp.x;
        const dy = y - rp.y;
        const r = Math.hypot(dx, dy);
        const front = SPEED_PX * rp.age;
        const s = r - front;
        let env = Math.exp(-(s * s) / w2) * Math.exp(-DECAY * rp.age) * rp.amp * AMPLITUDE;
        env *= smoothstep(0, 0.08, rp.age);
        env /= Math.sqrt(1 + (front / WAVELENGTH) * 0.2);
        if (env < 0.0015) continue;
        const dh = (k * Math.cos(s * k) - (2 * s / w2) * Math.sin(s * k)) * env;
        const factor = (dh * WAVELENGTH * 0.16) / Math.max(r, 1);
        gx += dx * factor;
        gy += dy * factor;
      }
      return { gx, gy };
    }

    function fillGrid(box, mw, mh, gxOut, gyOut) {
      gxOut.fill(0);
      gyOut.fill(0);
      const stepX = box.w / mw;
      const stepY = box.h / mh;
      const startX = box.x + stepX * 0.5;
      const startY = box.y + stepY * 0.5;
      const cutoff = RING_WIDTH * 2.6;
      for (let rIdx = 0; rIdx < ripples.length; rIdx += 1) {
        const rp = ripples[rIdx];
        const front = SPEED_PX * rp.age;
        const baseEnv = Math.exp(-DECAY * rp.age) * rp.amp * AMPLITUDE *
          smoothstep(0, 0.08, rp.age) / Math.sqrt(1 + (front / WAVELENGTH) * 0.2);
        if (baseEnv < 0.0015) continue;
        const maxR = front + cutoff;
        const minR = Math.max(0, front - cutoff);
        const maxR2 = maxR * maxR;
        const minR2 = minR * minR;
        const rpx = rp.x;
        const rpy = rp.y;
        const py0 = Math.max(0, Math.floor((rpy - maxR - box.y) / stepY));
        const py1 = Math.min(mh - 1, Math.ceil((rpy + maxR - box.y) / stepY));
        const px0 = Math.max(0, Math.floor((rpx - maxR - box.x) / stepX));
        const px1 = Math.min(mw - 1, Math.ceil((rpx + maxR - box.x) / stepX));
        for (let py = py0; py <= py1; py += 1) {
          const dy = startY + py * stepY - rpy;
          const dy2 = dy * dy;
          const rowOff = py * mw;
          for (let px = px0; px <= px1; px += 1) {
            const dx = startX + px * stepX - rpx;
            const r2 = dx * dx + dy2;
            if (r2 > maxR2 || r2 < minR2) continue;
            const r = Math.sqrt(r2);
            const s = r - front;
            const env = Math.exp(-(s * s) / w2) * baseEnv;
            if (env < 0.0015) continue;
            const sk = s * k;
            const dh = (k * Math.cos(sk) - (2 * s / w2) * Math.sin(sk)) * env;
            const factor = (dh * WAVELENGTH * 0.16) / (r > 1 ? r : 1);
            const idx = rowOff + px;
            gxOut[idx] += dx * factor;
            gyOut[idx] += dy * factor;
          }
        }
      }
      let peak = 0;
      for (let i = 0; i < gxOut.length; i += 1) {
        const ax = gxOut[i] < 0 ? -gxOut[i] : gxOut[i];
        const ay = gyOut[i] < 0 ? -gyOut[i] : gyOut[i];
        const mag = ax > ay ? ax : ay;
        if (mag > peak) peak = mag;
      }
      return peak;
    }

    return {
      splash,
      advance,
      bounds,
      gradientAt,
      fillGrid,
      clear() { ripples.length = 0; },
      count() { return ripples.length; },
      list() { return ripples; }
    };
  }

  function svg(name, attributes, parent) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    parent.appendChild(node);
    return node;
  }

  function createBmpBuffer(w, h) {
    const size = 54 + w * h * 3;
    const buf = new Uint8Array(size);
    const dv = new DataView(buf.buffer);
    buf[0] = 66; buf[1] = 77;
    dv.setUint32(2, size, true);
    dv.setUint32(10, 54, true);
    dv.setUint32(14, 40, true);
    dv.setInt32(18, w, true);
    dv.setInt32(22, -h, true);
    dv.setUint16(26, 1, true);
    dv.setUint16(28, 24, true);
    return buf;
  }

  function encodeBmp(buf) {
    let bin = '';
    for (let i = 0; i < buf.length; i += 8192) {
      bin += String.fromCharCode(...buf.subarray(i, i + 8192));
    }
    return 'data:image/bmp;base64,' + btoa(bin);
  }

  // Single-pass backdrop-filter lens avoids flattening root compositor layers,
  // keeping card scrolling and zoom transitions at native frame rate.
  function createFilterDom() {
    const layer = document.createElement('div');
    layer.className = 'home-ripple';
    layer.setAttribute('aria-hidden', 'true');
    const defs = svg('svg', { width: 0, height: 0 }, layer);
    const filter = svg('filter', {
      id: 'home-viewport-ripple',
      x: '0%',
      y: '0%',
      width: '100%',
      height: '100%',
      'color-interpolation-filters': 'sRGB'
    }, defs);
    const map = svg('feImage', { x: 0, y: 0, preserveAspectRatio: 'none', result: 'disp' }, filter);
    const displace = svg('feDisplacementMap', {
      in: 'SourceGraphic',
      in2: 'disp',
      scale: 0,
      xChannelSelector: 'R',
      yChannelSelector: 'G'
    }, filter);
    const lens = document.createElement('div');
    lens.className = 'home-ripple-lens';
    lens.setAttribute('aria-hidden', 'true');
    layer.appendChild(lens);
    return { layer, lens, map, displace };
  }

  function createGlintRenderer() {
    const canvas = document.createElement('canvas');
    canvas.className = 'home-ripple-glint';
    canvas.setAttribute('aria-hidden', 'true');
    const gl = canvas.getContext('webgl2', {
      alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true
    });
    if (!gl) return { canvas, draw() {}, reset() {} };
    const program = gl.createProgram();
    for (const [type, source] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return { canvas, draw() {}, reset() {} };
    }
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i += 1) {
      const info = gl.getActiveUniform(program, i);
      uniforms[info.name.replace('[0]', '')] = gl.getUniformLocation(program, info.name);
    }
    const data = new Float32Array(MAX_RIPPLES * 4);

    function draw(ripples, vw, vh) {
      if (gl.isContextLost()) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const pw = Math.max(1, Math.round(vw * dpr));
      const ph = Math.max(1, Math.round(vh * dpr));
      if (canvas.width !== pw) canvas.width = pw;
      if (canvas.height !== ph) canvas.height = ph;
      for (let i = 0; i < MAX_RIPPLES; i += 1) {
        const rp = ripples[i];
        data[i * 4] = rp ? rp.x * dpr : 0;
        data[i * 4 + 1] = rp ? rp.y * dpr : 0;
        data[i * 4 + 2] = rp ? rp.age : 0;
        data[i * 4 + 3] = rp ? rp.amp * AMPLITUDE : 0;
      }
      gl.useProgram(program);
      gl.viewport(0, 0, pw, ph);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.uResolution, pw, ph);
      gl.uniform4fv(uniforms.uRipples, data);
      gl.uniform1i(uniforms.uCount, ripples.length);
      gl.uniform1f(uniforms.uSpeed, SPEED_PX * dpr);
      gl.uniform1f(uniforms.uWavelength, WAVELENGTH * dpr);
      gl.uniform1f(uniforms.uWidth, RING_WIDTH * dpr);
      gl.uniform1f(uniforms.uDecay, DECAY);
      gl.uniform1f(uniforms.uShine, SHINE);
      gl.uniform1f(uniforms.uDispersion, DISPERSION);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    return {
      canvas,
      draw,
      reset() {
        if (!gl.isContextLost()) {
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }
    };
  }

  function create() {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const field = createField();
    const dom = createFilterDom();
    const glint = createGlintRenderer();
    const bmp = createBmpBuffer(MAP_W, MAP_H);
    const gxGrid = new Float32Array(MAP_W * MAP_H);
    const gyGrid = new Float32Array(MAP_W * MAP_H);
    let raf = 0;
    let lastTime = 0;
    let lastMapAt = 0;
    let mounted = false;

    function unmount() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!mounted) return;
      mounted = false;
      document.documentElement.classList.remove('home-ripple-active');
      dom.layer.remove();
      glint.reset();
      glint.canvas.remove();
    }

    function paintMap(vw, vh) {
      const box = field.bounds(vw, vh);
      if (!box) return;
      dom.lens.style.left = box.x + 'px';
      dom.lens.style.top = box.y + 'px';
      dom.lens.style.width = box.w + 'px';
      dom.lens.style.height = box.h + 'px';
      dom.map.setAttribute('width', box.w);
      dom.map.setAttribute('height', box.h);

      const peak = field.fillGrid(box, MAP_W, MAP_H, gxGrid, gyGrid);
      const scale = Math.min(180, 2 * REFRACTION * peak);
      const inv = peak > 1e-4 ? 127 / peak : 0;
      let off = 54;
      for (let i = 0; i < gxGrid.length; i += 1) {
        const r = Math.max(0, Math.min(255, Math.round(128 + gxGrid[i] * inv)));
        const g = Math.max(0, Math.min(255, Math.round(128 + gyGrid[i] * inv)));
        bmp[off++] = 128;
        bmp[off++] = g;
        bmp[off++] = r;
      }
      dom.map.setAttribute('href', encodeBmp(bmp));
      dom.displace.setAttribute('scale', scale.toFixed(2));
    }

    function tick(now) {
      raf = 0;
      if (motion.matches || document.hidden) {
        field.clear();
        unmount();
        return;
      }
      const delta = Math.min(Math.max((now - lastTime) / 1000, 0), 1 / 30);
      lastTime = now;
      const vw = document.documentElement.clientWidth;
      const vh = innerHeight;
      field.advance(delta, vw, vh);
      if (field.count() === 0) {
        unmount();
        return;
      }
      if (now - lastMapAt >= MAP_STEP_MS) {
        lastMapAt = now;
        paintMap(vw, vh);
      }
      glint.draw(field.list(), vw, vh);
      raf = requestAnimationFrame(tick);
    }

    function splash(x, y) {
      if (motion.matches || document.hidden) return;
      field.splash(x, y, 1);
      const prev = Number(document.documentElement.dataset.rippleSpawns || 0);
      document.documentElement.dataset.rippleSpawns = String(prev + 1);
      if (!mounted) {
        mounted = true;
        document.body.appendChild(dom.layer);
        document.body.appendChild(glint.canvas);
        document.documentElement.classList.add('home-ripple-active');
      }
      const now = performance.now();
      lastMapAt = now;
      paintMap(document.documentElement.clientWidth, innerHeight);
      glint.draw(field.list(), document.documentElement.clientWidth, innerHeight);
      if (!raf) {
        lastTime = now;
        raf = requestAnimationFrame(tick);
      }
    }

    function onEnvChange() {
      if ((motion.matches || document.hidden) && mounted) {
        field.clear();
        unmount();
      }
    }

    motion.addEventListener('change', onEnvChange);
    document.addEventListener('visibilitychange', onEnvChange);
    return { splash, active() { return mounted; } };
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { createField };
  else window.HomeRipple = { create };
})();
