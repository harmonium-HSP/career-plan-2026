(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.STARTUP_WALL = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const EDGE_POOL = [
    "assets/firmware-code.png",
    "assets/firmware-log.png",
    "assets/firmware-mindmap.png",
    "assets/screen-repo.png",
    "assets/schematic.png",
    "assets/practice-schematic.png",
    "assets/mcp-readme.png",
    "assets/mcp-repo.png",
    "assets/mcp-tasks.png",
    "assets/grade-strips.png",
    "assets/code.png",
    "assets/policy-crop.jpg",
    "assets/notebook.png",
    "assets/job-crops.jpg"
  ];

  const CENTER_POOL = [
    "assets/self-keyboard.jpg",
    "assets/practice-side.jpg",
    "assets/pcb-macro.png",
    "assets/keyboard-render.png",
    "assets/desk-keys.png",
    "assets/desk-wide.png",
    "assets/lab.jpg"
  ];

  const DROPPED_WALL_ASSETS = [
    "assets/practice-pcb-blue.png",
    "assets/practice-pcb-red.png",
    "assets/pcb-blue.png",
    "assets/pcb-red.png"
  ];

  // 中心格的上、下、左、右。slot = column * 4 + row，中心是第 2 列第 1 行。
  const COVER_NEIGHBOR_SLOTS = [8, 10, 5, 13];
  const CENTER_SLOT = 9;

  const EXCLUDED_WALL_ASSETS = [
    "assets/campus.jpg",
    "assets/sunset.jpg",
    "assets/screen-flow.png"
  ];

  function chapterIndexesExcept(count, active) {
    const neighbors = [];
    for (let i = 0; i < count; i += 1) {
      if (i !== active) neighbors.push(i);
    }
    return neighbors;
  }

  function placementIsComplete(count, active, neighbors) {
    if (!Number.isInteger(active) || active < 0 || active >= count) return false;
    if (!Array.isArray(neighbors) || neighbors.length !== count - 1) return false;
    const seen = new Set([active]);
    for (let i = 0; i < neighbors.length; i += 1) {
      const index = Number(neighbors[i]);
      if (!Number.isInteger(index) || index < 0 || index >= count || seen.has(index)) return false;
      seen.add(index);
    }
    return seen.size === count;
  }

  function resolveCoverPlacement(count, activeIndex, previous) {
    const total = Number(count) || 0;
    const active = Math.max(0, Math.min(total - 1, Number(activeIndex) || 0));
    const fallback = { active: active, neighbors: chapterIndexesExcept(total, active) };
    if (!previous || !placementIsComplete(total, Number(previous.active), previous.neighbors)) return fallback;
    const prevActive = Number(previous.active);
    if (prevActive === active) return { active: active, neighbors: previous.neighbors.slice() };
    const slot = previous.neighbors.indexOf(active);
    if (slot === -1) return fallback;
    const neighbors = previous.neighbors.slice();
    neighbors[slot] = prevActive;
    return { active: active, neighbors: neighbors };
  }

  function takeUnused(pool, used, reserved, needed) {
    const picked = [];
    for (let i = 0; i < pool.length && picked.length < needed; i += 1) {
      const src = pool[i];
      if (!reserved.has(src) && !used.has(src)) {
        used.add(src);
        picked.push(src);
      }
    }
    return picked;
  }

  function buildWallPhotos(plan, startupTarget, placement) {
    if (!plan || !Array.isArray(plan.chapters) || !plan.chapters.length) {
      throw new Error("Invalid plan for startup wall");
    }
    const targetIndex = Math.max(0, Math.min(plan.chapters.length - 1, Number(startupTarget) || 0));
    const resolved = placement
      ? resolveCoverPlacement(plan.chapters.length, placement.active == null ? targetIndex : placement.active, placement)
      : resolveCoverPlacement(plan.chapters.length, targetIndex, null);
    const reserved = new Set(
      (plan.close && plan.close.image ? [plan.close.image] : []).concat(EXCLUDED_WALL_ASSETS, DROPPED_WALL_ASSETS)
    );

    const photos = new Array(20);
    photos[CENTER_SLOT] = plan.chapters[resolved.active].image;
    COVER_NEIGHBOR_SLOTS.forEach(function (slot, i) {
      photos[slot] = plan.chapters[resolved.neighbors[i]].image;
    });

    const used = new Set(photos.filter(Boolean));
    const edgeImages = takeUnused(EDGE_POOL, used, reserved, 8);
    const centerImages = takeUnused(CENTER_POOL, used, reserved, 7);
    if (edgeImages.length !== 8 || centerImages.length !== 7) {
      throw new Error("Insufficient unique assets for startup wall: edge=" + edgeImages.length + ", center=" + centerImages.length);
    }

    for (let row = 0; row < 4; row += 1) {
      photos[row] = edgeImages[row];
      photos[16 + row] = edgeImages[4 + row];
    }
    let ci = 0;
    for (let col = 1; col <= 3; col += 1) {
      for (let row = 0; row < 4; row += 1) {
        const slotIndex = col * 4 + row;
        if (!photos[slotIndex]) photos[slotIndex] = centerImages[ci++];
      }
    }

    const uniqueCheck = new Set(photos);
    if (uniqueCheck.size !== 20) {
      throw new Error("Startup wall slots must be 20 unique images");
    }
    return photos;
  }

  function computeWallLayout(vw, vh) {
    const w = vw * 0.228;
    const gapX = vw * 0.02;
    const spanX = w + gapX;
    const centerH = w * vh / vw;
    const cardH = w * 0.54;
    const gapY = w * 0.14;

    // 镜像对齐参数（第 0/4 列镜像、第 1/3 列镜像）
    const directions = [1, -1, 1, -1, 1];
    const yShift = [-vh * 0.055, vh * 0.045, 0, vh * 0.045, -vh * 0.055];
    const heightFactors = [1.08, 1.02, 1.0, 1.02, 1.08];
    const gapFactors = [1.06, 0.94, 1.0, 0.94, 1.06];

    const columns = [];
    const slots = [];
    const centerTop = (vh - centerH) / 2;

    for (let columnIndex = 0; columnIndex < 5; columnIndex += 1) {
      const left = vw / 2 + (columnIndex - 2) * spanX - w / 2;
      columns.push({
        columnIndex: columnIndex,
        left: left,
        width: w,
        direction: directions[columnIndex]
      });

      const height = columnIndex === 2 ? cardH : cardH * heightFactors[columnIndex];
      const columnGap = gapY * gapFactors[columnIndex];

      for (let row = 0; row < 4; row += 1) {
        const slotIndex = columnIndex * 4 + row;
        const isCenter = columnIndex === 2 && row === 1;
        const slotHeight = isCenter ? centerH : height;
        let top;
        if (columnIndex === 2) {
          if (row === 0) top = centerTop - columnGap - cardH;
          else if (row === 1) top = centerTop;
          else if (row === 2) top = centerTop + centerH + columnGap;
          else top = centerTop + centerH + columnGap * 2 + cardH;
        } else {
          top = (vh - (height * 4 + columnGap * 3)) / 2 + row * (height + columnGap) + yShift[columnIndex];
        }
        slots.push({
          slotIndex: slotIndex,
          column: columnIndex,
          row: row,
          isCenter: isCenter,
          top: top,
          width: w,
          height: slotHeight
        });
      }
    }

    return {
      vw: vw,
      vh: vh,
      w: w,
      gapX: gapX,
      spanX: spanX,
      centerH: centerH,
      cardH: cardH,
      gapY: gapY,
      columns: columns,
      slots: slots
    };
  }

  return {
    EDGE_POOL: EDGE_POOL,
    CENTER_POOL: CENTER_POOL,
    EXCLUDED_WALL_ASSETS: EXCLUDED_WALL_ASSETS,
    DROPPED_WALL_ASSETS: DROPPED_WALL_ASSETS,
    COVER_NEIGHBOR_SLOTS: COVER_NEIGHBOR_SLOTS,
    CENTER_SLOT: CENTER_SLOT,
    resolveCoverPlacement: resolveCoverPlacement,
    buildWallPhotos: buildWallPhotos,
    computeWallLayout: computeWallLayout
  };
});
