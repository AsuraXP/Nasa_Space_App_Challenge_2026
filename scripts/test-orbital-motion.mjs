import assert from 'node:assert/strict';
import { createOrbitalMotion, ORBIT_PERIODS, simulationDelta } from '../assets/orbital-motion.js';
import { PLANETS, AXIAL_SPINS } from '../assets/solar-system.js';

function fixture() {
  const planets = PLANETS.map(planet => ({ ...planet, position: [...planet.position] }));
  const earth = [-6.5, 0, 4.66], mars = [9.6, 0, -7.53], moon = [-5.05, 0.3, 5.21];
  return { planets, earth, mars, moon, motion: createOrbitalMotion(planets, earth, mars, moon) };
}
const distance = (a, b = [0, 0, 0]) => Math.hypot(...a.map((value, axis) => value - b[axis]));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const sample = fixture();
const bodies = [...sample.planets.map(planet => planet.position), sample.earth, sample.mars];
const initial = bodies.map(position => [...position]);
const radii = bodies.map(position => distance(position));
const moonRadius = distance(sample.moon, sample.earth);
for (let frame = 0; frame < 1200; frame++) sample.motion.advance(1 / 60);
bodies.forEach((position, index) => {
  close(distance(position), radii[index]);
  assert.ok(distance(position, initial[index]) > 0.1, 'Every planet must revolve');
});
close(distance(sample.moon, sample.earth), moonRadius);
const paused = JSON.stringify([bodies, sample.moon]);
sample.motion.advance(1 / 60, true);
assert.equal(JSON.stringify([bodies, sample.moon]), paused);
const slow = fixture(), fast = fixture();
for (let frame = 0; frame < 300; frame++) slow.motion.advance(1 / 30);
for (let frame = 0; frame < 1200; frame++) fast.motion.advance(1 / 120);
slow.earth.forEach((value, axis) => close(value, fast.earth[axis]));
slow.moon.forEach((value, axis) => close(value, fast.moon[axis]));
const cycle = fixture(), start = cycle.moon.map((value, axis) => value - cycle.earth[axis]);
for (let frame = 0; frame < ORBIT_PERIODS.moon * 60; frame++) cycle.motion.advance(1 / 60);
cycle.moon.forEach((value, axis) => close(value - cycle.earth[axis], start[axis]));
for (const id of [...PLANETS.map(planet => planet.id), 'earth', 'mars', 'moon']) {
  assert.ok(Number.isFinite(AXIAL_SPINS[id]) && AXIAL_SPINS[id] !== 0, `${id} must rotate`);
}
assert.ok(AXIAL_SPINS.venus < 0, 'Venus rotates retrograde');
const reversible = fixture();
const positions = sample => [...sample.planets.map(planet => planet.position), sample.earth, sample.mars, sample.moon];
const original = positions(reversible).map(position => [...position]);
for (let frame = 0; frame < 600; frame++) reversible.motion.advance(1 / 60, false, 2);
for (let frame = 0; frame < 600; frame++) reversible.motion.advance(1 / 60, false, -2);
positions(reversible).forEach((position, index) => position.forEach((value, axis) => close(value, original[index][axis])));
const frozen = JSON.stringify(positions(reversible));
for (const speed of [0, NaN, Infinity]) reversible.motion.advance(1 / 60, false, speed);
reversible.motion.advance(1 / 60, true, -2);
assert.equal(JSON.stringify(positions(reversible)), frozen, 'Zero speed, invalid speed and reduced motion must hold positions');
const normal = fixture(), doubled = fixture();
for (let frame = 0; frame < 1200; frame++) normal.motion.advance(1 / 60);
for (let frame = 0; frame < 600; frame++) doubled.motion.advance(1 / 60, false, 2);
positions(normal).forEach((position, index) => position.forEach((value, axis) => close(value, positions(doubled)[index][axis])));
const reverseSlow = fixture(), reverseFast = fixture();
for (let frame = 0; frame < 300; frame++) reverseSlow.motion.advance(1 / 30, false, -3);
for (let frame = 0; frame < 1200; frame++) reverseFast.motion.advance(1 / 120, false, -3);
positions(reverseSlow).forEach((position, index) => position.forEach((value, axis) => close(value, positions(reverseFast)[index][axis])));
close(simulationDelta(5, -10), -1);
close(simulationDelta(1 / 30, 10), 1 / 3);
assert.equal(simulationDelta(-1, 2), 0);
assert.equal(simulationDelta(NaN, 2), 0);
console.log('Passed: solar and lunar orbits, radii, pause, frame-rate independence, lunar cycle, axial spins, signed speed, reversal, zero speed, invalid input, and capped frame delta.');
