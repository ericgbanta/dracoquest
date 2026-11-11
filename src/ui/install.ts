/** Home Screen install helpers. */

/** True when the game was opened from a Home Screen icon. */
export function isStandalone(): boolean {
  try {
    const nav = navigator as Navigator & { standalone?: boolean };
    return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

/** iPhone and iPad, including iPads that report a desktop Mac. Only used to word the install tip. */
export function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/**
 * Ask the browser to keep this site's storage instead of clearing it under pressure.
 * Installed apps usually get it without a prompt. Failure is fine: Export still works.
 */
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.();
  } catch {
    /* not supported */
  }
}
