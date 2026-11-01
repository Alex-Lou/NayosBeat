import type Phaser from 'phaser';
import type { Comfort } from '../app/comfort';
import type { Colorway } from '../art';
import { clipOf, poseClipOf, type ClipId, type FighterArt } from '../art/types';
import type { Sfx } from '../audio/sfx';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { finisherLocked } from '../core/finisher';
import { DIRECTIONS, type InputBits } from '../core/input';
import { MATCH_END_FRAMES, ROUND_END_FRAMES } from '../core/rules';
import type { GameState } from '../core/state';
import { step } from '../core/step';
import type { FighterId } from '../data/roster';
import { clipFrameAt } from './animation';
import { CLOSE_UP_EFFECTS, FINISHER_CLOSE_UP } from './camera-framing';
import { Crowd, crowdLift } from './crowd';
import type { FightEvent } from './fight-events';
import type { FightFeedback } from './fight-feedback';
import { FinisherCard, type CardLook } from './finisher-card';
import { FinisherProps, type Scratch } from './finisher-props';
import type { RenderMode } from './render-mode';
import {
  busOf,
  cardOf,
  easeInOut,
  easeOut,
  flatAlpha,
  NEEDLE_AT,
  NEEDLE_FRAMES,
  powerCutOf,
  RIVAL_NEEDLE_AT,
  scriptOf,
  silhouetteOf,
  ticksAfterKo,
  timelineOf,
  UNSTAGED,
  versionOf,
  winnerPoseOf,
  type FinisherScript,
  type Measure,
  type StagedLook,
  type StagingVersion,
  type Timeline,
} from './finisher-scripts';
import type { FlashBudget } from './flash-budget';
import { alphaForDelta, FLASH_DELTA, luminanceDelta, over } from './luminance';
import { TRAUMA } from './shake';
import { boostStamp } from './stamps';
import { VEIL_DELTA } from './veils';
import { VIEW_SIZE } from './view';

/** A player holds a button this many frames to skip the scene (§1.14): frames, never ticks. */
export const SKIP_FRAMES = 15;
/** A skip goes to the card's last frames, then on. */
export const SKIP_TO_CARD_END = 20;
/** The winner's pose once the match is fast-forwarded to its end, before the results. */
export const VICTORY_FRAMES = 60;
/** The camera's moves (§1.14, §2.4, §3.4): in to the close up, then back out after the release. */
const ZOOM_IN = 8;
const ZOOM_OUT = 30;
/** The card's feet over the floor, over the victim lying on it (world px). */
const CARD_FEET = 34;
/** Any button but a direction: what a player holds to skip the scene. */
const BUTTONS = ~DIRECTIONS;
/** The longest a victim may fly before its landing is given up (ticks). */
const FLIGHT_LIMIT = 240;

/** What the director plays with: the fight, its fighters and the pieces of the scene it drives. */
export interface FinisherCast {
  readonly config: MatchConfig;
  readonly fighters: readonly [FighterId, FighterId];
  readonly colorways: readonly [Colorway, Colorway];
  /** Each fighter's energy (its outline, its neon) and strike (its studs). */
  readonly energies: readonly [number, number];
  readonly strikes: readonly [number, number];
  readonly arts: readonly [FighterArt | undefined, FighterArt | undefined];
  readonly groundY: number;
  readonly stageWidth: number;
  readonly sfx: Sfx;
  readonly feedback: FightFeedback;
  readonly budget: FlashBudget;
  readonly comfort: Comfort;
  /** How the game is drawn: without tints, a dark card does not show (render-mode.ts). */
  readonly mode: RenderMode;
  /** The players who skip the scene by holding a button: the humans. */
  readonly humans: readonly (0 | 1)[];
  /** The fighters whose Finisher the session has played already (the next plays short). */
  readonly seen: Set<FighterId>;
}

/** The camera, where the scene frames it: a close up, centered on a world x. */
export interface SceneFraming {
  readonly closeUp: number;
  readonly middle: number;
}

/** What the fight's camera showed on the frame before (FightScene): where a zoom sets off from. */
export interface CameraNow {
  readonly closeUp: number;
  readonly left: number;
  readonly top: number;
  /** The simulation's camera, world px: the framing stays inside it. */
  readonly viewLeft: number;
}

