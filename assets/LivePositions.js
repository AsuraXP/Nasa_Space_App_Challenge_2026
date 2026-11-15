import { r as React, j as jsx } from './r3f-BNacQy8Q.js';
import { liveClock, RATES, FIRST_MS, LAST_MS } from './ephemeris.js';

const text = {
  en: {
    title: 'Live positions', source: 'Angles from NASA/JPL orbital elements. Distances are not to scale.',
    toggle: 'Real positions', now: 'Now', jump: 'Go to date', rate: 'Time rate',
    real: 'Real time', day: '1 day/s', month: '1 month/s', year: '1 year/s',
    live: 'Live', travel: 'Simulated', locale: 'en-GB',
  },
  es: {
    title: 'Posiciones en vivo', source: 'Ángulos de los elementos orbitales de NASA/JPL. Las distancias no están a escala.',
    toggle: 'Posiciones reales', now: 'Ahora', jump: 'Ir a la fecha', rate: 'Ritmo del tiempo',
    real: 'Tiempo real', day: '1 día/s', month: '1 mes/s', year: '1 año/s',
    live: 'En vivo', travel: 'Simulado', locale: 'es-ES',
  },
};
const rateKeys = ['real', 'day', 'month', 'year'];

function format(ms, locale) {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(new Date(ms)) + ' UTC';
}
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

export default function LivePositions({ hidden, es }) {
  const t = es ? text.es : text.en;
  const state = React.useSyncExternalStore(liveClock.subscribe, liveClock.getSnapshot);
  const [now, setNow] = React.useState(() => liveClock.date());
  const [pickerKey, setPickerKey] = React.useState(0);
  const panelRef = React.useRef(null);

  // Publish the panel's height so the hint text under the map can sit above it instead of behind it.
  React.useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const root = document.documentElement.style;
    const publish = () => root.setProperty('--live-panel-height', `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => { observer.disconnect(); root.removeProperty('--live-panel-height'); };
  }, []);

  // the readout follows the live clock (a few times a second is plenty)
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(liveClock.date()), 250);
    return () => window.clearInterval(id);
  }, []);

  const atNow = Math.abs(liveClock.offset()) < 60000 && state.rate === 1;
  return jsx.jsxs('section', {
    ref: panelRef, className: 'live-positions', hidden: Boolean(hidden), 'aria-label': t.title,
    children: [
      jsx.jsxs('div', { className: 'live-positions__head', children: [
        jsx.jsx('span', { className: 'live-positions__title', children: t.title }),
        jsx.jsx('button', {
          type: 'button', className: 'live-positions__switch', 'aria-pressed': state.enabled,
          onClick: () => liveClock.setEnabled(!state.enabled), children: t.toggle,
        }),
      ] }),
      state.enabled && jsx.jsxs(React.Fragment, { children: [
        jsx.jsxs('p', { className: 'live-positions__date', role: 'status', children: [
          jsx.jsx('span', { className: atNow ? 'live-positions__badge is-live' : 'live-positions__badge',
            children: atNow ? t.live : t.travel }),
          ' ', format(now, t.locale),
        ] }),
        jsx.jsx('div', { className: 'live-positions__rates', role: 'group', 'aria-label': t.rate,
          children: rateKeys.map(key => jsx.jsx('button', {
            type: 'button', className: 'live-positions__button',
            'aria-pressed': state.rate === RATES[key],
            onClick: () => liveClock.setRate(RATES[key]), children: t[key],
          }, key)) }),
        jsx.jsxs('div', { className: 'live-positions__row', children: [
          jsx.jsx('button', { type: 'button', className: 'live-positions__button',
            onClick: () => { liveClock.reset(); setPickerKey(k => k + 1); }, children: t.now }),
          jsx.jsxs('label', { className: 'live-positions__jump', children: [
            t.jump,
            jsx.jsx('input', {
              key: pickerKey, type: 'date', min: isoDay(FIRST_MS), max: isoDay(LAST_MS), defaultValue: isoDay(liveClock.date()),
              onChange: event => {
                const ms = Date.parse(event.target.value + 'T12:00:00Z');
                if (Number.isFinite(ms)) liveClock.jumpTo(ms);
              },
            }),
          ] }),
        ] }),
        jsx.jsx('p', { className: 'live-positions__note', children: t.source }),
      ] }),
    ],
  });
}