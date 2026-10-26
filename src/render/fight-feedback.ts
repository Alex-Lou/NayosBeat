import type Phaser from 'phaser';
import type { Sfx } from '../audio/sfx';
import { BLEEDS, Blood } from './blood';
import { Effects } from './effects';
import { HEAVY_HIT_DAMAGE, type FightEvent } from './fight-events';
import { HitFx } from './hit-fx';
import type { HitStyle } from './hit-styles';
import { Onomatopoeia } from './onomatopoeia';

/** The final blow plays in slow motion for a moment (display only: the simulation is intact). */
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SLOW_MOTION_SCALE = 0.35;

/**
 * Turns fight events into what the player sees and hears: hit effects in the attacker's own
 * style, comic words with the running tally of hits, blood, shake, flash, sounds.
 */
export class FightFeedback {
  private readonly effects: Effects;
  private readonly hitFx: HitFx;
  private readonly blood: Blood;
  private readonly words: Onomatopoeia;
  private slowMotionFrames = 0;

  constructor(
    scene: Phaser.Scene,
    groundY: number,
    private readonly sfx: Sfx,
    private readonly styles: readonly [HitStyle, HitStyle],
  ) {
    this.effects = new Effects(scene);
    this.hitFx = new HitFx(scene, groundY);
    this.blood = new Blood(scene, groundY);
    this.words = new Onomatopoeia(scene, groundY, styles);
  }

  react(event: FightEvent): void {
    const { effects, hitFx, sfx } = this;
    switch (event.type) {
      case 'hit': {
        const heavy = event.damage >= HEAVY_HIT_DAMAGE;
        const style = this.styles[event.by];
        hitFx.play(style, heavy ? 'heavy' : 'light', event.x, event.y, event.away);
        this.words.blow(heavy ? 'heavy' : 'light', event.by, event.x, event.y, event.away);
        if (heavy) {
          effects.shake(10, 3);
          this.blood.bleed(event.x, event.y, event.away, BLEEDS.heavyHit);
        }
        sfx.play(heavy ? 'heavyHit' : 'lightHit');
        break;
      }
      case 'block':
        hitFx.play(this.styles[event.by], 'block', event.x, event.y, event.away);
        sfx.play('block');
        break;
      case 'ko': {
        const style = this.styles[event.by];
        hitFx.play(style, 'ko', event.x, event.y, event.away);
        this.words.blow('ko', event.by, event.x, event.y, event.away);
        this.blood.bleed(event.x, event.y, event.away, BLEEDS.ko);
        // The final blow shakes the screen hard, then dies out over about 0.7 s.
        effects.shake(42, 6);
        // The final flash takes the winner's color, a light tint of it on the whole screen.
        effects.flash(12, style.energy);
        this.slowMotionFrames = KO_SLOW_MOTION_FRAMES;
        sfx.play('ko');
        break;
      }
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
        if (event.phase === 'intro') {
          sfx.play('round');
          this.words.reset();
        }
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
    this.hitFx.update();
    this.blood.update();
    this.words.update();
  }

  get shakeX(): number {
    return this.effects.shakeX;
  }

  get shakeY(): number {
    return this.effects.shakeY;
  }
}
