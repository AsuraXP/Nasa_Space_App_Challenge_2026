import { r as React } from './r3f-BNacQy8Q.js';
import { a as useScene } from './index-BS4g53at.js';

// Whether the always-on name labels (planets, Moon, Mars, probes, asteroid belt) are shown.
// When they are off, a label still appears for the body the pointer is over.
// The choice is remembered on this device. Change DEFAULT_VISIBLE to start with labels hidden.
const DEFAULT_VISIBLE = true;
const KEY = 'left-behind:labels';
const listeners = new Set();
let visible = DEFAULT_VISIBLE;
try {
  const saved = window.localStorage.getItem(KEY);
  if (saved === 'shown') visible = true;
  if (saved === 'hidden') visible = false;
} catch { /* storage can be blocked; keep the default */ }

let hoveredBody = null;
const emit = () => listeners.forEach(listener => listener());
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };

export const labelVisibility = {
  get: () => visible,
  set(next) {
    visible = Boolean(next);
    try { window.localStorage.setItem(KEY, visible ? 'shown' : 'hidden'); } catch { /* ignore */ }
    emit();
  },
  toggle() { labelVisibility.set(!visible); },
};

export function useLabelsVisible() {
  return React.useSyncExternalStore(subscribe, labelVisibility.get, labelVisibility.get);
}

// Hovering the planet itself (not only its small glowing beacon) shows that body's label.
// `id` is the beacon id of the body, for example "hub-mars".
export function bodyHoverEnter(id) {
  if (hoveredBody !== id) { hoveredBody = id; emit(); }
  document.body.style.cursor = 'pointer';
}
export function bodyHoverLeave(id) {
  if (hoveredBody === id) { hoveredBody = null; emit(); }
  // wait a tick: the pointer may have just moved onto the beacon of the same body
  window.setTimeout(() => {
    if (hoveredBody === null && !useScene.getState().hoveredId) document.body.style.cursor = '';
  }, 0);
}
export function useBodyHovered(id) {
  return React.useSyncExternalStore(subscribe, () => hoveredBody === id, () => false);
}
