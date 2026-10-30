import Phaser from 'phaser';
import { cpuStep, createCpu, type CpuState } from '../ai/cpu';
import { artOf } from '../art';
import type { FighterArt } from '../art/types';
import { assertValidArt } from '../art/validate';
import type { Sfx } from '../audio/sfx';
import { matchConfigOf, player2Behavior, type MatchSetup } from '../app/match-setup';
import type { MatchConfig } from '../core/config';
import { TICK_RATE, toPx } from '../core/constants';
import type { InputBits } from '../core/input';
import { matchWinner } from '../core/round';
import { MATCH_END_FRAMES } from '../core/rules';
import { createInitialState, type GameState } from '../core/state';
import { step } from '../core/step';
import { assertValidMatch } from '../core/validate';
import { connectedGamepads } from '../input/gamepad';
import { PauseInput } from '../input/pause-input';
import { vibrate } from '../input/haptics';
import { PlayerInputs } from '../input/player-inputs';
import { isTouchDevice, TouchControls } from '../input/touch-controls';
import { FixedTimestep } from '../loop/fixed-timestep';
import { frontFighter } from './animation';
import { BoxOverlay } from './box-overlay';
import { frameFight, MAX_CLOSE_UP, type FramingInput } from './camera-framing';
import { DebugOverlay, describeGame, isDebugEnabled } from './debug-overlay';
import { detectEvents, type FightEvent } from './fight-events';
import { FightFeedback } from './fight-feedback';
import { FighterView } from './fighter-view';
import { drawGreyboxStage, GROUND_Y } from './greybox-stage';
import { hitStyleOf, hudColorOf, type HitStyle } from './hit-styles';
import { requestLandscapeFullscreen } from './fullscreen';
import { HoldPrompt } from './hold-prompt';
import { HoldRing } from './hold-ring';
import { Hud } from './hud';
import { MoveCaption } from './move-caption';
import { ProjectileView } from './projectile-view';
import { loadArt } from './art-textures';
import { SpriteFighterView } from './sprite-fighter-view';
import { VIEW_SIZE } from './view';

/** Caps the catch-up after a long stall (~83 ms of simulation at 60 Hz). */
const MAX_TICKS_PER_FRAME = 5;

/** Grey boxes of the fighters without art. */
const COLORS = { player1: 0xd9574a, player2: 0x4a8fd9 } as const;

export interface FightSceneData {
  readonly setup: MatchSetup;
  readonly sfx: Sfx;
  readonly onPause: () => void;
  /** Called once, a moment after the final KO, with the winner's index. */
  readonly onMatchEnd: (winner: 0 | 1 | null) => void;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** A fighter on screen: sprites when it has art, a grey box otherwise. */
interface FighterDisplay {
  update(state: GameState): void;
  setFront(front: boolean): void;
}

/** Everything that exists only while the scene runs, created in `create`, freed on shutdown. */
interface Runtime {
  readonly inputs: PlayerInputs;
  /** Player 1's touch controls, on a touch device: the BOOST button wears its gauge. */
  readonly touch: TouchControls | undefined;
  readonly pauseInput: PauseInput;
  readonly fighterViews: readonly [FighterDisplay, FighterDisplay];
  readonly projectileView: ProjectileView;
  readonly feedback: FightFeedback;
  readonly hud: Hud;
  /** The time a hold has left, around the fighter held. */
  readonly holdRing: HoldRing;
  /** Training only: the name of each move as it starts, the buttons of a hold. */
  readonly caption: MoveCaption | undefined;
  readonly holdPrompt: HoldPrompt | undefined;
  /** Debug only: the statistics, and every box. */
  readonly debugOverlay: DebugOverlay | undefined;
  readonly boxOverlay: BoxOverlay | undefined;
}

/**
 * Runs one match: reads the players (or the CPU), advances the simulation at a fixed tick
 * rate and displays it. Game rules live in `core/`, CPU decisions in `ai/`, effects and
 * sounds in `FightFeedback`: this scene only orchestrates them.
 */
export class FightScene extends Phaser.Scene {
  private sceneData!: FightSceneData;
  private config!: MatchConfig;
  private state!: GameState;
  private timestep!: FixedTimestep;
  /**
   * Visual effects count steps of 1/60 s (their durations are written in 60 Hz frames), not
   * display frames: a KO lasts as long on a 144 Hz screen as on a 60 Hz one. Unscaled by slow
   * motion, which only slows the simulation.
   */
  private visualClock!: FixedTimestep;
  /** Player 2's CPU, unless a human plays it. */
  private cpu: CpuState | undefined;
  private arts: readonly [FighterArt | undefined, FighterArt | undefined] = [undefined, undefined];
  private styles!: readonly [HitStyle, HitStyle];
  private paused = false;
  private matchEndReported = false;
  /** The fighter drawn over the other one. */
  private front: 0 | 1 = 0;
  /** Current close-up of the fight camera (see frameFight). */
  private closeUp = MAX_CLOSE_UP;
  private runtime: Runtime | undefined;

