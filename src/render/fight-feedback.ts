import type Phaser from 'phaser';
import type { Sfx } from '../audio/sfx';
import { BURSTS, Effects } from './effects';
import { HEAVY_HIT_DAMAGE, type FightEvent } from './fight-events';

/** The final blow plays in slow motion for a moment (display only: the simulation is intact). */
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SLOW_MOTION_SCALE = 0.35;

/** Turns fight events into what the player sees and hears: sparks, shake, flash, sounds. */
export class FightFeedback {
  private readonly effects: Effects;
  private slowMotionFrames = 0;

  constructor(
    scene: Phaser.Scene,
    groundY: number,
    private readonly sfx: Sfx,
  ) {
    this.effects = new Effects(scene, groundY);
  }

  react(event: FightEvent): void {
    const { effects, sfx } = this;
    switch (event.type) {
      case 'hit': {
        const heavy = event.damage >= HEAVY_HIT_DAMAGE;
        effects.burst(event.x, event.y, heavy ? BURSTS.heavyHit : BURSTS.lightHit);
        if (heavy) effects.shake(8, 2);
        sfx.play(heavy ? 'heavyHit' : 'lightHit');
        break;
      }
      case 'block':
        effects.burst(event.x, event.y, BURSTS.block);
        sfx.play('block');
        break;
      case 'ko':
        effects.burst(event.x, event.y, BURSTS.ko);
        effects.shake(24, 3);
        effects.flash(12);
        this.slowMotionFrames = KO_SLOW_MOTION_FRAMES;
        sfx.play('ko');
        break;
      case 'attack':
        sfx.play(event.heavy ? 'heavySwing' : 'swing');
        break;
      case 'projectile':
        sfx.play('projectile');
        break;
      case 'jump':
        sfx.play('jump');
        break;
      case 'land':
        sfx.play('land');
        break;
      case 'phase':
        if (event.phase === 'intro') sfx.play('round');
        if (event.phase === 'fight') sfx.play('fight');
        break;
    }
  }

  /** How fast game time runs this display frame (slower right after a KO). Call once per frame. */
  timeScale(): number {
    if (this.slowMotionFrames === 0) return 1;
    this.slowMotionFrames -= 1;
    return KO_SLOW_MOTION_SCALE;
  }

  /** Advances visual effects by one display frame. */
  update(): void {
    this.effects.update();
  }

  get shakeX(): number {
    return this.effects.shakeX;
  }

  get shakeY(): number {
    return this.effects.shakeY;
  }
}
