import { j as jsx } from './r3f-BNacQy8Q.js';
import { a as useScene } from './index-BS4g53at.js';
import { u as useSceneEntry } from './useSceneEntry-Dk2Atd0t.js';
import { PLANET_BY_ID } from './solar-system.js';
import { NasaPlanet } from './NasaPlanet.js';

export default function PlanetScene() {
  const body = useScene(state => state.scene);
  useSceneEntry(body);
  const planet = PLANET_BY_ID[body];
  if (!planet) return null;
  return jsx.jsxs(jsx.Fragment, { children: [
    jsx.jsx('ambientLight', { intensity: 0.6 }),
    jsx.jsx('directionalLight', { position: [5, 3, 5], intensity: 2.6 }),
    jsx.jsx(NasaPlanet, { planet, radius: body === 'saturn' ? 1.05 : 1.5 }),
  ] });
}
