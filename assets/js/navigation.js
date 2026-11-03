'use strict';
// Native details remains usable without JavaScript. No overlay or focus trap.
const featureMenu = document.getElementById('sia-feature-menu');
if (featureMenu) {
  const desktop = window.matchMedia('(min-width: 1000px)');
  const setLayout = () => { featureMenu.open = desktop.matches; };
  setLayout();
  desktop.addEventListener('change', setLayout);
}
const activeModule = document.querySelector('.sia-modules [aria-current]');
if (activeModule) {
  const bar = activeModule.parentElement;
  // Scroll only the module strip; never move the page away from its form.
  bar.scrollLeft = Math.max(0, activeModule.offsetLeft - bar.offsetLeft - 16);
}
