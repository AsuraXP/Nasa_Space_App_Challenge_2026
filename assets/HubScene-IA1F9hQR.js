import { r as React, j as jsx, L as Line, u as useThree, a as useFrame } from './r3f-BNacQy8Q.js';
import { s as Color, c as Vector3, aU as QuadraticBezierCurve3 } from './three-CxkaggD8.js';
import { c as useDestinations, a as useScene, d as artifactsAtYear, H as hub, h as probePosition, s as scaleVector, p as probeDirection, u as useSettings, r as runtime } from './index-BS4g53at.js';
import { u as useSceneEntry, B as Beacon } from './useSceneEntry-Dk2Atd0t.js';
import { P as Planet } from './Planet-BHsR4hM3.js';
import { PLANETS, AXIAL_SPINS } from './solar-system.js';
import { NasaPlanet } from './NasaPlanet.js';
import { createOrbitalMotion, orbitPoints } from './orbital-motion.js';
import { liveClock } from './ephemeris.js';
import AsteroidBelt from './AsteroidBelt.js';

const amber = '#f2a541';
// Positions remain shared with destination callbacks, so camera flights follow
// the current location. Keep simulation time across visits to the overview.
const motion = createOrbitalMotion(PLANETS, hub.earth, hub.mars, hub.moon, liveClock);
const positions = Object.fromEntries([
  ...PLANETS.map(planet => [planet.id, planet.position]),
  ['earth', hub.earth], ['mars', hub.mars], ['moon', hub.moon],
]);
const origin = [0, 0, 0];
const orbitPaths = [
  ...PLANETS.map(planet => ({ id: planet.id, points: orbitPoints(planet.id, planet.orbit) })),
  { id: 'earth', points: orbitPoints('earth', Math.hypot(hub.earth[0], hub.earth[2])) },
  { id: 'mars', points: orbitPoints('mars', Math.hypot(hub.mars[0], hub.mars[2])) },
];
const lunarPath = Array.from({ length: 65 }, (_, index) => motion.moonOffset(index / 64 * Math.PI * 2));
function probeTrail(id) {
  const end = new Vector3(...probePosition(id));
  const direction = new Vector3(...probeDirection(id));
  const flat = new Vector3(direction.x, 0, direction.z).normalize();
  const start = flat.clone().applyAxisAngle(new Vector3(0, 1, 0), 1.1).multiplyScalar(hub.earthOrbit);
  const control = flat.clone().multiplyScalar(hub.marsOrbit * 0.9).add(new Vector3(0, direction.y * 2, 0));
  return new QuadraticBezierCurve3(start, control, end).getPoints(48).map(point => point.toArray());
}

export default function HubScene() {
  useSceneEntry('hub');
  const aspect = useThree(state => state.size.width / state.size.height);
  const reduceMotion = useSettings(state => state.reduceMotion);
  const destinations = useDestinations();
  const year = useScene(state => state.year);
  const probes = React.useMemo(() => artifactsAtYear('deep-space', year), [year]);
  const trails = React.useMemo(() => probes.map(probe => ({ id: probe.id, points: probeTrail(probe.id) })), [probes]);
  const bodyRefs = React.useMemo(() => Object.fromEntries(Object.keys(positions).map(id => [id, React.createRef()])), []);
  const lunarOrbit = React.useRef(null);

  React.useEffect(() => {
    const scale = Math.max(1, 1.5 / aspect);
    useScene.getState().flyTo({ position: [0, 34 * scale, 60 * scale], target: origin, duration: 1.2 });
  }, [aspect]);

  useFrame((_, delta) => {
    // Hold still during selection flights so the camera reaches the chosen body.
    const { fading, speed } = useScene.getState();
    motion.advance(delta, reduceMotion || runtime.flying || fading, speed);
    for (const [id, position] of Object.entries(positions)) {
      bodyRefs[id].current?.position.fromArray(position);
    }
    lunarOrbit.current?.position.fromArray(hub.earth);
  });

  const selectOf = id => destinations.find(item => item.id === `hub-${id}`)?.onSelect;

  function beacon(id, height) {
    const destination = destinations.find(item => item.id === `hub-${id}`);
    return destination && jsx.jsx(Beacon, {
      id: destination.id, position: [0, height, 0],
      label: destination.label, sublabel: destination.sublabel,
      size: 0.13, alwaysLabel: true, onSelect: destination.onSelect,
    });
  }

  return jsx.jsxs(jsx.Fragment, { children: [
    jsx.jsx('ambientLight', { intensity: 0.6 }),
    jsx.jsx('directionalLight', { position: [5, 10, 8], intensity: 2.6 }),
    jsx.jsx(AsteroidBelt, {}),
    jsx.jsxs('mesh', { children: [
      jsx.jsx('sphereGeometry', { args: [0.9, 32, 32] }),
      jsx.jsx('meshBasicMaterial', { color: new Color('#ffc46b').multiplyScalar(2.4), toneMapped: false }),
    ] }),
    ...orbitPaths.map(path => jsx.jsx(Line, { points: path.points, color: '#efe6d6', transparent: true, opacity: 0.14, lineWidth: 1 }, `orbit-${path.id}`)),
    jsx.jsx('group', { ref: lunarOrbit, position: hub.earth, children:
      jsx.jsx(Line, { points: lunarPath, color: '#efe6d6', transparent: true, opacity: 0.12, lineWidth: 1 }) }),
    ...PLANETS.map(planet => jsx.jsxs('group', { ref: bodyRefs[planet.id], position: planet.position, children: [
      jsx.jsx(NasaPlanet, { planet, onSelect: () => useScene.getState().travelTo(planet.id, { focus: planet.position }) }),
      beacon(planet.id, planet.radius + 0.25),
    ] }, planet.id)),
    jsx.jsx('group', { ref: bodyRefs.earth, position: hub.earth, children: jsx.jsx(Planet, { kind: 'earth', radius: 0.62, spin: AXIAL_SPINS.earth }) }),
    jsx.jsxs('group', { ref: bodyRefs.moon, position: hub.moon, children: [
      jsx.jsx(Planet, { kind: 'moon', radius: 0.2, spin: AXIAL_SPINS.moon, hoverId: 'hub-moon', onSelect: selectOf('moon') }), beacon('moon', 0.42),
    ] }),
    jsx.jsxs('group', { ref: bodyRefs.mars, position: hub.mars, children: [
      jsx.jsx(Planet, { kind: 'mars', radius: 0.42, spin: AXIAL_SPINS.mars, hoverId: 'hub-mars', onSelect: selectOf('mars') }), beacon('mars', 0.68),
    ] }),
    ...trails.map(trail => jsx.jsx(Line, { points: trail.points, color: amber, transparent: true, opacity: 0.4, lineWidth: 1.2, dashed: true, dashSize: 0.5, gapSize: 0.28 }, trail.id)),
    ...destinations.filter(destination => !destination.id.startsWith('hub-')).map(destination => jsx.jsx(Beacon, {
      id: destination.id, position: destination.position, label: destination.label, sublabel: destination.sublabel,
      size: 0.11, alwaysLabel: true, onSelect: destination.onSelect,
    }, destination.id)),
    ...probes.map(probe => jsx.jsx(Line, {
      points: [probePosition(probe.id), scaleVector(probeDirection(probe.id), new Vector3(...probePosition(probe.id)).length() + 2.2)],
      color: amber, transparent: true, opacity: 0.18, lineWidth: 1,
    }, `${probe.id}-out`)),
  ] });
}
