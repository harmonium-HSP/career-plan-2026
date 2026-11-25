(function (root) {
  var math = root.BendMath;
  var source = root.BendShader;
  var config = math.CONFIG;
  var host = null;
  var reading = null;
  var mask = null;
  var output = null;
  var ctx = null;
  var gl = null;
  var program = null;
  var texture = null;
  var uniforms = null;
  var lenis = null;
  var resizeObserver = null;
  var hostHeight = -1;
  var raf = 0;
  var running = false;
  var hasTexture = false;
  var scrollSpeed = 0;
  var lastSample = 0;
  var lastScrollTime = 0;
  var lastFrameTime = 0;
  var topState = { value: 0, velocity: 0 };
  var bottomState = { value: 0, velocity: 0 };
  var syncingHeight = false;
  var photoLayer = null;

  function supported() {
    if (!math || !source) return false;
    var probe = document.createElement("canvas");
    var probeCtx = probe.getContext("2d");
    return !!(probeCtx && typeof probeCtx.drawElementImage === "function" && typeof probe.requestPaint === "function");
  }

  function resetMotion() {
    scrollSpeed = 0;
    lastSample = 0;
    lastScrollTime = 0;
    hasTexture = false;
    topState = { value: 0, velocity: 0 };
    bottomState = { value: 0, velocity: 0 };
  }

  function stop() {
    if (lenis) lenis.off("scroll", onScroll);
    lenis = null;
    root.removeEventListener("resize", onScroll);
    running = false;
    if (raf) root.cancelAnimationFrame(raf);
    raf = 0;
    if (mask) mask.hidden = true;
    if (output) output.hidden = true;
  }

  function discard() {
    stop();
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
    if (host && host.isConnected && reading) {
      var parent = host.parentElement;
      while (reading.firstChild) parent.insertBefore(reading.firstChild, host);
      host.remove();
    }
    if (mask) mask.remove();
    if (output) output.remove();
    if (photoLayer) photoLayer.remove();
    photoLayer = null;
    host = null;
    reading = null;
    mask = null;
    output = null;
    ctx = null;
    gl = null;
    program = null;
    texture = null;
    uniforms = null;
    hostHeight = -1;
    hasTexture = false;
    syncingHeight = false;
  }

  function compile(type, text) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  function setupGl() {
    gl = output.getContext("webgl2", {
      alpha: true,
      depth: false,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false
    });
    if (!gl) return false;
    var vertex = compile(gl.VERTEX_SHADER, source.VERT);
    var fragment = compile(gl.FRAGMENT_SHADER, source.FRAG);
    if (!vertex || !fragment) return false;
    program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return false;
    }
    uniforms = {};
    var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    var index;
    for (index = 0; index < count; index += 1) {
      var info = gl.getActiveUniform(program, index);
      uniforms[info.name] = gl.getUniformLocation(program, info.name);
    }
    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  function bitmapSize() {
    var dpr = root.devicePixelRatio || 1;
    return {
      dpr: dpr,
      w: Math.max(1, Math.round(root.innerWidth * dpr)),
      h: Math.max(1, Math.round(root.innerHeight * dpr))
    };
  }

  function measure() {
    var rect = reading.getBoundingClientRect();
    return math.frameForRect({
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height
    }, root.innerHeight, config.ease);
  }

  function syncHostHeight() {
    if (!host || !reading || syncingHeight) return;
    var next = reading.offsetHeight;
    if (next === hostHeight) return;
    hostHeight = next;
    host.style.height = next + "px";
    if (!root.ScrollTrigger) return;
    syncingHeight = true;
    root.ScrollTrigger.refresh();
    syncingHeight = false;
  }

  function paintSlice() {
    if (!ctx || !gl || !reading) return;
    var size = bitmapSize();
    if (host.width !== size.w || host.height !== size.h) {
      host.width = size.w;
      host.height = size.h;
    }
    var frame = measure();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, host.width, host.height);
    if (frame.visible && reading.clientWidth > 0) {
      var sourceH = Math.min(frame.sourceH, Math.max(0, reading.offsetHeight - frame.sourceY));
      if (sourceH > 0) {
        ctx.drawElementImage(
          reading,
          0,
          frame.sourceY,
          reading.clientWidth,
          sourceH,
          0,
          Math.round(frame.destY * size.dpr),
          size.w,
          Math.max(1, Math.round(sourceH * size.dpr)),
          { preserveElementGeometry: true }
        );
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, host);
    gl.generateMipmap(gl.TEXTURE_2D);
    ctx.clearRect(0, 0, host.width, host.height);
    hasTexture = true;
  }

  function onPaint() {
    try {
      paintSlice();
      wake();
    } catch (error) {
      if (String(error && error.message || "").indexOf("cached paint") !== -1) return;
      console.error(error);
      discard();
    }
  }

  function uniform1(name, value) {
    if (uniforms[name]) gl.uniform1f(uniforms[name], value);
  }

  function readPose() {
    var opener = document.querySelector(".opener");
    var next = document.querySelector("#next-project");
    var openerRect = opener ? opener.getBoundingClientRect() : { top: 0, bottom: 0 };
    var nextRect = next ? next.getBoundingClientRect() : { top: 0, bottom: 0 };
    var scroll = root.scrollY || 0;
    return math.bendPose({
      viewport: Math.max(root.innerHeight, 1),
      scroll: scroll,
      openerTop: opener ? openerRect.top + scroll : 0,
      openerHeight: opener ? opener.offsetHeight : 0,
      openerRectTop: openerRect.top,
      openerRectBottom: openerRect.bottom,
      nextTop: next ? nextRect.top + scroll : 0,
      nextHeight: next ? next.offsetHeight : 0,
      nextRectTop: nextRect.top,
      nextRectBottom: nextRect.bottom,
      expanding: !!document.querySelector(".expand-layer"),
      pptZone: config.zone,
      coverScale: config.coverScale
    });
  }

  function render(now) {
    if (!gl || !reading || !hasTexture) return;
    var delta = Math.min((now - lastFrameTime) / 1000, 1 / 30);
    lastFrameTime = now;
    scrollSpeed *= Math.exp(-delta / 0.12);
    if (Math.abs(scrollSpeed) < 5) scrollSpeed = 0;
    var frame = measure();
    var pose = readPose();
    var topGoal = pose.flatten ? 0 : math.bendGoal(frame.top, scrollSpeed, config.momentum);
    var bottomGoal = pose.flatten ? 0 : math.bendGoal(frame.bottom, scrollSpeed, config.momentum);
    if (pose.flatten) {
      topState = { value: 0, velocity: 0 };
      bottomState = { value: 0, velocity: 0 };
    } else {
      topState = math.settleFold(topState, topGoal, delta, config.smoothing);
      bottomState = math.settleFold(bottomState, bottomGoal, delta, config.smoothing);
    }
    placeFileImages();
    var show = frame.visible;
    mask.hidden = !show;
    output.hidden = !show;
    if (!show) return;
    mask.style.top = frame.destY + "px";
    mask.style.height = frame.sourceH + "px";
    var size = bitmapSize();
    if (output.width !== size.w || output.height !== size.h) {
      output.width = size.w;
      output.height = size.h;
    }
    var cssH = Math.max(root.innerHeight, 1);
    var cssW = Math.max(root.innerWidth, 1);
    var zone = Math.min(Math.max(pose.zone, 8) / cssH, 0.49);
    gl.useProgram(program);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, output.width, output.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (uniforms.uContent) gl.uniform1i(uniforms.uContent, 0);
    uniform1("uZone", zone);
    uniform1("uAngle", Math.min(Math.max(config.angle, 1), 160) * Math.PI / 180);
    uniform1("uPersp", Math.max(config.perspective, 50) / cssH);
    uniform1("uDir", config.direction === "in" ? -1 : 1);
    uniform1("uTopAmt", topState.value);
    uniform1("uBotAmt", bottomState.value);
    uniform1("uMaxX", 1);
    uniform1("uPxY", 1.5 / cssH);
    uniform1("uPxX", 1.5 / cssW);
    uniform1("uCover", 1);
    if (uniforms.uBg) gl.uniform3f(uniforms.uBg, 20 / 255, 20 / 255, 20 / 255);
    uniform1("uTiltX", 0);
    uniform1("uTiltY", 0);
    uniform1("uPhi", 0);
    uniform1("uRound", Math.min(Math.max(config.rounding, 0) / cssH, zone));
    uniform1("uFade", Math.min(Math.max(config.fade, 0), 1));
    uniform1("uBlur", Math.min(Math.max(config.blur, 0), 1));
    if (uniforms.uContentSize) gl.uniform2f(uniforms.uContentSize, host.width, host.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function settled(frame) {
    var pose = readPose();
    var topGoal = pose.flatten ? 0 : math.bendGoal(frame.top, scrollSpeed, config.momentum);
    var bottomGoal = pose.flatten ? 0 : math.bendGoal(frame.bottom, scrollSpeed, config.momentum);
    return scrollSpeed === 0 && topState.velocity === 0 && bottomState.velocity === 0 &&
      topState.value === topGoal && bottomState.value === bottomGoal;
  }

  function frame(now) {
    if (!running) return;
    render(now);
    if (hasTexture && reading && settled(measure())) {
      running = false;
      return;
    }
    raf = root.requestAnimationFrame(frame);
  }

  function wake() {
    if (running || !gl) return;
    running = true;
    lastFrameTime = root.performance.now();
    raf = root.requestAnimationFrame(frame);
  }

  function onScroll() {
    if (!reading || !host) return;
    placeFileImages();
    var now = root.performance.now();
    var sample = measure().sourceY;
    if (lastScrollTime && now - lastScrollTime < 200) {
      var instant = (sample - lastSample) / Math.max((now - lastScrollTime) / 1000, 1 / 240);
      scrollSpeed += (instant - scrollSpeed) * 0.5;
    }
    lastSample = sample;
    lastScrollTime = now;
    host.requestPaint();
    wake();
  }

  function build(beats) {
    discard();
    host = document.createElement("canvas");
    host.id = "bend-host";
    host.setAttribute("content", "drawable");
    reading = document.createElement("div");
    reading.id = "bend-reading";
    reading.setAttribute("drawable", "");
    if (root.location.protocol === "file:") reading.classList.add("is-file-images");
    host.appendChild(reading);
    beats.appendChild(host);
    ctx = host.getContext("2d");
    if (!ctx || typeof ctx.drawElementImage !== "function") {
      discard();
      return false;
    }
    mask = document.createElement("div");
    mask.id = "bend-mask";
    mask.hidden = true;
    mask.setAttribute("aria-hidden", "true");
    output = document.createElement("canvas");
    output.id = "bend-output";
    output.hidden = true;
    output.setAttribute("aria-hidden", "true");
    beats.parentElement.appendChild(mask);
    beats.parentElement.appendChild(output);
    if (!setupGl()) {
      discard();
      return false;
    }
    host.onpaint = onPaint;
    resizeObserver = new ResizeObserver(syncHostHeight);
    resizeObserver.observe(reading);
    return true;
  }

  function adopt(beats, reducedMotion) {
    stop();
    resetMotion();
    if (reducedMotion || !supported()) {
      discard();
      return false;
    }
    var sections = Array.prototype.slice.call(beats.querySelectorAll(":scope > .opener, :scope > .sheet, :scope > .end"));
    if (!sections.length) {
      discard();
      return false;
    }
    if (!build(beats)) return false;
    sections.forEach(function (section) { reading.appendChild(section); });
    syncHostHeight();
    return true;
  }

  function liftFileImages() {
    if (!reading || !reading.classList.contains("is-file-images") || !host) return;
    if (!photoLayer) {
      photoLayer = document.createElement("div");
      photoLayer.id = "bend-photos";
      host.parentElement.parentElement.appendChild(photoLayer);
    }
    var images = Array.prototype.slice.call(reading.querySelectorAll("img"));
    var index;
    for (index = 0; index < images.length; index += 1) {
      var img = images[index];
      if (img.closest(".next-window") || img.getAttribute("data-bend-source")) continue;
      var copy = img.cloneNode(true);
      copy.removeAttribute("id");
      copy.setAttribute("data-bend-copy", "1");
      img.setAttribute("data-bend-source", "1");
      photoLayer.appendChild(copy);
    }
    if (!photoLayer.querySelector(".bend-next-copy")) {
      var sourceWindow = reading.querySelector(".next-window");
      if (sourceWindow) {
        var copyWindow = sourceWindow.cloneNode(true);
        copyWindow.removeAttribute("id");
        copyWindow.classList.add("bend-next-copy");
        photoLayer.appendChild(copyWindow);
      }
    }
    if (!photoLayer.querySelector(".bend-next-title")) {
      var sourceTitle = reading.querySelector(".next-card .next-copy");
      if (sourceTitle) {
        var copyTitle = sourceTitle.cloneNode(true);
        copyTitle.removeAttribute("id");
        copyTitle.classList.add("bend-next-title");
        photoLayer.appendChild(copyTitle);
      }
    }
  }

  function placeFileImages() {
    if (!photoLayer || !reading) return;
    var sources = reading.querySelectorAll("img[data-bend-source]");
    var copies = photoLayer.querySelectorAll("img[data-bend-copy]");
    var index;
    for (index = 0; index < sources.length && index < copies.length; index += 1) {
      var rect = sources[index].getBoundingClientRect();
      var copy = copies[index];
      copy.style.left = rect.left + "px";
      copy.style.top = rect.top + "px";
      copy.style.width = rect.width + "px";
      copy.style.height = rect.height + "px";
    }
    var sourceWindow = reading.querySelector(".next-window");
    var copyWindow = photoLayer.querySelector(".bend-next-copy");
    if (!sourceWindow || !copyWindow) return;
    var windowRect = sourceWindow.getBoundingClientRect();
    copyWindow.style.left = windowRect.left + "px";
    copyWindow.style.top = windowRect.top + "px";
    copyWindow.style.width = windowRect.width + "px";
    copyWindow.style.height = windowRect.height + "px";
    var sourceImg = sourceWindow.querySelector("img");
    var copyImg = copyWindow.querySelector("img");
    if (sourceImg && copyImg) copyImg.style.cssText = sourceImg.style.cssText;
    var sourceTitle = reading.querySelector(".next-card .next-copy");
    var copyTitle = photoLayer.querySelector(".bend-next-title");
    if (!sourceTitle || !copyTitle) return;
    var titleRect = sourceTitle.getBoundingClientRect();
    copyTitle.style.left = titleRect.left + "px";
    copyTitle.style.top = titleRect.top + "px";
    copyTitle.style.width = titleRect.width + "px";
    copyTitle.style.height = titleRect.height + "px";
    copyTitle.style.transform = "none";
  }

  function start(lenisInstance) {
    if (!reading || !gl) return;
    liftFileImages();
    placeFileImages();
    lenis = lenisInstance || null;
    if (lenis) lenis.on("scroll", onScroll);
    root.addEventListener("resize", onScroll);
    onScroll();
  }

  root.BendView = {
    supported: supported,
    adopt: adopt,
    start: start,
    stop: stop
  };
})(typeof window !== "undefined" ? window : globalThis);