  /** Reused every tick to avoid allocating. */
  private readonly tickInputs: [InputBits, InputBits] = [0, 0];
  private readonly tickEvents: FightEvent[] = [];
  /**
   * Reused every display frame by `syncViews`. What the framing keeps in view: both fighters,
   * then the projectiles (at most one per player). A missing projectile repeats the first
   * fighter's position, which moves neither bound.
   */
  private readonly framedXs: [number, number, number, number] = [0, 0, 0, 0];
  private readonly framingInput: Mutable<FramingInput> = {
    xs: this.framedXs,
    highestFeet: 0,
    viewLeft: 0,
    groundY: GROUND_Y,
    closeUp: MAX_CLOSE_UP,
    elapsed: 0,
  };

  constructor() {
    super('fight');
  }

  /** Called on every (re)start: resets everything that belongs to one match. */
  init(data: FightSceneData): void {
    this.sceneData = data;
    this.config = matchConfigOf(data.setup);
    assertValidMatch(this.config);
    this.state = createInitialState(this.config);
    // In a mirror match, player 2 wears the second colorway.
    const [first, second] = data.setup.fighters;
    const colorway = first === second ? 'alt' : 'main';
    this.arts = [artOf(first), artOf(second, colorway)];
    this.styles = [hitStyleOf(first), hitStyleOf(second, colorway)];
    for (const player of [0, 1] as const) {
      const art = this.arts[player];
      if (art) assertValidArt(art, this.config.fighters[player]);
    }
    this.timestep = new FixedTimestep(1000 / TICK_RATE, MAX_TICKS_PER_FRAME);
    this.visualClock = new FixedTimestep(1000 / TICK_RATE, MAX_TICKS_PER_FRAME);
    const behavior = player2Behavior(data.setup);
    this.cpu = behavior === 'human' ? undefined : createCpu(1, behavior, Date.now() | 0);
    this.paused = false;
    this.matchEndReported = false;
    this.front = 0;
    this.closeUp = MAX_CLOSE_UP;
  }

  preload(): void {
    for (const art of this.arts) if (art) loadArt(this, art);
  }

  create(): void {
    const debug = isDebugEnabled();
    // Everything is placed in world pixels; the canvas is finer (see renderScaleFor). With the
    // origin at the top left, the scroll stays the world x of the screen's left edge.
    this.cameras.main.setZoom(this.scale.width / VIEW_SIZE.width).setOrigin(0, 0);
    drawGreyboxStage(this, toPx(this.config.stage.width));
    const touch = isTouchDevice()
      ? new TouchControls(document.body, requestLandscapeFullscreen, this.styles[0].energy)
      : undefined;

    this.runtime = {
      inputs: new PlayerInputs(window, touch, connectedGamepads()),
      touch,
      pauseInput: new PauseInput(document.body),
      fighterViews: [
        this.fighterDisplay(0, COLORS.player1),
        this.fighterDisplay(1, COLORS.player2),
      ],
      projectileView: new ProjectileView(this, this.config, GROUND_Y, this.arts),
      // Touch is player 1's: its phone vibrates when player 1 is grabbed or hit hard.
      feedback: new FightFeedback(
        this,
        GROUND_Y,
        this.sceneData.sfx,
        this.styles,
        touch ? vibrate : undefined,
      ),
      hud: new Hud(this, this.config, [hudColorOf(this.styles[0]), hudColorOf(this.styles[1])]),
      holdRing: new HoldRing(this, GROUND_Y, [this.styles[0].energy, this.styles[1].energy]),
      caption: this.config.training ? new MoveCaption(this, this.config, GROUND_Y) : undefined,
      holdPrompt: this.config.training ? new HoldPrompt(this, this.config, GROUND_Y) : undefined,
      debugOverlay: debug ? new DebugOverlay(document.body) : undefined,
      boxOverlay: debug ? new BoxOverlay(this, this.config, GROUND_Y) : undefined,
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dispose();
    });
    this.addScreenCamera();
    this.syncViews(this.runtime, 0);
  }

  /**
   * The main camera frames the fight and zooms (see frameFight); what is fixed on screen (HUD,
   * border, flash: scroll factor 0) is drawn by a second camera that never zooms. Every object
   * exists from here on (pools), so each is given to its camera once.
   */
  private addScreenCamera(): void {
    const main = this.cameras.main;
    const screen = this.cameras
      .add(0, 0, this.scale.width, this.scale.height)
      .setZoom(this.scale.width / VIEW_SIZE.width)
      .setOrigin(0, 0);
    for (const object of this.children.list) {
      const fixed = (object as { scrollFactorX?: number }).scrollFactorX === 0;
      (fixed ? main : screen).ignore(object);
    }
  }

  private fighterDisplay(player: 0 | 1, color: number): FighterDisplay {
    const art = this.arts[player];
    return art
      ? new SpriteFighterView(this, art, player, GROUND_Y, this.styles[player].energy, this.config)
      : new FighterView(this, color, GROUND_Y, player, this.config.fighters[player]);
  }

