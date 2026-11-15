// Keep the hit area still while the canvas and its highlight tilt together.
const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

export function rippleExplorerCard(event) {
  if (reducedMotion.matches || document.documentElement.dataset.motion === 'reduced') return;
  const surface = event.currentTarget;
  // Native offsets are local to the canvas, even while its parent is tilted.
  const x = event.nativeEvent.offsetX;
  const y = event.nativeEvent.offsetY;
  const size = 2 * Math.hypot(
    Math.max(x, surface.clientWidth - x),
    Math.max(y, surface.clientHeight - y),
  );
  const ripple = document.createElement('span');
  ripple.className = 'explorer-card-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  Object.assign(ripple.style, {
    left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`,
  });
  surface.appendChild(ripple);
  const animation = ripple.animate([
    { transform: 'translate(-50%, -50%) scale(0)', opacity: 0.65 },
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 0 },
  ], { duration: 850, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  animation.finished.then(() => ripple.remove(), () => ripple.remove());
}

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
