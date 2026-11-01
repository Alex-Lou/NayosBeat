import '@fontsource/press-start-2p/latin.css';
import '@fontsource/bangers/latin-400.css';
import './styles.css';
import Phaser from 'phaser';
import { App } from './app/app';
import { viewingFromUrl } from './app/viewing';
import { watchInstallPrompt } from './app/install';
import { registerServiceWorker } from './app/service-worker';
import { Sfx } from './audio/sfx';
import { isTouchDevice } from './input/touch-controls';
import { FightScene } from './render/fight-scene';
import { canTurnLandscape, requestLandscapeFullscreen } from './render/fullscreen';
import { computeZoom, uiScaleFor, type Size } from './render/pixel-scaling';
import { rendererChoice } from './render/lean-context';
import { renderModeOf } from './render/render-mode';
import { renderScaleFor, renderSizeOf } from './render/view';

/**
 * The area the game can fill: its container (the visible viewport minus notches, see
 * styles.css), never more than the visible viewport (the browser's bars may cover the rest).
 */
function viewport(): Size {
  const area = document.getElementById('game')?.getBoundingClientRect();
  const visible = window.visualViewport;
  return {
    width: Math.min(area?.width || window.innerWidth, visible?.width ?? window.innerWidth),
    height: Math.min(area?.height || window.innerHeight, visible?.height ?? window.innerHeight),
  };
}

/** The canvas resolution is chosen once, for the screen the game starts on. */
const RENDER_SIZE = renderSizeOf(
  renderScaleFor(viewport(), window.devicePixelRatio, isTouchDevice()),
);

function currentZoom(): number {
  return computeZoom(viewport(), RENDER_SIZE, window.devicePixelRatio);
}

/** The menus grow with the screen (styles.css, `.menu-panel`), by whole steps. */
function scaleMenus(): void {
  document.getElementById('ui')?.style.setProperty('--ui-scale', String(uiScaleFor(viewport())));
}

/** Set once the game has started: the service worker may only reload it on the menus. */
let app: App | undefined;

function uiRoot(): HTMLElement {
  const root = document.getElementById('ui');
  if (!root) throw new Error('Missing #ui element');
  return root;
}

/** A font that never arrives (a stalled network) must not hold the game back longer than this. */
const FONT_WAIT_MS = 3000;

/**
 * Canvas text is rendered once: the fonts must be loaded before the first fight (the pixel
 * font of the HUD, the comic lettering of the blows' words).
 */
async function loadFonts(): Promise<void> {
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('8px "Press Start 2P"'),
        document.fonts.load('16px Bangers'),
      ]),
      new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS)),
    ]);
  } catch {
    // Fallback fonts are used instead; the game stays playable.
  }
}

