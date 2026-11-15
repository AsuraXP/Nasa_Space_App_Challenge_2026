import { r as React, j as jsx, a as useFrame, H as Html } from './r3f-BNacQy8Q.js';
import { y as Object3D, s as Color } from './three-CxkaggD8.js';
import { u as useSettings, a as useScene, r as runtime } from './index-BS4g53at.js';
import { u as useQuality } from './Experience-Nj6LORV9.js';

// Illustrative main belt, safely between the existing Mars and Jupiter orbits.
// Three instanced bands keep the draw-call count low on mobile devices.
const bands = [
  { inner: 13.5, outer: 14.1, period: 145, seed: 1801 },
  { inner: 14.1, outer: 14.7, period: 155, seed: 2707 },
  { inner: 14.7, outer: 15.3, period: 165, seed: 3701 },
];
const angles = [0, 0, 0];
const noRaycast = () => null;

function AsteroidBand({ band, index, count, paused }) {
  const mesh = React.useRef(null);
  const group = React.useRef(null);
  React.useLayoutEffect(() => {
    const instances = mesh.current;
    if (!instances) return;
    let seed = band.seed;
    const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
    const transform = new Object3D();
    const color = new Color();
    for (let asteroid = 0; asteroid < count; asteroid++) {
      const angle = random() * Math.PI * 2;
      const radius = band.inner + random() * (band.outer - band.inner);
      const size = 0.025 + Math.pow(random(), 2) * 0.075;
      transform.position.set(Math.cos(angle) * radius, (random() - 0.5) * 0.45, Math.sin(angle) * radius);
      transform.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
      transform.scale.set(size * (0.7 + random() * 0.6), size * (0.5 + random() * 0.6), size);
      transform.updateMatrix();
      instances.setMatrixAt(asteroid, transform.matrix);
      color.setHSL(0.07 + random() * 0.04, 0.08 + random() * 0.16, 0.3 + random() * 0.3);
      instances.setColorAt(asteroid, color);
    }
    instances.instanceMatrix.needsUpdate = true;
    instances.instanceColor.needsUpdate = true;
    instances.computeBoundingSphere();
  }, [band, count]);

  useFrame((_, delta) => {
    if (!paused && !runtime.flying && !useScene.getState().fading) {
      angles[index] = (angles[index] + Math.min(delta, 0.1) * Math.PI * 2 / band.period) % (Math.PI * 2);
    }
    if (group.current) group.current.rotation.y = angles[index];
  });

  return jsx.jsx('group', { ref: group, rotation: [0, angles[index], 0], name: `asteroid-band-${index}`, children:
    jsx.jsxs('instancedMesh', { ref: mesh, args: [undefined, undefined, count], raycast: noRaycast, children: [
      jsx.jsx('dodecahedronGeometry', { args: [1, 0] }),
      jsx.jsx('meshStandardMaterial', { roughness: 1, metalness: 0, flatShading: true }),
    ] }) });
}

export default function AsteroidBelt() {
  const paused = useSettings(state => state.reduceMotion);
  const { tier } = useQuality();
  const count = tier === 'high' ? 600 : tier === 'medium' ? 360 : 180;
  return jsx.jsxs('group', { name: 'main-asteroid-belt', children: [
    ...bands.map((band, index) => jsx.jsx(AsteroidBand, { band, index, count, paused }, `${index}-${count}`)),
    jsx.jsx(Html, { center: true, position: [-11.8, 0.5, 8.5], zIndexRange: [10, 0], style: { pointerEvents: 'none' }, children:
      jsx.jsx('span', { style: { color: '#b7aca0', fontSize: '10px', letterSpacing: '0.16em', whiteSpace: 'nowrap', background: 'rgba(5,7,11,0.7)', padding: '4px 7px', borderRadius: '3px' }, children: 'ASTEROID BELT' }) }),
  ] });
}
