/** `lock` is typed as always present, but iOS Safari does not implement it. */
type LockableOrientation = Omit<ScreenOrientation, 'lock'> & {
  lock?: (orientation: 'landscape') => Promise<void>;
};

/** A touch can turn the game landscape here (Android); elsewhere, only turning the phone can. */
export function canTurnLandscape(): boolean {
  return (
    typeof document.documentElement.requestFullscreen === 'function' &&
    typeof (screen.orientation as LockableOrientation | undefined)?.lock === 'function'
  );
}

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