/** The scene after its KO: its timeline, and where in it. */
interface After {
  readonly timeline: Timeline;
  /** Frames since the KO. */
  k: number;
  /** The winner's pose: the super's tick it landed on, the next frame's, its last; then its pose. */
  readonly koTick: number;
  readonly nextTick: number;
  readonly endTick: number;
  readonly finale: ClipId;
  /** The victim's fighter: the rival gets its own card and needle. */
  readonly victim: FighterId;
  /** Where the needle crosses the screen, once it skipped. */
  scratch: Scratch | null;
  cardReady: boolean;
  cardLook: CardLook;
  cardX: number;
  /**
   * The winner's outline, once asked of the budget (null: not yet): its energy if admitted, a
   * tone that never flashes if not.
   */
  outline: number | null;
  /** The match is over: fast-forwarded to its end, the winner posing until the results. */
  fastForwarded: boolean;
}

/** One Finisher played: from its lock to its scene's end. */
interface Take {
  readonly by: 0 | 1;
  readonly script: FinisherScript;
  readonly version: StagingVersion;
  /** Blows of its super, and how many have landed. */
  readonly blows: number;
  landed: number;
  /** Frames since the lock: the scene's clock. */
  frame: number;
  /** Frames left to hold without a tick (the count stretched). */
  hold: number;
  /** The impact the camera closes in on (world px). */
  focus: number;
  /** The zoom, once set off: from which frame, from which framing. */
  zoom: { readonly from: number; readonly closeUp: number; readonly middle: number } | null;
  after: After | null;
  /** Frames each player has held a button, for the skip. */
  readonly held: [number, number];
  /** Buttons held since before the KO: they skip nothing until let go (as PlayerInputs does). */
  readonly stale: [InputBits, InputBits];
}

/**
 * The Finisher's director (docs/finisher.md §1.14, §5.2): from the lock to the results, it plays
 * the winner's script (finisher-scripts.ts). It paces the simulation itself, a whole number of
 * ticks every frame (its track: 0, 1/3, 1/2 or 1), in place of the KO's slow motion; frames the
 * camera to its close up and out again; draws the flat, the silhouettes, the cold light, the
 * crowd, the needle, the studs and the card; plays the landing through the fight's effects (its
 * éclat, the HUD breaking, the phones), its sounds and the fight's bus; lets the humans skip it
 * once the KO has landed; then asks for the match's fast-forward and holds the winner's pose
 * before the results. Nothing it does reaches the simulation (D17): it only says how many ticks
 * a frame plays, and measures the victim's flight ahead on a copy of the state.
 */
