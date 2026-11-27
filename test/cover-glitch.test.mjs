import { test } from 'node:test';
import assert from 'node:assert/strict';
import glitch from '../cover-glitch.js';

function fixture(t) {
  t.mock.timers.enable({apis:['setTimeout','Date'], now:0});
  const starts = [], ends = [];
  const sync = glitch.clock(() => {
    starts.push(Date.now());
    setTimeout(() => ends.push(Date.now()),400);
  });
  return {sync, starts, ends, tick: ms => t.mock.timers.tick(ms)};
}

test('first and repeat start at 4000 ms, not 4000 ms after end', t => {
  const {sync,starts,tick} = fixture(t);
  sync(true); tick(3999); sync(true); assert.deepEqual(starts,[]);
  tick(1); tick(400); tick(3600); assert.deepEqual(starts,[4000,8000]);
});

test('leaving at the boundary cancels, return needs a full interval', t => {
  const {sync,starts,tick} = fixture(t);
  sync(true); tick(3999); sync(false); tick(8000); assert.deepEqual(starts,[]);
  sync(true); tick(3999); assert.deepEqual(starts,[]); tick(1);
  assert.deepEqual(starts,[15999]);
});

test('leaving during a burst does not stop it or start another', t => {
  const {sync,starts,ends,tick} = fixture(t);
  sync(true); tick(4000); tick(100); sync(false); tick(299);
  assert.deepEqual(ends,[]); tick(1); assert.deepEqual(ends,[4400]);
  tick(8000); assert.deepEqual(starts,[4000]);
});

test('burst profiles vary spatially, chromatically, and temporally across runs', () => {
  assert.equal(typeof glitch.createBurstProfile, 'function');
  let state = 1337;
  const rng = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const profiles = Array.from({ length: 24 }, () => glitch.createBurstProfile(rng));
  const sliceCounts = new Set(profiles.map(p => p.slices.length));
  const layouts = new Set(profiles.map(p => p.slices.map(v => v.toFixed(2)).join(',')));
  const channelOrders = new Set(profiles.map(p => p.rgbOrder.join(',')));
  const colorModes = new Set(profiles.map(p => p.colorMode));
  const archetypes = new Set(profiles.map(p => p.archetype));
  const envelopes = new Set(profiles.map(p => p.envelope));
  assert.ok(sliceCounts.size >= 4, `expected varied slice counts, got ${[...sliceCounts]}`);
  assert.ok(layouts.size >= 20, `expected unique slice layouts, got ${layouts.size}`);
  assert.ok(channelOrders.size >= 4, `expected varied RGB channel orders, got ${[...channelOrders]}`);
  assert.ok(colorModes.size >= 4, `expected varied color modes, got ${[...colorModes]}`);
  assert.ok(archetypes.size >= 3, `expected varied spatial archetypes, got ${[...archetypes]}`);
  assert.ok(envelopes.size >= 3, `expected varied envelopes, got ${[...envelopes]}`);
  for (const p of profiles) {
    const sum = p.slices.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-6, `slice weights must sum to 1, got ${sum}`);
    assert.ok(p.duration >= 340 && p.duration <= 460, `duration out of range: ${p.duration}`);
    assert.deepEqual(p.colorMatrix.slice(15, 20), [0, 0, 0, 1, 0], 'color matrix must keep opaque alpha');
    assert.deepEqual(p.blockMatrix.slice(15, 20), [0, 0, 0, 1, 0], 'block matrix must keep opaque alpha');
  }
});
