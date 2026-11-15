import assert from 'node:assert/strict';
import { createOrbitalMotion } from '../assets/orbital-motion.js';
import { PLANETS } from '../assets/solar-system.js';
import { heliocentricLongitude, moonLongitude, liveClock, ORBIT_SHAPE } from '../assets/ephemeris.js';
import { ellipseRadius } from '../assets/orbital-motion.js';

const deg = r => ((r * 180 / Math.PI) % 360 + 360) % 360;
const diff = (a, b) => Math.abs(((a - b + 180) % 360 + 360) % 360 - 180);

// Earth on 2000-01-01 12:00 UTC sits at 100.4 deg (the Sun is seen at 280.4 deg)
assert.ok(diff(deg(heliocentricLongitude('earth', Date.UTC(2000, 0, 1, 12))), 100.38) < 0.1);
// Mars at J2000 was near 359.4 deg heliocentric longitude
assert.ok(diff(deg(heliocentricLongitude('mars', Date.UTC(2000, 0, 1, 12))), 359.4) < 0.6);

function fixture() {
  const planets = PLANETS.map(p => ({ ...p, position: [...p.position] }));
  const earth = [-6.5, 0, 4.66], mars = [9.6, 0, -7.53], moon = [-5.05, 0.3, 5.21];
  return { planets, earth, mars, moon, motion: createOrbitalMotion(planets, earth, mars, moon, liveClock) };
}
const s = fixture();
const radius = p => Math.hypot(p[0], p[2]);
const radii = [...s.planets.map(p => radius(p.position)), radius(s.earth), radius(s.mars)];
liveClock.setEnabled(true); liveClock.reset();
s.motion.advance(1 / 60, false, 1);

// each body sits at its real angle (scene angle = -longitude) on its own illustrative ellipse
const now = liveClock.date();
const ids = [...s.planets.map(p => p.id), 'earth', 'mars'];
const bodies = [...s.planets.map(p => p.position), s.earth, s.mars];
bodies.forEach((p, k) => {
  const expected = ellipseRadius(radii[k], ORBIT_SHAPE[ids[k]], heliocentricLongitude(ids[k], now));
  assert.ok(Math.abs(radius(p) - expected) < 1e-9, `${ids[k]} on its ellipse`);
  const sceneAngle = deg(Math.atan2(p[2], p[0]));
  assert.ok(diff(sceneAngle, deg(-heliocentricLongitude(ids[k], now))) < 0.01, `${ids[k]} angle`);
});
// the Moon keeps its distance from Earth and points along the real lunar longitude
const rel = s.moon.map((v, k) => v - s.earth[k]);
assert.ok(diff(deg(Math.atan2(rel[2], rel[0])), deg(-moonLongitude(now))) < 0.01, 'moon direction');

// time travel: 1 year per second for one second moves Earth about once around
liveClock.setRate(31557600);
const before = liveClock.date();
for (let i = 0; i < 60; i++) s.motion.advance(1 / 60, false, 1);
const travelled = (liveClock.date() - before) / 86400000;
assert.ok(Math.abs(travelled - 365.25) < 5, `travelled ${travelled} days`);
liveClock.reset();
assert.ok(Math.abs(liveClock.date() - Date.now()) < 50, 'reset returns to now');

// date jump is clamped to the elements' 1800-2050 range
liveClock.jumpTo(Date.UTC(2200, 0, 1));
assert.ok(liveClock.date() <= Date.UTC(2050, 11, 31) + 1000);
liveClock.reset();

// paused (flying / reduced motion) still shows real positions but does not time travel
liveClock.setRate(86400);
const frozen = liveClock.date();
s.motion.advance(1 / 60, true, 1);
assert.ok(Math.abs(liveClock.date() - frozen) < 50);
liveClock.reset();

// switching live off continues smoothly from where the bodies are (no jump)
s.motion.advance(1 / 60, false, 1);
const snap = bodies.map(p => [...p]), moonSnap = [...s.moon];
liveClock.setEnabled(false);
s.motion.advance(1 / 600, false, 1);
bodies.forEach((p, k) => assert.ok(Math.hypot(p[0] - snap[k][0], p[2] - snap[k][2]) < 0.05, `${ids[k]} no jump`));
assert.ok(Math.hypot(...s.moon.map((v, k) => v - moonSnap[k])) < 0.05, 'moon no jump');
liveClock.setEnabled(true);
console.log('Passed: real angles, real ellipses, moon direction, time travel, clamp, paused, live-off continuity.');
