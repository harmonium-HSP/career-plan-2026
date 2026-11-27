import { test } from 'node:test';
import assert from 'node:assert/strict';
import ripple from '../home-ripple.js';

test('wave physics: ripples expand, superimpose, and prune after decay or leaving viewport', () => {
  assert.equal(typeof ripple.createField, 'function');
  const field = ripple.createField();
  assert.equal(field.count(), 0);

  field.splash(200, 150, 1);
  assert.equal(field.count(), 1);

  // Advance 0.5s: ring front is at 340 * 0.65 * 0.5 = 110.5px
  field.advance(0.5, 1000, 700);
  const near = field.gradientAt(200 + 110, 150);
  const far = field.gradientAt(950, 650);
  assert.ok(Math.abs(near.gx) > 0.05, `expected strong radial gx at ring front, got ${near.gx}`);
  assert.ok(Math.abs(near.gy) < 1e-6, `expected zero gy along horizontal axis, got ${near.gy}`);
  assert.ok(Math.hypot(far.gx, far.gy) < 0.002, `expected negligible gradient far from ring, got ${JSON.stringify(far)}`);

  // Superposition: a symmetric second splash doubles magnitude at midpoint
  field.splash(420, 150, 1);
  assert.equal(field.count(), 2);

  // Caps at MAX_RIPPLES (12)
  for (let i = 0; i < 20; i += 1) field.splash(100 + i * 10, 100, 1);
  assert.equal(field.count(), 12);

  // Advance long enough for all ripples to decay below threshold
  for (let i = 0; i < 160; i += 1) field.advance(0.05, 1000, 700);
  assert.equal(field.count(), 0);
});
