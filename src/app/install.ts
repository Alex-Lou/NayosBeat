/**
 * Installing the game (PWA): fullscreen, landscape, offline, no browser bar. Chrome and Edge
 * offer an install prompt, kept here until the player picks "Installer le jeu"; iPhones and
 * iPads install from Safari's share menu, which can only be explained.
 */

/** `beforeinstallprompt` (Chromium only, not in the DOM typings). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ readonly outcome: 'accepted' | 'dismissed' }>;
}

let installPrompt: InstallPromptEvent | undefined;
const listeners = new Set<() => void>();

/**
 * Keeps the browser's install prompt for the menu. The browser may still offer its own banner
 * too (the prompt is not held back): the player can install either way.
 */
export function watchInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    installPrompt = event as InstallPromptEvent;
    for (const listener of listeners) listener();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = undefined;
    for (const listener of listeners) listener();
  });
}

/** Calls `listener` whenever installing becomes possible, or done. */
export function onInstallChange(listener: () => void): void {
  listeners.add(listener);
}

/** How this browser can install the game, if it is not installed yet. */
export function installMethod(): 'prompt' | 'safari' | undefined {
  if (isInstalled()) return undefined;
  if (installPrompt) return 'prompt';
  const apple = /iPhone|iPad|iPod/.test(navigator.userAgent) || isIpadOs();
  return apple ? 'safari' : undefined;
}

/** Shows the browser's install prompt; resolves once the player has answered. */
export async function promptInstall(): Promise<void> {
  const prompt = installPrompt;
  if (!prompt) return;
  // A prompt can be shown only once.
  installPrompt = undefined;
  await prompt.prompt();
  await prompt.userChoice;
}

function isInstalled(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return (
    standalone ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/** iPadOS presents itself as a Mac, but with touch. */
function isIpadOs(): boolean {
  return /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
}
