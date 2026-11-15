(function () {
  var MIN_HEIGHT = 180;
  var MAX_RATIO = 0.8;
  var activePanel = null;
  var startY = 0;
  var startHeight = 0;

  function clampHeight(height) {
    return Math.max(MIN_HEIGHT, Math.min(window.innerHeight * MAX_RATIO, height));
  }

  function setHeight(panel, height) {
    panel.style.maxHeight = clampHeight(height) + 'px';
  }

  function stopResize(event) {
    if (!activePanel) return;
    if (event && activePanel.handle.hasPointerCapture(event.pointerId)) {
      activePanel.handle.releasePointerCapture(event.pointerId);
    }
    activePanel = null;
  }

  function startResize(event, panel, handle) {
    if (window.innerWidth > 767) return;
    activePanel = { panel: panel, handle: handle };
    startY = event.clientY;
    startHeight = panel.getBoundingClientRect().height;
    handle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function moveResize(event) {
    if (!activePanel) return;
    setHeight(activePanel.panel, startHeight + startY - event.clientY);
    event.preventDefault();
  }

  function resizeByKeyboard(event, panel) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    var amount = event.key === 'ArrowUp' ? 48 : -48;
    setHeight(panel, panel.getBoundingClientRect().height + amount);
    event.preventDefault();
  }

  function attach(panel) {
    if (panel.dataset.resizeReady === 'true') return;
    panel.dataset.resizeReady = 'true';

    var handle = document.createElement('div');
    handle.className = 'placard__resize-handle';
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-label', 'Resize information panel');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.tabIndex = 0;
    handle.addEventListener('pointerdown', function (event) {
      startResize(event, panel, handle);
    });
    handle.addEventListener('pointermove', moveResize);
    handle.addEventListener('pointerup', stopResize);
    handle.addEventListener('pointercancel', stopResize);
    handle.addEventListener('keydown', function (event) {
      resizeByKeyboard(event, panel);
    });
    panel.insertBefore(handle, panel.firstChild);
  }

  function scan() {
    if (window.innerWidth <= 767) {
      document.querySelectorAll('.placard[aria-labelledby="story-title"]').forEach(attach);
    }
  }

  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('resize', scan);
  scan();
})();
