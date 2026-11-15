import { liveClock, ORBIT_SHAPE } from './ephemeris.js';

// Compressed animation periods in seconds, used when live positions are switched off.
// These preserve orbital ordering, but are not a real-time ephemeris (see ephemeris.js).
export const ORBIT_PERIODS = Object.freeze({
  mercury: 40, venus: 70, earth: 100, mars: 130,
  jupiter: 180, saturn: 240, uranus: 300, neptune: 360, moon: 16,
});

export function simulationDelta(delta, speed = 1) {
  if (!Number.isFinite(delta) || delta <= 0 || !Number.isFinite(speed)) return 0;
  // Cap wall-clock time before scaling, so high speeds still work at low FPS.
  return Math.min(delta, 0.1) * speed;
}

// Real axial rotation periods in seconds. Earth uses the 24 h solar day, so "1 day/s" is exactly
// one turn per second. The others are the sidereal periods (Venus and Uranus are retrograde, which
// the scene already handles with the sign of AXIAL_SPINS and the tilt of the model).
export const ROTATION_PERIODS = Object.freeze({
  mercury: 5067015, venus: 20996798, earth: 86400, moon: 2360592, mars: 88642.66,
  jupiter: 35729.85, saturn: 38361.6, uranus: 62064, neptune: 57996,
});

// How far (radians) a body's globe turns this frame. In the hub with the live clock running faster
// than real time (1 day/s, 1 month/s, 1 year/s) the globe follows the clock: real rotation period,
// so Earth turns once per second at 1 day/s, about 30 times per second at 1 month/s and about 365
// times per second at 1 year/s (at those rates the screen refresh aliases the motion; that is real). Everywhere else it keeps the illustrative spin
// driven by the speed slider. `state` is the scene store state ({ scene, speed }).
export function spinDelta(delta, state, spin, id) {
  if (!Number.isFinite(delta) || delta <= 0) return 0;
  if (state.scene === 'hub' && liveClock.enabled() && spin) {
    const rate = liveClock.getSnapshot().rate;
    const period = ROTATION_PERIODS[id];
    if (period && rate > 1) {
      // same 0.1 s wall-clock cap the live clock uses, so spin and orbits stay in step
      return Math.sign(spin) * Math.PI * 2 * (rate / period) * Math.min(delta, 0.1);
    }
  }
  return spin * simulationDelta(delta, state.speed);
}

// ---- real elliptical orbits -------------------------------------------------------------
// Each orbit is the planet's real ellipse (eccentricity and direction of perihelion from the JPL
// table in ephemeris.js). The scene radius of a body is its semi-major axis, the Sun sits at a
// focus, and bodies speed up near the Sun and slow down far from it (Kepler's second law).
// Longitudes are ecliptic longitudes; the scene angle of a longitude L is -L.
const TWO_PI = Math.PI * 2;
const CIRCLE = Object.freeze({ e: 0, peri: 0 });
const shapeOf = id => ORBIT_SHAPE[id] ?? CIRCLE;

function solveKepler(mean, e) {
  let E = mean + e * Math.sin(mean);
  for (let k = 0; k < 12; k++) E -= (E - e * Math.sin(E) - mean) / (1 - e * Math.cos(E));
  return E;
}
// distance from the Sun at a given longitude
export function ellipseRadius(a, shape, longitude) {
  return a * (1 - shape.e * shape.e) / (1 + shape.e * Math.cos(longitude - shape.peri));
}
function meanAnomalyAt(longitude, shape) {
  const nu = longitude - shape.peri;
  const E = 2 * Math.atan2(Math.sqrt(1 - shape.e) * Math.sin(nu / 2), Math.sqrt(1 + shape.e) * Math.cos(nu / 2));
  return E - shape.e * Math.sin(E);
}
// scene x/z of a point on the ellipse at a longitude
function scenePoint(a, shape, longitude) {
  const r = ellipseRadius(a, shape, longitude);
  return [Math.cos(-longitude) * r, 0, Math.sin(-longitude) * r];
}
// points for drawing the orbit line of body `id` whose semi-major axis in the scene is `a`
export function orbitPoints(id, a, segments = 128) {
  const shape = shapeOf(id);
  return Array.from({ length: segments + 1 }, (_, index) => scenePoint(a, shape, shape.peri + index / segments * TWO_PI));
}

