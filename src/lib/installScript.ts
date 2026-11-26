/** Fired on window whenever the install state changes. */
export const INSTALL_EVENT = "sumcraft-install";

/**
 * Inline script for the root layout. The browser can fire `beforeinstallprompt` before
 * our JavaScript has loaded, so we catch it as early as possible and keep it for later.
 * preventDefault() stops Chrome's own mini-infobar: we ask in our own friendlier way.
 */
export const INSTALL_CAPTURE_SCRIPT = `
window.addEventListener("beforeinstallprompt", function (e) {
  e.preventDefault();
  window.__sumcraftInstallEvent = e;
  window.dispatchEvent(new Event("${INSTALL_EVENT}"));
});
window.addEventListener("appinstalled", function () {
  window.__sumcraftInstallEvent = null;
  window.__sumcraftInstalled = true;
  window.dispatchEvent(new Event("${INSTALL_EVENT}"));
});
`;
