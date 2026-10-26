/** Locks the orientation; missing from TypeScript's DOM types and unsupported on iOS. */
type LockableOrientation = ScreenOrientation & { lock?: (orientation: string) => Promise<void> };

/**
 * Best effort: goes fullscreen and locks landscape where the browser allows it
 * (Android). Must be called from a user gesture. Failures are expected and ignored:
 * the CSS rotate hint covers the other cases.
 */
export function requestLandscapeFullscreen(): void {
  const root = document.documentElement;
  if (document.fullscreenElement || typeof root.requestFullscreen !== 'function') return;

  root
    .requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as LockableOrientation).lock?.('landscape'))
    .catch(() => undefined);
}
