// Compressed animation periods in seconds, for a readable solar-system overview.
// These preserve orbital ordering, but are not a real-time ephemeris.
export const ORBIT_PERIODS = Object.freeze({
  mercury: 40, venus: 70, earth: 100, mars: 130,
  jupiter: 180, saturn: 240, uranus: 300, neptune: 360, moon: 16,
});

export function simulationDelta(delta, speed = 1) {
  if (!Number.isFinite(delta) || delta <= 0 || !Number.isFinite(speed)) return 0;
  // Cap wall-clock time before scaling, so high speeds still work at low FPS.
  return Math.min(delta, 0.1) * speed;
}

export function createOrbitalMotion(planets, earth, mars, moon) {
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
  let elapsed = 0;

  // A circular, inclined orbit centered on Earth, including the initial offset.
  function moonOffset(angle) {
    return offset.map((value, index) => value * Math.cos(angle) + tangent[index] * Math.sin(angle));
  }

  function advance(delta, paused = false, speed = 1) {
    const step = paused ? 0 : simulationDelta(delta, speed);
    if (!step) return;
    elapsed += step;
    for (const orbit of orbits) {
      const angle = orbit.phase - elapsed * Math.PI * 2 / orbit.period;
      orbit.position[0] = Math.cos(angle) * orbit.radius;
      orbit.position[2] = Math.sin(angle) * orbit.radius;
    }
    const relative = moonOffset(-elapsed * Math.PI * 2 / ORBIT_PERIODS.moon);
    for (let axis = 0; axis < 3; axis++) moon[axis] = earth[axis] + relative[axis];
  }

  return { advance, moonOffset };
}
