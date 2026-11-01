import type Phaser from 'phaser';
import type { Comfort } from '../app/comfort';
import type { Sfx } from '../audio/sfx';
import { px, toPx } from '../core/constants';
import { TickPacer } from '../loop/tick-pacer';
import { BLEEDS, Blood } from './blood';
import { HAPTICS } from './fight-events';
import { Dust } from './dust';
import { Effects } from './effects';
import { Graze, type GrazeWeight } from './graze';
import type { AnimOptions } from './anim-options';
import {
  landingOf,
  landsHeavy,
  SHATTER_RUMBLE,
  shatters,
  vibrationFor,
  type FightEvent,
  type KoFinish,
} from './fight-events';
import { CLOSE_UP_EFFECTS, MAX_CLOSE_UP } from './camera-framing';
import {
  blowAsk,
  finisherAsk,
  SPARK_AREAS,
  stampArea,
  wordArea,
  type BlowAsk,
} from './flash-areas';
import { FLASH_MERGE, type FlashBudget } from './flash-budget';
import { SHATTER_VIEW } from './health-bar';
import { HitFx } from './hit-fx';
import type { HitStyle } from './hit-styles';
import { Onomatopoeia } from './onomatopoeia';
import type { RenderMode } from './render-mode';
import { SHAKE_STRENGTH, TRAUMA, type ShakeAxis } from './shake';
import { boostStamp, STAMP_TEXTS, Stamps, type StampLook } from './stamps';
import { glowFlashArea, koVeil, superDim, superHalo, type VeilLook } from './veils';

/**
 * The final blow plays in slow motion for a moment (display only: the simulation is intact): 7
 * ticks every 20 frames of game time, for 50 of them.
 */
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SLOW_MOTION = { ticks: 7, frames: 20 } as const;
const KO_SLOW_MOTION_SCALE = KO_SLOW_MOTION.ticks / KO_SLOW_MOTION.frames;

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
/**
 * Display frames a stamp of the Finisher's scene waits after its blow: past the frames it would
 * light with (FLASH_MERGE), its count still on the beat.
 */
