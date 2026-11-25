import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const code = fs.readFileSync(new URL("../bend-math.js", import.meta.url), "utf8");
const context = { window: {} };
vm.runInNewContext(code, context);
const math = context.window.BendMath;

assert.equal(math.CONFIG.direction, "in");
assert.equal(math.CONFIG.angle, 80);
assert.equal(math.CONFIG.zone, 240);
assert.equal(math.CONFIG.rounding, 150);
assert.equal(math.CONFIG.perspective, 700);
assert.equal(math.CONFIG.fade, 0.2);
assert.equal(math.CONFIG.blur, 0.3);
assert.equal(math.CONFIG.momentum, 0.35);
assert.equal(math.CONFIG.ease, 240);
assert.equal(math.CONFIG.smoothing, 0.1);
assert.equal(math.CONFIG.tilt, 0);
assert.equal(math.CONFIG.tumble, 0);

assert.equal(math.ramp(0, 240), 0);
assert.equal(math.ramp(240, 240), 1);
assert.equal(math.ramp(-20, 240), 0);
assert.equal(math.ramp(480, 240), 1);
assert.equal(math.ramp(120, 240), 0.5);

function same(actual, expected) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected));
}

const flat = math.foldAmounts(400, 2000, 240, false);
same(flat, { top: 0, bottom: 0 });
const short = math.foldAmounts(0, 1, 240, true);
same(short, { top: 0, bottom: 0 });
same(math.foldAmounts(0, 2000, 240, true), { top: 0, bottom: 1 });
same(math.foldAmounts(2000, 2000, 240, true), { top: 1, bottom: 0 });
same(math.foldAmounts(1000, 2000, 240, true), { top: 1, bottom: 1 });

const hidden = math.frameForRect({ top: 1000, bottom: 3000, height: 2000 }, 900, 240);
assert.equal(hidden.visible, false);
assert.equal(hidden.top, 0);
assert.equal(hidden.bottom, 0);

const peek = math.frameForRect({ top: 700, bottom: 2700, height: 2000 }, 900, 240);
assert.equal(peek.visible, true);
assert.equal(peek.destY, 700);
assert.equal(peek.sourceY, 0);
assert.equal(peek.sourceH, 200);
assert.equal(peek.top, 0);
assert.equal(peek.bottom, 1);

const middle = math.frameForRect({ top: -1000, bottom: 1000, height: 2000 }, 900, 240);
assert.equal(middle.destY, 0);
assert.equal(middle.sourceY, 1000);
assert.equal(middle.sourceH, 900);
assert.equal(middle.top, 1);
assert.ok(middle.bottom > 0 && middle.bottom < 1);

const end = math.frameForRect({ top: -1500, bottom: 500, height: 2000 }, 900, 240);
assert.equal(end.sourceY, 1500);
assert.equal(end.sourceH, 500);
assert.equal(end.bottom, 0);
assert.equal(end.top, 1);

assert.equal(math.bendGoal(1, 0, 0.35), 1);
assert.ok(Math.abs(math.bendGoal(1, 2500, 0.35) - 1.21) < 1e-9);
assert.equal(math.bendGoal(1, 2500, 0), 1);

const step = math.settleFold({ value: 0, velocity: 0 }, 1, 0.05, 0.1);
assert.ok(step.value > 0 && step.value < 1.2);
const snapped = math.settleFold({ value: 1, velocity: 0 }, 1, 0.05, 0.1);
same(snapped, { value: 1, velocity: 0 });
const instant = math.settleFold({ value: 0, velocity: 4 }, 1, 0.05, 0);
same(instant, { value: 1, velocity: 0 });

assert.equal(math.CONFIG.coverScale, 0.82);
const shrinking = math.bendPose({
  viewport: 1000,
  scroll: 0,
  openerTop: 0,
  openerHeight: 1800,
  openerRectTop: 0,
  openerRectBottom: 1800,
  nextHeight: 0,
  pptZone: 240,
  coverScale: 0.82
});
assert.equal(shrinking.flatten, true);
assert.ok(Math.abs(shrinking.zone - 90) < 1e-6);

const shrunk = math.bendPose({
  viewport: 1000,
  scroll: 800,
  openerTop: 0,
  openerHeight: 1800,
  openerRectTop: -800,
  openerRectBottom: 1000,
  nextHeight: 0,
  pptZone: 240,
  coverScale: 0.82
});
assert.equal(shrunk.flatten, false);
assert.ok(Math.abs(shrunk.zone - 90) < 1e-6);

const papers = math.bendPose({
  viewport: 1000,
  scroll: 2000,
  openerTop: 0,
  openerHeight: 1800,
  openerRectTop: -2000,
  openerRectBottom: -200,
  nextHeight: 0,
  pptZone: 240,
  coverScale: 0.82
});
assert.equal(papers.flatten, false);
assert.equal(papers.zone, 240);

const enlarging = math.bendPose({
  viewport: 1000,
  scroll: 3000,
  openerTop: 0,
  openerHeight: 1800,
  openerRectTop: -3000,
  openerRectBottom: -1200,
  nextTop: 2600,
  nextHeight: 2000,
  nextRectTop: 0,
  nextRectBottom: 1000,
  pptZone: 240,
  coverScale: 0.82
});
assert.equal(enlarging.enlarging, true);
assert.equal(enlarging.flatten, true);

const fullscreen = math.bendPose({
  viewport: 1000,
  scroll: 0,
  openerTop: 0,
  openerHeight: 1800,
  openerRectTop: 0,
  openerRectBottom: 1000,
  nextHeight: 0,
  expanding: true,
  pptZone: 240,
  coverScale: 0.82
});
assert.equal(fullscreen.flatten, true);

console.log("bend math ok");
