import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const startupWall = require("../startup-wall.js");

const contentCode = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(contentCode, context);
const plan = context.window.PLAN;

const forbiddenWallImages = new Set([
  plan.close.image,
  "assets/campus.jpg",
  "assets/sunset.jpg",
  "assets/screen-flow.png",
  ...startupWall.DROPPED_WALL_ASSETS
]);

const neighborSlots = startupWall.COVER_NEIGHBOR_SLOTS;

// 1. Each chapter opens with its cover in the center and the other covers on the four neighbors.
for (let target = 0; target < plan.chapters.length; target += 1) {
  const photos = startupWall.buildWallPhotos(plan, target);
  const others = plan.chapters.map((chapter) => chapter.image).filter((_, index) => index !== target);
  assert.equal(photos.length, 20, `target ${target} must have 20 slots`);
  assert.equal(new Set(photos).size, 20, `target ${target} must have 20 unique photos`);
  assert.equal(photos[9], plan.chapters[target].image, `target ${target} center slot 9 must match chapter cover`);
  neighborSlots.forEach((slot, index) => {
    assert.equal(photos[slot], others[index], `target ${target} neighbor ${slot} must follow chapter order`);
  });

  photos.forEach((src, slotIdx) => {
    const filePath = path.resolve("assets", src.replace(/^assets\//, ""));
    assert.ok(fs.existsSync(filePath), `asset must exist: ${src}`);
    assert.ok(!forbiddenWallImages.has(src), `slot ${slotIdx} (${src}) must not be a dropped or excluded asset`);
    const isCoverSlot = slotIdx === 9 || neighborSlots.includes(slotIdx);
    if (!isCoverSlot) {
      assert.ok(!plan.chapters.some((chapter) => chapter.image === src), `slot ${slotIdx} must not repeat a chapter cover`);
    }
  });
}

// 1b. Refresh keeps the other covers still and exchanges the old center with the new one.
const swapped = startupWall.resolveCoverPlacement(plan.chapters.length, 3, {
  active: 0,
  neighbors: [1, 2, 3, 4]
});
assert.deepEqual(swapped, { active: 3, neighbors: [1, 2, 0, 4] });
const swappedPhotos = startupWall.buildWallPhotos(plan, 3, swapped);
assert.equal(swappedPhotos[9], plan.chapters[3].image);
assert.equal(swappedPhotos[neighborSlots[2]], plan.chapters[0].image);
assert.equal(swappedPhotos[neighborSlots[0]], plan.chapters[1].image);
assert.equal(swappedPhotos[neighborSlots[1]], plan.chapters[2].image);
assert.equal(swappedPhotos[neighborSlots[3]], plan.chapters[4].image);

const kept = startupWall.resolveCoverPlacement(plan.chapters.length, 1, {
  active: 1,
  neighbors: [4, 0, 2, 3]
});
assert.deepEqual(kept.neighbors, [4, 0, 2, 3]);
const invalid = startupWall.resolveCoverPlacement(plan.chapters.length, 2, {
  active: 9,
  neighbors: [0, 1, 2, 3]
});
assert.deepEqual(invalid.neighbors, [0, 1, 3, 4]);

// 2. Desktop (1440x900) and mobile (599x850) layout geometry checks
for (const [vw, vh] of [[1440, 900], [599, 850]]) {
  const layout = startupWall.computeWallLayout(vw, vh);
  assert.equal(layout.columns.length, 5);
  assert.equal(layout.slots.length, 20);

  // Col 0 and Col 4 half-exposed, no horizontal overlap between adjacent columns
  const col0 = layout.columns[0];
  const col1 = layout.columns[1];
  const col2 = layout.columns[2];
  const col3 = layout.columns[3];
  const col4 = layout.columns[4];

  assert.ok(col0.left < 0 && col0.left + col0.width > 0, `col 0 should be half-exposed on ${vw}x${vh}`);
  assert.ok(col4.left < vw && col4.left + col4.width > vw, `col 4 should be half-exposed on ${vw}x${vh}`);
  assert.ok(col1.left > 0 && col3.left + col3.width < vw, `cols 1..3 should be fully inside viewport on ${vw}x${vh}`);

  for (let i = 0; i < 4; i += 1) {
    const gap = layout.columns[i + 1].left - (layout.columns[i].left + layout.columns[i].width);
    assert.ok(gap > 0, `column ${i} and ${i + 1} must not overlap on ${vw}x${vh} (gap=${gap})`);
  }

  // Mirror symmetry check: col 0 <-> col 4, col 1 <-> col 3
  assert.ok(Math.abs((col0.left + col0.width / 2) + (col4.left + col4.width / 2) - vw) < 0.01);
  assert.ok(Math.abs((col1.left + col1.width / 2) + (col3.left + col3.width / 2) - vw) < 0.01);

  const centerSlot = layout.slots.find((s) => s.isCenter);
  assert.ok(centerSlot, "center slot must exist");
  assert.ok(Math.abs(centerSlot.width / centerSlot.height - vw / vh) < 1e-6, "center slot must match viewport aspect ratio");
  assert.ok(Math.abs((col2.left + col2.width / 2) - vw / 2) < 1e-6, "col 2 must be centered horizontally");
  assert.ok(Math.abs((centerSlot.top + centerSlot.height / 2) - vh / 2) < 1e-6, "center slot must be centered vertically");
}

console.log("startup-wall tests ok");
