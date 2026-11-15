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

// `live` is optional (see ephemeris.js liveClock). When it is switched on, every body is placed
// at its real angle for the live date. Distances stay the illustrative ones used by the scene.
export function createOrbitalMotion(planets, earth, mars, moon, live) {
  const bodies = [...planets, { id: 'earth', position: earth }, { id: 'mars', position: mars }];
  const orbits = bodies.map(({ id, position }) => ({
    position, period: ORBIT_PERIODS[id],
    radius: Math.hypot(position[0], position[2]),
    phase: Math.atan2(position[2], position[0]),
  }));
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
      const angle = -live.longitude(bodies[k].id, date);
      orbits[k].position[0] = Math.cos(angle) * orbits[k].radius;
      orbits[k].position[2] = Math.sin(angle) * orbits[k].radius;
    }
    // the tilted orbit is slightly stretched, so solve for the angle that points at the real direction
    const turn = -live.moonLongitude(date) - moonPhase0;
    const relative = moonOffset(Math.atan2(horizontalRadius * Math.sin(turn), radius * Math.cos(turn)));
    for (let axis = 0; axis < 3; axis++) moon[axis] = earth[axis] + relative[axis];
  }

  // leaving live mode: carry on from where the bodies are instead of jumping
  function rebase() {
    for (const orbit of orbits) {
      orbit.phase = Math.atan2(orbit.position[2], orbit.position[0]) + elapsed * Math.PI * 2 / orbit.period;
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
      const angle = orbit.phase - elapsed * Math.PI * 2 / orbit.period;
      orbit.position[0] = Math.cos(angle) * orbit.radius;
      orbit.position[2] = Math.sin(angle) * orbit.radius;
    }
    const relative = moonOffset(moonBase - elapsed * Math.PI * 2 / ORBIT_PERIODS.moon);
    for (let axis = 0; axis < 3; axis++) moon[axis] = earth[axis] + relative[axis];
  }

  return { advance, moonOffset };
}
