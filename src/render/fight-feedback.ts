import type Phaser from 'phaser';
import type { Comfort } from '../app/comfort';
import type { Sfx } from '../audio/sfx';
import { px, toPx } from '../core/constants';
import { BLEEDS, Blood } from './blood';
import { Dust } from './dust';
import { Effects } from './effects';
import { Graze, type GrazeWeight } from './graze';
import { SHATTER_RUMBLE, vibrationFor, type FightEvent, type KoFinish } from './fight-events';
import { blowAsk, SPARK_AREAS, stampArea, wordArea, type BlowAsk } from './flash-areas';
import type { FlashBudget } from './flash-budget';
import { SHATTER_VIEW } from './health-bar';
import { HitFx } from './hit-fx';
import type { HitStyle } from './hit-styles';
import { Onomatopoeia } from './onomatopoeia';
import { SHAKE_STRENGTH, TRAUMA } from './shake';
import { boostStamp, STAMP_TEXTS, Stamps } from './stamps';
import { glowFlashArea, koVeil, superDim, superHalo, type VeilLook } from './veils';

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

/**
 * Display frames a muted blow's word waits, then its stamp, at the least: their peaks never meet
 * the spark's (docs/flashs.md §4). Later still if what lights then leaves no room (FlashBudget's
 * `place`).
 */
export const MUTED_DELAY = { word: 8, stamp: 16 } as const;

/** Where a Boost stamp goes: over the head of the one who spends. */
function overHead(at: { readonly by: 0 | 1; readonly x: number; readonly y: number }) {
  return { by: at.by, x: at.x, y: at.y + HEAD_HEIGHT };
}

/** The fight, as the effects need it. */
export interface FeedbackStage {
  /** World pixels. */
  readonly width: number;
  /** Its large colors (sky, ground): no veil changes any of them by more than its luminance bound. */
  readonly colors: readonly number[];
  /** The fight's flash budget (docs/flashs.md §4), shared with the fighters' views. */
  readonly budget: FlashBudget;
  /** The player's comfort options as the fight starts (then `setComfort`). */
  readonly comfort: Comfort;
  /**
   * Tells the HUD how `player` fell, on the tick it falls (Hud.knockOut): `still`, its gauges
   * break without their shards, the flash budget leaving no room for them.
   */
  readonly knockOut?: (player: 0 | 1, finish: KoFinish, still: boolean) => void;
}

/** A blow of the tick, waiting for the others: the tick's blows light up together. */
interface PendingBlow {
  readonly event: Extract<FightEvent, { type: 'hit' | 'ko' }>;
  readonly viewLeft: number;
}

