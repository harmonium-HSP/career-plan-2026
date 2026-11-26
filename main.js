(function () {
  const plan = window.PLAN;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const home = document.querySelector("#home");
  const chapterView = document.querySelector("#chapter");
  const curtain = document.querySelector("#curtain");
  const beatsRoot = document.querySelector("#beats");
  const rail = document.querySelector("#rail");
  const progress = document.querySelector("#progress");

  let index = 0;
  let view = "home";
  let lenis = null;
  let lenisTick = null;
  let busy = false;
  let railMounting = true;
  let homePlayed = false;
  let homeTarget = 0;
  let homeShown = 0;
  let velocity = 0;
  let desired = 0;
  let releaseAt = 0;
  let drive = "idle";
  const startupWall = document.querySelector("#startup-wall");
  let startupState = "home";
  let startupTarget = 0;

  function readStoredState() {
    try {
      const raw = window.sessionStorage.getItem("career-plan-2026-state");
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function readStartupState() {
    try {
      const saved = readStoredState();
      if (!Object.prototype.hasOwnProperty.call(saved, "index")) return;
      const max = plan.chapters.length - 1;
      startupTarget = Math.max(0, Math.min(max, Number(saved.index) || 0));
      startupState = "chapter";
      index = startupTarget;
      homeTarget = startupTarget;
      homeShown = startupTarget;
    } catch (error) {
      startupState = "home";
      startupTarget = 0;
    }
  }

  function saveStartupState(nextView) {
    try {
      const prev = readStoredState();
      const next = { index: index, view: nextView || view };
      if (Array.isArray(prev.wallNeighbors)) {
        next.wallActive = prev.wallActive;
        next.wallNeighbors = prev.wallNeighbors;
      }
      window.sessionStorage.setItem("career-plan-2026-state", JSON.stringify(next));
    } catch (error) { /* sessionStorage 可能被禁用 */ }
  }

  function readWallPlacement() {
    const saved = readStoredState();
    if (!Array.isArray(saved.wallNeighbors)) return null;
    return { active: saved.wallActive, neighbors: saved.wallNeighbors };
  }

  function saveWallPlacement(placement) {
    try {
      const prev = readStoredState();
      prev.index = Object.prototype.hasOwnProperty.call(prev, "index") ? prev.index : index;
      prev.view = prev.view || view;
      prev.wallActive = placement.active;
      prev.wallNeighbors = placement.neighbors;
      window.sessionStorage.setItem("career-plan-2026-state", JSON.stringify(prev));
    } catch (error) { /* sessionStorage 可能被禁用 */ }
  }

  readStartupState();

  gsap.registerPlugin(ScrollTrigger);

  function chapter() {
    return plan.chapters[index];
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }

  function buildCards() {
    const track = document.querySelector("#card-track");
    plan.chapters.forEach(function (item, i) {
      const card = document.createElement("figure");
      card.className = "photo-card";
      card.innerHTML = '<img src="' + esc(item.image) + '" alt="' + esc(item.alt) + '"><span class="card-name">' + esc(item.name) + "</span>";
      card.querySelector("img").addEventListener("load", renderHome);
      card.addEventListener("click", function () {
        enterFromCard(i);
      });
      track.appendChild(card);
    });
  }

  let countShown = null;

  function totalLabel() {
    return String(plan.chapters.length).padStart(2, "0");
  }

  function buildCount() {
    document.querySelector("#home-sentence").innerHTML = '<span class="sentence-strip">' + plan.chapters.map(function (item) {
      return '<span>' + esc(item.sentence) + '</span>';
    }).join('') + '</span>';
    const node = document.querySelector("#count");
    const nums = plan.chapters.map(function (item) {
      return "<span>" + esc(item.index) + "</span>";
    }).join("");
    node.innerHTML = '<span class="count-roll" aria-hidden="true"><span class="count-strip" id="count-strip">' +
      nums + '</span></span><span class="count-suffix">  —  ' + totalLabel() + '</span>';
  }

  function renderCount(nextIndex) {
    const strip = document.querySelector("#count-strip");
    const node = document.querySelector("#count");
    if (!strip || !node) return;
    node.setAttribute("aria-label", plan.chapters[nextIndex].index + "  —  " + totalLabel());
    if (countShown === nextIndex) return;
    const first = countShown === null || reduced;
    countShown = nextIndex;
    const sentence = document.querySelector(".sentence-strip");
    if (first) {
      strip.style.transition = "none";
      sentence.style.transition = "none";
    }
    strip.style.transform = "translateY(" + (-nextIndex) + "em)";
    sentence.style.transform = "translateY(" + (-nextIndex * 1.5) + "em)";
    if (first && !reduced) {
      window.requestAnimationFrame(function () {
        strip.style.transition = "";
        sentence.style.transition = "";
      });
    }
  }

  function renderHome() {
    if (view !== "home") return;
    const last = plan.chapters.length - 1;
    const position = Math.max(0, Math.min(last, homeShown));
    index = Math.max(0, Math.min(last, Math.round(position)));
    saveStartupState(view);
    const item = chapter();
    document.querySelector("#slogan").textContent = plan.slogan;
    document.querySelector("#home-contest").textContent = plan.contest;
    document.querySelector("#home-meta").textContent = plan.meta;
    document.querySelector("#home-sentence").setAttribute("aria-label", item.sentence);
    document.querySelector("#home-name").textContent = item.name;
    const track = document.querySelector("#card-track");
    const clip = document.querySelector("#card-clip");
    const cards = track.querySelectorAll(".photo-card");
    const card = cards[0];
    if (card && clip) {
      const gap = parseFloat(getComputedStyle(track).gap) || 36;
      const cardWidth = card.getBoundingClientRect().width;
      const span = cardWidth + gap;
      const clipBox = clip.getBoundingClientRect();
      const x = clipBox.width / 2 - cardWidth / 2 - position * span;
      track.style.transform = "translate3d(" + x + "px, 0, 0)";
      cards.forEach(function (node, cardIndex) {
        node.style.visibility = "";
        const img = node.querySelector("img");
        const maxShift = Math.max(0, img.offsetWidth - node.clientWidth);
        if (reduced || maxShift === 0) {
          img.style.transform = "translate3d(" + (-maxShift / 2) + "px, 0, 0)";
          return;
        }
        const along = (position - cardIndex) / 3.6;
        const seen = Math.max(0, Math.min(1, (along + 1) / 2));
        img.style.transform = "translate3d(" + (-(1 - seen) * maxShift) + "px, 0, 0)";
      });
    }
    document.querySelector("#enter").setAttribute("aria-label", "进入" + item.name);
    renderCount(index);
    document.querySelectorAll("#thumbs button").forEach(function (button, i) {
      if (i === index) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    const mark = document.querySelector(".thumb-mark");
    if (mark) mark.style.transform = "translateX(" + index * 80 + "px)";
  }

  function clampHome(value) {
    return Math.max(0, Math.min(plan.chapters.length - 1, value));
  }

  function glideHome() {
    if (view === "home" && !reduced) {
      const max = plan.chapters.length - 1;
      if (drive === "wheel") {
        if (performance.now() > releaseAt) desired += (0 - desired) * 0.06;
        velocity += (desired - velocity) * 0.065;
      } else if (drive === "coast") {
        const decel = 0.0016;
        if (Math.abs(velocity) <= decel) velocity = 0;
        else velocity -= Math.sign(velocity) * decel;
      } else if (drive === "spring") {
        const error = homeTarget - homeShown;
        if (pointerDrag) {
          const maxAccel = 0.0032;
          const wanted = error * 0.1;
          velocity += Math.max(-maxAccel, Math.min(maxAccel, wanted - velocity));
        } else {
          velocity += error * 0.05 - velocity * 0.44;
        }
      }
      if (drive !== "idle") {
        homeShown += velocity;
        if (homeShown < 0 || homeShown > max) {
          homeShown = clampHome(homeShown);
          homeTarget = homeShown;
          velocity = 0;
          desired = 0;
          drive = "idle";
        } else if (drive === "wheel") {
          homeTarget = homeShown;
          if (Math.abs(velocity) < 0.0002 && Math.abs(desired) < 0.0002) {
            velocity = 0;
            desired = 0;
            drive = "idle";
          }
        } else if (drive === "coast") {
          homeTarget = homeShown;
          if (velocity === 0) drive = "idle";
        } else if (!pointerDrag && Math.abs(homeTarget - homeShown) < 0.0015 && Math.abs(velocity) < 0.0015) {
          homeShown = homeTarget;
          velocity = 0;
          drive = "idle";
        }
        renderHome();
      }
    }
    window.requestAnimationFrame(glideHome);
  }

  function buildThumbs() {
    const box = document.querySelector("#thumbs");
    const mark = document.createElement("span");
    mark.className = "thumb-mark";
    box.appendChild(mark);
    plan.chapters.forEach(function (item, i) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", item.name);
      button.innerHTML = '<img src="' + esc(item.image) + '" alt="">';
      button.addEventListener("click", function () {
        moveHome(i);
      });
      box.appendChild(button);
    });
  }

  function nudge(direction) {
    if (reduced) return;
    gsap.fromTo("#stage", { x: direction * 14 }, { x: 0, duration: 0.28, ease: "power2.out" });
  }

  function moveHome(next) {
    if (busy || view !== "home") return;
    if (next < 0 || next >= plan.chapters.length) {
      nudge(next < 0 ? -1 : 1);
      return;
    }
    if (Math.abs(homeTarget - next) < 0.001 && Math.abs(homeShown - next) < 0.001) return;
    velocity = 0;
    desired = 0;
    drive = "spring";
    homeTarget = next;
    if (reduced) {
      homeShown = next;
      renderHome();
    }
  }

  function onHomeWheel(event) {
    if (view !== "home") return;
    event.preventDefault();
    if (busy) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const delta = event.deltaY * unit;
    const max = plan.chapters.length - 1;
    if ((homeTarget <= 0 && delta < 0) || (homeTarget >= max && delta > 0)) {
      nudge(delta < 0 ? -1 : 1);
      return;
    }
    if (reduced) {
      homeTarget = Math.max(0, Math.min(max, homeTarget + (delta > 0 ? 1 : -1)));
      homeShown = homeTarget;
      renderHome();
      return;
    }
    drive = "wheel";
    const cap = 0.042;
    desired = Math.max(-cap, Math.min(cap, desired + delta / 1800));
    releaseAt = performance.now() + 160;
  }

  async function playStartupIntro() {
    if (!startupWall || homePlayed) return Promise.resolve();
    homePlayed = true;
    busy = true;
    startupState = "chapter";
    const placement = window.STARTUP_WALL.resolveCoverPlacement(
      plan.chapters.length,
      startupTarget,
      readWallPlacement()
    );
    saveWallPlacement(placement);
    const photos = window.STARTUP_WALL.buildWallPhotos(plan, startupTarget, placement);
    await openChapter({ holdTitle: true });
    stopScroll();
    if (reduced) {
      startupWall.innerHTML = "";
      startupWall.hidden = true;
      showDock(startupTarget);
      await revealOpener(0);
      busy = false;
      return;
    }
    chapterView.classList.add("is-intro-overlay");
    document.querySelectorAll(".opener .opener-reveal, .side-plus, #dock, #back, #rail").forEach(function (node) {
      node.style.visibility = "hidden";
    });
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const layout = window.STARTUP_WALL.computeWallLayout(vw, vh);
    const stage = document.createElement("div");
    stage.className = "startup-wall-stage";
    startupWall.appendChild(stage);
    const columns = [];
    const slots = [];
    layout.columns.forEach(function (colSpec) {
      const column = document.createElement("div");
      column.className = "startup-wall-column";
      column.style.left = colSpec.left + "px";
      column.style.width = colSpec.width + "px";
      stage.appendChild(column);
      columns.push(column);
    });
    layout.slots.forEach(function (slotSpec) {
      const node = document.createElement("figure");
      node.className = "startup-wall-photo";
      const image = document.createElement("img");
      image.src = photos[slotSpec.slotIndex];
      image.alt = "";
      node.appendChild(image);
      columns[slotSpec.column].appendChild(node);
      gsap.set(node, { left: 0, top: slotSpec.top, width: slotSpec.width, height: slotSpec.height, autoRound: false });
      slots.push({
        node: node,
        image: image,
        column: slotSpec.column,
        row: slotSpec.row,
        isCenter: slotSpec.isCenter,
        top: slotSpec.top,
        height: slotSpec.height
      });
    });
    const centerSlot = slots.find(function (slot) { return slot.isCenter; });
    const loadImages = Promise.all(slots.map(function (slot) {
      return new Promise(function (resolve) {
        if (slot.image.complete) { resolve(); return; }
        slot.image.addEventListener("load", resolve, { once: true });
        slot.image.addEventListener("error", resolve, { once: true });
      });
    }));
    const duration = 4.2;
    const delays = [0.50, 0.28, 0.00, 0.42, 0.62];
    const motions = [];
    const clamp = function (p) { return Math.max(0, Math.min(1, p)); };
    const approach = function (p) { return p * p * p * (10 - 15 * p + 6 * p * p); };
    layout.columns.forEach(function (colSpec) {
      const columnIndex = colSpec.columnIndex;
      const direction = colSpec.direction;
      const ordered = slots.filter(function (slot) { return slot.column === columnIndex; })
        .sort(function (a, b) { return direction * (a.row - b.row); });
      const entry = direction > 0
        ? vh + 24 - Math.min.apply(null, ordered.map(function (slot) { return slot.top; }))
        : -24 - Math.max.apply(null, ordered.map(function (slot) { return slot.top + slot.height; }));
      const spacing = (280 + Math.abs(columnIndex - 2) * 30) * Math.min(1, vw / 1440);
      ordered.forEach(function (slot, rank) {
        const startY = entry + direction * rank * spacing;
        gsap.set(slot.node, { y: startY, autoRound: false });
        motions.push({
          slot: slot,
          entry: entry,
          spread: direction * rank * spacing,
          delay: delays[columnIndex] + rank * 0.06,
          span: 2.85 + rank * 0.08 + columnIndex * 0.03
        });
      });
    });
    return loadImages.then(function () {
      const target = document.querySelector(".opener-photo").getBoundingClientRect();
      const centerRect = centerSlot.node.getBoundingClientRect();
      const centerTop = centerRect.top - Number(gsap.getProperty(centerSlot.node, "y"));
      const centerX = centerRect.left;
      const scaleX = target.width / centerRect.width;
      const scaleY = target.height / centerRect.height;
      const shiftX = target.left - (vw / 2 + (centerX - vw / 2) * scaleX);
      const shiftY = target.top - (vh / 2 + (centerTop - vh / 2) * scaleY);
      stage.style.visibility = "visible";

      const dockNode = document.querySelector("#dock");
      if (dockNode) dockNode.classList.add("is-intro");
      showDock(startupTarget);
      const reveal = document.querySelector(".opener-reveal");
      const backButton = document.querySelector("#back");
      const dockButtons = Array.from(document.querySelectorAll("#dock .dock-card"));
      const sidePluses = Array.from(document.querySelectorAll(".side-plus"));
      if (reveal) gsap.set(reveal, { visibility: "visible", opacity: 0, y: 18 });
      if (backButton) gsap.set(backButton, { visibility: "visible", opacity: 0 });
      if (dockNode) dockNode.style.visibility = "hidden";
      gsap.set(dockButtons, { opacity: 0, y: 24 });
      moveDockFrame(false);
      const introFrame = dockNode && dockNode.querySelector(".dock-frame");
      if (introFrame) introFrame.style.opacity = "0";
      plusesWanted = false;
      sidePluses.forEach(function (button) {
        button.classList.remove("is-on");
        button.style.visibility = "hidden";
      });
      gsap.set(".plus-arm-x", { scaleX: 0 });
      gsap.set(".plus-arm-y", { scaleY: 0 });

      const clock = { time: 0 };
      const overlayStart = 3.65;
      let overlayTriggered = false;
      const render = function () {
        const time = clock.time;
        const zoomRaw = clamp((time - 1.35) / (duration - 1.35));
        // 放大从 1.35 秒就跟上，上下移动一直持续到周围图片被挤出画面。
        const zoom = approach(Math.pow(zoomRaw, 1.05));
        stage.style.transform = "translate(" + (shiftX * zoom) + "px," + (shiftY * zoom) + "px) scale(" + Math.pow(scaleX, zoom) + "," + Math.pow(scaleY, zoom) + ")";
        motions.forEach(function (motion) {
          const phase = clamp((time - motion.delay) / motion.span);
          const travel = approach(phase);
          const tighten = approach(clamp((time - motion.delay - 0.18) / (motion.span - 0.18)));
          gsap.set(motion.slot.node, { y: motion.entry * (1 - travel) + motion.spread * (1 - tighten), autoRound: false });
        });
        if (!overlayTriggered && time >= overlayStart) {
          overlayTriggered = true;
          const remaining = Math.max(0.2, duration - overlayStart);
          if (backButton) gsap.to(backButton, { opacity: 1, duration: remaining, ease: "power2.out" });
          plusesWanted = true;
          sidePluses.forEach(function (button) {
            button.classList.add("is-on");
            button.style.visibility = "visible";
          });
          gsap.to(".plus-arm-x", { scaleX: 1, duration: remaining, ease: "power2.out" });
          gsap.to(".plus-arm-y", { scaleY: 1, duration: remaining, ease: "power2.out" });
          if (dockNode) dockNode.style.visibility = "visible";
          dockButtons.forEach(function (btn, idx) {
            const staggerDelay = idx * 0.032;
            gsap.to(btn, {
              y: 0,
              opacity: 1,
              duration: Math.max(0.18, remaining - staggerDelay),
              ease: "power2.out",
              delay: staggerDelay,
              onUpdate: function () {
                moveDockFrame(false);
                const frame = dockNode && dockNode.querySelector(".dock-frame");
                const current = dockNode && dockNode.querySelector('.dock-card[aria-current="true"]');
                if (frame && current) frame.style.opacity = String(gsap.getProperty(current, "opacity"));
              }
            });
          });
        }
      };
      render();
      return new Promise(function (resolve) {
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(clock, { time: duration, duration: duration, ease: "none", onUpdate: render }, 0);
      });
    }).then(function () {
      const reveal = document.querySelector(".opener-reveal");
      const backButton = document.querySelector("#back");
      const dockButtons = Array.from(document.querySelectorAll("#dock .dock-card"));
      if (reveal) gsap.set(reveal, { visibility: "visible", opacity: 0, y: 0 });
      if (backButton) gsap.set(backButton, { visibility: "visible", clearProps: "opacity" });
      gsap.set(".plus-arm-x", { scaleX: 1 });
      gsap.set(".plus-arm-y", { scaleY: 1 });
      gsap.set(dockButtons, { clearProps: "opacity,transform" });
      const dockNode = document.querySelector("#dock");
      if (dockNode) {
        dockNode.classList.remove("is-intro");
        const frame = dockNode.querySelector(".dock-frame");
        if (frame) frame.style.opacity = "";
      }
      moveDockFrame(false);
      document.querySelectorAll("#rail").forEach(function (node) { node.style.visibility = "visible"; });
      chapterView.classList.remove("is-intro-overlay");
      startupWall.innerHTML = "";
      startupWall.hidden = true;
      stage.remove();
      mountScroll();
      ScrollTrigger.refresh();
      if (reveal) sweepVertical(reveal.parentNode, true);
      followTitle();
      syncDockScroll(true);
      busy = false;
    }).catch(function () {
      const dockNode = document.querySelector("#dock");
      if (dockNode) {
        dockNode.classList.remove("is-intro");
        dockNode.style.visibility = "";
      }
      chapterView.classList.remove("is-intro-overlay");
      startupWall.innerHTML = "";
      startupWall.hidden = true;
      chapterView.hidden = false;
      busy = false;
    });
  }

  function blockHtml(block) {
    if (block.type === "lede") return '<p class="lede">' + esc(block.text) + "</p>";
    if (block.type === "note") return '<p class="note">' + esc(block.text) + "</p>";
    if (block.type === "quote") {
      return '<blockquote class="quote"><p>' + esc(block.text) + "</p><cite>" + esc(block.cite) + "</cite></blockquote>";
    }
    if (block.type === "role") {
      return '<div class="role"><strong>' + esc(block.name) + "</strong><p>" + esc(block.note) + "</p></div>";
    }
    if (block.type === "list") {
      const mod = block.items.length === 2 ? " two" : block.items.length === 4 ? " four" : "";
      return '<div class="list' + mod + '">' + block.items.map(function (item) {
        return '<article class="item"><span class="n">' + esc(item.n) + "</span><h3>" + esc(item.title) + "</h3><p>" + esc(item.text) + "</p></article>";
      }).join("") + "</div>";
    }
    if (block.type === "metrics") {
      const mod = block.items.length === 2 ? " two" : "";
      return '<div class="metrics' + mod + '">' + block.items.map(function (item) {
        return '<article class="metric"><strong data-value="' + esc(item.value) + '">' + esc(item.value) + "</strong><h3>" + esc(item.label) + "</h3><p>" + esc(item.text) + "</p></article>";
      }).join("") + "</div>";
    }
    if (block.type === "media") {
      const shot = block.shot ? " is-shot" : "";
      const cap = block.caption ? "<figcaption>" + esc(block.caption) + "</figcaption>" : "";
      return '<figure class="solo reveal-photo' + shot + '"><img src="' + esc(block.src) + '" alt="' + esc(block.alt) + '">' + cap + "</figure>";
    }
    if (block.type === "gallery") {
      const columns = block.items.length === 2 ? " two" : "";
      const tall = block.items.some(function (item) { return item.shot; }) ? " is-tall" : "";
      return '<div class="gallery' + columns + tall + '">' + block.items.map(function (item) {
        const shot = item.shot ? " is-shot" : "";
        return '<figure class="reveal-photo' + shot + '"><img src="' + esc(item.src) + '" alt="' + esc(item.alt) + '"><figcaption>' + esc(item.caption) + "</figcaption></figure>";
      }).join("") + "</div>";
    }
    if (block.type === "split") {
      const side = block.side === "right" ? " is-right" : "";
      const shot = block.shot === false ? "" : " is-shot";
      const srcs = Array.isArray(block.srcs) && block.srcs.length ? block.srcs : [block.src];
      const imgs = srcs.map(function (s) {
        return '<img src="' + esc(s) + '" alt="' + esc(block.alt || "") + '">';
      }).join("");
      const stack = srcs.length > 1 ? " is-stack" : "";
      const paras = String(block.text || "").split("\n").map(function (line) {
        return "<p>" + esc(line) + "</p>";
      }).join("");
      const cite = block.cite ? "<cite>" + esc(block.cite) + "</cite>" : "";
      return '<div class="split' + side + '"><figure class="' + (shot + stack).trim() + '">' + imgs + '</figure><div class="split-copy">' + paras + cite + "</div></div>";
    }
    return "";
  }

  function pageHtml(page) {
    return '<section class="sheet beat" id="' + esc(page.id) + '" data-label="' + esc(page.kicker) + '">' +
      '<article class="paper"><div class="paper-body">' +
      '<p class="paper-kicker">' + esc(page.kicker) + "</p>" +
      "<h2>" + esc(page.title) + "</h2>" +
      page.blocks.map(blockHtml).join("") +
      "</div></article></section>";
  }

  function closeHtml() {
    const ending = plan.close;
    const line = esc(ending.line).replace(" · ", "<br>").replace("能力让", "能力<br>让");
    return '<section class="sheet beat" id="close">' +
      '<article class="close-paper"><div class="paper-body">' +
      '<div class="close-copy"><h2>' + esc(ending.title) + "</h2><p class=\"lede\">" + line + "</p>" +
      '<ul class="close-words">' + ending.words.map(function (word) { return "<li>" + esc(word) + "</li>"; }).join("") + "</ul>" +
      "<p class=\"lede\">" + esc(ending.thanks) + "</p><p class=\"note\">" + esc(ending.sign) + "</p></div>" +
      '<img class="close-photo" src="' + esc(ending.image) + '" alt="' + esc(ending.alt) + '">' +
      "</div></article></section>";
  }

  function usesInk(item) {
    return !!item.ink;
  }

  function titleBlock(item) {
    return '<p class="opener-index">' + esc(item.index) + "  —  " + totalLabel() + "</p>" +
      "<h1>" + esc(item.name) + "</h1><p>" + esc(item.sentence) + "</p>";
  }

  function nextHtml() {
    const next = plan.chapters[index + 1];
    if (!next) return closeHtml();
    return '<section class="end beat" id="next-project"><div class="next-sticky">' +
      '<button class="next-card" id="go-next" type="button" aria-label="进入' + esc(next.name) + '">' +
      '<span class="next-window"><img src="' + esc(next.image) + '" alt=""></span>' +
      '<div class="next-copy opener-copy' + (usesInk(next) ? ' is-ink' : '') + '"><div class="opener-reveal is-shown">' +
      titleBlock(next) + "</div></div></button></div></section>";
  }

  function renderChapter() {
    railMounting = true;
    syncRail();
    const item = chapter();
    const ink = usesInk(item) ? " is-ink" : "";
    const opener = '<section class="opener beat" id="opener"><div class="opener-sticky">' +
      '<img class="opener-photo" src="' + esc(item.image) + '" alt="' + esc(item.alt) + '">' +
      '<div class="opener-copy' + ink + '"><div class="opener-reveal">' +
      titleBlock(item) + "</div></div></div></section>";
    beatsRoot.innerHTML = opener + item.pages.map(pageHtml).join("") + nextHtml();
    if (window.BendView) BendView.adopt(beatsRoot, reduced);
    const go = document.querySelector("#go-next");
    if (go) go.addEventListener("click", enterFromNext);
    renderRail();
    layoutRail();
    placeNextWindow();
    window.requestAnimationFrame(placeNextWindow);
  }

  function renderRail() {
    const item = chapter();
    const targets = item.pages.map(function (page) {
      return { id: page.id, image: firstImage(page), label: page.title };
    });
    if (index === plan.chapters.length - 1) {
      targets.push({ id: "close", image: plan.close.image, label: "尾" });
    }
    rail.innerHTML = targets.map(function (target) {
      return '<button type="button" data-target="' + esc(target.id) + '" aria-label="跳到' + esc(target.label) + '"></button>';
    }).join("");
    rail.querySelectorAll("button").forEach(function (button) {
      button.addEventListener("click", function () {
        const node = document.getElementById(button.getAttribute("data-target"));
        scrollToNode(node);
      });
    });
  }

  function layoutRail() {
    const buttons = Array.from(rail.querySelectorAll("button"));
    const pages = buttons.map(function (button) { return document.getElementById(button.dataset.target); });
    const total = pages.reduce(function (sum, page) { return sum + page.offsetHeight; }, 0);
    if (!total) return;
    const capWidth = window.innerWidth <= 800 ? 44 : 100;
    const scale = Math.min(capWidth / window.innerWidth, window.innerHeight * 0.7 / total);
    rail.style.width = window.innerWidth * scale + "px";
    buttons.forEach(function (button, i) {
      const page = pages[i];
      const clone = page.cloneNode(true);
      clone.removeAttribute("id");
      clone.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
      clone.classList.remove("beat");
      clone.classList.add("rail-page");
      clone.setAttribute("aria-hidden", "true");
      clone.style.width = window.innerWidth + "px";
      clone.style.height = page.offsetHeight + "px";
      clone.style.transform = "scale(" + scale + ")";
      button.replaceChildren(clone);
      button.style.width = window.innerWidth * scale + "px";
      button.style.height = page.offsetHeight * scale + "px";
    });
    syncRail();
  }

  function firstImage(page) {
    const found = page.blocks.find(function (block) {
      return block.type === "media" || block.type === "gallery" || block.type === "split";
    });
    if (!found) return "";
    if (found.type === "media" || found.type === "split") return found.src || (found.srcs && found.srcs[0]) || "";
    return found.items[0].src;
  }

  function resetScroll() {
    if (typeof ScrollTrigger.clearScrollMemory === "function") ScrollTrigger.clearScrollMemory();
    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true });
  }

  let verticalSweep = null;
  let coverNavOpacity = 1;

  function stopVerticalSweep() {
    if (verticalSweep) verticalSweep.destroy();
    verticalSweep = null;
  }

  function sweepVertical(copy, entering) {
    const reveal = copy && copy.querySelector(".opener-reveal");
    if (!reveal) return null;
    gsap.killTweensOf(reveal);
    gsap.set(reveal, { y: 0 });
    verticalSweep = !reduced && window.AsciiTitleSweep && window.AsciiTitleSweep.attach({
      from: entering ? null : copy, to: entering ? copy : null, duration: 0.78
    });
    if (!verticalSweep) reveal.style.opacity = entering ? "1" : "0";
    return verticalSweep;
  }

  function stopScroll() {
    stopVerticalSweep();
    if (window.BendView) BendView.stop();
    railMounting = true;
    syncRail();
    interruptReadingDrag();
    if (nextReadingAuto) nextReadingAuto.kill();
    if (nextAuto) { nextAuto.kill(); nextAuto = null; }
    if (!nextHandoff) nextProgress = 0;
    ScrollTrigger.getAll().forEach(function (trigger) { trigger.kill(); });
    if (lenis) {
      gsap.ticker.remove(lenisTick);
      lenis.destroy();
      lenis = null;
    }
    resetScroll();
  }

  function mountScroll() {
    stopScroll();
    if (reduced) {
      progress.style.transform = "none";
      railMounting = false;
      syncRail();
      return;
    }
    lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenis.on("scroll", placeNextWindow);
    lenisTick = function (time) { lenis.raf(time * 1000); };
    gsap.ticker.add(lenisTick);
    gsap.ticker.lagSmoothing(0);

    const opener = document.querySelector(".opener");
    const photo = document.querySelector(".opener-photo");
    const copy = document.querySelector(".opener-copy");
    gsap.set(copy, { xPercent: -50, yPercent: -50, opacity: 1, y: 0 });
    let lastProgress = 0;
    let entering = !nextHandoff;
    coverNavOpacity = 1;
    const nav = { opacity: 1 };
    const timeline = gsap.timeline({
      onUpdate: function () {
        coverNavOpacity = nav.opacity;
        const p = this.progress();
        if (!nextHandoff && !coverTurn && !railMounting && p !== lastProgress) {
          const forward = p < lastProgress;
          if (p >= 1) {
            stopVerticalSweep();
            copy.querySelector(".opener-reveal").style.opacity = "0";
            entering = false;
          } else if (forward !== entering) {
            entering = forward;
            sweepVertical(copy, entering);
          }
        }
        lastProgress = p;
        followTitle();
      },
      scrollTrigger: {
        trigger: opener,
        start: "top top",
        end: "bottom bottom",
        scrub: true
      }
    });
    const coverScale = window.BendMath ? BendMath.CONFIG.coverScale : 0.82;
    timeline.to(photo, { scale: coverScale, ease: "none" }, 0);
    timeline.to(nav, { opacity: 0, ease: "none", immediateRender: false }, 0.55);
    timeline.fromTo(".plus-arm-x", { scaleX: 1 }, { scaleX: 0, ease: "none", immediateRender: false }, 0.55);
    timeline.fromTo(".plus-arm-y", { scaleY: 1 }, { scaleY: 0, ease: "none", immediateRender: false }, 0.55);

    beatsRoot.querySelectorAll(".paper, .close-paper").forEach(function (paper) {
      const body = paper.querySelector(".paper-body");
      if (!body) return;
      if (reduced) {
        gsap.set(body, { opacity: 1, y: 0 });
        return;
      }
      gsap.set(body, { opacity: 0, y: 42 });
      ScrollTrigger.create({
        trigger: paper,
        start: "top 76%",
        once: true,
        onEnter: function () {
          gsap.to(body, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" });
          paper.querySelectorAll(".metric strong").forEach(function (node) {
            const target = Number(node.getAttribute("data-value"));
            const start = Math.max(0, target - 12);
            const state = { value: start };
            node.textContent = String(start);
            gsap.to(state, {
              value: target,
              duration: 0.9,
              ease: "power2.out",
              onUpdate: function () { node.textContent = String(Math.round(state.value)); }
            });
          });
        }
      });
    });

    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: function (self) {
        progress.style.transform = "scaleY(" + self.progress + ")";
        markRail();
        syncRail();
        followTitle();
      }
    });
    resetScroll();
    ScrollTrigger.refresh();
    railMounting = false;
    syncRail();
    if (window.BendView) BendView.start(lenis);
  }

  function syncRail() {
    const suppressed = view !== "chapter" || railMounting || coverTurn ||
      (nextHandoff && !nextReadingAuto);
    rail.classList.toggle("is-suppressed", !!suppressed);
    if (suppressed) {
      rail.classList.remove("is-on");
      return;
    }
    const papers = beatsRoot.querySelectorAll(".sheet > .paper, .sheet > .close-paper");
    const firstPaper = papers[0];
    const lastPaper = papers[papers.length - 1];
    const height = rail.getBoundingClientRect().height;
    // 固定居中位置是边界基准，不读回平移后的 top。
    const fixedTop = (window.innerHeight - height) / 2;
    const fixedBottom = fixedTop + height;
    const lower = firstPaper ? firstPaper.getBoundingClientRect().top - fixedTop : 0;
    const upper = lastPaper ? lastPaper.getBoundingClientRect().bottom - fixedBottom : 0;
    const offset = Math.max(lower, Math.min(0, upper));
    rail.style.transform = "translateY(calc(-50% + " + offset + "px))";
    rail.classList.toggle("is-on", !!firstPaper && firstPaper.getBoundingClientRect().top < window.innerHeight);
  }

  function followTitle() {
    if (view !== "chapter") return;
    if (chapterView.classList.contains("is-intro-overlay")) return;
    if (nextNavigationSuppressed()) { suppressNextPluses(); return; }
    if (coverTurn) {
      document.querySelectorAll(".side-plus").forEach(function (button) {
        button.style.pointerEvents = "auto";
        button.tabIndex = 0;
      });
      syncDockScroll();
      return;
    }
    const copy = document.querySelector(".opener .opener-copy");
    if (!copy) return;
    const opacity = coverNavOpacity;
    const visible = coverNavigationVisible();
    document.querySelectorAll(".side-plus").forEach(function (button) {
      button.classList.toggle("is-on", visible && plusesWanted);
      button.tabIndex = visible && plusesWanted ? 0 : -1;
    });
    syncDockScroll();
    if (currentScrollY() > 0) {
      plusRevealTweens.forEach(function (tween) { tween.kill(); });
      gsap.set(".plus-arm-x", { scaleX: opacity });
      gsap.set(".plus-arm-y", { scaleY: opacity });
    }
    document.querySelectorAll(".side-plus").forEach(function (button) {
      button.style.pointerEvents = visible && plusesWanted ? "auto" : "none";
    });
  }

  function markRail() {
    const buttons = rail.querySelectorAll("button");
    let current = buttons[0];
    buttons.forEach(function (button) {
      const node = document.getElementById(button.getAttribute("data-target"));
      if (!node) return;
      const top = node.getBoundingClientRect().top;
      if (top < window.innerHeight * 0.45) current = button;
    });
    buttons.forEach(function (button) {
      button.setAttribute("aria-current", button === current ? "true" : "false");
    });
  }

  function scrollToNode(node, duration) {
    interruptReadingDrag();
    if (!node || coverTurn || nextHandoff || nextAuto) return;
    if (lenis) lenis.scrollTo(pageTop(node), { duration: duration || 0.9 });
    else node.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }

  function sheetNodes() {
    return Array.from(document.querySelectorAll(".beat"));
  }

  function moveSheet(direction) {
    const nodes = sheetNodes();
    const marker = window.scrollY + 8;
    let current = 0;
    nodes.forEach(function (node, i) {
      if (pageTop(node) <= marker) current = i;
    });
    const target = nodes[current + direction];
    if (!target) {
      nudge(direction);
      return;
    }
    scrollToNode(target);
  }

  function clipInset(rect, vw, vh) {
    const top = Math.max(0, Math.round(rect.top));
    const right = Math.max(0, Math.round(vw - rect.right));
    const bottom = Math.max(0, Math.round(vh - rect.bottom));
    const left = Math.max(0, Math.round(rect.left));
    return "inset(" + top + "px " + right + "px " + bottom + "px " + left + "px)";
  }

  function revealOpener(seconds) {
    const reveal = document.querySelector(".opener-reveal");
    const duration = reduced ? 0 : (seconds || 0.72);
    if (!reveal) return Promise.resolve();
    showPluses(duration);
    if (reduced) {
      gsap.set(reveal, { opacity: 1, y: 0 });
      return Promise.resolve();
    }
    const sweep = sweepVertical(reveal.parentNode, true);
    return sweep ? new Promise(function (resolve) { sweep.whenDone(resolve); }) : Promise.resolve();
  }

  function openChapter(options) {
    const scrollToSheet = Boolean(options && options.scrollToSheet);
    const holdTitle = Boolean(options && options.holdTitle);
    home.hidden = true;
    chapterView.hidden = false;
    chapterView.classList.add("is-open");
    chapterView.classList.remove("is-ready");
    view = "chapter";
    saveStartupState("chapter");
    window.scrollTo(0, 0);
    renderChapter();
    mountScroll();
    ScrollTrigger.refresh();
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        chapterView.classList.add("is-ready");
        if (holdTitle) {
          resolve();
          return;
        }
        revealOpener().then(function () {
          if (scrollToSheet) scrollToNode(document.querySelector("#beats .sheet"));
          resolve();
        });
      });
    });
  }

  function objectAnchor(image) {
    const parts = String(getComputedStyle(image).objectPosition || "50% 50%").split(/\s+/);
    const words = { left: 0, center: 0.5, right: 1, top: 0, bottom: 1 };
    function read(token, fallback) {
      if (!token) return fallback;
      if (token.indexOf("%") > -1) return parseFloat(token) / 100 || 0;
      if (words[token] !== undefined) return words[token];
      return fallback;
    }
    return { x: read(parts[0], 0.5), y: read(parts[1], 0.5) };
  }

  function playExpand(image, fromRect, toRect, fromClip, toClip, anchors) {
    const nw = image.naturalWidth || fromRect.width || 1;
    const nh = image.naturalHeight || fromRect.height || 1;
    const fromAnchor = (anchors && anchors.from) || { x: 0.5, y: 0.5 };
    const toAnchor = (anchors && anchors.to) || { x: 0.5, y: 0.5 };
    const layer = document.createElement("div");
    const photo = document.createElement("img");
    photo.src = image.currentSrc || image.src;
    layer.className = "expand-layer";
    layer.style.width = document.documentElement.clientWidth + "px";
    layer.style.height = document.documentElement.clientHeight + "px";
    photo.alt = "";
    photo.style.left = "0";
    photo.style.top = "0";
    photo.style.width = nw + "px";
    photo.style.height = nh + "px";
    photo.style.transformOrigin = "0 0";
    layer.appendChild(photo);
    document.body.appendChild(layer);
    gsap.set(layer, { clipPath: fromClip });
    function frame(progress) {
      const left = fromRect.left + (toRect.left - fromRect.left) * progress;
      const top = fromRect.top + (toRect.top - fromRect.top) * progress;
      const width = fromRect.width + (toRect.width - fromRect.width) * progress;
      const height = fromRect.height + (toRect.height - fromRect.height) * progress;
      const scale = Math.max(width / nw, height / nh);
      const anchorX = fromAnchor.x + (toAnchor.x - fromAnchor.x) * progress;
      const anchorY = fromAnchor.y + (toAnchor.y - fromAnchor.y) * progress;
      photo.style.transform = "translate3d(" +
        (left + (width - nw * scale) * anchorX) + "px," +
        (top + (height - nh * scale) * anchorY) + "px,0) scale(" + scale + ")";
    }
    frame(0);
    return new Promise(function (resolve) {
      const state = { progress: 0 };
      gsap.timeline({
        defaults: { duration: reduced ? 0 : 0.72, ease: "power3.inOut" },
        onComplete: function () {
          resolve(layer);
        }
      })
        .to(layer, { clipPath: toClip }, 0)
        .to(state, { progress: 1, onUpdate: function () { frame(state.progress); } }, 0);
    });
  }

  function fittedBitmap(box, naturalWidth, naturalHeight, alignLeft) {
    const scale = Math.max(box.width / naturalWidth, box.height / naturalHeight);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    return {
      scale: scale,
      left: alignLeft ? box.left : box.left + (box.width - width) / 2,
      top: box.top + (box.height - height) / 2
    };
  }

  function expandFromVisible(image, cardRect, endRect) {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const nw = image.naturalWidth;
    const nh = image.naturalHeight;
    const shown = image.getBoundingClientRect();
    const start = fittedBitmap(shown, nw, nh, true);
    const end = fittedBitmap(endRect, nw, nh, false);
    const originX = cardRect.left + cardRect.width / 2;
    const originY = cardRect.top + cardRect.height / 2;
    const sourceX = (originX - start.left) / start.scale;
    const sourceY = (originY - start.top) / start.scale;
    const layer = document.createElement("div");
    const photo = document.createElement("img");
    layer.className = "expand-layer";
    layer.style.width = vw + "px";
    layer.style.height = vh + "px";
    photo.src = image.currentSrc || image.src;
    photo.alt = "";
    photo.style.left = "0";
    photo.style.top = "0";
    photo.style.width = nw + "px";
    photo.style.height = nh + "px";
    photo.style.transformOrigin = "0 0";
    layer.appendChild(photo);
    document.body.appendChild(layer);
    function frame(progress) {
      const clipLeft = cardRect.left + (0 - cardRect.left) * progress;
      const clipTop = cardRect.top + (0 - cardRect.top) * progress;
      const clipRight = cardRect.right + (endRect.width - cardRect.right) * progress;
      const clipBottom = cardRect.bottom + (endRect.height - cardRect.bottom) * progress;
      const scale = start.scale + (end.scale - start.scale) * progress;
      const ax = sourceX + (nw / 2 - sourceX) * progress;
      const ay = sourceY + (nh / 2 - sourceY) * progress;
      const centerX = (clipLeft + clipRight) / 2;
      const centerY = (clipTop + clipBottom) / 2;
      const top = Math.max(0, clipTop);
      const right = Math.max(0, vw - clipRight);
      const bottom = Math.max(0, vh - clipBottom);
      const left = Math.max(0, clipLeft);
      layer.style.clipPath = "inset(" + top + "px " + right + "px " + bottom + "px " + left + "px)";
      photo.style.transform = "translate3d(" +
        (centerX - ax * scale) + "px," +
        (centerY - ay * scale) + "px,0) scale(" + scale + ")";
    }
    frame(0);
    return new Promise(function (resolve) {
      const state = { progress: 0 };
      gsap.to(state, {
        progress: 1,
        duration: 0.72,
        ease: "power3.inOut",
        onUpdate: function () { frame(state.progress); },
        onComplete: function () { resolve(layer); }
      });
    });
  }

  function dropLayer(layer) {
    return new Promise(function (resolve) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          if (layer && layer.parentNode) layer.remove();
          resolve();
        });
      });
    });
  }

  let nextProgress = 0;
  let nextHandoff = false;
  let nextAuto = null;
  let nextReadingAuto = null;

  function nextNavigationSuppressed() {
    return nextProgress > 0 || nextHandoff || nextAuto || nextReadingAuto;
  }

  function coverNavigationVisible() {
    if (nextNavigationSuppressed()) return false;
    if (coverTurn) return true;
    const copy = document.querySelector(".opener .opener-copy");
    return !!copy && (reduced
      ? currentScrollY() < window.innerHeight * 0.8
      : coverNavOpacity > 0.2);
  }

  function suppressNextPluses() {
    plusRevealTweens.forEach(function (tween) { tween.kill(); });
    gsap.killTweensOf(".plus-arm-x, .plus-arm-y");
    document.querySelectorAll(".side-plus").forEach(function (button) {
      button.classList.remove("is-on");
      button.style.pointerEvents = "none";
      button.tabIndex = -1;
    });
    syncDockScroll(true);
  }

  function placeNextWindow() {
    const section = document.querySelector("#next-project");
    const button = section && section.querySelector("#go-next");
    if (!button || nextHandoff) return;
    const frame = button.querySelector(".next-window");
    const img = frame.querySelector("img");
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const travel = Math.max(1, section.offsetHeight - vh);
    const distance = window.scrollY - pageTop(section);
    nextProgress = distance >= travel - 2 ? 1 : Math.max(0, Math.min(1, distance / travel));
    const box = button.getBoundingClientRect();
    const dx = (vw - box.width) * nextProgress / 2;
    const dy = (vh - box.height) * nextProgress / 2;
    frame.style.inset = (-dy) + "px " + (-dx) + "px";
    const card = frame.getBoundingClientRect();
    img.style.left = (-card.left) + "px";
    img.style.top = (-card.top) + "px";
    img.style.width = vw + "px";
    img.style.height = vh + "px";
    if (nextProgress > 0 || nextAuto) suppressNextPluses();
    if (nextProgress >= 1 && !busy) finishNext(false);
  }

  async function finishNext(clicked) {
    if (nextHandoff) return;
    const button = document.querySelector("#go-next");
    if (!button) return;
    nextHandoff = true;
    syncRail();
    plusesWanted = false;
    busy = true;
    suppressNextPluses();
    if (readingDrag && readingDrag.moved) readingClick = { id: readingDrag.id, until: performance.now() + 500 };
    interruptReadingDrag();
    if (lenis) { lenis.reset(); lenis.stop(); }
    const layer = document.createElement("div");
    layer.className = "expand-layer";
    layer.innerHTML = '<img src="' + esc(button.querySelector("img").src) + '" alt="">';
    Object.assign(layer.firstChild.style, { inset: "0", width: "100vw", height: "100vh", objectFit: "cover" });
    const copy = button.querySelector(".next-copy").cloneNode(true);
    copy.classList.add("title-pin");
    Object.assign(copy.style, { left: "50%", top: "50%", transform: "translate(-50%, -50%)" });
    layer.appendChild(copy);
    document.body.appendChild(layer);
    button.querySelector(".next-copy").style.visibility = "hidden";
    stopVerticalSweep();
    const exitSweep = !reduced && window.AsciiTitleSweep && window.AsciiTitleSweep.attach({ from: copy, duration: 0.78 });
    if (exitSweep) await new Promise(function (resolve) { exitSweep.whenDone(resolve); });
    copy.style.visibility = "hidden";
    rememberCard(index + 1);
    await openChapter({ holdTitle: true });
    if (lenis) { lenis.reset(); lenis.stop(); }
    await dropLayer(layer);
    showDock(index);
    resetScroll();
    nextProgress = 0;
    const sheet = document.querySelector("#beats .sheet");
    function complete() {
      nextReadingAuto = null;
      nextHandoff = false;
      syncRail();
      plusesWanted = true;
      busy = false;
      if (lenis) { lenis.reset(); lenis.start(); }
      followTitle();
    }
    if (reduced || !sheet) {
      if (sheet) window.scrollTo(0, pageTop(sheet));
      complete();
      return;
    }
    const state = { y: 0 };
    nextReadingAuto = gsap.to(state, {
      y: pageTop(sheet), duration: 1.7,
      ease: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      onUpdate: function () {
        if (lenis) lenis.scrollTo(state.y, { immediate: true, force: true });
        else window.scrollTo(0, state.y);
        suppressNextPluses();
        syncRail();
      },
      onComplete: complete,
      onInterrupt: complete
    });
  }

  function after(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function rememberCard(cardIndex) {
    index = cardIndex;
    homeTarget = cardIndex;
    homeShown = cardIndex;
    saveStartupState(view);
  }

  let dockAway = false;

  function currentScrollY() {
    return lenis ? lenis.scroll : window.scrollY;
  }

  function pageTop(node) {
    let y = 0;
    let current = node;
    while (current && current !== document.body && current !== document.documentElement) {
      y += current.offsetTop;
      current = current.offsetParent;
    }
    return y;
  }

  function ensureDockFrame() {
    const dock = document.querySelector("#dock");
    let frame = dock.querySelector(".dock-frame");
    if (!frame) {
      frame = document.createElement("span");
      frame.className = "dock-frame";
      frame.setAttribute("aria-hidden", "true");
      dock.appendChild(frame);
    }
    return frame;
  }

  function moveDockFrame(animate) {
    const dock = document.querySelector("#dock");
    if (!dock) return;
    const current = dock.querySelector('.dock-card[aria-current="true"]');
    const frame = ensureDockFrame();
    if (!current) {
      frame.hidden = true;
      return;
    }
    frame.hidden = false;
    const shift = Number(gsap.getProperty(current, "y")) || 0;
    const next = {
      x: current.offsetLeft,
      y: current.offsetTop + shift,
      width: current.offsetWidth,
      height: current.offsetHeight
    };
    if (animate && !reduced) {
      gsap.to(frame, {
        x: next.x, y: next.y, width: next.width, height: next.height,
        duration: 0.35, ease: "power2.out", overwrite: true
      });
      return;
    }
    gsap.set(frame, next);
  }

  function syncDockScroll(immediate) {
    if (view !== "chapter") return;
    const suppressed = !!nextNavigationSuppressed();
    const away = !coverNavigationVisible();
    const dock = document.querySelector("#dock");
    dock.style.visibility = suppressed ? "hidden" : "";
    dock.inert = away;
    const buttons = dock.querySelectorAll(".dock-card");
    buttons.forEach(function (button) {
      button.style.pointerEvents = away ? "none" : "auto";
      button.tabIndex = away ? -1 : 0;
    });
    if (immediate === true || suppressed) {
      gsap.killTweensOf(buttons);
      gsap.set(buttons, { y: away ? 90 : 0 });
      moveDockFrame(false);
    } else if (away !== dockAway) {
      gsap.to(buttons, {
        y: away ? 90 : 0, duration: reduced ? 0 : 0.48,
        stagger: reduced ? 0 : 0.075, ease: "power2.inOut", overwrite: true,
        clearProps: away ? "" : "transform",
        onUpdate: function () { moveDockFrame(false); }
      });
    }
    dockAway = away;
  }

  function showDock(activeIndex) {
    dockAway = false;
    gsap.killTweensOf("#dock .dock-card");
    const dock = document.querySelector("#dock");
    dock.classList.add("is-on");
    dock.innerHTML = plan.chapters.map(function (item, i) {
      const current = i === activeIndex ? ' aria-current="true"' : "";
      return '<button type="button" class="dock-card" data-index="' + i + '"' + current + ' title="' + esc(item.index + " " + item.name) + '" aria-label="' + esc(item.name) + '"><img src="' + esc(item.image) + '" alt=""></button>';
    }).join("");
    dock.querySelectorAll(".dock-card").forEach(function (button) {
      button.addEventListener("click", function () {
        switchChapter(Number(button.getAttribute("data-index")));
      });
    });
    dock.style.visibility = "";
    dock.inert = false;
    moveDockFrame(false);
    if (view === "chapter") syncDockScroll(true);
  }

  function updateDockCurrent(activeIndex, animate) {
    const buttons = document.querySelectorAll("#dock .dock-card");
    buttons.forEach(function (button, i) {
      if (i === activeIndex) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    moveDockFrame(animate === true);
  }

  function flyDock(activeIndex, returning) {
    const cards = Array.from(document.querySelectorAll(".photo-card"));
    const homeClip = document.querySelector("#card-clip").getBoundingClientRect();
    const dock = document.querySelector("#dock");
    if (!returning) showDock(activeIndex);
    const buttons = Array.from(dock.querySelectorAll(".dock-card"));
    gsap.killTweensOf(buttons);
    const order = cards.map(function (_, i) { return i; }).filter(function (i) {
      return i !== activeIndex;
    }).sort(function (a, b) {
      return Math.abs(a - activeIndex) - Math.abs(b - activeIndex) || a - b;
    });
    const flights = buttons.map(function (button, i) {
      const target = button.getBoundingClientRect();
      const source = cards[i].getBoundingClientRect();
      const clone = button.cloneNode(true);
      clone.removeAttribute("aria-label");
      clone.setAttribute("aria-hidden", "true");
      clone.className = "dock-card dock-flight" + (button.getAttribute("aria-current") === "true" ? " is-current" : "");
      document.body.appendChild(clone);
      const homeBox = i === activeIndex
        ? { left: target.left, top: window.innerHeight + 8, width: target.width, height: target.height }
        : source;
      const from = returning ? target : homeBox;
      const to = returning ? homeBox : target;
      gsap.set(clone, { x: 0, y: 0, left: from.left, top: from.top, width: from.width, height: from.height });
      const homeImage = cards[i].querySelector("img");
      const photo = clone.querySelector("img");
      const nw = homeImage.naturalWidth || 1;
      const nh = homeImage.naturalHeight || 1;
      const homeBitmap = fittedBitmap(homeImage.getBoundingClientRect(), nw, nh, true);
      const dockBitmap = fittedBitmap(target, nw, nh, false);
      // 同一张位图在两个裁切窗口之间过渡，保留首页当前的视差位置。
      const homeCrop = i === activeIndex
        ? { left: dockBitmap.left - target.left, top: dockBitmap.top - target.top, scale: dockBitmap.scale }
        : { left: homeBitmap.left - source.left, top: homeBitmap.top - source.top, scale: homeBitmap.scale };
      const dockCrop = { left: dockBitmap.left - target.left, top: dockBitmap.top - target.top, scale: dockBitmap.scale };
      const first = returning ? dockCrop : homeCrop;
      const last = returning ? homeCrop : dockCrop;
      Object.assign(photo.style, {
        position: "absolute", left: "0", top: "0", width: nw + "px", height: nh + "px",
        maxWidth: "none", transformOrigin: "0 0"
      });
      const croppedLeft = i === activeIndex ? 0 : Math.min(source.width, Math.max(0, homeClip.left - source.left));
      const croppedRight = i === activeIndex ? 0 : Math.min(source.width - croppedLeft, Math.max(0, source.right - homeClip.right));
      function drawCrop(progress) {
        const homeWeight = returning ? progress : 1 - progress;
        clone.style.clipPath = "inset(0px " + (croppedRight * homeWeight) + "px 0px " + (croppedLeft * homeWeight) + "px)";
        const x = first.left + (last.left - first.left) * progress;
        const y = first.top + (last.top - first.top) * progress;
        const scale = first.scale + (last.scale - first.scale) * progress;
        photo.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";
      }
      drawCrop(0);
      cards[i].style.visibility = "hidden";
      return new Promise(function (resolve) {
        gsap.to(clone, {
          left: to.left, top: to.top, width: to.width, height: to.height,
          duration: 0.72, ease: "power3.inOut",
          delay: i === activeIndex ? 0 : (returning ? order.length - 1 - order.indexOf(i) : order.indexOf(i)) * 0.085,
          onUpdate: function () { drawCrop(this.ratio); },
          onComplete: function () { drawCrop(1); resolve(clone); }
        });
      });
    });
    dock.style.visibility = "hidden";
    return Promise.all(flights).then(function (clones) {
      if (returning) {
        hideDock();
        cards.forEach(function (card) { card.style.visibility = ""; });
      }
      dock.style.visibility = "";
      clones.forEach(function (clone) { clone.remove(); });
    });
  }

  function hideDock() {
    const dock = document.querySelector("#dock");
    dock.classList.remove("is-on");
    dock.innerHTML = "";
  }

  let plusesWanted = false;
  let plusRevealTweens = [];

  function showPluses(duration) {
    if (nextNavigationSuppressed()) { suppressNextPluses(); return; }
    plusesWanted = true;
    const time = reduced ? 0 : (duration == null ? 0.72 : duration);
    document.querySelectorAll(".side-plus").forEach(function (button) {
      button.classList.add("is-on");
    });
    if (time === 0) {
      gsap.set(".plus-arm-x", { scaleX: 1 });
      gsap.set(".plus-arm-y", { scaleY: 1 });
      followTitle();
      return;
    }
    plusRevealTweens.forEach(function (tween) { tween.kill(); });
    plusRevealTweens = [
      gsap.fromTo(".plus-arm-x", { scaleX: 0 }, { scaleX: 1, duration: time, ease: "power2.out" }),
      gsap.fromTo(".plus-arm-y", { scaleY: 0 }, { scaleY: 1, duration: time, ease: "power2.out" })
    ];
    followTitle();
  }

  function hidePluses() {
    plusesWanted = false;
    if (reduced) {
      document.querySelectorAll(".side-plus").forEach(function (button) { button.classList.remove("is-on"); });
      return;
    }
    gsap.killTweensOf(".plus-arm-x, .plus-arm-y");
    gsap.to(".plus-arm-x", { scaleX: 0, duration: 0.32, ease: "power2.in" });
    gsap.to(".plus-arm-y", {
      scaleY: 0,
      duration: 0.32,
      ease: "power2.in",
      onComplete: function () {
        if (plusesWanted) return;
        document.querySelectorAll(".side-plus").forEach(function (button) { button.classList.remove("is-on"); });
      }
    });
  }

  let coverTurn = null;
  let coverRotation = 0;

  function prepareCover(image) {
    return new Promise(function (resolve) {
      let settled = false;
      const timer = window.setTimeout(function () { finish(false); }, 12000);
      function finish(ok) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        image.removeEventListener("load", loaded);
        image.removeEventListener("error", failed);
        resolve(ok);
      }
      function failed() { finish(false); }
      function loaded() {
        if (!image.naturalWidth) { failed(); return; }
        if (image.decode) image.decode().then(function () { finish(true); }, failed);
        else finish(true);
      }
      image.addEventListener("load", loaded);
      image.addEventListener("error", failed);
      if (image.complete) loaded();
    });
  }

  function revealShown(copy) {
    if (!copy || !copy.isConnected) return false;
    const reveal = copy.querySelector(".opener-reveal");
    if (!reveal) return false;
    return parseFloat(getComputedStyle(reveal).opacity) > 0.35;
  }

  function sweepSource(turn) {
    const sweep = turn.sweep;
    if (sweep && !sweep.finished()) {
      const node = sweep.progress() < 0.5 ? sweep.fromElement() : sweep.toElement();
      if (node && node.isConnected) return node;
    }
    if (revealShown(turn.copy)) return turn.copy;
    if (revealShown(turn.outgoing)) return turn.outgoing;
    const live = document.querySelector(".opener .opener-copy");
    if (revealShown(live)) return live;
    return null;
  }

  function prepareTurnCopy(turn) {
    const fromNode = sweepSource(turn);
    const item = plan.chapters[turn.target];
    const copy = document.createElement("div");
    copy.className = "opener-copy" + (usesInk(item) ? " is-ink" : "");
    copy.innerHTML = '<div class="opener-reveal">' + titleBlock(item) + '</div>';
    const back = document.querySelector("#back").cloneNode(true);
    back.removeAttribute("id");
    back.inert = true;
    back.setAttribute("aria-hidden", "true");
    back.style.transition = "none";
    back.style.pointerEvents = "none";
    turn.copy = copy;
    turn.back = back;
    turn.layer.appendChild(copy);
    turn.layer.appendChild(back);
    // 与真实标题的滚动初始化使用同一变换，避免窄屏亚像素舍入跳动。
    if (!reduced) gsap.set(copy, { xPercent: -50, yPercent: -50, opacity: 1, y: 0 });
    if (!reduced && window.AsciiTitleSweep) {
      turn.sweep = window.AsciiTitleSweep.attach({ overlap: true, from: fromNode, to: copy, direction: turn.direction, duration: 0.78 });
    }
  }

  function drawCoverTurn(turn) {
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const pixels = turn.bounds.map(function (value) { return Math.round(value * width * dpr) / dpr; });
    pixels[0] = 0;
    pixels[pixels.length - 1] = width;
    turn.layer.style.width = width + "px";
    turn.layer.style.height = height + "px";
    if (turn.copy) {
      // 返回按钮仍用末段上浮淡入。标题扫带自己走两秒，不跟这条末段进度。
      let remaining = 0;
      for (let i = 1; i < turn.bounds.length - 1; i += 1) {
        remaining = Math.max(remaining, Math.abs((i <= turn.target ? 0 : 1) - turn.bounds[i]));
      }
      const threshold = 0.5 / (width * dpr);
      const progress = reduced ? 1 : Math.max(0, Math.min(1, (0.12 - remaining) / (0.12 - threshold)));
      const eased = progress * progress * (3 - 2 * progress);
      const reveal = turn.copy.querySelector(".opener-reveal");
      if (turn.back) gsap.set(turn.back, { opacity: eased, y: 18 * (1 - eased) });
      if (!turn.sweep && reveal) gsap.set(reveal, { opacity: eased, y: 18 * (1 - eased) });
    }
    turn.slots.forEach(function (slot, i) {
      slot.node.style.clipPath = "inset(0px " + (width - pixels[i + 1]) + "px 0px " + pixels[i] + "px)";
      if (!slot.ready) return;
      const bitmap = fittedBitmap({ left: 0, top: 0, width: width, height: height }, slot.image.naturalWidth, slot.image.naturalHeight, false);
      // 图片跟随窗口中心，但移动幅度小于裁切边界；铺满时自然回到原构图。
      const windowCenter = (pixels[i] + pixels[i + 1]) / 2;
      const desiredLeft = bitmap.left + (windowCenter - width / 2) * 0.6;
      // 位图左右边缘必须覆盖可见窗口，避免反向和窄条状态下露底。
      const left = Math.max(pixels[i + 1] - slot.image.naturalWidth * bitmap.scale,
        Math.min(pixels[i], desiredLeft));
      Object.assign(slot.image.style, {
        width: slot.image.naturalWidth + "px", height: slot.image.naturalHeight + "px",
        transform: "translate3d(" + left + "px," + bitmap.top + "px,0) scale(" + bitmap.scale + ")"
      });
    });
  }

  function finishCoverTurn(turn) {
    if (coverTurn !== turn) return;
    window.cancelAnimationFrame(turn.raf);
    window.cancelAnimationFrame(turn.dropRaf);
    const sweep = turn.sweep;
    turn.sweep = null;
    const pageReveal = document.querySelector(".opener .opener-reveal");
    if (sweep && !sweep.finished() && pageReveal) {
      sweep.useUnderlay(pageReveal);
      verticalSweep = sweep;
    } else if (sweep) {
      sweep.destroy();
    }
    turn.layer.remove();
    coverTurn = null;
    syncRail();
    busy = false;
    beatsRoot.inert = turn.beatsInert;
    rail.inert = turn.railInert;
    document.querySelector("#back").inert = turn.backInert;
    chapterView.classList.remove("is-turning");
    const dockFocus = document.activeElement && document.activeElement.closest("#dock .dock-card");
    if (turn.started) {
      if (!turn.mounted) mountScroll();
      if (lenis) lenis.start();
      showDock(index);
      if (!sweep || sweep.finished()) {
        const reveal = document.querySelector(".opener .opener-reveal");
        if (reveal) {
          reveal.style.opacity = "1";
          reveal.style.clipPath = "";
        }
      }
      showPluses(0);
      if (dockFocus) document.querySelector('#dock [data-index="' + dockFocus.dataset.index + '"]').focus({ preventScroll: true });
    }
    const focused = document.activeElement;
    if (turn.focus && turn.focus.isConnected && (focused === document.body || focused === turn.focus)) {
      turn.focus.focus({ preventScroll: true });
    }
    followTitle();
    syncDockScroll();
  }

  function cancelCoverTurn(turn) {
    if (coverTurn !== turn) return;
    if (window.AsciiTitleSweep) window.AsciiTitleSweep.cancelAll();
    turn.sweep = null;
    if (index !== turn.origin) {
      rememberCard(turn.origin);
      renderChapter();
      turn.mounted = false;
    }
    updateDockCurrent(turn.origin, true);
    finishCoverTurn(turn);
  }

  function commitCoverTurn(turn) {
    const version = turn.version;
    turn.phase = "committing";
    if (index !== turn.target) {
      rememberCard(turn.target);
      renderChapter();
    }
    // 保留已解码的覆盖图，等待真实封面布局及两次绘制后再撤层。
    const photo = document.querySelector(".opener-photo");
    prepareCover(photo).then(function (ok) {
      if (coverTurn !== turn || version !== turn.version) return;
      if (!ok) {
        const fallback = turn.slots[turn.target].image;
        photo.replaceWith(fallback);
        fallback.removeAttribute("style");
        fallback.className = "opener-photo";
        fallback.alt = chapter().alt;
        turn.slots[turn.target].image = fallback.cloneNode(true);
        turn.slots[turn.target].image.className = "";
        turn.slots[turn.target].node.appendChild(turn.slots[turn.target].image);
        drawCoverTurn(turn);
      }
      mountScroll();
      if (lenis) lenis.stop();
      turn.mounted = true;
      // Paint the settled live title beneath the opaque cover before its removal.
      // An unfinished sweep still owns its clipped rows until useUnderlay().
      if (!turn.sweep || turn.sweep.finished()) {
        document.querySelector(".opener .opener-reveal").style.opacity = "1";
      }
      turn.dropRaf = window.requestAnimationFrame(function () {
        if (coverTurn !== turn || version !== turn.version) return;
        turn.dropRaf = window.requestAnimationFrame(function () {
          if (coverTurn !== turn || version !== turn.version) return;
          finishCoverTurn(turn);
        });
      });
    });
  }

  function scheduleCoverTurn(turn) {
    if (turn.raf || coverTurn !== turn) return;
    turn.raf = window.requestAnimationFrame(function tick(now) {
      turn.raf = 0;
      if (coverTurn !== turn || turn.phase !== "moving") return;
      const alpha = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 1 - Math.exp(-Math.max(0, now - turn.time) / 165);
      turn.time = now;
      let remaining = 0;
      for (let i = 1; i < turn.bounds.length - 1; i += 1) {
        const goal = i <= turn.target ? 0 : 1;
        turn.bounds[i] += (goal - turn.bounds[i]) * alpha;
        remaining = Math.max(remaining, Math.abs(goal - turn.bounds[i]));
      }
      const settled = remaining * document.documentElement.clientWidth * (window.devicePixelRatio || 1) < 0.5;
      if (settled) {
        for (let i = 1; i < turn.bounds.length - 1; i += 1) turn.bounds[i] = i <= turn.target ? 0 : 1;
      }
      drawCoverTurn(turn);
      if (settled) commitCoverTurn(turn);
      else scheduleCoverTurn(turn);
    });
  }

  function switchChapter(nextIndex) {
    interruptReadingDrag();
    if (view !== "chapter" || (busy && !coverTurn)) return;
    if (nextIndex < 0 || nextIndex >= plan.chapters.length) return;
    const previousTarget = coverTurn ? coverTurn.target : index;
    if (nextIndex === previousTarget) return;
    coverRotation += nextIndex > previousTarget ? 90 : -90;
    gsap.to(".side-plus", {
      rotation: coverRotation, duration: reduced ? 0 : 0.85,
      ease: "power3.out", overwrite: "auto"
    });
    if (!coverTurn) {
      const layer = document.createElement("div");
      layer.className = "chapter-turn";
      layer.setAttribute("aria-hidden", "true");
      const turn = {
        origin: index, target: index, version: 0, phase: "preparing", started: false,
        bounds: plan.chapters.map(function (_, i) { return i <= index ? 0 : 1; }).concat(1),
        layer: layer, slots: [], raf: 0, dropRaf: 0, time: performance.now(),
        focus: document.activeElement, beatsInert: beatsRoot.inert, railInert: rail.inert,
        backInert: document.querySelector("#back").inert
      };
      turn.slots = plan.chapters.map(function (item) {
        const node = document.createElement("div");
        const image = document.createElement("img");
        node.className = "chapter-turn-slot";
        image.alt = "";
        image.src = item.image;
        node.appendChild(image);
        layer.appendChild(node);
        const slot = { node: node, image: image, ready: false };
        slot.prepared = prepareCover(image).then(function (ok) { slot.ready = ok; return ok; });
        return slot;
      });
      coverTurn = turn;
      syncRail();
      busy = true;
      rail.inert = true;
      document.querySelector("#back").inert = true;
      chapterView.classList.add("is-turning");
      followTitle();
    }
    const turn = coverTurn;
    turn.direction = nextIndex > previousTarget ? -1 : 1;
    turn.target = nextIndex;
    updateDockCurrent(nextIndex, true);
    turn.version += 1;
    turn.phase = "preparing";
    window.cancelAnimationFrame(turn.raf);
    window.cancelAnimationFrame(turn.dropRaf);
    turn.raf = 0;
    // 旧扫带先留着，新标题栅格化后再换，避免空一拍。
    if (turn.back) { turn.back.remove(); turn.back = null; }
    if (turn.started) gsap.killTweensOf(document.querySelector(".opener-reveal"));
    const version = turn.version;
    if (!turn.started) {
      turn.started = true;
      turn.slots.forEach(function (slot) { slot.node.style.visibility = "hidden"; });
      drawCoverTurn(turn);
      const copy = document.querySelector(".opener-copy").cloneNode(true);
      turn.outgoing = copy;
      turn.layer.appendChild(copy);
      document.body.appendChild(turn.layer);
      // Keep the current frame available to the incoming sweep.
      verticalSweep = null;
      stopScroll();
      gsap.killTweensOf(document.querySelector(".opener-reveal"));
      beatsRoot.inert = true;
      plusRevealTweens.forEach(function (tween) { tween.kill(); });
      gsap.set(".plus-arm-x", { scaleX: 1 });
      gsap.set(".plus-arm-y", { scaleY: 1 });
    }
    gsap.set(document.querySelector(".opener-reveal"), { opacity: 0 });
    const staleCopy = turn.copy;
    const staleOut = turn.outgoing;
    prepareTurnCopy(turn);
    if (turn.sweep) {
      if (staleOut && staleOut !== turn.copy) staleOut.remove();
      if (staleCopy && staleCopy !== turn.copy) staleCopy.remove();
      turn.outgoing = null;
    } else if (staleOut) {
      gsap.to(staleOut, {
        opacity: 0,
        duration: reduced ? 0 : 0.22,
        onComplete: function () { staleOut.remove(); }
      });
      turn.outgoing = null;
    }
    if (!turn.sweep && staleCopy) staleCopy.remove();
    drawCoverTurn(turn);
    Promise.all([turn.slots[turn.origin].prepared, turn.slots[nextIndex].prepared]).then(function (ready) {
      if (coverTurn !== turn || turn.version !== version) return;
      if (!ready[0] || !ready[1]) {
        cancelCoverTurn(turn);
        return;
      }
      turn.slots.forEach(function (slot) { slot.node.style.visibility = slot.ready ? "visible" : "hidden"; });
      turn.phase = "moving";
      turn.time = performance.now();
      scheduleCoverTurn(turn);
    });
  }

  function enterFromCard(cardIndex) {
    if (busy || view !== "home") return;
    const currentCard = document.querySelectorAll(".photo-card")[cardIndex];
    if (!currentCard) return;
    busy = true;
    velocity = 0;
    desired = 0;
    drive = "idle";
    if (reduced) {
      rememberCard(cardIndex);
      openChapter();
      showDock(cardIndex);
      busy = false;
      return;
    }
    const cardRect = currentCard.getBoundingClientRect();
    const image = currentCard.querySelector("img");
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const cardMid = cardRect.left + cardRect.width / 2;
    const onCenter = Math.abs(cardMid - vw / 2) < 30;
    const start = image.getBoundingClientRect();
    // 首页没有滚动条；同步测量章节滚动条占位后立即还原，不改变首页绘制。
    const root = document.documentElement;
    const overflowY = root.style.overflowY;
    root.style.overflowY = "scroll";
    const end = { left: 0, top: 0, width: root.clientWidth, height: root.clientHeight };
    root.style.overflowY = overflowY;
    const flight = !onCenter && image.naturalWidth
      ? expandFromVisible(image, cardRect, end)
      : playExpand(image, start, end, clipInset(cardRect, vw, vh), clipInset({ left: 0, top: 0, right: end.width, bottom: end.height }, vw, vh), {
        from: objectAnchor(image),
        to: { x: 0.5, y: 0.5 }
      });
    const dockFlight = flyDock(cardIndex, false);
    Promise.all([flight, dockFlight]).then(function (results) {
      rememberCard(cardIndex);
      openChapter();
      dropLayer(results[0]).then(function () { busy = false; });
    });
  }

  function enterFromHome() {
    enterFromCard(index);
  }

  async function enterFromNext() {
    if (busy || view !== "chapter" || nextHandoff) return;
    const section = document.querySelector("#next-project");
    if (!section) return;
    busy = true;
    interruptReadingDrag();
    if (lenis) { lenis.reset(); lenis.stop(); }
    suppressNextPluses();
    async function travel(duration, expanding) {
      const state = { progress: 0 };
      const start = window.scrollY;
      const initialProgress = nextProgress;
      await new Promise(function (resolve) {
        nextAuto = gsap.to(state, {
          progress: 1, duration: reduced ? 0 : duration, ease: "power2.inOut",
          onUpdate: function () {
            if (!section.isConnected) return;
            const y = expanding
              ? pageTop(section) + (section.offsetHeight - window.innerHeight) * (initialProgress + (1 - initialProgress) * state.progress)
              : start + (pageTop(section) - start) * state.progress;
            if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
            else window.scrollTo(0, y);
            placeNextWindow();
            syncRail();
          },
          onComplete: resolve,
          onInterrupt: function () { busy = false; resolve(); }
        });
      });
      nextAuto = null;
    }
    if (window.scrollY < pageTop(section)) await travel(0.5, false);
    if (!section.isConnected) return;
    placeNextWindow();
    // 显式进入展开阶段，不依赖滚动坐标在设备像素舍入后是否精确到达居中点。
    await travel(1.5 * (1 - nextProgress), true);
    if (section.isConnected) await finishNext(true);
  }

  function returnToOpener() {
    busy = true;
    if (lenis) lenis.stop();
    hidePluses();
    curtain.hidden = false;
    gsap.set(curtain, { scaleY: 1, opacity: 0, backgroundColor: "#000", pointerEvents: "auto" });
    gsap.to(curtain, {
      opacity: 1, duration: reduced ? 0 : 0.4, ease: "power2.inOut",
      onComplete: function () {
        stopScroll();
        renderChapter();
        mountScroll();
        showDock(index);
        gsap.to(curtain, {
          opacity: 0, duration: reduced ? 0 : 0.55, ease: "power2.out",
          onComplete: function () {
            curtain.hidden = true;
            gsap.set(curtain, { clearProps: "all" });
          }
        });
        revealOpener().then(function () {
          busy = false;
          followTitle();
          syncDockScroll();
        });
      }
    });
  }

  function backHome() {
    interruptReadingDrag();
    if (busy || view !== "chapter") return;
    if (currentScrollY() > 2) {
      returnToOpener();
      return;
    }
    busy = true;
    velocity = 0;
    if (reduced) {
      stopScroll();
      chapterView.hidden = true;
      chapterView.classList.remove("is-ready", "is-open");
      home.hidden = false;
      view = "home";
      saveStartupState("home");
      renderHome();
      hideDock();
      hidePluses();
      progress.style.transform = "scaleY(0)";
      busy = false;
      return;
    }
    hidePluses();
    chapterView.classList.remove("is-ready", "is-open");
    drive = "idle";
    velocity = 0;
    desired = 0;
    homeShown = index;
    homeTarget = index;
    window.setTimeout(function () {
      stopScroll();
      const start = document.querySelector(".opener-photo").getBoundingClientRect();
      chapterView.hidden = true;
      home.hidden = false;
      view = "home";
      saveStartupState("home");
      renderHome();
      const currentCard = document.querySelectorAll(".photo-card")[index];
      const cardRect = currentCard.getBoundingClientRect();
      const cardImage = currentCard.querySelector("img");
      const imageRect = cardImage.getBoundingClientRect();
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const flight = playExpand(cardImage, start, imageRect, clipInset(start, vw, vh), clipInset(cardRect, vw, vh), {
        from: { x: 0.5, y: 0.5 },
        to: objectAnchor(cardImage)
      });
      const dockFlight = flyDock(index, true);
      Promise.all([flight, dockFlight]).then(function (results) {
        dropLayer(results[0]).then(function () { busy = false; });
        progress.style.transform = "scaleY(0)";
      });
    }, 180);
  }

  function curtainTo(nextIndex) {
    if (busy) return;
    busy = true;
    const go = function () {
      stopScroll();
      index = nextIndex;
      renderChapter();
      mountScroll();
      ScrollTrigger.refresh();
    };
    if (reduced) {
      go();
      busy = false;
      return;
    }
    curtain.hidden = false;
    gsap.fromTo(curtain, { scaleY: 0 }, {
      scaleY: 1,
      duration: 0.28,
      ease: "power2.in",
      transformOrigin: "top",
      onComplete: function () {
        go();
        gsap.fromTo(curtain, { scaleY: 1 }, {
          scaleY: 0,
          duration: 0.34,
          ease: "power2.out",
          transformOrigin: "bottom",
          onComplete: function () {
            curtain.hidden = true;
            busy = false;
          }
        });
      }
    });
  }

  document.querySelector("#prev").addEventListener("click", function () {
    switchChapter((coverTurn ? coverTurn.target : index) - 1);
  });
  document.querySelector("#next").addEventListener("click", function () {
    switchChapter((coverTurn ? coverTurn.target : index) + 1);
  });
  // 正文共用真实滚动位置：按住平滑追随累计目标，松手交给 Lenis 单次减速。
  let readingDrag = null;
  let readingThrow = false;
  let readingClick = null;
  const readingControls = "button, a, input, textarea, select, label, summary, [contenteditable], [role='button'], #dock, .rail";

  function interruptReadingDrag() {
    if ((readingThrow || readingDrag) && lenis) lenis.reset();
    readingThrow = false;
    const drag = readingDrag;
    readingDrag = null;
    document.body.classList.remove("is-reading-drag");
    if (drag && beatsRoot.hasPointerCapture(drag.id)) beatsRoot.releasePointerCapture(drag.id);
  }

  window.addEventListener("pointerdown", function (event) {
    interruptReadingDrag();
    readingClick = null;
    if (event.pointerType !== "mouse" || !event.isPrimary || event.button !== 0 ||
        view !== "chapter" || busy || coverTurn || !event.target.closest("#beats .sheet, #next-project") ||
        (event.target.closest(readingControls) && !event.target.closest("#go-next"))) return;
    if (lenis) lenis.reset();
    readingDrag = { id: event.pointerId, x: event.clientX, y: event.clientY,
      target: window.scrollY, lastY: event.clientY, moved: false,
      samples: [{ y: window.scrollY, t: performance.now() }] };
  }, true);

  window.addEventListener("pointermove", function (event) {
    const drag = readingDrag;
    if (!drag || event.pointerId !== drag.id) return;
    if (busy || coverTurn || view !== "chapter") { interruptReadingDrag(); return; }
    if (!drag.moved) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) <= 6) return;
      drag.moved = true;
      beatsRoot.setPointerCapture(drag.id);
      document.body.classList.add("is-reading-drag");
    }
    event.preventDefault();
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const delta = drag.lastY - event.clientY;
    if (delta && drag.direction && Math.sign(delta) !== drag.direction) {
      if (lenis) lenis.reset();
      drag.target = window.scrollY;
      drag.samples = [{ y: drag.target, t: performance.now() }];
    }
    const target = Math.max(0, Math.min(max, drag.target + delta));
    drag.target = target;
    drag.lastY = event.clientY;
    if (lenis) lenis.scrollTo(target, { duration: 0, lerp: 0.22, programmatic: false });
    else window.scrollTo(0, target);
    const now = performance.now();
    const previous = drag.samples[drag.samples.length - 1];
    const direction = Math.sign(target - previous.y);
    // 反向后丢弃旧方向的速度，停住则由释放时的时间窗口自然归零。
    if (direction && drag.direction && direction !== drag.direction) drag.samples = [previous];
    if (direction) drag.direction = direction;
    drag.samples.push({ y: target, t: now });
    drag.samples = drag.samples.filter(function (sample) { return sample.t >= now - 100; });
  }, { passive: false });

  window.addEventListener("pointerup", function (event) {
    const drag = readingDrag;
    if (!drag || event.pointerId !== drag.id) return;
    const now = performance.now();
    if (drag.moved) readingClick = { id: drag.id, until: now + 500 };
    const samples = drag.samples.filter(function (sample) { return sample.t >= now - 100; });
    const first = samples[0];
    const speed = first ? (drag.target - first.y) / Math.max(16, now - first.t) : 0;
    interruptReadingDrag();
    if (!drag.moved || reduced || !lenis || lenis.isStopped || busy || coverTurn ||
        view !== "chapter" || Math.abs(speed) < 0.12) return;
    const velocity = Math.max(-2.4, Math.min(2.4, speed));
    const distance = velocity * 240;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const target = Math.max(0, Math.min(max, window.scrollY + distance));
    readingThrow = true;
    lenis.scrollTo(target, { duration: 0.72, easing: function (t) { return 1 - Math.pow(1 - t, 3); },
      onComplete: function () { readingThrow = false; } });
  });

  window.addEventListener("click", function (event) {
    if (!readingClick || event.detail === 0 || performance.now() > readingClick.until ||
        (event.pointerId !== undefined && event.pointerId !== readingClick.id)) return;
    readingClick = null;
    coverPress = null;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  window.addEventListener("pointercancel", interruptReadingDrag);
  window.addEventListener("blur", function () { interruptReadingDrag(); coverPress = null; readingClick = null; });
  window.addEventListener("wheel", interruptReadingDrag, { capture: true, passive: true });
  window.addEventListener("keydown", interruptReadingDrag, true);
  beatsRoot.addEventListener("dragstart", function (event) {
    if (readingDrag) event.preventDefault();
  });

  let coverPress = null;
  window.addEventListener("pointerdown", function (event) {
    coverPress = event.isPrimary && event.button === 0 && view === "chapter"
      ? { x: event.clientX, y: event.clientY } : null;
  });
  window.addEventListener("pointercancel", function () { coverPress = null; });
  window.addEventListener("click", function (event) {
    const press = coverPress;
    coverPress = null;
    if (!press || event.detail === 0 || view !== "chapter" || (busy && !coverTurn)) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
    if (event.target.closest("button, a, input, textarea, select, [role='button'], #dock, .rail")) return;
    if (!coverTurn && currentScrollY() > 2) return;
    const width = document.documentElement.clientWidth;
    if (event.clientX < 0 || event.clientX >= width) return;
    const direction = event.clientX < width / 2 ? -1 : 1;
    switchChapter((coverTurn ? coverTurn.target : index) + direction);
  });
  home.addEventListener("wheel", onHomeWheel, { passive: false });
  window.addEventListener("wheel", function (event) {
    if (busy) event.preventDefault();
  }, { passive: false });
  window.addEventListener("touchmove", function (event) {
    if (busy) event.preventDefault();
  }, { passive: false });

  let pointerDrag = null;
  home.addEventListener("pointerdown", function (event) {
    if (view !== "home" || event.button !== 0 || busy) return;
    if (event.target.closest(".plus") || event.target.closest(".switcher")) return;
    pointerDrag = { id: event.pointerId, x: event.clientX, origin: homeShown, moved: false, target: event.target, downT: performance.now() };
    drive = "spring";
    desired = 0;
  });
  home.addEventListener("pointermove", function (event) {
    if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
    const dx = event.clientX - pointerDrag.x;
    if (!pointerDrag.moved) {
      if (Math.abs(dx) <= 8) return;
      pointerDrag.moved = true;
      pointerDrag.samples = [{ x: pointerDrag.x, t: pointerDrag.downT }];
      try { home.setPointerCapture(event.pointerId); } catch (error) { /* 指针已经松开时忽略 */ }
      const selection = window.getSelection();
      if (selection) selection.removeAllRanges();
    }
    pointerDrag.samples.push({ x: event.clientX, t: performance.now() });
    pointerDrag.samples = pointerDrag.samples.filter(function (sample) {
      return sample.t >= performance.now() - 120;
    });
    const sample = document.querySelector(".photo-card");
    const span = (sample ? sample.getBoundingClientRect().width : 250) + 36;
    const max = plan.chapters.length - 1;
    const next = Math.max(0, Math.min(max, pointerDrag.origin - dx / span));
    homeTarget = next;
    drive = "spring";
  });
  function endPointerDrag(event) {
    if (!pointerDrag || event.pointerId !== pointerDrag.id) return;
    if (pointerDrag.moved) {
      home.dataset.dragged = "1";
      const sampleCard = document.querySelector(".photo-card");
      const span = (sampleCard ? sampleCard.getBoundingClientRect().width : 250) + 36;
      const samples = pointerDrag.samples || [];
      let speed = 0;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = Math.max(16, last.t - first.t);
        speed = (-(last.x - first.x) / span) * (16.7 / dt);
      }
      velocity = Math.max(-0.055, Math.min(0.055, speed));
      desired = 0;
      homeTarget = homeShown;
      drive = Math.abs(velocity) > 0.002 ? "coast" : "idle";
    } else {
      const hit = pointerDrag.target;
      const card = hit && hit.closest ? hit.closest(".photo-card") : null;
      if (hit && hit.closest && hit.closest("#enter")) enterFromHome();
      else if (card) card.click();
    }
    pointerDrag = null;
  }
  home.addEventListener("pointerup", endPointerDrag);
  home.addEventListener("pointercancel", endPointerDrag);
  home.addEventListener("click", function (event) {
    if (home.dataset.dragged !== "1") return;
    event.preventDefault();
    event.stopPropagation();
    home.dataset.dragged = "";
  }, true);
  document.querySelector("#enter").addEventListener("click", enterFromHome);
  document.querySelector("#back").addEventListener("click", backHome);

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && coverTurn && coverTurn.phase !== "moving") {
      event.preventDefault();
      cancelCoverTurn(coverTurn);
      return;
    }
    const chapterArrow = view === "chapter" && (event.key === "ArrowRight" || event.key === "ArrowLeft");
    if (chapterArrow && (coverTurn || (!busy && currentScrollY() <= 2))) {
      event.preventDefault();
      if (!event.repeat) switchChapter((coverTurn ? coverTurn.target : index) + (event.key === "ArrowRight" ? 1 : -1));
      return;
    }
    if (busy) {
      const chapterButton = event.target.closest && event.target.closest(".side-plus, #dock .dock-card");
      if (coverTurn && (event.key === "Tab" || (chapterButton && (event.key === "Enter" || event.key === " ")))) return;
      event.preventDefault();
      return;
    }
    if (event.key === "ArrowRight" && view === "home") {
      event.preventDefault();
      moveHome(index + 1);
    } else if (event.key === "ArrowLeft" && view === "home") {
      event.preventDefault();
      moveHome(index - 1);
    } else if (view === "chapter" && (event.key === "ArrowDown" || event.key === "PageDown")) {
      event.preventDefault();
      moveSheet(1);
    } else if (view === "chapter" && (event.key === "ArrowUp" || event.key === "PageUp")) {
      event.preventDefault();
      moveSheet(-1);
    } else if (event.key === "Escape" && view === "chapter") {
      backHome();
    } else if (event.key === "Enter" && view === "home" && document.activeElement === document.body) {
      enterFromHome();
    }
  });

  window.addEventListener("resize", function () {
    if (coverTurn && coverTurn.started) drawCoverTurn(coverTurn);
  });
  window.addEventListener("resize", placeNextWindow);
  window.addEventListener("resize", layoutRail);
  window.addEventListener("scroll", function () {
    if (coverTurn && coverTurn.started && window.scrollY !== 0) {
      window.scrollTo(0, 0);
      return;
    }
    placeNextWindow();
    syncRail();
    followTitle();
    syncDockScroll();
  }, { passive: true });
  buildCards();
  buildThumbs();
  buildCount();
  renderHome();
  playStartupIntro();
  window.requestAnimationFrame(glideHome);
})();
