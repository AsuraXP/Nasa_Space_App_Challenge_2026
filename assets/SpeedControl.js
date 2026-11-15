import { r as React, j as jsx } from './r3f-BNacQy8Q.js';
import { a as useScene, u as useSettings } from './index-BS4g53at.js';
import LivePositions from './LivePositions.js';
import { liveClock } from './ephemeris.js';
import { labelVisibility, useLabelsVisible } from './label-visibility.js';

export default function SpeedControl() {
  const scene = useScene(state => state.scene);
  const selectedId = useScene(state => state.selectedId);
  const speed = useScene(state => state.speed);
  const setSpeed = useScene(state => state.setSpeed);
  const locale = useSettings(state => state.locale);
  const reduceMotion = useSettings(state => state.reduceMotion);
  const labelsOn = useLabelsVisible();
  const previousSpeed = React.useRef(1);
  const live = React.useSyncExternalStore(liveClock.subscribe, liveClock.getSnapshot);
  // In the hub, "Real positions" drives the planets, so the speed controls are locked while it is on.
  const locked = scene === 'hub' && live.enabled;
  React.useEffect(() => {
    if (speed !== 0) previousSpeed.current = speed;
  }, [speed]);
  const es = locale === 'es';
  const label = es ? 'Velocidad' : 'Speed';
  const paused = speed === 0;
  const lockHint = es ? 'Desactiva «Posiciones reales» en el panel de posiciones en vivo para usar estos controles.'
    : 'Turn off “Real positions” in the Live panel to use these controls.';
  const status = locked ? lockHint
    : reduceMotion ? (es ? 'Movimiento reducido activado' : 'Reduced motion is on')
    : paused ? (es ? 'En pausa' : 'Paused')
    : speed < 0 ? (es ? 'Retroceso' : 'Reverse') : (es ? 'Avance' : 'Forward');
  const formatted = `${speed > 0 ? '+' : ''}${speed}×`;
  if (scene === 'intro') return null;
  const progress = (speed + 10) / 20;
  const speedPanel = jsx.jsxs('section', {
    className: 'simulation-speed', hidden: Boolean(selectedId), 'aria-label': label,
    'data-reduced-motion': reduceMotion ? 'true' : 'false', 'data-locked': locked ? 'true' : 'false',
    children: [
      jsx.jsx('label', { htmlFor: 'simulation-speed', className: 'simulation-speed__label', children: label }),
      jsx.jsx('output', { htmlFor: 'simulation-speed', className: 'simulation-speed__value', children: formatted }),
      jsx.jsxs('div', { className: 'simulation-speed__lockzone', title: locked ? lockHint : undefined, children: [
      locked && jsx.jsx('span', { className: 'simulation-speed__hint', 'aria-hidden': true, children: lockHint }),
      jsx.jsxs('div', { className: 'simulation-speed__buttons', children: [
        jsx.jsx('button', { type: 'button', className: 'simulation-speed__button', disabled: locked,
          onClick: () => setSpeed(-Math.abs(speed || previousSpeed.current)),
          'aria-label': es ? 'Retroceder' : 'Reverse motion', 'aria-pressed': speed < 0,
          children: jsx.jsx('span', { 'aria-hidden': true, children: '◀◀' }) }),
        jsx.jsx('button', { type: 'button', className: 'simulation-speed__button simulation-speed__pause', disabled: locked,
          onClick: () => setSpeed(paused ? previousSpeed.current : 0),
          'aria-label': paused ? (es ? 'Reanudar movimiento' : 'Resume motion') : (es ? 'Pausar movimiento' : 'Pause motion'),
          children: jsx.jsx('span', { 'aria-hidden': true, children: paused ? '▶' : 'Ⅱ' }) }),
        jsx.jsx('button', { type: 'button', className: 'simulation-speed__button', disabled: locked,
          onClick: () => setSpeed(Math.abs(speed || previousSpeed.current)),
          'aria-label': es ? 'Avanzar' : 'Forward motion', 'aria-pressed': speed > 0,
          children: jsx.jsx('span', { 'aria-hidden': true, children: '▶▶' }) }),
      ] }),
      jsx.jsxs('div', { className: 'simulation-speed__slider',
        style: { '--thumb-offset': `${4 * progress * (1 - progress) * 24 - 24}px` }, children: [
          jsx.jsx('svg', { className: 'simulation-speed__arc', viewBox: '0 0 1000 24', preserveAspectRatio: 'none', 'aria-hidden': true, children:
            jsx.jsx('path', { d: 'M 0 0 Q 500 48 1000 0', fill: 'none', stroke: 'currentColor', strokeWidth: 2, vectorEffect: 'non-scaling-stroke' }) }),
          jsx.jsx('span', { className: 'simulation-speed__zero', 'aria-hidden': true }),
          jsx.jsx('input', { id: 'simulation-speed', type: 'range', min: -10, max: 10, step: 0.25, value: speed, disabled: locked,
            'aria-describedby': 'simulation-speed-help', 'aria-valuetext': `${formatted}, ${status}`,
            onChange: event => setSpeed(event.target.valueAsNumber),
          }),
        ] }),
      jsx.jsxs('div', { className: 'simulation-speed__ticks', 'aria-hidden': true, children: [
        jsx.jsx('span', { children: '−10×' }), jsx.jsx('span', { children: '0' }), jsx.jsx('span', { children: '+10×' }),
      ] }),
      ] }),
      jsx.jsx('p', { className: 'simulation-speed__status', role: 'status', children: status }),
      jsx.jsx('p', { id: 'simulation-speed-help', className: 'sr-only',
        children: es ? 'Velocidad negativa para retroceder, cero para pausar y positiva para avanzar.' : 'Negative speed reverses, zero pauses, and positive speed moves forward.' }),
    ],
  });
  // Labels only exist in the overview and the deep-space view.
  const labelToggle = (scene === 'hub' || scene === 'deep-space') && jsx.jsx('button', {
    type: 'button', className: 'btn label-toggle', hidden: Boolean(selectedId),
    'aria-pressed': labelsOn, onClick: () => labelVisibility.toggle(),
    title: es ? 'Con las etiquetas ocultas, pasa el cursor sobre un cuerpo para ver su nombre.'
      : 'With labels off, hover a planet or probe to see its name.',
    children: `${es ? 'Etiquetas' : 'Labels'}: ${labelsOn ? (es ? 'Sí' : 'On') : (es ? 'No' : 'Off')}`,
  });
  return jsx.jsxs(jsx.Fragment, { children: [
    speedPanel,
    labelToggle,
    jsx.jsx(LivePositions, { hidden: Boolean(selectedId) || scene !== 'hub', es }),
  ] });
}