/**
 * Turns fight events into what the player sees, hears and feels: hit effects in the attacker's
 * own style, comic words with the running tally of hits, the stamps (the hold's, CONTRE and
 * PUNITION, the Boost's), blood, dust, the shake and the veils (never a flash over the whole
 * screen: docs/flashs.md), sounds, and player 1's vibrations (`vibrate`, given only where a
 * device can). The blows of a tick ask the flash budget once, for all they light together
 * (docs/flashs.md §4): refused, they play muted, their words and stamps calm and a moment later;
 * with the player's « Effets de flash » off, always so. Every other piece that lights (a stamp, a
 * guard's spark) asks the budget too. A low blow lands at the feet (docs/combat-v2.md
 * §9.3): instead of the burst, which would sink through the floor, a grazing spark skims it and
 * dust flies, without blood, which stays for heavy blows higher up. A low KO keeps its burst,
 * the mark of the final blow, lifted above the floor by HitFx.
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
  /** World px² the halo flashes, and each player's éclat (an Ultime's KO in its energy). */
  private readonly haloArea: number;
  private readonly eclatAreas: readonly [number, number];
  private readonly budget: FlashBudget;
  private readonly blows: PendingBlow[] = [];
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
    this.budget = stage.budget;
    const shake = SHAKE_STRENGTH[stage.comfort.shake];
    this.effects = new Effects(scene, { stageWidth: stage.width, shake });
    this.superDim = superDim(stage.colors);
    this.superHalo = superHalo(stage.colors);
    this.haloArea = glowFlashArea(this.superHalo, stage.colors);
    const eclat = (style: HitStyle): number => {
      const look = koVeil('finisher', style.energy, stage.colors);
      return look ? glowFlashArea(look, stage.colors) : 0;
    };
    this.eclatAreas = [eclat(styles[0]), eclat(styles[1])];
    this.hitFx = new HitFx(scene, groundY);
    this.blood = new Blood(scene, groundY);
    this.dust = new Dust(scene, groundY);
    this.graze = new Graze(scene, groundY);
    this.words = new Onomatopoeia(scene, groundY, styles);
    this.stamps = new Stamps(scene, groundY, styles);
    this.setComfort(stage.comfort);
  }

  /**
   * The player's comfort options, at once (the pause's options): how far the screen shakes, and
   * the words and stamps calm while the flashes are not normal. The budget's mode is the fight
   * scene's to set.
   */
  setComfort(comfort: Comfort): void {
    this.effects.setShake(SHAKE_STRENGTH[comfort.shake]);
    const calm = comfort.flashes !== 'normal';
    this.words.calm = calm;
    this.stamps.calm = calm;
  }

  /** Call before the events of each simulation tick: blows of the same tick trade fairly. */
  beginTick(): void {
    this.words.beginTick();
  }

  /**
   * Call after the events of each simulation tick: its blows light up, together (a trade is
   * one flash or none, never two).
   */
  endTick(): void {
    const { blows, budget } = this;
    if (blows.length === 0) return;
    const calm = budget.mode !== 'normal';
    const asks = blows.map(({ event }) =>
      blowAsk(event, this.styles[event.by].shape, calm, this.words.countOf(event.by)),
    );
    let area = 0;
    let climax = false;
    blows.forEach(({ event }, index) => {
      const ask = asks[index];
      if (!ask) return;
      area += ask.area + this.alsoLit(event);
      climax ||= ask.climax;
    });
    const lit = budget.mode !== 'off' && budget.request(area, climax) === 'lit';
    blows.forEach(({ event, viewLeft }, index) => {
      const ask = asks[index];
      if (ask) this.land(event, ask, lit, viewLeft);
    });
    blows.length = 0;
  }

  /** `viewLeft`: left edge of the simulation camera, in world pixels (the words stay inside). */
  react(event: FightEvent, viewLeft: number): void {
    const { effects, sfx } = this;
    if (this.vibrate) {
      const ms = vibrationFor(event, 0);
      if (ms > 0) this.vibrate(ms);
    }
    switch (event.type) {
      case 'hit':
      case 'ko':
        // With the tick's other blows, at its end (endTick).
        this.blows.push({ event, viewLeft });
        break;
      case 'block':
        this.guardSpark(event);
        // A low blow blocked still kicks up the dust it scrapes.
        if (event.low) this.dust.kick(event.x, event.away);
        sfx.play('block');
        break;
      case 'grab':
        // Caught: the freeze and the victim's vibration say it, a PUNITION is stamped.
        if (event.punish) this.stamp(STAMP_TEXTS.punish, event, viewLeft);
        sfx.play('grab');
        break;
      case 'tech':
        // The hands knocked away: a flash where they meet, both pushed apart.
        this.guardSpark(event);
        this.stamp(STAMP_TEXTS.tech, event, viewLeft);
        sfx.play('tech');
        break;
      case 'throw': {
        // Let go: the word and the rush of air now, the impact when the body lands.
        const count = this.words.countOf(event.by);
        const word = this.alone(
          wordArea('heavy', count, this.words.calm),
          wordArea('heavy', count, true),
        );
        this.words.blow('heavy', event, viewLeft, word.delay, word.calm);
        effects.kick(TRAUMA.throw, event.away);
        sfx.play('throw');
        break;
      }
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
        this.stamp(STAMP_TEXTS.remix, overHead(event), viewLeft);
        sfx.play('remix');
        break;
      case 'rewind':
        this.dust.puff(event.x, event.toward);
        this.stamp(boostStamp(event.name), overHead(event), viewLeft);
        sfx.play('rewind');
        break;
      case 'super':
        this.stamp(boostStamp(event.name), overHead(event), viewLeft);
        sfx.play('super');
        break;
      case 'freeze': {
        // The whole game freezes on the cue (the core's flash): the stage goes dark under both
        // fighters, who stay lit, a platine halo behind the one who lets it go (docs/flashs.md §2),
        // a flash on its own: only with the flashes normal, if the budget lets it.
        effects.veil(this.superDim);
        const normal = this.budget.mode === 'normal';
        if (normal && this.budget.request(this.haloArea) === 'lit') {
          const at = this.inWorld(event.x, event.y);
          effects.veil(this.superHalo, { x: at.x, y: at.y - BODY_HEIGHT });
        }
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

  /**
   * A blow of the tick lights up, `lit` or muted (docs/flashs.md §4). Muted, what its KO breaks
   * on the HUD shows first, then its spark plays its muted look, each if it makes no flash with
   * what lights already (the gauges break still, the spark is not played otherwise); its word and
   * stamp come later, calm, where the budget finds room for them (never if it finds none).
   */
  private land(event: PendingBlow['event'], ask: BlowAsk, lit: boolean, viewLeft: number): void {
    const { effects, budget } = this;
    const style = this.styles[event.by];
    const ko = event.type === 'ko';
    // A counter-hit lands like a heavy blow, its stamp over it (docs/combat-v2.md §7.4).
    const heavy = ko || event.heavy || event.counter !== null;
    if (ko) {
      const breaks = lit || budget.admit(this.shatterOf(event));
      this.stage.knockOut?.(event.by === 0 ? 1 : 0, event.finish, !breaks);
    }
    const sparks = lit || budget.admit(ask.mutedArea);
    // A super's blows before its last play a smaller spark and a small BOUM, the big ones kept
    // for the last (BOOM, BOOM, BOOOOM).
    if (event.low) this.lowBlow(style, heavy ? 'heavy' : 'light', event, sparks);
    if (sparks && (!event.low || ko)) {
      this.hitFx.play(style, lit ? ask.look : ask.muted, event.x, event.y, event.away);
    }
    // Lit, they are in what its request lit; muted, they wait, calm, the stamp after its word.
    const word = lit ? 0 : budget.place(ask.later.word, MUTED_DELAY.word);
    this.words.blow(ask.word, event, viewLeft, word, !lit);
    if (event.counter) {
      const after = (word ?? MUTED_DELAY.word) + MUTED_DELAY.stamp - MUTED_DELAY.word;
      const stamp = lit ? 0 : budget.place(ask.later.stamp, after);
      this.stamps.show(STAMP_TEXTS[event.counter], event, viewLeft, stamp, !lit);
    }
    if (!ko) {
      if (heavy) {
        effects.kick(TRAUMA.heavy, event.away);
        if (!event.low) this.blood.bleed(event.x, event.y, event.away, BLEEDS.heavyHit);
      }
      this.sfx.play(event.held ? 'pummel' : heavy ? 'heavyHit' : 'lightHit');
      return;
    }
    if (!event.low) this.blood.bleed(event.x, event.y, event.away, BLEEDS.ko);
    // The final blow shakes the screen hard, then dies out over about 0.7 s; harder still when
    // it blows the loser's Boost gauge up (an Ultime), the gamepads rumbling with it.
    effects.kick(TRAUMA.ko[event.finish], event.away);
    if (event.finish === 'finisher') this.rumble?.(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
    // How it fell, in the winner's energy: nothing more for a blow on its own, a vignette for a
    // combo's end, the éclat for an Ultime (docs/flashs.md §2), in ink when refused.
    const veil = koVeil(event.finish, style.energy, this.stage.colors, budget.mode, lit);
    if (veil) effects.veil(veil, this.inWorld(event.x, event.y));
    this.slowMotionFrames = KO_SLOW_MOTION_FRAMES;
    this.sfx.play('ko');
  }

  /**
   * World px² a blow lights besides its spark, word and stamp, at once: the éclat of an Ultime's
   * KO (only with the flashes normal), and what it breaks on the HUD. (The HUD asks for the flash
   * of the bar it hits on its own: Hud.)
   */
  private alsoLit(event: PendingBlow['event']): number {
    const finisher = event.type === 'ko' && event.finish === 'finisher';
    const eclat = finisher && this.budget.mode === 'normal' ? this.eclatAreas[event.by] : 0;
    return eclat + this.shatterOf(event);
  }

  /**
   * World px² an Ultime's KO lights on the HUD, as the loser's bar and gauge blow up (view px²,
   * which the zoom does not enlarge): hot shards with the flashes normal, their own colors else.
   */
  private shatterOf(event: PendingBlow['event']): number {
    if (event.type !== 'ko' || event.finish !== 'finisher') return 0;
    const normal = this.budget.mode === 'normal';
    return this.budget.toWorld(normal ? SHATTER_VIEW.hot : SHATTER_VIEW.plain);
  }

  /**
   * When a piece shown on its own (a stamp, the word of a throw) lights, and how: at once in its
   * look (`area`) if the budget lets it, a flash taking a slot; otherwise calm (`calmArea`), from
   * the first frame it fits (null: none). Calm options: always calm.
   */
  private alone(area: number, calmArea: number): { delay: number | null; calm: boolean } {
    const { budget } = this;
    if (budget.mode === 'normal' && budget.request(area) === 'lit')
      return { delay: 0, calm: false };
    return { delay: budget.place(calmArea, 0), calm: true };
  }

  /** A stamp that is not a blow's (the Boost's, the hold's): when the budget lets it. */
  private stamp(
    text: string,
    at: { readonly by: 0 | 1; readonly x: number; readonly y: number },
    viewLeft: number,
  ): void {
    const { delay, calm } = this.alone(stampArea(this.stamps.calm), stampArea(true));
    this.stamps.show(text, at, viewLeft, delay, calm);
  }

  /** A blocked blow, or hands knocked away: the guard's spark, if it makes no flash. */
  private guardSpark(event: { by: 0 | 1; x: number; y: number; away: 1 | -1 }): void {
    const style = this.styles[event.by];
    if (!this.budget.admit(SPARK_AREAS[style.shape].block)) return;
    this.hitFx.play(style, 'block', event.x, event.y, event.away);
  }

  /** Where stage sub-pixels `x`, `y` (above the ground) are, in world pixels. */
  private inWorld(x: number, y: number): { x: number; y: number } {
    return { x: toPx(x), y: this.groundY - toPx(y) };
  }

  /** A blow landed at the feet: the spark skims the floor (`sparks`: if it may), the dust flies. */
  private lowBlow(
    style: HitStyle,
    weight: GrazeWeight,
    event: { x: number; y: number; away: 1 | -1 },
    sparks: boolean,
  ): void {
    if (sparks) this.graze.play(style, weight, event.x, event.y, event.away);
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
    // What this frame's blows hold back waits from the next frame on: it shows on the frame of
    // the visual clock the budget kept it for.
    this.words.settle();
    this.stamps.settle();
    this.slowMotionFrames = Math.max(0, this.slowMotionFrames - frames);
  }

  get shakeX(): number {
    return this.effects.shakeX;
  }

  get shakeY(): number {
    return this.effects.shakeY;
  }
}
