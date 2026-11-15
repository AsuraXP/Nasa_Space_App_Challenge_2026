// Keep the hit area still while the canvas and its highlight tilt together.
const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function resetExplorerCard(event) {
  const card = event.currentTarget;
  card.removeAttribute('data-tilting');
  card.style.removeProperty('--card-rotate-x');
  card.style.removeProperty('--card-rotate-y');
}

export function tiltExplorerCard(event) {
  if (event.pointerType === 'touch' || !hoverPointer.matches || reducedMotion.matches ||
      document.documentElement.dataset.motion === 'reduced') {
    resetExplorerCard(event);
    return;
  }

  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
  const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
  card.style.setProperty('--card-rotate-x', `${(0.5 - y) * 12}deg`);
  card.style.setProperty('--card-rotate-y', `${(x - 0.5) * 12}deg`);
  card.style.setProperty('--card-light-x', `${x * 100}%`);
  card.style.setProperty('--card-light-y', `${y * 100}%`);
  card.setAttribute('data-tilting', '');
}
