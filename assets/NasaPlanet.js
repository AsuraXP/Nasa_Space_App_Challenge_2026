import { r as React, j as jsx, h as useGLTF, a as useFrame, H as Html } from './r3f-BNacQy8Q.js';
import { at as Box3, c as Vector3 } from './three-CxkaggD8.js';
import { u as useSettings } from './index-BS4g53at.js';
import { AXIAL_SPINS } from './solar-system.js';

function Placeholder({ planet, radius, failed = false }) {
  return jsx.jsxs('group', { children: [
    jsx.jsxs('mesh', { children: [
      jsx.jsx('sphereGeometry', { args: [radius, 32, 24] }),
      jsx.jsx('meshBasicMaterial', { color: planet.color, wireframe: true, transparent: true, opacity: 0.3 }),
    ] }),
    jsx.jsx(Html, { center: true, position: [0, -radius - 0.3, 0], children:
      jsx.jsx('span', { className: 'label', role: 'status', children: failed ? `${planet.name} model unavailable` : `Loading ${planet.name}…` }) }),
  ] });
}

class ModelBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Model({ planet, radius }) {
  const { scene } = useGLTF(planet.model);
  const object = React.useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    // Use the globe's bounds so Saturn keeps its NASA ring geometry and proportions.
    let globe;
    clone.traverse(child => { if (!globe && child.isMesh) globe = child; });
    const bounds = new Box3().setFromObject(globe || clone, true);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = 2 * radius / Math.max(size.x, size.y, size.z, 1e-6);
    clone.scale.multiplyScalar(scale);
    clone.position.addScaledVector(center, -scale);
    return clone;
  }, [scene, radius]);
  return jsx.jsx('primitive', { object, dispose: null });
}

export function NasaPlanet({ planet, radius = planet.radius, position, onSelect, spin = AXIAL_SPINS[planet.id] }) {
  const group = React.useRef(null);
  const reduceMotion = useSettings(state => state.reduceMotion);
  useFrame((_, delta) => { if (group.current && !reduceMotion) group.current.rotation.y += spin * Math.min(delta, 0.1); });
  return jsx.jsx('group', { position, onClick: event => { event.stopPropagation(); onSelect?.(); }, children:
    jsx.jsx('group', { rotation: [0, 0, planet.id === 'saturn' ? 0.47 : planet.id === 'uranus' ? 1.71 : 0], children:
      jsx.jsx('group', { ref: group, children:
        jsx.jsx(ModelBoundary, { fallback: jsx.jsx(Placeholder, { planet, radius, failed: true }), children:
          jsx.jsx(React.Suspense, { fallback: jsx.jsx(Placeholder, { planet, radius }), children: jsx.jsx(Model, { planet, radius }) }) }) }) }) });
}
