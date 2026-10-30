import type Phaser from 'phaser';
import type { Sfx } from '../audio/sfx';
import { px, toPx } from '../core/constants';
import { BLEEDS, Blood } from './blood';
import { Dust } from './dust';
import { Effects } from './effects';
import { Graze, type GrazeWeight } from './graze';
import { SHATTER_RUMBLE, vibrationFor, type FightEvent } from './fight-events';
import { HitFx } from './hit-fx';
import type { HitStyle } from './hit-styles';
import { Onomatopoeia } from './onomatopoeia';
import { TRAUMA } from './shake';
import { boostStamp, STAMP_TEXTS, Stamps } from './stamps';
import { koVeil, superDim, superHalo, type VeilLook } from './veils';

/** The final blow plays in slow motion for a moment (display only: the simulation is intact). */
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SLOW_MOTION_SCALE = 0.35;

/** The super's halo glows behind the body of the one who lets it go: this high over its feet. */
const BODY_HEIGHT = 40;
/**
 * A Boost stamp stands over the head of the one who spends (its feet + this, sub-pixels), above
 * the name of its move that training writes there (move-caption.ts), whoever spends.
 */
const HEAD_HEIGHT = px(60);

/** Where a Boost stamp goes: over the head of the one who spends. */
function overHead(at: { readonly by: 0 | 1; readonly x: number; readonly y: number }) {
  return { by: at.by, x: at.x, y: at.y + HEAD_HEIGHT };
}

/** The fight's stage, as the veils and the shake need it. */
export interface FeedbackStage {
  /** World pixels. */
  readonly width: number;
  /** Its large colors (sky, ground): no veil changes any of them by more than its luminance bound. */
  readonly colors: readonly number[];
  /** The screen shakes (not with prefers-reduced-motion). */
  readonly shake: boolean;
}

/**
 * Turns fight events into what the player sees, hears and feels: hit effects in the attacker's
 * own style, comic words with the running tally of hits, the stamps (the hold's, CONTRE and
 * PUNITION, the Boost's), blood, dust, the shake and the veils (never a flash over the whole
 * screen: docs/flashs.md), sounds, and player 1's vibrations (`vibrate`, given only where a
 * device can). A low blow lands at the
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
  private readonly superDim: VeilLook;
  private readonly superHalo: VeilLook;
  private slowMotionFrames = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly sfx: Sfx,
    private readonly styles: readonly [HitStyle, HitStyle],
    private readonly stage: FeedbackStage,
    private readonly vibrate?: (ms: number) => void,
    /** The gamepads' rumble (`rumble` in input/haptics.ts), on the KO that blows a gauge up. */
    private readonly rumble?: (ms: number, strength: number) => void,
  ) {
    this.effects = new Effects(scene, { stageWidth: stage.width, shake: stage.shake });
    this.superDim = superDim(stage.colors);
    this.superHalo = superHalo(stage.colors);
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
        // A super's blows before its last: a smaller spark and a small BOUM, the big ones kept
        // for the last (BOOM, BOOM, BOOOOM), never three flashes in a second.
        if (event.low) this.lowBlow(style, weight, event);
        else hitFx.play(style, event.pulse ? 'pulse' : weight, event.x, event.y, event.away);
        this.words.blow(event.pulse ? 'pulse' : weight, event, viewLeft);
        if (counter) this.stamps.show(STAMP_TEXTS[counter], event, viewLeft);
        if (heavy) {
          effects.kick(TRAUMA.heavy, event.away);
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
        if (event.counter) this.stamps.show(STAMP_TEXTS[event.counter], event, viewLeft);
        if (event.low) this.lowBlow(style, 'heavy', event);
        else this.blood.bleed(event.x, event.y, event.away, BLEEDS.ko);
        // The final blow shakes the screen hard, then dies out over about 0.7 s; harder still when
        // it blows the loser's Boost gauge up (an Ultime), the gamepads rumbling with it.
        effects.kick(TRAUMA.ko[event.finish], event.away);
        if (event.finish === 'finisher') this.rumble?.(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
        // How it fell, in the winner's energy: nothing more for a blow on its own, a vignette for
        // a combo's end, the éclat for an Ultime (docs/flashs.md §2).
        const veil = koVeil(event.finish, style.energy, this.stage.colors);
        if (veil) effects.veil(veil, this.inWorld(event.x, event.y));
        this.slowMotionFrames = KO_SLOW_MOTION_FRAMES;
        sfx.play('ko');
        break;
      }
      case 'grab':
        // Caught: the freeze and the victim's vibration say it, a PUNITION is stamped.
        if (event.punish) this.stamps.show(STAMP_TEXTS.punish, event, viewLeft);
        sfx.play('grab');
        break;
      case 'tech':
        // The hands knocked away: a flash where they meet, both pushed apart.
        hitFx.play(this.styles[event.by], 'block', event.x, event.y, event.away);
        this.stamps.show(STAMP_TEXTS.tech, event, viewLeft);
        sfx.play('tech');
        break;
      case 'throw':
        // Let go: the word and the rush of air now, the impact when the body lands.
        this.words.blow('heavy', event, viewLeft);
        effects.kick(TRAUMA.throw, event.away);
        sfx.play('throw');
        break;
      case 'fall':
        this.dust.kick(event.x, event.away);
        effects.kick(TRAUMA.fall, event.away);
        sfx.play('fall');
        break;
      case 'attack':
        sfx.play(event.heavy ? 'heavySwing' : 'swing');
        break;
      case 'dash':
        this.dust.puff(event.x, event.toward);
        sfx.play('dash');
        break;
      // The Boost (docs/combos-v3.md §1.8.7): its stamp over the fighter who spends, its sound.
      case 'boost':
        this.stamps.show(STAMP_TEXTS.remix, overHead(event), viewLeft);
        sfx.play('remix');
        break;
      case 'rewind':
        this.dust.puff(event.x, event.toward);
        this.stamps.show(boostStamp(event.name), overHead(event), viewLeft);
        sfx.play('rewind');
        break;
      case 'super':
        this.stamps.show(boostStamp(event.name), overHead(event), viewLeft);
        sfx.play('super');
        break;
      case 'freeze': {
        // The whole game freezes on the cue (the core's flash): the stage goes dark under both
        // fighters, who stay lit, a platine halo behind the one who lets it go (docs/flashs.md §2).
        effects.veil(this.superDim);
        const at = this.inWorld(event.x, event.y);
        effects.veil(this.superHalo, { x: at.x, y: at.y - BODY_HEIGHT });
        effects.kick(TRAUMA.super, event.toward);
        break;
      }
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

  /** Where stage sub-pixels `x`, `y` (above the ground) are, in world pixels. */
  private inWorld(x: number, y: number): { x: number; y: number } {
    return { x: toPx(x), y: this.groundY - toPx(y) };
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
