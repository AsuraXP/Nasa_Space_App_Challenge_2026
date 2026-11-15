import assert from 'node:assert/strict';
import { createOrbitalMotion, ORBIT_PERIODS, simulationDelta, orbitPoints, ellipseRadius } from '../assets/orbital-motion.js';
import { ORBIT_SHAPE } from '../assets/ephemeris.js';
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
const ids = [...sample.planets.map(planet => planet.id), 'earth', 'mars'];
for (let frame = 0; frame < 1200; frame++) sample.motion.advance(1 / 60);
bodies.forEach((position, index) => {
  // real ellipse: the distance stays between perihelion and aphelion of the scene's semi-major axis
  const { e } = ORBIT_SHAPE[ids[index]];
  const r = distance(position);
  assert.ok(r >= radii[index] * (1 - e) - 1e-9 && r <= radii[index] * (1 + e) + 1e-9, `${ids[index]} stays on its ellipse`);
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
reversible.motion.advance(1e-9); // first step puts every body on its ellipse
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
// Real ellipses: Mercury swings between perihelion and aphelion, is fastest at perihelion, and
// returns to the same place after one period.
{
  const mercury = fixture(), at = () => mercury.planets.find(planet => planet.id === 'mercury').position;
  const a = distance(at()), { e } = ORBIT_SHAPE.mercury;
  let min = Infinity, max = 0, fastest = 0, fastestR = 0, slowest = Infinity, slowestR = 0, last = null;
  mercury.motion.advance(1e-9);
  const first = [...at()];
  const frames = ORBIT_PERIODS.mercury * 600;
  for (let frame = 0; frame < frames; frame++) {
    mercury.motion.advance(1 / 600);
    const p = at(), r = distance(p);
    min = Math.min(min, r); max = Math.max(max, r);
    if (last) {
      const turn = Math.abs(Math.atan2(p[0] * last[2] - p[2] * last[0], p[0] * last[0] + p[2] * last[2]));
      if (turn > fastest) { fastest = turn; fastestR = r; }
      if (turn < slowest) { slowest = turn; slowestR = r; }
    }
    last = [...p];
  }
  assert.ok(Math.abs(min - a * (1 - e)) < 0.01, `Mercury perihelion ${min}`);
  assert.ok(Math.abs(max - a * (1 + e)) < 0.01, `Mercury aphelion ${max}`);
  assert.ok(fastestR < slowestR, 'Mercury moves fastest close to the Sun');
  at().forEach((value, axis) => assert.ok(Math.abs(value - first[axis]) < 1e-3, 'One period returns Mercury to its start'));
  // the drawn orbit line matches the formula and is a closed ellipse with the Sun at a focus
  const line = orbitPoints('mercury', a);
  assert.ok(Math.abs(Math.hypot(line[0][0], line[0][2]) - a * (1 - e)) < 1e-9, 'line starts at perihelion');
  line.forEach(point => {
    const longitude = -Math.atan2(point[2], point[0]);
    assert.ok(Math.abs(Math.hypot(point[0], point[2]) - ellipseRadius(a, ORBIT_SHAPE.mercury, longitude)) < 1e-9);
  });
  assert.ok(Math.hypot(line[0][0] - line[128][0], line[0][2] - line[128][2]) < 1e-9, 'line is closed');
  const mid = line.reduce((m, p) => [m[0] + p[0] / line.length, m[1] + p[2] / line.length], [0, 0]);
  assert.ok(Math.hypot(...mid) > 0.05, 'Sun is not at the centre of the ellipse');
}
console.log('Passed: solar and lunar orbits, real ellipses, radii, pause, frame-rate independence, lunar cycle, axial spins, signed speed, reversal, zero speed, invalid input, and capped frame delta.');