async function start(): Promise<void> {
  await loadFonts();

  // WebGL on the lean context (render/lean-context.ts), else on Phaser's own; Canvas without
  // WebGL, drawn simplified then (render/render-mode.ts), as `?rendu=canvas` asks.
  const renderer = rendererChoice(window.location.search, () => document.createElement('canvas'));
  const game = new Phaser.Game({
    type: renderer.type,
    ...('context' in renderer && {
      canvas: renderer.canvas,
      // Phaser's types know only a 2D context here; its Config.js takes a WebGL one too.
      context: renderer.context as unknown as CanvasRenderingContext2D,
    }),
    parent: 'game',
    width: RENDER_SIZE.width,
    height: RENDER_SIZE.height,
    // Pixel art kept crisp at any zoom, even fractional (the fight camera closes in smoothly).
    // The multisampling it turns on applies only to Phaser's own context, not to the lean one.
    // One texture per draw call, a workaround for Phaser 4.2: its shader picks a batched quad's
    // texture by testing its interpolated texture index with `==`. A rasterizer that does not
    // interpolate that constant exactly (SwiftShader, headless Chromium's software GL, for any
    // index but 0, 1, 2, 4, 8...) matches no texture there and cuts holes in the quad: the comic
    // words, last in a crowded batch, came out torn. A fight frame takes 20 draw calls on average
    // (25 at most), a Finisher's 37 to 50 (72 at most), instead of 12 (14 at most) in a fight.
    render: { smoothPixelArt: true, maxTextures: 1 },
    // The raw frame time: the fixed timesteps of the fight already bound the catch-up. Phaser's
    // smoothing clamps it to 60 Hz for 120 frames after every resume, which would run the game
    // at half speed on a 30 Hz screen.
    fps: { smoothStep: false },
    // Centering is done in CSS; Phaser only sizes the canvas.
    scale: { mode: Phaser.Scale.NONE, zoom: currentZoom() },
    // Devices are read by `input/`; Phaser's own listeners would only duplicate the work.
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    // Every sound is Sfx's (audio/sfx.ts), on its own AudioContext: Phaser's sound manager, unused,
    // would open a second one for nothing.
    audio: { noAudio: true },
    // The fight scene is started by the menus.
    scene: [],
  });
  game.scene.add('fight', FightScene, false);

  // Also fires on orientation change and browser zoom (devicePixelRatio change).
  const onResize = (): void => {
    game.scale.setZoom(currentZoom());
    scaleMenus();
  };
  scaleMenus();
  window.addEventListener('resize', onResize);
  // The browser's bars showing or hiding resize only the visible viewport.
  window.visualViewport?.addEventListener('resize', onResize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', onResize);
    window.visualViewport?.removeEventListener('resize', onResize);
  });

  const startApp = (): void => {
    try {
      // `?vitesse=2`, `?anim=avant`: to watch the animation in any mode (src/app/viewing.ts).
      // The renderer is known once the game has booted: its mode is read here, once.
      // Its sound woken by any press or touch, in a fight too, and back on screen (P15).
      const sfx = new Sfx();
      sfx.listenTo(window, document);
      const started = new App(
        uiRoot(),
        game,
        sfx,
        renderModeOf(game.renderer),
        viewingFromUrl(window.location.search),
      );
      started.start();
      app = started;
    } catch (error) {
      // Outside start()'s promise: shown here, on the boot screen still up.
      showStartupError(error);
      return;
    }
    // The title screen is up: the boot screen (index.html, public/boot.js) is no longer needed.
    document.getElementById('boot')?.remove();
  };
  // Phaser announces READY just before it starts its loop: the app starts right after, so it
  // can put the loop to sleep on the menus (otherwise the canvas redraws behind them for good).
  game.events.once(Phaser.Core.Events.READY, () => {
    queueMicrotask(startApp);
  });
}

/** A failure at startup must not leave a silent blank page: the boot screen tells it. */
function showStartupError(error: unknown): void {
  console.error(error);
  const status = document.getElementById('boot-status');
  if (status) {
    // The cause on screen: an installed app has no console to read it from.
    const cause = error instanceof Error ? error.message : String(error);
    status.textContent = `Le jeu n'a pas pu démarrer sur ce navigateur (${cause}). Essaie de le réparer, ou un navigateur récent.`;
  }
  const repair = document.getElementById('boot-repair');
  if (repair) repair.hidden = false;
}

/**
 * The installed game opens in the phone's orientation (its manifest forces none: the app must
 * open from a portrait home screen without a rotation at launch). In portrait, touching the
 * hint turns it landscape where the browser can, even with auto-rotate off.
 */
function watchRotateHint(): void {
  const hint = document.querySelector('.rotate-hint');
  if (!hint || !canTurnLandscape()) return;
  hint.textContent = "Touche l'écran ou tourne ton téléphone pour jouer en paysage";
  hint.addEventListener('click', requestLandscapeFullscreen);
}

start().catch(showStartupError);
watchInstallPrompt();
watchRotateHint();

// The installed game (PWA) plays offline; the service worker exists only in production builds.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker(() => app?.isIdle() ?? true);
  });
}
