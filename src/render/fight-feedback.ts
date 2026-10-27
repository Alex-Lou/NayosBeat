import type Phaser from 'phaser';
import type { Sfx } from '../audio/sfx';
import { BLEEDS, Blood } from './blood';
import { Dust } from './dust';
import { Effects } from './effects';
import { Graze, type GrazeWeight } from './graze';
import { vibrationFor, type FightEvent } from './fight-events';
import { HitFx } from './hit-fx';
import type { HitStyle } from './hit-styles';
import { Onomatopoeia } from './onomatopoeia';
import { Stamps } from './stamps';

/** The final blow plays in slow motion for a moment (display only: the simulation is intact). */
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SLOW_MOTION_SCALE = 0.35;

/**
 * Turns fight events into what the player sees, hears and feels: hit effects in the attacker's
 * own style, comic words with the running tally of hits, the stamps (the hold's, CONTRE and
 * PUNITION), blood, dust,
 * shake, flash, sounds, and player 1's vibrations (`vibrate`, given only where a device can). A low blow lands at the
 * feet (docs/combat-v2.md §9.3): instead of the burst, which would sink through the floor, a
 * grazing spark skims it and dust flies, without blood, which stays for heavy blows higher up.
 * A low KO keeps its burst, the mark of the final blow, lifted above the floor by HitFx.
 */
export class FightFeedback {
  private readonly effects: Effects;
  private readonly hitFx: HitFx;
  private readonly blood: Blood;
  private readonly dust: Dust;
  private readonly graze: Graze;
  private readonly words: Onomatopoeia;
  private readonly stamps: Stamps;
  private slowMotionFrames = 0;

  constructor(
    scene: Phaser.Scene,
    groundY: number,
    private readonly sfx: Sfx,
    private readonly styles: readonly [HitStyle, HitStyle],
    private readonly vibrate?: (ms: number) => void,
  ) {
    this.effects = new Effects(scene);
    this.hitFx = new HitFx(scene, groundY);
    this.blood = new Blood(scene, groundY);
    this.dust = new Dust(scene, groundY);
    this.graze = new Graze(scene, groundY);
    this.words = new Onomatopoeia(scene, groundY, styles);
    this.stamps = new Stamps(scene, groundY, styles);
  }

  /** Call before the events of each simulation tick: blows of the same tick trade fairly. */
  beginTick(): void {
    this.words.beginTick();
  }

  /** `viewLeft`: left edge of the simulation camera, in world pixels (the words stay inside). */
  react(event: FightEvent, viewLeft: number): void {
    const { effects, hitFx, sfx } = this;
    if (this.vibrate) {
      const ms = vibrationFor(event, 0);
      if (ms > 0) this.vibrate(ms);
    }
    switch (event.type) {
      case 'hit': {
        // A counter-hit lands like a heavy blow, its stamp over it (docs/combat-v2.md §7.4).
        const { counter } = event;
        const heavy = event.heavy || counter !== null;
        const style = this.styles[event.by];
        const weight = heavy ? 'heavy' : 'light';
        if (event.low) this.lowBlow(style, weight, event);
        else hitFx.play(style, weight, event.x, event.y, event.away);
        this.words.blow(weight, event, viewLeft);
        if (counter) this.stamps.show(counter, event, viewLeft);
        if (heavy) {
          effects.shake(10, 3);
          if (!event.low) this.blood.bleed(event.x, event.y, event.away, BLEEDS.heavyHit);
        }
        sfx.play(event.held ? 'pummel' : heavy ? 'heavyHit' : 'lightHit');
        break;
      }
      case 'block':
        hitFx.play(this.styles[event.by], 'block', event.x, event.y, event.away);
        // A low blow blocked still kicks up the dust it scrapes.
        if (event.low) this.dust.kick(event.x, event.away);
        sfx.play('block');
        break;
      case 'ko': {
        const style = this.styles[event.by];
        hitFx.play(style, 'ko', event.x, event.y, event.away);
        this.words.blow('ko', event, viewLeft);
        if (event.counter) this.stamps.show(event.counter, event, viewLeft);
        if (event.low) this.lowBlow(style, 'heavy', event);
        else this.blood.bleed(event.x, event.y, event.away, BLEEDS.ko);
        // The final blow shakes the screen hard, then dies out over about 0.7 s.
        effects.shake(42, 6);
        // The final flash takes the winner's color, a light tint of it on the whole screen.
        effects.flash(12, style.energy);
        this.slowMotionFrames = KO_SLOW_MOTION_FRAMES;
        sfx.play('ko');
        break;
      }
      case 'grab':
        // Caught: the freeze and the victim's vibration say it, a PUNITION is stamped.
        if (event.punish) this.stamps.show('punish', event, viewLeft);
        sfx.play('grab');
        break;
      case 'tech':
        // The hands knocked away: a flash where they meet, both pushed apart.
        hitFx.play(this.styles[event.by], 'block', event.x, event.y, event.away);
        this.stamps.show('tech', event, viewLeft);
        sfx.play('tech');
        break;
      case 'throw':
        // Let go: the word and the rush of air now, the impact when the body lands.
        this.words.blow('heavy', event, viewLeft);
        effects.shake(6, 2);
        sfx.play('throw');
        break;
      case 'fall':
        this.dust.kick(event.x, event.away);
        effects.shake(8, 2);
        sfx.play('fall');
        break;
      case 'attack':
        sfx.play(event.heavy ? 'heavySwing' : 'swing');
        break;
      case 'dash':
        this.dust.puff(event.x, event.toward);
        sfx.play('dash');
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

  /** A blow landed at the feet: the spark skims the floor, the dust flies. */
  private lowBlow(
    style: HitStyle,
    weight: GrazeWeight,
    event: { x: number; y: number; away: 1 | -1 },
  ): void {
    this.graze.play(style, weight, event.x, event.y, event.away);
    this.dust.kick(event.x, event.away);
  }

  /** How fast game time runs (slower right after a KO). */
  timeScale(): number {
    return this.slowMotionFrames > 0 ? KO_SLOW_MOTION_SCALE : 1;
  }

  /**
   * Advances the visual effects by `frames` steps of 1/60 s (see the visual clock of
   * FightScene): they last as long on a 144 Hz screen as on a 60 Hz one.
   */
  update(frames: number): void {
    for (let i = 0; i < frames; i++) {
      this.effects.update();
      this.hitFx.update();
      this.blood.update();
      this.dust.update();
      this.graze.update();
      this.words.update();
      this.stamps.update();
    }
    this.slowMotionFrames = Math.max(0, this.slowMotionFrames - frames);
  }

  get shakeX(): number {
    return this.effects.shakeX;
  }

  get shakeY(): number {
    return this.effects.shakeY;
  }
}
