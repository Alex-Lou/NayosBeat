import Phaser from 'phaser';
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
  scene: [FightScene],
});

// Also fires on orientation change and browser zoom (devicePixelRatio change).
const onResize = (): void => {
  game.scale.setZoom(currentZoom());
};
window.addEventListener('resize', onResize);
game.events.once(Phaser.Core.Events.DESTROY, () => {
  window.removeEventListener('resize', onResize);
});