export class FinisherScene {
  private take: Take | null = null;
  private readonly props: FinisherProps;
  private readonly crowd: Crowd;
  private readonly cards: readonly [FinisherCard, FinisherCard];
  private comfort: Comfort;
  private framing: SceneFraming | null = null;
  /** The camera's close up on the frame before: what a shake divides by. */
  private closeUpNow = 1;
  private readonly looks: [StagedLook, StagedLook] = [UNSTAGED, UNSTAGED];
  /** Ticks skipped this frame, for the fight to play without showing them. */
  private skipped = 0;
  private victoryLeft = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly cast: FinisherCast,
  ) {
    this.props = new FinisherProps(scene, cast.groundY, cast.stageWidth);
    this.crowd = new Crowd(scene, cast.groundY, cast.stageWidth);
    const card = (player: 0 | 1) => {
      const script = scriptOf(cast.fighters[player]);
      return new FinisherCard(
        scene,
        script.card,
        cast.energies[player],
        script.flats[cast.colorways[player]],
        cast.mode,
      );
    };
    this.cards = [card(0), card(1)];
    this.comfort = cast.comfort;
  }

  /**
   * The player's options, at once: « Mise en scène » for the next Finisher; the screen kept
   * still, no zoom, no shake, nothing moves in (§4.5).
   */
  setComfort(comfort: Comfort): void {
    this.comfort = comfort;
  }

  private get still(): boolean {
    return this.comfort.shake === 'off';
  }

  /** The scene paces the simulation (from its lock to the results). */
  isActive(): boolean {
    return this.take !== null || this.victoryLeft > 0;
  }

  /**
   * Nobody plays while the scene is on (§1.12: « simulation figée »; §4.4: no zoom nor shake while
   * the players have the hand): in a match the KO's round ignores them already; in training the
   * fight goes on under the scene, the dummy at 1 HP, so the fight gives the core nothing pressed,
   * neither player (a CPU dummy would walk through the card).
   */
  seizesInputs(): boolean {
    return this.cast.config.training === true && this.isActive();
  }

  /** The results wait: the scene is on, or the winner still poses. */
  holdsResults(): boolean {
    return this.isActive();
  }

  /** The card is over in a match: the fight plays it to its end, unseen (§1.10). */
  wantsFastForward(): boolean {
    const after = this.take?.after;
    return (
      !this.cast.config.training &&
      after !== undefined &&
      after !== null &&
      !after.fastForwarded &&
      after.k >= after.timeline.end
    );
  }

  /** The fight played the match to its end: the winner poses, then the results. */
  fastForwarded(): void {
    const after = this.take?.after;
    if (!after) return;
    after.fastForwarded = true;
    this.victoryLeft = VICTORY_FRAMES;
  }

  /** Where the scene frames the camera this frame; null: the fight's own framing. */
  get camera(): SceneFraming | null {
    return this.framing;
  }

  /** What the scene imposes on `player`'s drawing this frame. */
  lookOf(player: 0 | 1): StagedLook {
    return this.looks[player];
  }

  /** The ticks a skip jumped over, played by the fight without showing them; then none. */
  takeSkipped(): number {
    const ticks = this.skipped;
    this.skipped = 0;
    return ticks;
  }

  /**
   * An event of a tick the fight played (`next`: the state after it): the lock starts a take,
   * each blow of the super stamps its count and holds, its last blow (`finisherBlow`, in a match
   * as in training) sets the timeline off.
   */
  react(event: FightEvent, next: GameState, viewLeft: number): void {
    const take = this.take;
    if (event.type === 'finisherLock' && !take) {
      this.start(event.by, event.x, event.y, next, viewLeft);
      return;
    }
    if (!take || take.after) return;
    if (event.type === 'hit' && event.by === take.by && event.tier >= 3 && event.pulse) {
      take.landed++;
      take.focus = toPx(event.x);
      this.stampCount(take, event.x, event.y, viewLeft);
      if (take.version === 'full') take.hold = take.script.stretch;
    }
    if (event.type === 'finisherBlow' && event.by === take.by) {
      take.landed++;
      take.focus = toPx(event.x);
      this.knockOut(take, event, next, viewLeft);
    }
  }

  /** The ticks the next frame plays (its track), the scene's clocks moved on by that frame. */
  nextFrame(): number {
    if (this.victoryLeft > 0 && this.take?.after?.fastForwarded) {
      this.take.after.k++;
      return 1;
    }
    const take = this.take;
    if (!take) return 0;
    take.frame++;
    const { after } = take;
    if (after) {
      after.k++;
      return ticksAfterKo(after.timeline, after.k);
    }
    if (take.hold > 0) {
      take.hold--;
      return 0;
    }
    return 1;
  }

  /**
   * The frame, once its ticks are played: its camera, the fighters' looks, what it draws, its
   * sounds and its bus; `held`: what each player holds (the skip); `camera`: the frame before.
   */
  update(state: GameState, held: readonly [InputBits, InputBits], camera: CameraNow): void {
    this.props.update();
    this.closeUpNow = camera.closeUp;
    const take = this.take;
    if (!take) {
      this.idle();
      return;
    }
    // A lock that ends without its KO (never: the guarantee) leaves the scene with it.
    if (!take.after && !finisherLocked(state, take.by)) {
      this.end();
      return;
    }
    if (this.victoryLeft > 0 && take.after?.fastForwarded) {
      this.victoryLeft--;
      if (this.victoryLeft === 0) {
        this.end();
        return;
      }
    }
    this.setOffZoom(take, state, camera);
    this.frameCamera(take, camera);
    this.draw(take, state, camera);
    if (take.after) this.play(take, take.after, state, held);
    else for (const player of [0, 1] as const) take.stale[player] = held[player] & BUTTONS;
    if (take.after && this.cast.config.training && take.after.k >= take.after.timeline.end) {
      this.end();
    }
  }

  /** Everything let go: the bus whole and open, nothing shown, the camera the fight's. */
  dispose(): void {
    this.end();
  }

  private start(by: 0 | 1, x: number, y: number, state: GameState, viewLeft: number): void {
    const { cast } = this;
    const fighter = cast.fighters[by];
    const script = scriptOf(fighter);
    const training = cast.config.training === true;
    const version = versionOf(this.comfort.staging, training, cast.seen.has(fighter));
    // Training's, always short, leaves the next match's whole.
    if (!training) cast.seen.add(fighter);
    const move = cast.config.fighters[by].moves.super;
    const take: Take = {
      by,
      script,
      version,
      blows: 1 + (move?.pulses?.length ?? 0),
      landed: 1,
      frame: 0,
      hold: version === 'full' ? script.stretch : 0,
      focus: toPx(x),
      zoom: null,
      after: null,
      held: [0, 0],
      stale: [0, 0],
    };
    this.take = take;
    const attacker = state.fighters[by];
    const superName = move ? boostStamp(move.name) : undefined;
    // Its name in the place of the super's, over its head; its first blow's count over it.
    cast.feedback.finisherStamp(
      script.name,
      { by, x: attacker.x, y: attacker.y },
      viewLeft,
      script.nameTilt === undefined ? {} : { tilt: script.nameTilt },
      { replaces: superName ?? null, overHead: true },
    );
    this.stampCount(take, x, y, viewLeft);
  }

  /** The count of the blow just landed (UN, DEUX, TROIS), over its impact, in the last's place. */
  private stampCount(take: Take, x: number, y: number, viewLeft: number): void {
    const { count } = take.script;
    const word = count[take.landed - 1];
    if (word === undefined) return;
    const size = take.zoom && !this.still ? CLOSE_UP_EFFECTS : 1;
    const replaces = count[take.landed - 2] ?? null;
    this.cast.feedback.finisherStamp(
      word,
      { by: take.by, x, y },
      viewLeft,
      { size },
      {
        replaces,
        overHead: false,
      },
    );
  }

  /** The super's last blow (the KO in a match): the timeline sets off, measured on the core. */
  private knockOut(
    take: Take,
    event: Extract<FightEvent, { type: 'finisherBlow' }>,
    state: GameState,
    viewLeft: number,
  ): void {
    const { cast } = this;
    const victim = take.by === 0 ? 1 : 0;
    const timeline = timelineOf(
      take.script,
      take.version,
      measureFlight(state, take.by, cast.config),
    );
    const art = cast.arts[take.by];
    const koTick = state.fighters[take.by].actionFrame;
    const ticks = art ? clipTicksAround(art, 'super', koTick) : { next: koTick, end: koTick };
    take.after = {
      timeline,
      k: 0,
      koTick,
      nextTick: ticks.next,
      endTick: ticks.end,
      finale: art ? poseClipOf(art, 'finale') : 'victory',
      victim: cast.fighters[victim],
      scratch: null,
      cardReady: false,
      cardLook: 'lit',
      cardX: 0,
      outline: null,
      fastForwarded: false,
    };
    this.stampCount(take, event.x, event.y, viewLeft);
    // With the screen kept still, no studs fly (§4.5: « ni zoom, ni secousse, ni éclats »).
    if (take.script.shards && !this.still) {
      const strike = cast.strikes[take.by];
      if (cast.budget.admit(SHARD_AREA * CLOSE_UP_EFFECTS ** 2)) {
        const y = cast.groundY - toPx(event.y);
        this.props.burst(toPx(event.x), y, event.away, strike, CLOSE_UP_EFFECTS);
      }
    }
    cast.feedback.finisherShake(TRAUMA.ko.finale, event.away, take.script.shake, this.closeUpNow);
  }

  /** The camera sets off for its close up: on the charge before the last blow, or on the KO. */
  private setOffZoom(take: Take, state: GameState, camera: CameraNow): void {
    if (take.zoom || this.still) return;
    const charge =
      take.script.zoomFrom === 'charge' &&
      !take.after &&
      take.landed >= take.blows - 1 &&
      state.hitstop === 0;
    const ko = take.script.zoomFrom === 'ko' && take.after !== null;
    if (!charge && !ko) return;
    const middle = camera.left + VIEW_SIZE.width / camera.closeUp / 2;
    take.zoom = { from: take.frame, closeUp: camera.closeUp, middle };
    this.cast.feedback.setCloseUp(FINISHER_CLOSE_UP);
  }

  private frameCamera(take: Take, camera: CameraNow): void {
    const { zoom, after } = take;
    if (!zoom || this.still) {
      this.framing = null;
      return;
    }
    const e = easeOut(take.frame, zoom.from, ZOOM_IN);
    let closeUp = zoom.closeUp + (FINISHER_CLOSE_UP - zoom.closeUp) * e;
    let middle = zoom.middle + (take.focus - zoom.middle) * e;
    if (after && after.k >= after.timeline.release) {
      const out = easeInOut(after.k, after.timeline.release, ZOOM_OUT);
      const center = camera.viewLeft + VIEW_SIZE.width / 2;
      closeUp += (1 - closeUp) * out;
      middle += (center - middle) * out;
    }
    this.framing = { closeUp, middle };
  }

  /** The flat and what stands on it, the silhouettes and the winner's pose, the card. */
  private draw(take: Take, state: GameState, camera: CameraNow): void {
    const { cast } = this;
    const { script, after } = take;
    const flat = script.flats[cast.colorways[take.by]];
    const k = after ? after.k : null;
    const alpha = flatAlpha(script, after?.timeline ?? null, take.frame, k, this.still);
    // Riff's power cut takes the flat's place once it is gone: the stage in the dark.
    const cut = after ? powerCutOf(script, after.timeline, after.k) : 0;
    if (cut > 0) this.props.showFlat(0x000000, cut);
    else this.props.showFlat(flat, alpha);
    if (script.crowd) {
      const lift = after && !this.still ? crowdLift(after.k - after.timeline.release) : 0;
      this.crowd.update(alpha, lift);
    }
    const victim = take.by === 0 ? 1 : 0;
    if (!after) {
      this.looks[0] = UNSTAGED;
      this.looks[1] = UNSTAGED;
      return;
    }
    const { timeline } = after;
    // With the flashes off, no silhouette: its return to color would flash (§4.5).
    const shade = cast.budget.mode === 'off' ? 0 : silhouetteOf(timeline, after.k);
    const art = cast.arts[take.by];
    const pose = art
      ? winnerPoseOf(
          script,
          timeline,
          after.k,
          after.koTick,
          after.nextTick,
          after.endTick,
          after.finale,
        )
      : null;
    const outline = this.outlineOf(take.by, after, shade, flat);
    this.looks[take.by] = { pose, silhouette: shade, outline };
    this.looks[victim] = { pose: null, silhouette: shade, outline: null };
    const winnerX = toPx(state.fighters[take.by].x);
    if (script.cone) this.props.showCone(winnerX, shade, flat);
    if (script.needle) this.showNeedle(after, camera);
    this.showCard(take, after, state, camera);
  }

  /**
   * The winner's outline (§2.3, §3.3), a rise over the flat: in its energy while it stays under
   * FLASH_DELTA there; on the frame it would reach it, asked of the budget once (§4.5: in reduced
   * flashes, none counted out of the card), then in its energy if admitted, in a tone that never
   * flashes (VEIL_DELTA over the flat) if not. From the release, in that tone as it leaves with the
   * silhouette: the pose moves then, and each frame of it would light its outline anew.
   */
  private outlineOf(by: 0 | 1, after: After, shade: number, flat: number): number {
    const energy = this.cast.energies[by];
    const calm = (): number => over(energy, flat, alphaForDelta(energy, flat, VEIL_DELTA));
    if (after.k >= after.timeline.release) return calm();
    if (after.outline === null && luminanceDelta(energy, flat, shade) >= FLASH_DELTA) {
      after.outline = this.cast.budget.admit(OUTLINE_AREA) ? energy : calm();
    }
    return after.outline ?? energy;
  }

  private showNeedle(after: After, camera: CameraNow): void {
    const { k, timeline } = after;
    if (k < NEEDLE_AT || k >= timeline.release) {
      this.props.showNeedle(null, 0);
      return;
    }
    if (!after.scratch) {
      const width = VIEW_SIZE.width / camera.closeUp;
      const height = VIEW_SIZE.height / camera.closeUp;
      after.scratch = {
        x1: camera.left + width * 0.08,
        y1: camera.top + height * 0.22,
        x2: camera.left + width * 0.92,
        y2: this.cast.groundY - 4,
      };
    }
    // Against the rival, it skips again and retraces itself (§3.3).
    const rival = this.take?.script.card.rival?.fighter === after.victim && k >= RIVAL_NEEDLE_AT;
    const from = rival ? RIVAL_NEEDLE_AT : NEEDLE_AT;
    this.props.showNeedle(after.scratch, Math.min(1, (k - from + 1) / NEEDLE_FRAMES));
  }

  private showCard(take: Take, after: After, state: GameState, camera: CameraNow): void {
    const card = this.cards[take.by];
    const { timeline, k } = after;
    const shown = cardOf(timeline, k);
    // Filled with its words on its first frame, a skip past its start included.
    if (shown.shown && !after.cardReady) {
      after.cardReady = true;
      after.cardLook = this.cardLook(card, after.victim);
      const victimX = toPx(state.fighters[take.by === 0 ? 1 : 0].x);
      const half = card.width / 2 + 4;
      after.cardX = Math.min(
        Math.max(victimX, camera.viewLeft + half),
        camera.viewLeft + VIEW_SIZE.width - half,
      );
    }
    card.update(
      shown,
      after.cardX,
      this.cast.groundY - CARD_FEET,
      this.still,
      k - timeline.card.from,
    );
  }

  /** The card's look as it comes, as the budget lets it (§4.5): a counted flash, or dark. */
  private cardLook(card: FinisherCard, victim: FighterId): CardLook {
    const { budget } = this.cast;
    card.prepare(victim, 'lit');
    const lit = budget.mode !== 'off' && budget.request(card.area()) === 'lit';
    const look: CardLook = !lit ? 'dark' : budget.mode === 'reduced' ? 'fade' : 'lit';
    if (look !== 'lit') card.prepare(victim, look);
    return look;
  }

  /** After the KO: the landing, the sounds, the bus, the skip. */
  private play(
    take: Take,
    after: After,
    state: GameState,
    held: readonly [InputBits, InputBits],
  ): void {
    const { cast } = this;
    const { timeline, k } = after;
    if (k === timeline.release) this.land(take, state, false);
    for (const cue of take.script.cues) {
      if (cue.against !== undefined && cue.against !== after.victim) continue;
      const at =
        cue.at +
        (cue.moment === 'ko' ? 0 : cue.moment === 'release' ? timeline.release : timeline.end);
      if (at !== k) continue;
      // In training the dummy lands as any fall does (ko: false), with its own thud: the scene's
      // would double it.
      if (cast.config.training && cue.sound === 'fall' && at === timeline.touchdown) continue;
      cast.sfx.play(cue.sound, 1, cue.bus);
    }
    const bus = busOf(take.script, timeline, k);
    cast.sfx.setFightBus(bus.gain, bus.cutoff);
    this.skip(take, after, held, state);
  }

  /** The release: the victim's landing (Nayo's QUATRE) or Riff's reprise. */
  private land(take: Take, state: GameState, quiet: boolean): void {
    const victim = state.fighters[take.by === 0 ? 1 : 0];
    const away = victim.x >= state.fighters[take.by].x ? 1 : -1;
    const size = this.still ? 1 : CLOSE_UP_EFFECTS;
    const dust = take.script.silence === 'flight' && !this.cast.config.training;
    this.cast.feedback.finisherLanding(take.by, victim.x, away, size, { quiet, dust });
    if (!quiet) {
      const { shake } = take.script;
      this.cast.feedback.finisherShake(TRAUMA.finaleLanding, away, shake, this.closeUpNow);
    }
  }

  /**
   * The humans held a button SKIP_FRAMES frames each, after the KO: on to the card's last frames
   * (§1.14), the ticks in between played unseen; the landing breaks the HUD if it came between.
   */
  private skip(
    take: Take,
    after: After,
    held: readonly [InputBits, InputBits],
    state: GameState,
  ): void {
    for (const player of [0, 1] as const) {
      // A button held since before the KO counts once let go, then pressed again.
      take.stale[player] &= held[player];
      const fresh = held[player] & BUTTONS & ~take.stale[player];
      take.held[player] = fresh !== 0 ? take.held[player] + 1 : 0;
    }
    const { humans } = this.cast;
    // The next frame shows the first of the card's last frames.
    const target = after.timeline.end - SKIP_TO_CARD_END - 1;
    if (humans.length === 0 || after.k >= target || after.fastForwarded) return;
    if (!humans.every((player) => take.held[player] >= SKIP_FRAMES)) return;
    let ticks = 0;
    for (let k = after.k + 1; k <= target; k++) ticks += ticksAfterKo(after.timeline, k);
    this.skipped += ticks;
    if (after.k < after.timeline.release) this.land(take, state, true);
    take.frame += target - after.k;
    after.k = target;
  }

  private idle(): void {
    this.framing = null;
    this.looks[0] = UNSTAGED;
    this.looks[1] = UNSTAGED;
  }

  /** The scene over: its drawings gone, the bus whole, the camera and the effects the fight's. */
  private end(): void {
    const had = this.take !== null;
    this.take = null;
    this.victoryLeft = 0;
    this.idle();
    this.props.hide();
    this.crowd.update(0, 0);
    for (const card of this.cards)
      card.update({ shown: false, entered: 0, alpha: 0 }, 0, 0, true, 0);
    this.cast.sfx.resetFightBus();
    if (had) this.cast.feedback.setCloseUp(null);
  }
}

