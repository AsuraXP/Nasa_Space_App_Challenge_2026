// Real planet positions from NASA/JPL's published "Approximate Positions of the Planets"
// (E.M. Standish, JPL Solar System Dynamics, valid 1800-2050): Keplerian elements at J2000
// plus a rate per Julian century. Everything is computed here in the browser, so it needs
// no network and works for any date. Accuracy is a few arcminutes for the planets.
//   [a AU, e, I deg, L deg, long.perihelion deg, long.node deg]  then their rates per century
const ELEMENTS = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
            [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
            [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
            [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
            [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
            [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
            [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
            [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
            [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
};

const RAD = Math.PI / 180;
const wrap180 = degrees => ((degrees + 180) % 360 + 360) % 360 - 180;

function centuries(ms) {
  const julianDay = ms / 86400000 + 2440587.5;
  return (julianDay - 2451545.0) / 36525;
}

// heliocentric position in the ecliptic plane, in AU (x toward the vernal equinox)
export function heliocentric(id, ms) {
  const table = ELEMENTS[id];
  if (!table) return null;
  const T = centuries(ms);
  const [a, e, I, L, peri, node] = table[0].map((value, k) => value + table[1][k] * T);
  const M = wrap180(L - peri) * RAD;
  let E = M + e * Math.sin(M);
  for (let k = 0; k < 12; k++) {
    E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const w = (peri - node) * RAD, N = node * RAD, i = I * RAD;
  const cw = Math.cos(w), sw = Math.sin(w), cN = Math.cos(N), sN = Math.sin(N), ci = Math.cos(i), si = Math.sin(i);
  return [
    (cw * cN - sw * sN * ci) * xp + (-sw * cN - cw * sN * ci) * yp,
    (cw * sN + sw * cN * ci) * xp + (-sw * sN + cw * cN * ci) * yp,
    (sw * si) * xp + (cw * si) * yp,
  ];
}

// heliocentric ecliptic longitude in radians, counter-clockwise seen from ecliptic north
export function heliocentricLongitude(id, ms) {
  const p = heliocentric(id, ms);
  return p ? Math.atan2(p[1], p[0]) : 0;
}

// geocentric ecliptic longitude of the Moon in radians (main terms of Meeus ch. 47, ~0.3 deg)
export function moonLongitude(ms) {
  const T = centuries(ms);
  const Lm = 218.3164477 + 481267.88123421 * T;
  const D = (297.8501921 + 445267.1114034 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const Mm = (134.9633964 + 477198.8675055 * T) * RAD;
  const F = (93.2720950 + 483202.0175233 * T) * RAD;
  const degrees = Lm
    + 6.288774 * Math.sin(Mm) + 1.274027 * Math.sin(2 * D - Mm) + 0.658314 * Math.sin(2 * D)
    + 0.213618 * Math.sin(2 * Mm) - 0.185116 * Math.sin(M) - 0.114332 * Math.sin(2 * F)
    + 0.058793 * Math.sin(2 * D - 2 * Mm) + 0.057066 * Math.sin(2 * D - M - Mm)
    + 0.053322 * Math.sin(2 * D + Mm) + 0.045758 * Math.sin(2 * D - M)
    - 0.040923 * Math.sin(M - Mm) - 0.034720 * Math.sin(D) - 0.030383 * Math.sin(M + Mm);
  // Meeus gives longitude of date; the planet elements above are J2000, so remove precession
  return ((degrees - 1.3969713 * T) % 360) * RAD;
}

// ---- the live clock the 3D scene follows ----------------------------------------------
// date = real clock + offset. rate is simulated time per real time (1 = real time).
export const RATES = Object.freeze({ real: 1, day: 86400, month: 2629800, year: 31557600 });
export const FIRST_MS = Date.UTC(1800, 0, 1);
export const LAST_MS = Date.UTC(2050, 11, 31);

let snapshot = { enabled: true, rate: 1 };
let offsetMs = 0;
const listeners = new Set();
function publish(next) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach(listener => listener());
}

export const liveClock = {
  subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot() { return snapshot; },
  enabled() { return snapshot.enabled; },
  date() { return Date.now() + offsetMs; },
  offset() { return offsetMs; },
  // seconds of real time that passed; moves the date faster than the real clock when rate > 1
  tick(seconds) {
    if (snapshot.rate !== 1 && seconds > 0) {
      offsetMs += seconds * 1000 * (snapshot.rate - 1);
      const now = Date.now();
      offsetMs = Math.min(LAST_MS - now, Math.max(FIRST_MS - now, offsetMs));
    }
  },
  setEnabled(enabled) { publish({ enabled: Boolean(enabled) }); },
  setRate(rate) { publish({ rate }); },
  reset() { offsetMs = 0; publish({ rate: 1 }); },
  jumpTo(ms) {
    if (!Number.isFinite(ms)) return;
    offsetMs = Math.min(LAST_MS, Math.max(FIRST_MS, ms)) - Date.now();
    publish({ rate: 1 });
  },
  longitude: heliocentricLongitude,
  moonLongitude,
};