// `live` is optional (see ephemeris.js liveClock). When it is switched on, every body is placed
// at its real angle for the live date, on its own ellipse. Sizes stay the illustrative ones used by the scene.
export function createOrbitalMotion(planets, earth, mars, moon, live) {
  const bodies = [...planets, { id: 'earth', position: earth }, { id: 'mars', position: mars }];
  const orbits = bodies.map(({ id, position }) => {
    const shape = shapeOf(id);
    return {
      position, shape, period: ORBIT_PERIODS[id],
      semiMajor: Math.hypot(position[0], position[2]),
      // where the body starts, as a mean anomaly, so every body keeps its starting direction
      mean0: meanAnomalyAt(-Math.atan2(position[2], position[0]), shape),
    };
  });
  const offset = moon.map((value, index) => value - earth[index]);
  const radius = Math.hypot(...offset);
  const horizontalRadius = Math.hypot(offset[0], offset[2]);
  const tangent = [-offset[2] / horizontalRadius * radius, 0, offset[0] / horizontalRadius * radius];
  const moonPhase0 = Math.atan2(offset[2], offset[0]);
  let elapsed = 0;
  let moonBase = 0;
  let wasLive = false;

  // A circular, inclined orbit centered on Earth, including the initial offset.
  function moonOffset(angle) {
    return offset.map((value, index) => value * Math.cos(angle) + tangent[index] * Math.sin(angle));
  }

  // scene x/z is ecliptic x and -y, so a real longitude L sits at scene angle -L
  function placeLive() {
    const date = live.date();
    for (let k = 0; k < orbits.length; k++) {
      const orbit = orbits[k];
      const point = scenePoint(orbit.semiMajor, orbit.shape, live.longitude(bodies[k].id, date));
      orbit.position[0] = point[0];
      orbit.position[2] = point[2];
    }
    // the tilted orbit is slightly stretched, so solve for the angle that points at the real direction
    const turn = -live.moonLongitude(date) - moonPhase0;
    const relative = moonOffset(Math.atan2(horizontalRadius * Math.sin(turn), radius * Math.cos(turn)));
    for (let axis = 0; axis < 3; axis++) moon[axis] = earth[axis] + relative[axis];
  }

  // leaving live mode: carry on from where the bodies are instead of jumping
  function rebase() {
    for (const orbit of orbits) {
      const longitude = -Math.atan2(orbit.position[2], orbit.position[0]);
      orbit.mean0 = meanAnomalyAt(longitude, orbit.shape) - elapsed * TWO_PI / orbit.period;
    }
    const rx = moon[0] - earth[0], ry = moon[1] - earth[1], rz = moon[2] - earth[2];
    const along = rx * offset[0] + ry * offset[1] + rz * offset[2];
    const across = rx * tangent[0] + rz * tangent[2];
    moonBase = Math.atan2(across, along) + elapsed * Math.PI * 2 / ORBIT_PERIODS.moon;
  }

  function advance(delta, paused = false, speed = 1) {
    if (live && live.enabled()) {
      if (!paused) live.tick(Math.min(delta, 0.1));
      placeLive();
      wasLive = true;
      return;
    }
    if (wasLive) { rebase(); wasLive = false; }
    const step = paused ? 0 : simulationDelta(delta, speed);
    if (!step) return;
    elapsed += step;
    for (const orbit of orbits) {
      const { e, peri } = orbit.shape;
      const raw = orbit.mean0 + elapsed * TWO_PI / orbit.period;
      const mean = ((raw + Math.PI) % TWO_PI + TWO_PI) % TWO_PI - Math.PI;
      const E = solveKepler(mean, e);
      const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
      const r = orbit.semiMajor * (1 - e * Math.cos(E));
      orbit.position[0] = Math.cos(-(peri + nu)) * r;
      orbit.position[2] = Math.sin(-(peri + nu)) * r;
    }
    const relative = moonOffset(moonBase - elapsed * TWO_PI / ORBIT_PERIODS.moon);
    for (let axis = 0; axis < 3; axis++) moon[axis] = earth[axis] + relative[axis];
  }

  return { advance, moonOffset };
}