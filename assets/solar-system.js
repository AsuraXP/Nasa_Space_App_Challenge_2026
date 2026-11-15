// Display distances and radii are illustrative, not astronomical scale.
const definitions = [
  ['mercury', 'Mercury', 3.4, 2.5, 0.28, 'Rocky planet', '#aaa49a'],
  ['venus', 'Venus', 5.4, -0.5, 0.57, 'Rocky planet', '#dfbc7c'],
  ['jupiter', 'Jupiter', 17, 0.55, 1.35, 'Gas giant', '#caa785'],
  ['saturn', 'Saturn', 23, 2.7, 1.1, 'Gas giant', '#d9c497'],
  ['uranus', 'Uranus', 28, 4.05, 0.8, 'Ice giant', '#9bd4da'],
  ['neptune', 'Neptune', 33, 5.15, 0.78, 'Ice giant', '#5c83d7'],
];
export const PLANETS = definitions.map(([id, name, orbit, angle, radius, kind, color]) => ({
  id, name, orbit, radius, kind, color,
  position: [Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit],
  model: new URL(`./planets/${id}.glb`, import.meta.url).href,
  source: `https://science.nasa.gov/resource/${id}-3d-model/`,
}));
export const PLANET_BY_ID = Object.fromEntries(PLANETS.map(planet => [planet.id, planet]));
export const PLANET_SHOTS = Object.fromEntries(PLANETS.map(({ id }) => [id, {
  position: [0, 2.2, 7.5], target: [0, 0, 0], duration: 1.6,
}]));
export const PLANET_ZOOM = Object.fromEntries(PLANETS.map(({ id }) => [id, [3.2, 12]]));