  /** Resumes after the pause menu. The paused time is not simulated. */
  resumeMatch(): void {
    if (!this.runtime) return;
    // Keys and buttons used in the menu must not reach the fighters, nor pause again.
    this.runtime.inputs.reset(connectedGamepads());
    this.runtime.pauseInput.reset();
    this.paused = false;
  }

  override update(_time: number, deltaMs: number): void {
    const runtime = this.runtime;
    if (!runtime || this.paused) return;

    const pads = connectedGamepads();
    // Once the results screen is up, there is nothing left to pause.
    if (!this.matchEndReported && runtime.pauseInput.consume(pads)) {
      this.paused = true;
      this.sceneData.onPause();
      return;
    }

    const visualFrames = this.visualClock.advance(deltaMs);
    const ticks = this.timestep.advance(deltaMs * runtime.feedback.timeScale());
    const startMs = runtime.debugOverlay ? performance.now() : 0;

    // Devices are sampled once per display frame and held for every tick of that frame. Above
    // 60 Hz some frames run no tick: reading then would drop a quick tap no tick ever sees.
    if (ticks > 0) {
      const [player1, player2] = runtime.inputs.read(pads);
      for (let i = 0; i < ticks; i++) {
        this.tickInputs[0] = player1;
        this.tickInputs[1] = this.cpu ? this.cpuInput(this.cpu) : player2;
        const previous = this.state;
        this.state = step(previous, this.tickInputs, this.config);
        detectEvents(previous, this.state, this.config, this.tickEvents);
        const viewLeft = toPx(this.state.cameraX) - VIEW_SIZE.width / 2;
        runtime.feedback.beginTick();
        for (const event of this.tickEvents) {
          if (event.type === 'ko') runtime.hud.knockOut(event.by === 0 ? 1 : 0, event.finish);
          runtime.feedback.react(event, viewLeft);
          runtime.caption?.react(event, this.state.frame);
        }
      }
    }
    runtime.feedback.update(visualFrames);

    runtime.debugOverlay?.record(
      { frameMs: deltaMs, ticks, tickTimeMs: performance.now() - startMs },
      this.describeState,
    );
    this.syncViews(runtime, deltaMs / (1000 / TICK_RATE));
    this.reportMatchEnd();
  }

  private cpuInput(cpu: CpuState): InputBits {
    const decision = cpuStep(cpu, this.state, this.config);
    this.cpu = decision.cpu;
    return decision.input;
  }

  private reportMatchEnd(): void {
    const round = this.state.round;
    if (this.matchEndReported || round.phase !== 'matchEnd') return;
    if (round.phaseFrame < MATCH_END_FRAMES) return;
    this.matchEndReported = true;
    this.sceneData.onMatchEnd(matchWinner(round));
  }

  /** `elapsed`: time since the previous frame, in 1/60 s (for the camera's easing). */
  private syncViews(runtime: Runtime, elapsed: number): void {
    const [viewA, viewB] = runtime.fighterViews;
    const [a, b] = this.state.fighters;
    this.front = frontFighter(this.front, a, b);
    viewA.setFront(this.front === 0);
    viewB.setFront(this.front === 1);
    viewA.update(this.state);
    viewB.update(this.state);
    runtime.projectileView.update(this.state.projectiles, this.state.frame);
    runtime.hud.update(this.state);
    runtime.touch?.showBoost(a.boost);
    runtime.holdRing.update(this.state);
    runtime.caption?.update(this.state);
    runtime.holdPrompt?.update(this.state);
    runtime.boxOverlay?.update(this.state);

    const xs = this.framedXs;
    const projectiles = this.state.projectiles;
    xs[0] = toPx(a.x);
    xs[1] = toPx(b.x);
    xs[2] = projectiles[0] ? toPx(projectiles[0].x) : xs[0];
    xs[3] = projectiles[1] ? toPx(projectiles[1].x) : xs[0];
    const input = this.framingInput;
    input.highestFeet = toPx(Math.max(a.y, b.y));
    input.viewLeft = toPx(this.state.cameraX) - VIEW_SIZE.width / 2;
    input.closeUp = this.closeUp;
    input.elapsed = elapsed;
    const framing = frameFight(input);
    this.closeUp = framing.closeUp;
    this.cameras.main
      .setZoom((this.scale.width / VIEW_SIZE.width) * framing.closeUp)
      .setScroll(framing.left + runtime.feedback.shakeX, framing.top + runtime.feedback.shakeY);
  }

  /** DOM elements and listeners live outside Phaser: they must be released explicitly. */
  private dispose(): void {
    if (!this.runtime) return;
    this.runtime.inputs.dispose();
    this.runtime.pauseInput.dispose();
    this.runtime.debugOverlay?.destroy();
    this.runtime = undefined;
  }

  private readonly describeState = (): string => describeGame(this.state);
}