export const FINISHER_STAMP_AFTER = FLASH_MERGE + 1;

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
  /** How the game is drawn: without tints, the tinted veils and pieces are cut (render-mode.ts). */
  readonly mode: RenderMode;
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
 * the mark of the final blow, lifted above the floor by HitFx. The blows of the Finisher's lock
 * and its KO are its scene's (finisher-scene.ts): small sparks, no word, no blood; the scene
 * plays the rest through its own hands here (its stamps, its shakes, its landing).
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
  /** Frames of game time the KO's slow motion has left. */
  private slowMotionFrames = 0;
  /** Its ticks in whole ticks (`ticksFor`); anew at each KO. */
  private slowMotionPacer = new TickPacer(KO_SLOW_MOTION.ticks, KO_SLOW_MOTION.frames);
  /** How the round's KO landed, null before it: the Finisher's lands in silence (landingOf). */
  private koFinish: KoFinish | null = null;
  /** The animation of before (AnimOptions): a body knocked out in the air lands without a sound. */
  private legacy = false;
  /**
   * Who the Finisher's lock is of, from its first contact to that player's next super: the blows
   * of its super are the scene's (finisher-scene.ts), their count stamped instead of their words.
   */
  private lockedBy: 0 | 1 | null = null;

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
    this.effects = new Effects(scene, { stageWidth: stage.width, shake, mode: stage.mode });
    this.superDim = superDim(stage.colors);
    this.superHalo = superHalo(stage.colors);
    this.haloArea = glowFlashArea(this.superHalo, stage.colors);
    const eclat = (style: HitStyle): number => {
      const look = koVeil('ultimate', style.energy, stage.colors);
      return look ? glowFlashArea(look, stage.colors) : 0;
    };
    this.eclatAreas = [eclat(styles[0]), eclat(styles[1])];
    this.hitFx = new HitFx(scene, groundY, stage.mode);
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

  /** The animation's options, at once (training's pause): what a body knocked out lands with. */
  setAnimOptions(options: AnimOptions): void {
    this.legacy = options.legacy;
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
      this.staged(event)
        ? finisherAsk(event, this.styles[event.by].shape, this.sizeOf(event))
        : blowAsk(event, this.styles[event.by].shape, calm, this.words.countOf(event.by)),
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
        if (event.type === 'ko') this.koFinish = event.finish;
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
      case 'fall': {
        // A body knocked out in the air claps onto the floor too (docs/art/animation-plan.md §2,
        // V1), in the dust its ko draws.
        const landing = landingOf(event, this.koFinish, this.legacy);
        if (landing.dust) this.dust.kick(event.x, event.away);
        if (landing.thud) {
          effects.kick(TRAUMA.fall, event.away);
          sfx.play('fall');
        }
        break;
      }
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
        // A new super is a new sequence: a lock before it is over.
        if (this.lockedBy === event.by) this.lockedBy = null;
        this.stamp(boostStamp(event.name), overHead(event), viewLeft);
        sfx.play('super');
        break;
      case 'finisherLock':
        this.lockedBy = event.by;
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
          this.koFinish = null;
          this.lockedBy = null;
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
    const staged = this.staged(event);
    // A counter-hit lands like a heavy blow, its stamp over it (docs/combat-v2.md §7.4).
    const heavy = landsHeavy(event);
    // The Finisher's KO breaks the HUD on its landing, which its scene plays.
    if (ko && event.finish !== 'finale') {
      const breaks = lit || budget.admit(this.shatterOf(event.finish));
      this.stage.knockOut?.(event.by === 0 ? 1 : 0, event.finish, !breaks);
    }
    const sparks = lit || budget.admit(ask.mutedArea);
    // A super's blows before its last play a smaller spark and a small BOUM, the big ones kept
    // for the last (BOOM, BOOM, BOOOOM); the Finisher's all play the small one.
    if (event.low) this.lowBlow(style, heavy ? 'heavy' : 'light', event, sparks);
    if (sparks && (!event.low || ko)) {
      const look = lit ? ask.look : ask.muted;
      this.hitFx.play(style, look, event.x, event.y, event.away, this.sizeOf(event));
    }
    if (staged) {
      // Its words are the scene's count; its KO, its scene's alone: no blood at the close up, no
      // veil, no shake, no slow motion, no KO sound (docs/finisher.md §5.2). So is its last blow
      // on the training dummy, kept at 1 HP: the scene sounds and shakes it (§1.12).
      if (ko || !event.pulse) return;
      this.sfx.play(heavy ? 'heavyHit' : 'lightHit');
      if (heavy) effects.kick(TRAUMA.heavy, event.away);
      return;
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
    if (shatters(event.finish)) this.rumble?.(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
    // How it fell, in the winner's energy: nothing more for a blow on its own, a vignette for a
    // combo's end, the éclat for an Ultime (docs/flashs.md §2), in ink when refused.
    const veil = koVeil(event.finish, style.energy, this.stage.colors, budget.mode, lit);
    if (veil) effects.veil(veil, this.inWorld(event.x, event.y));
    this.slowMotionFrames = KO_SLOW_MOTION_FRAMES;
    this.slowMotionPacer = new TickPacer(KO_SLOW_MOTION.ticks, KO_SLOW_MOTION.frames);
    this.sfx.play('ko');
  }

  /**
   * World px² a blow lights besides its spark, word and stamp, at once: the éclat of an Ultime's
   * KO (only with the flashes normal), and what it breaks on the HUD; nothing for the Finisher's,
   * which lights them on its landing (`finisherLanding`). (The HUD asks for the flash of the bar
   * it hits on its own: Hud.)
   */
  private alsoLit(event: PendingBlow['event']): number {
    if (event.type !== 'ko' || event.finish === 'finale') return 0;
    const shattered = shatters(event.finish);
    const eclat = shattered && this.budget.mode === 'normal' ? this.eclatAreas[event.by] : 0;
    return eclat + this.shatterOf(event.finish);
  }

  /**
   * World px² a KO that blows the gauges up lights on the HUD, as the loser's bar and gauge
   * break (view px², which the zoom does not enlarge): hot shards with the flashes normal, their
   * own colors else.
   */
  private shatterOf(finish: KoFinish): number {
    if (!shatters(finish)) return 0;
    const normal = this.budget.mode === 'normal';
    return this.budget.toWorld(normal ? SHATTER_VIEW.hot : SHATTER_VIEW.plain);
  }

  /** A blow of the super the Finisher locks, its KO always: its scene's (finisher-scene.ts). */
  private staged(event: PendingBlow['event']): boolean {
    if (event.type === 'ko' && event.finish === 'finale') return true;
    return this.lockedBy === event.by && event.tier >= 3;
  }

  /**
   * The size of what a blow fires over its own: × 0.725 for the Finisher's, from its lock on
   * (docs/finisher.md §1.14): its screen area stays the one measured at the fight's closest
   * framing once the camera closes in, and its first blows leave their super's rings room to
   * light without a slot. With the screen kept still too (no close up): that room is what keeps
   * the registry (§4.3), TROIS's rings lit, and Larsen's KO no flash (measured).
   */
  private sizeOf(event: PendingBlow['event']): number {
    return this.staged(event) ? CLOSE_UP_EFFECTS : 1;
  }

  /**
   * The Finisher's scene frames the fight at `closeUp` (camera-framing.ts), or leaves it to the
   * fight's framing (null): the words and stamps drawn from now on stay sharp at it.
   */
  setCloseUp(closeUp: number | null): void {
    this.words.setCloseUp(closeUp ?? MAX_CLOSE_UP);
    this.stamps.setCloseUp(closeUp ?? MAX_CLOSE_UP);
  }

  /**
   * A stamp of the Finisher's scene (its name, its count) for `at.by` over `at` (stage
   * sub-pixels), or over its head; `look`: its size and tilt; `replaces`: the stamp whose place
   * it takes (the super's name, the count's word before). It comes just past what its blow lights (FINISHER_STAMP_AFTER frames: the
   * blow's spark and the new frame of its effects, which ask later in the frame), in its look if
   * that makes no flash, calm where the budget finds room otherwise: it never takes a slot, the
   * scene's flashes are its blows' and its landing's.
   */
  finisherStamp(
    text: string,
    at: { readonly by: 0 | 1; readonly x: number; readonly y: number },
    viewLeft: number,
    look: StampLook,
    place: { readonly replaces: string | null; readonly overHead: boolean },
  ): void {
    if (place.replaces !== null) this.stamps.dismiss(place.replaces);
    const { budget } = this;
    const size = (look.size ?? 1) ** 2;
    const full = stampArea(false) * size;
    const lit = budget.mode === 'normal' && budget.fits(full, FINISHER_STAMP_AFTER);
    if (lit) budget.show(full, FINISHER_STAMP_AFTER);
    const delay = lit
      ? FINISHER_STAMP_AFTER
      : budget.place(stampArea(true) * size, FINISHER_STAMP_AFTER);
    const where = place.overHead ? overHead(at) : at;
    this.stamps.show(text, where, viewLeft, delay, !lit, look);
  }

  /** The Finisher's shake (docs/finisher.md §4.4): along one axis, divided by the close up. */
  finisherShake(trauma: number, away: 1 | -1, axis: ShakeAxis, closeUp: number): void {
    this.effects.kick(trauma, away, axis, closeUp);
  }

  /**
   * The Finisher's landing (docs/finisher.md §1.13, §1.14): the victim of `by` lands at `x`
   * (stage sub-pixels), pushed `away`. Its one éclat, from where it lands, `size` times its own,
   * a climax with what the loser's gauges light as they break, in ink if refused, none with the
   * flashes off; the gauges and the bar break (still, without their shards, if even they find
   * no room); the `dust` (the victim's body landing then); the phones and the gamepads. `quiet`
   * (the scene skipped past it): the gauges and the bar break still, nothing else.
   */
  finisherLanding(
    by: 0 | 1,
    x: number,
    away: 1 | -1,
    size: number,
    how: { readonly quiet: boolean; readonly dust: boolean },
  ): void {
    const { budget } = this;
    const loser = by === 0 ? 1 : 0;
    if (how.quiet) {
      this.stage.knockOut?.(loser, 'finale', true);
      return;
    }
    const { energy } = this.styles[by];
    const eclat = budget.mode === 'normal' ? this.eclatAreas[by] * size ** 2 : 0;
    const shatter = this.shatterOf('finale');
    const lit = budget.mode !== 'off' && budget.request(eclat + shatter, true) === 'lit';
    const breaks = lit || budget.admit(shatter);
    this.stage.knockOut?.(loser, 'finale', !breaks);
    if (budget.mode !== 'off') {
      const veil = koVeil('finale', energy, this.stage.colors, budget.mode, lit);
      if (veil) this.effects.veil(veil, this.inWorld(x, 0), size);
    }
    if (how.dust) this.dust.kick(x, away);
    this.vibrate?.(HAPTICS.shatter);
    this.rumble?.(SHATTER_RUMBLE.ms, SHATTER_RUMBLE.strength);
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
   * The ticks to play for `gameFrames` frames of game time (FightScene, steps of its visual clock,
   * fewer when the viewing slows the game down): one a frame, or 7 every 20 in the KO's slow
   * motion. In whole ticks, so the slow motion holds each tick a whole number of frames, and still
   * slows a slowed game as much as the game's own.
   */
  ticksFor(gameFrames: number): number {
    return this.slowMotionFrames > 0 ? this.slowMotionPacer.advance(gameFrames) : gameFrames;
  }

  /**
   * Advances the visual effects by `frames` steps of 1/60 s (see the visual clock of
   * FightScene): they last as long on a 144 Hz screen as on a 60 Hz one. `gameFrames`: those of
   * them the game lives, fewer when the viewing slows it down; the KO's slow motion counts them.
   */
  update(frames: number, gameFrames = frames): void {
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
    this.slowMotionFrames = Math.max(0, this.slowMotionFrames - gameFrames);
  }

  get shakeX(): number {
    return this.effects.shakeX;
  }

  get shakeY(): number {
    return this.effects.shakeY;
  }
}
