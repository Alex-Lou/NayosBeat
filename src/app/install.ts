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

/** Keeps the browser's install prompt for later instead of letting it show its own banner. */
export function watchInstallPrompt(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = undefined;
  });
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
