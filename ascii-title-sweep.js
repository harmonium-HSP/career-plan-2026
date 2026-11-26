(function (root) {
  // 笔记默认字形与扫带。翻卡一开始就扫，时长用笔记的 2 秒，不挤在封面末段。
  var ASCII = [0, 128, 131200, 14336, 459200, 469440, 4357252, 18157905, 11512810, 15724526];
  var DURATION = 2;
  var DETAIL_DELAY = 0.14; // Fraction of the shared two-second clock.
  var SWEEP = {
    angle: 0,
    band: 0.28,
    softness: 0.45,
    turbulence: 0.5,
    trail: 0.75,
    scale: 2,
    spacing: 1,
    color: "#4ade80",
    glow: 2,
    aberration: 5,
    flicker: 0.35,
    density: 0.9,
    displace: 14,
    contrast: 1.2,
    brightness: 0,
    invert: 0,
    threshold: 0.1,
    fade: 0.75
  };
  var PAD = 36;
  var VERT = [
    "#version 300 es",
    "precision highp float;",
    "layout(location = 0) in vec2 aPos;",
    "out vec2 vUv;",
    "void main() {",
    "  vUv = aPos * 0.5 + 0.5;",
    "  gl_Position = vec4(aPos, 0.0, 1.0);",
    "}"
  ].join("\n");
  var FRAG = [
    "#version 300 es",
    "precision highp float;",
    "in vec2 vUv;",
    "out vec4 outColor;",
    "uniform sampler2D uFrom;",
    "uniform sampler2D uTo;",
    "uniform sampler2D uGlyphs;",
    "uniform vec2 uResolution;",
    "uniform float uProgress;",
    "uniform float uSourceVisible;",
    "uniform float uDetailProgress;",
    "uniform vec2 uHeadingY;",
    "uniform vec2 uDir;",
    "uniform float uBand;",
    "uniform float uSoftness;",
    "uniform float uTurbulence;",
    "uniform float uTrail;",
    "uniform float uGlyphPx;",
    "uniform float uSpacing;",
    "uniform int uGlyphCount;",
    "uniform vec3 uInk;",
    "uniform float uGlow;",
    "uniform float uAberration;",
    "uniform float uFlicker;",
    "uniform float uDensity;",
    "uniform float uDisplace;",
    "uniform float uContrast;",
    "uniform float uBrightness;",
    "uniform float uInvert;",
    "uniform float uThreshold;",
    "uniform float uFade;",
    "uniform float uAdditive;",
    "uniform float uTime;",
    "uniform float uLod;",
    "float glyphBit(int index, ivec2 p) {",
    "  if (p.x < 0 || p.x > 4 || p.y < 0 || p.y > 4 || index < 0) return 0.0;",
    "  int bit = (4 - p.x) + 5 * p.y;",
    "  return texelFetch(uGlyphs, ivec2(bit, index), 0).r;",
    "}",
    "float hash21(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
    "}",
    "float hash31(vec3 p) {",
    "  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);",
    "}",
    "vec4 panel(sampler2D tex, vec2 uv, float lod, vec2 fringe) {",
    "  vec4 c = textureLod(tex, uv, lod);",
    "  if (uAberration > 0.001) {",
    "    c.r = textureLod(tex, uv + fringe, lod).r;",
    "    c.b = textureLod(tex, uv - fringe, lod).b;",
    "  }",
    "  return c;",
    "}",
    "vec4 mixPanel(vec2 uv, float lod, vec2 fringe, float swapValue) {",
    "  vec4 fromC = panel(uFrom, uv, lod, fringe);",
    "  vec4 toC = panel(uTo, uv, lod, fringe);",
    "  float alpha = mix(fromC.a, toC.a, swapValue);",
    "  vec3 premixed = mix(fromC.rgb * fromC.a, toC.rgb * toC.a, swapValue);",
    "  vec3 rgb = alpha > 0.001 ? premixed / alpha : vec3(0.0);",
    "  return vec4(rgb, alpha);",
    "}",
    "void main() {",
    "  vec2 uv = vUv;",
    "  float cellPx = max((5.0 + 2.0 * uSpacing) * uGlyphPx, 1.0);",
    "  vec2 frag = uv * uResolution;",
    "  vec2 cell = floor(frag / cellPx);",
    "  vec2 cellUv = (cell + 0.5) * cellPx / uResolution;",
    "  float extent = max(0.5 * (abs(uDir.x) + abs(uDir.y)), 1e-4);",
    "  float axis = dot(cellUv - 0.5, uDir) / (2.0 * extent) + 0.5;",
    "  float band = max(uBand, 1e-3);",
    "  float rowSeed = hash21(vec2(floor(cell.y * 0.5), 19.7)) - 0.5;",
    "  float cellSeed = hash21(cell * 0.37 + 3.1) - 0.5;",
    "  axis += (rowSeed * 0.8 + cellSeed * 0.4) * uTurbulence * band;",
    "  float feather = max(clamp(uSoftness, 0.0, 1.0) * band, 1e-4);",
    "  float glowSpan = band * (1.0 + uTrail) + feather;",
    "  float travel = 1.0 + band * (1.0 + uTrail) + uTurbulence * band;",
    "  float progress = (uv.y >= uHeadingY.x && uv.y <= uHeadingY.y) ? uProgress : uDetailProgress;",
    "  float behind = progress * travel - axis;",
    "  float swap = smoothstep(band * 0.30, band * 0.62, behind);",
    "  float enter = smoothstep(0.0, feather, behind);",
    "  float leave = 1.0 - smoothstep(band, band + max(uTrail, 0.001) * band, behind);",
    "  float ascii = clamp(enter * leave, 0.0, 1.0);",
    "  float aura = (1.0 - smoothstep(0.0, glowSpan, abs(behind - band * 0.5))) * smoothstep(-feather * 2.0, feather, behind);",
    "  vec2 fringe = (uDir * uAberration * max(ascii, aura * 0.5)) / max(uResolution, vec2(1.0));",
    "  float shift = 0.0;",
    "  if (uDisplace > 0.001) {",
    "    float slice = floor(frag.y / max(cellPx * 1.6, 2.0));",
    "    float tick = floor(uTime * 12.0);",
    "    float pick = hash21(vec2(slice, tick));",
    "    float tear = (hash21(vec2(slice * 1.7, tick * 0.31)) - 0.5) * step(0.45, pick);",
    "    shift = (tear * 2.0 * uDisplace * ascii) / max(uResolution.x, 1.0);",
    "  }",
    "  vec2 texUv = vec2(uv.x + shift, 1.0 - uv.y);",
    "  vec2 cellTexUv = vec2(cellUv.x + shift, 1.0 - cellUv.y);",
    "  vec3 prem = vec3(0.0);",
    "  float alpha = 0.0;",
    "  if (aura > 0.002) {",
    "    vec2 spread = vec2(cellPx) / max(uResolution, vec2(1.0));",
    "    float edge = 0.0;",
    "    for (int i = 0; i < 5; i++) {",
    "      vec2 tap = vec2(float(i == 1) - float(i == 2), float(i == 3) - float(i == 4)) * spread;",
    "      vec4 sharpTap = mixPanel(texUv + tap, uLod, vec2(0.0), swap);",
    "      vec4 broadTap = mixPanel(texUv + tap, uLod + 2.5, vec2(0.0), swap);",
    "      edge += abs(dot(sharpTap.rgb * sharpTap.a, vec3(0.299, 0.587, 0.114)) - dot(broadTap.rgb * broadTap.a, vec3(0.299, 0.587, 0.114)));",
    "    }",
    "    edge = clamp(edge / (5.0 * 0.16), 0.0, 1.0);",
    "    float haze = edge * aura * clamp(uGlow, 0.0, 2.0) * 0.5;",
    "    prem += uInk * haze * (0.55 + 0.85 * uAdditive);",
    "    alpha = max(alpha, haze * 0.8);",
    "  }",
    "  float on = 0.0;",
    "  vec3 glyphColor = uInk;",
    "  float lit = 0.0;",
    "  if (ascii > 0.002 && uGlyphCount > 0) {",
    "    vec4 fromSharp = panel(uFrom, cellTexUv, 0.0, fringe);",
    "    vec4 toSharp = panel(uTo, cellTexUv, 0.0, fringe);",
    "    vec4 soft = mixPanel(cellTexUv, uLod, fringe, swap);",
    "    vec4 broad = mixPanel(cellTexUv, uLod + 2.5, vec2(0.0), swap);",
    "    float letter = max(smoothstep(0.72, 0.96, fromSharp.a), smoothstep(0.72, 0.96, toSharp.a));",
    "    float lum = dot(soft.rgb, vec3(0.299, 0.587, 0.114));",
    "    float ink = letter * max(lum, 1.0 - lum);",
    "    float present = smoothstep(uThreshold * 0.5, uThreshold + 0.02, ink);",
    "    float detail = abs(lum - dot(broad.rgb, vec3(0.299, 0.587, 0.114)));",
    "    present *= mix(0.5, 1.0, smoothstep(0.01, uThreshold + 0.06, detail));",
    "    present *= step(hash21(cell + 11.3), clamp(uDensity, 0.0, 1.0));",
    "    float roll = hash31(vec3(cell, floor(uTime * 18.0)));",
    "    present *= 1.0 - clamp(uFlicker, 0.0, 1.0) * step(roll, 0.4);",
    "    float t = clamp(ink / 0.35, 0.0, 1.0);",
    "    float amount = clamp((t - 0.5) * uContrast + 0.5 + uBrightness, 0.0, 1.0);",
    "    amount = mix(amount, 1.0 - amount, clamp(uInvert, 0.0, 1.0));",
    "    float picked = clamp(amount + (hash31(vec3(cell, floor(uTime * 15.0))) - 0.5) * 0.25, 0.0, 1.0);",
    "    int index = clamp(int(picked * float(uGlyphCount)), 0, uGlyphCount - 1);",
    "    ivec2 local = ivec2(floor((frag - cell * cellPx) / max(uGlyphPx, 0.001)));",
    "    int pad = int(uSpacing + 0.5);",
    "    on = glyphBit(index, ivec2(local.x - pad, local.y - pad));",
    "    glyphColor = uInk * step(0.35, hash21(cell * 0.91 + 7.7));",
    "    lit = on * ascii * present;",
    "  }",
    "  float fadeMix = clamp(uFade, 0.0, 1.0) * ascii * (1.0 - on);",
    "  vec4 fromC = panel(uFrom, texUv, 0.0, fringe);",
    "  float fromVis = uSourceVisible * (1.0 - swap) * (1.0 - fadeMix);",
    "  prem += fromC.rgb * fromC.a * fromVis;",
    "  alpha = max(alpha, fromC.a * fromVis);",
    "  prem = mix(prem, glyphColor, lit);",
    "  alpha = mix(alpha, 1.0, lit);",
    "  prem = clamp(prem, 0.0, 1.0);",
    "  alpha = clamp(alpha, 0.0, 1.0);",
    "  outColor = vec4(prem, alpha) * (1.0 - smoothstep(0.93, 1.0, progress));",
    "}"
  ].join("\n");

  var gpu = null;
  var failed = false;
  var active = null; // Sole owner of the DOM reveal.
  var bands = new Set();
  var pendingFrame = 0;

  function pixelRatio() {
    return Math.min(root.devicePixelRatio || 1, 2);
  }

  function readColor(cssColor) {
    var probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    probe.fillStyle = "#000";
    probe.fillStyle = cssColor;
    probe.fillRect(0, 0, 1, 1);
    var px = probe.getImageData(0, 0, 1, 1).data;
    return [px[0] / 255, px[1] / 255, px[2] / 255];
  }

  function pageIsDark() {
    var lum = readColor(getComputedStyle(document.body).backgroundColor);
    return 0.299 * lum[0] + 0.587 * lum[1] + 0.114 * lum[2] < 0.5;
  }

  function compile(gl, type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function packGlyphs() {
    var bytes = new Uint8Array(25 * 16);
    ASCII.forEach(function (value, glyph) {
      var bits = value >>> 0;
      for (var bit = 0; bit < 25; bit += 1) {
        bytes[glyph * 25 + bit] = ((bits >>> bit) & 1) ? 255 : 0;
      }
    });
    return bytes;
  }

  function createGpu() {
    var canvas = document.createElement("canvas");
    canvas.className = "ascii-title-sweep";
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "0";
    canvas.style.height = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "33";
    canvas.style.visibility = "hidden";
    var gl = canvas.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: true
    });
    if (!gl) return null;
    var vertex = compile(gl, gl.VERTEX_SHADER, VERT);
    var fragment = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vertex || !fragment) return null;
    var program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }
    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var glyphTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, glyphTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 25, 16, 0, gl.RED, gl.UNSIGNED_BYTE, packGlyphs());
    var uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < count; i += 1) {
      var info = gl.getActiveUniform(program, i);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    return {
      canvas: canvas,
      gl: gl,
      program: program,
      vao: vao,
      glyphTex: glyphTex,
      uniforms: uniforms,
      source: document.createElement("canvas"),
      ink: readColor(SWEEP.color),
      additive: pageIsDark() ? 1 : 0
    };
  }

  function boot() {
    if (gpu) return true;
    if (failed) return false;
    gpu = createGpu();
    if (!gpu) failed = true;
    return !!gpu;
  }

  function splitShadows(value) {
    if (!value || value === "none") return [];
    var parts = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < value.length; i += 1) {
      var ch = value.charAt(i);
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if (ch === "," && depth === 0) {
        parts.push(value.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(value.slice(start).trim());
    return parts.filter(Boolean);
  }

  function parseShadow(part) {
    var colorMatch = part.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}/);
    var color = colorMatch ? colorMatch[0] : "rgba(0, 0, 0, 0.45)";
    var rest = colorMatch ? part.replace(colorMatch[0], " ") : part;
    var nums = rest.trim().split(/\s+/).map(parseFloat).filter(function (n) { return !isNaN(n); });
    return { x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, color: color };
  }

  function setFont(ctx, style) {
    ctx.font = style.fontStyle + " " + style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
    ctx.fillStyle = style.color;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  function drawGlyph(ctx, text, x, y, shadows) {
    if (!shadows.length) {
      ctx.fillText(text, x, y);
      return;
    }
    shadows.forEach(function (shadow) {
      ctx.shadowOffsetX = shadow.x;
      ctx.shadowOffsetY = shadow.y;
      ctx.shadowBlur = shadow.blur;
      ctx.shadowColor = shadow.color;
      ctx.fillText(text, x, y);
    });
    ctx.shadowColor = "rgba(0, 0, 0, 0)";
    ctx.shadowBlur = 0;
  }

  function lineRects(element) {
    var range = document.createRange();
    range.selectNodeContents(element);
    return Array.prototype.filter.call(range.getClientRects(), function (rect) {
      return rect.width > 0.5 && rect.height > 0.5;
    });
  }

  function paintElement(ctx, element, origin) {
    var style = getComputedStyle(element);
    var textNodes = [];
    for (var n = 0; n < element.childNodes.length; n += 1) {
      if (element.childNodes[n].nodeType === 3) textNodes.push(element.childNodes[n]);
    }
    if (!textNodes.length) return;
    ctx.save();
    setFont(ctx, style);
    var shadows = splitShadows(style.textShadow).map(parseShadow);
    textNodes.forEach(function (node) {
      var text = node.textContent || "";
      var glyphs = [];
      for (var i = 0; i < text.length; i += 1) {
        var ch = text.charAt(i);
        if (!ch.trim()) continue;
        var range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + 1);
        var rect = range.getBoundingClientRect();
        if (rect.width < 0.2) continue;
        glyphs.push({ ch: ch, rect: rect });
      }
      var lines = [];
      glyphs.forEach(function (glyph) {
        var line = null;
        for (var k = 0; k < lines.length; k += 1) {
          if (Math.abs(lines[k].top - glyph.rect.top) < 2) line = lines[k];
        }
        if (!line) {
          line = { top: glyph.rect.top, height: glyph.rect.height, items: [] };
          lines.push(line);
        }
        line.items.push(glyph);
      });
      lines.forEach(function (line) {
        var sample = ctx.measureText(line.items[0].ch);
        var ascent = sample.fontBoundingBoxAscent || sample.actualBoundingBoxAscent;
        var descent = sample.fontBoundingBoxDescent || sample.actualBoundingBoxDescent || 0;
        var baseline = line.top - origin.y + (line.height - ascent - descent) / 2 + ascent;
        line.items.forEach(function (glyph) {
          var x = glyph.rect.left - origin.x;
          drawGlyph(ctx, glyph.ch, x, baseline, shadows);
        });
      });
    });
    ctx.restore();
  }

  function textUnion(reveal) {
    var nodes = reveal.querySelectorAll(".opener-index, h1, p");
    var left = Infinity;
    var top = Infinity;
    var right = -Infinity;
    var bottom = -Infinity;
    var found = false;
    Array.prototype.forEach.call(nodes, function (node) {
      lineRects(node).forEach(function (rect) {
        found = true;
        left = Math.min(left, rect.left);
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
      });
    });
    if (!found) return null;
    return { left: left, top: top, width: right - left, height: bottom - top };
  }

  function paintTitle(reveal, union) {
    var dpr = pixelRatio();
    var width = union.width + PAD * 2;
    var height = union.height + PAD * 2;
    var source = gpu.source;
    var pw = Math.max(1, Math.round(width * dpr));
    var ph = Math.max(1, Math.round(height * dpr));
    source.width = pw;
    source.height = ph;
    var ctx = source.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    var origin = { x: union.left - PAD, y: union.top - PAD };
    Array.prototype.forEach.call(reveal.querySelectorAll(".opener-index, h1, p"), function (node) {
      paintElement(ctx, node, origin);
    });
    return { width: width, height: height, pw: pw, ph: ph };
  }

  function uploadTex() {
    var gl = gpu.gl;
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gpu.source);
    gl.generateMipmap(gl.TEXTURE_2D);
    return tex;
  }

  function renderSweep(progress, detailProgress, now, size) {
    var gl = gpu.gl;
    if (gl.isContextLost()) return false;
    gl.useProgram(gpu.program);
    gl.bindVertexArray(gpu.vao);
    gl.viewport(size.x, size.y, size.pw, size.ph);
    gl.uniform1f(gpu.uniforms.uSourceVisible, size.sourceVisible);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, size.fromTex);
    gl.uniform1i(gpu.uniforms.uFrom, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, size.toTex);
    gl.uniform1i(gpu.uniforms.uTo, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, gpu.glyphTex);
    gl.uniform1i(gpu.uniforms.uGlyphs, 2);
    var dpr = size.pw / Math.max(1, Math.round(size.width));
    
    gl.uniform2f(gpu.uniforms.uResolution, size.pw, size.ph);
    gl.uniform1f(gpu.uniforms.uProgress, progress);
    gl.uniform1f(gpu.uniforms.uDetailProgress, detailProgress);
    gl.uniform2f(gpu.uniforms.uHeadingY, size.headingBottom, size.headingTop);
    gl.uniform2f(gpu.uniforms.uDir, size.direction, 0);
    gl.uniform1f(gpu.uniforms.uBand, SWEEP.band);
    gl.uniform1f(gpu.uniforms.uSoftness, SWEEP.softness);
    gl.uniform1f(gpu.uniforms.uTurbulence, SWEEP.turbulence);
    gl.uniform1f(gpu.uniforms.uTrail, SWEEP.trail);
    gl.uniform1f(gpu.uniforms.uGlyphPx, SWEEP.scale * dpr);
    gl.uniform1f(gpu.uniforms.uSpacing, SWEEP.spacing);
    gl.uniform1i(gpu.uniforms.uGlyphCount, ASCII.length);
    gl.uniform3f(gpu.uniforms.uInk, gpu.ink[0], gpu.ink[1], gpu.ink[2]);
    gl.uniform1f(gpu.uniforms.uGlow, SWEEP.glow);
    gl.uniform1f(gpu.uniforms.uAberration, SWEEP.aberration * dpr);
    gl.uniform1f(gpu.uniforms.uFlicker, SWEEP.flicker);
    gl.uniform1f(gpu.uniforms.uDensity, SWEEP.density);
    gl.uniform1f(gpu.uniforms.uDisplace, SWEEP.displace * dpr);
    gl.uniform1f(gpu.uniforms.uContrast, SWEEP.contrast);
    gl.uniform1f(gpu.uniforms.uBrightness, SWEEP.brightness);
    gl.uniform1f(gpu.uniforms.uInvert, SWEEP.invert);
    gl.uniform1f(gpu.uniforms.uThreshold, SWEEP.threshold);
    gl.uniform1f(gpu.uniforms.uFade, SWEEP.fade);
    gl.uniform1f(gpu.uniforms.uAdditive, gpu.additive);
    gl.uniform1f(gpu.uniforms.uTime, now / 1000);
    gl.uniform1f(gpu.uniforms.uLod, Math.max(0, Math.log2((5 + 2 * SWEEP.spacing) * SWEEP.scale * dpr) - 1));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  function unite(a, b) {
    if (!a) return b;
    if (!b) return a;
    var left = Math.min(a.left, b.left);
    var top = Math.min(a.top, b.top);
    var right = Math.max(a.left + a.width, b.left + b.width);
    var bottom = Math.max(a.top + a.height, b.top + b.height);
    return { left: left, top: top, width: right - left, height: bottom - top };
  }

  function placeCanvas(union, size) {
    var canvas = gpu.canvas;
    canvas.style.left = (union.left - PAD) + "px";
    canvas.style.top = (union.top - PAD) + "px";
    canvas.style.width = size.width + "px";
    canvas.style.height = size.height + "px";
  }

  function blankTitle(union) {
    var dpr = pixelRatio();
    var width = union.width + PAD * 2;
    var height = union.height + PAD * 2;
    var source = gpu.source;
    source.width = Math.max(1, Math.round(width * dpr));
    source.height = Math.max(1, Math.round(height * dpr));
    var ctx = source.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, source.width, source.height);
    return { width: width, height: height, pw: source.width, ph: source.height };
  }

  function ease(t) {
    var x = Math.max(0, Math.min(1, t));
    return x * x * (3 - 2 * x);
  }

  function paintBands() {
    var canvas = gpu.canvas, gl = gpu.gl;
    if (!bands.size) { canvas.style.visibility = "hidden"; return; }
    var bounds = null;
    bands.forEach(function (band) { bounds = unite(bounds, band.union); });
    var width = bounds.width + 2 * PAD, height = bounds.height + 2 * PAD;
    var ratio = pixelRatio();
    var pw = Math.max(1, Math.round(width * ratio)), ph = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    placeCanvas(bounds, {width: width, height: height});
    canvas.style.visibility = "visible";
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    bands.forEach(function (band) {
      band.size.x = Math.round((band.union.left - bounds.left) * ratio);
      band.size.y = ph - Math.round((band.union.top - bounds.top) * ratio) - band.size.ph;
      band.paint();
    });
  }

  function schedule() {
    if (!pendingFrame && bands.size) pendingFrame = root.requestAnimationFrame(function (now) {
      pendingFrame = 0;
      bands.forEach(function (band) { band.advance(now); });
      paintBands();
      schedule();
    });
  }

  function attach(options) {
    var fromNode = options && options.from;
    var toNode = options && options.to;
    var toReveal = toNode && toNode.querySelector(".opener-reveal");
    var fromReveal = fromNode && fromNode.querySelector(".opener-reveal");
    if ((!toReveal && !fromReveal) || !boot()) return null;
    var toUnion = toNode && textUnion(toNode);
    var fromUnion = fromNode ? textUnion(fromNode) : null;
    var concurrent = options.overlap === true && bands.size > 0;
    var snapshot = !options.overlap && active && active.snapshot();
    var union = unite(fromUnion, toUnion);
    if (snapshot) union = unite(union, {left:snapshot.left, top:snapshot.top, width:snapshot.width - 2 * PAD, height:snapshot.height - 2 * PAD});
    if (!union) return null;
    if (active) {
      if (concurrent) active.retireTitle();
      else active.stop();
    }
    var size = fromNode ? paintTitle(fromNode, union) : blankTitle(union);
    if (snapshot) {
      var ctx = gpu.source.getContext("2d");
      ctx.setTransform(pixelRatio(), 0, 0, pixelRatio(), 0, 0);
      ctx.clearRect(0, 0, size.width, size.height);
      ctx.drawImage(snapshot.image, snapshot.left - union.left, snapshot.top - union.top, snapshot.width, snapshot.height);
    }
    var fromTex = uploadTex();
    size = toNode ? paintTitle(toNode, union) : blankTitle(union);
    size.direction = options.direction < 0 ? -1 : 1;
    size.fromTex = fromTex;
    size.toTex = uploadTex();
    size.sourceVisible = concurrent ? 0 : 1;
    var heading = (toReveal || fromReveal).querySelector("h1").getBoundingClientRect();
    var canvasTop = union.top - PAD;
    size.headingBottom = 1 - (heading.bottom - canvasTop) / size.height;
    size.headingTop = 1 - (heading.top - canvasTop) / size.height;
    if (gpu.canvas.parentNode !== document.body) document.body.appendChild(gpu.canvas);
    if (fromReveal && fromReveal !== toReveal) fromReveal.style.opacity = "0";
    var underlay = toReveal;
    gpu.canvas.style.visibility = "visible";

    var dead = false;
    var finished = false;
    var startedAt = options.overlap ? root.performance.now() : null;
    var current = 0;
    var detail = 0;
    var onDone = null;

    function revealCut(progress) {
      var travel = 1 + SWEEP.band * (1 + SWEEP.trail) + SWEEP.turbulence * SWEEP.band;
      return progress * travel - SWEEP.band * 0.55;
    }

    function applyClip(progress) {
      if (!underlay || !underlay.isConnected) return;
      var canvasLeft = union.left - PAD;
      Array.prototype.forEach.call(underlay.children, function (row) {
        var phase = row.tagName === "H1" ? progress : detail;
        var fraction = revealCut(phase);
        var rtl = size.direction < 0;
        var cutX = canvasLeft + (rtl ? 1 - fraction : fraction) * size.width;
        var rect = row.getBoundingClientRect();
        // Clip horizontally only: the index and caption sit outside their parent,
        // and shadows extend beyond each row's own line box.
        row.style.clipPath = fraction >= 1 ? "" : rtl ?
          "inset(-" + PAD + "px -" + PAD + "px -" + PAD + "px " + (cutX - rect.left).toFixed(2) + "px)" :
          "inset(-" + PAD + "px " + (rect.right - cutX).toFixed(2) + "px -" + PAD + "px -" + PAD + "px)";
      });
    }

    function clearClips() {
      if (underlay) Array.prototype.forEach.call(underlay.children, function (row) { row.style.clipPath = ""; });
    }

    function showUnderlay() {
      if (!underlay || !underlay.isConnected) return;
      clearClips();
      underlay.style.opacity = "1";
    }

    function showTo() {
      showUnderlay();
      release();
      var done = onDone;
      onDone = null;
      if (done) done();
    }

    applyClip(0);
    if (underlay) underlay.style.opacity = "1";
    var lastRenderAt = root.performance.now();


    function frame(now) {
      if (dead || finished) return;
      if (startedAt === null) startedAt = now;
      var t = (now - startedAt) / ((options.duration || DURATION) * 1000);
      current = ease(t);
      detail = ease((t - DETAIL_DELAY) / (1 - DETAIL_DELAY));
      if (t >= 1 || gpu.gl.isContextLost()) {
        finished = true;
        current = 1;
        applyClip(1);
        showTo();
        return;
      }
      gpu.canvas.style.visibility = "visible";
      applyClip(current);
      lastRenderAt = now;
    }

    function release() {
      if (!bands.delete(band)) return;
      gpu.gl.deleteTexture(size.fromTex);
      gpu.gl.deleteTexture(size.toTex);
      size.fromTex = size.toTex = null;
      if (active === handle) active = null;
      underlay = fromNode = toNode = fromReveal = toReveal = options = null;
      if (!bands.size && pendingFrame) {
        root.cancelAnimationFrame(pendingFrame);
        pendingFrame = 0;
      }
    }

    function stop() {
      if (finished) return;
      clearClips();
      dead = true;
      finished = true;
      var done = onDone;
      onDone = null;
      if (done) done();
      release();
    }

    function destroy() {
      stop();
      paintBands();
    }

    var handle = {
      // Preserve both the GPU effect and the revealed DOM rows on interruption.
      snapshot: function () {
        if (dead || finished || !(underlay || fromNode).isConnected) return null;
        var image = document.createElement("canvas");
        image.width = size.pw;
        image.height = size.ph;
        var ctx = image.getContext("2d");
        var ratio = pixelRatio();
        ctx.scale(ratio, ratio);
        if (underlay) Array.prototype.forEach.call(underlay.children, function (row) {
          var phase = row.tagName === "H1" ? current : detail;
          var w = Math.max(0, Math.min(1, revealCut(phase))) * size.width;
          ctx.save();
          ctx.beginPath();
          ctx.rect(size.direction < 0 ? size.width - w : 0, 0, w, size.height);
          ctx.clip();
          paintElement(ctx, row, {x: union.left - PAD, y: union.top - PAD});
          ctx.restore();
        });
        // A vertical reversal inherits only its owner's frame. Other bands
        // remain live and must never also appear frozen in the new source.
        gpu.gl.clear(gpu.gl.COLOR_BUFFER_BIT);
        band.paint();
        ctx.drawImage(gpu.canvas, size.x, gpu.canvas.height - size.y - size.ph, size.pw, size.ph, 0, 0, size.width, size.height);
        paintBands();
        return {image: image, left: union.left, top: union.top, width: size.width, height: size.height};
      },
      retireTitle: function () {
        if (underlay) underlay.style.opacity = "0";
        clearClips();
        underlay = null;
        size.sourceVisible = 0;
        if (active === handle) active = null;
      },
      stop: stop,
      destroy: destroy,
      finished: function () { return finished; },
      progress: function () { return current; },
      fromElement: function () { return fromNode; },
      toElement: function () { return toNode; },
      useUnderlay: function (node) {
        if (finished || active !== handle) return;
        if (!node || node === underlay) {
          applyClip(current);
          return;
        }
        if (underlay && underlay.isConnected) {
          clearClips();
          underlay.style.opacity = "0";
        }
        underlay = node;
        underlay.style.opacity = "1";
        applyClip(current);
      },
      whenDone: function (fn) {
        if (finished) fn();
        else onDone = fn;
      }
    };
    var band = { union: union, size: size, advance: frame, stop: stop,
      paint: function () { renderSweep(current, detail, lastRenderAt, size); } };
    bands.add(band);
    active = handle;
    paintBands();
    schedule();
    return handle;
  }

  root.AsciiTitleSweep = { attach: attach, cancelAll: function () {
    bands.forEach(function (band) { band.stop(); });
    if (gpu) paintBands();
  } };
})(window);
