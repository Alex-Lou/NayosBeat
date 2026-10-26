import '@fontsource/press-start-2p/latin.css';
import Phaser from 'phaser';
import { App } from './app/app';
import { Sfx } from './audio/sfx';
import { FightScene } from './render/fight-scene';
import { computeZoom } from './render/pixel-scaling';
import { VIEW_SIZE } from './render/view';

function currentZoom(): number {
  return computeZoom(
    { width: window.innerWidth, height: window.innerHeight },
    VIEW_SIZE,
    window.devicePixelRatio,
  );
}

function uiRoot(): HTMLElement {
  const root = document.getElementById('ui');
  if (!root) throw new Error('Missing #ui element');
  return root;
}

/** Canvas text is rendered once: the pixel font must be loaded before the first fight. */
async function loadFonts(): Promise<void> {
  try {
    await document.fonts.load('8px "Press Start 2P"');
  } catch {
    // The fallback monospace font is used instead; the game stays playable.
  }
}

async function start(): Promise<void> {
  await loadFonts();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW_SIZE.width,
    height: VIEW_SIZE.height,
    pixelArt: true,
    // Centering is done in CSS; Phaser only sizes the canvas.
    scale: { mode: Phaser.Scale.NONE, zoom: currentZoom() },
    // Devices are read by `input/`; Phaser's own listeners would only duplicate the work.
    input: { keyboard: false, mouse: false, touch: false, gamepad: false },
    // The fight scene is started by the menus.
    scene: [],
  });
  game.scene.add('fight', FightScene, false);

  // Also fires on orientation change and browser zoom (devicePixelRatio change).
  const onResize = (): void => {
    game.scale.setZoom(currentZoom());
  };
  window.addEventListener('resize', onResize);
  game.events.once(Phaser.Core.Events.DESTROY, () => {
    window.removeEventListener('resize', onResize);
  });

  const startApp = (): void => {
    new App(uiRoot(), game, new Sfx()).start();
  };
  if (game.isRunning) startApp();
  else game.events.once(Phaser.Core.Events.READY, startApp);
}

void start();