/**
 * Ticks from the Finisher's KO to the results at most (§1.10: its freeze, the round's end, the
 * match's), with room to spare: the fast-forward never runs on past it.
 */
const FAST_FORWARD_LIMIT = 2 * (ROUND_END_FRAMES + MATCH_END_FRAMES);

/** The match is over, and has shown its end long enough: the results may come. */
export function resultsDue(state: GameState): boolean {
  const { round } = state;
  return round.phase === 'matchEnd' && round.phaseFrame >= MATCH_END_FRAMES;
}

/**
 * The match played on unseen to its end, once the Finisher's card is over (§1.10): in its own
 * loop, not through the fixed timestep (5 ticks a frame at most would spread it over 60 frames,
 * every fall and phase sounding together), nobody pressing anything, no CPU, no event, no effect.
 */
export function playToResults(state: GameState, config: MatchConfig): GameState {
  let current = state;
  for (let i = 0; i < FAST_FORWARD_LIMIT && !resultsDue(current); i++) {
    current = step(current, [0, 0], config);
  }
  return current;
}

/** World px² Riff's studs light at most (8 diamonds of 5 × 5 px). */
const SHARD_AREA = 8 * 12.5;
/**
 * World px² the winner's 1 px outline lights at most around its held pose, measured on the
 * planches (Nayo's s4: 236, Riff's s5: 291; tests/render/finisher-flashes.test.ts).
 */
export const OUTLINE_AREA = 300;

/**
 * The KO's freeze and the victim's flight after it (§2.3: « calculé à l'avance, sur une copie de
 * l'état »): the state after the super's last blow of `by`, played on with nobody pressing
 * anything until the victim lands. Pure: the copy is the core's own step, its states immutable.
 */
export function measureFlight(state: GameState, by: 0 | 1, config: MatchConfig): Measure {
  const victim = by === 0 ? 1 : 0;
  const freeze = state.hitstop;
  let current = state;
  let airborne = current.fighters[victim].y > 0;
  for (let tick = 1; tick <= FLIGHT_LIMIT; tick++) {
    current = step(current, [0, 0], config);
    const { y } = current.fighters[victim];
    if (y > 0) airborne = true;
    else if (airborne) return { freeze, flight: Math.max(0, tick - freeze) };
  }
  return { freeze, flight: 0 };
}

/** In `clip` of `art`, the tick its frame after the one of `tick` starts on, and its end. */
function clipTicksAround(
  art: FighterArt,
  clip: ClipId,
  tick: number,
): { readonly next: number; readonly end: number } {
  const { ticks } = clipOf(art, clip);
  const index = clipFrameAt(clipOf(art, clip), tick);
  let next = 0;
  for (let i = 0; i <= index; i++) next += ticks[i] ?? 0;
  const end = ticks.reduce((sum, each) => sum + each, 0);
  return { next: Math.min(next, end), end };
}
