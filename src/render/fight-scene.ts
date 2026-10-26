import Phaser from 'phaser';
import { cpuStep, createCpu, type CpuState } from '../ai/cpu';
import { artOf } from '../art';
import type { FighterArt } from '../art/types';
import { assertValidArt } from '../art/validate';
import type { Sfx } from '../audio/sfx';
import { matchConfigOf, player2Behavior, type MatchSetup } from '../app/match-setup';
import type { FighterTemplate, MatchConfig } from '../core/config';
import { TICK_RATE, toPx } from '../core/constants';
import type { InputBits } from '../core/input';
import { matchWinner } from '../core/round';
import { MATCH_END_FRAMES } from '../core/rules';
import {
  createInitialState,
  type FighterState,
  type GameState,
  type RoundState,
} from '../core/state';
import { step } from '../core/step';
import { assertValidMatch } from '../core/validate';
import { connectedGamepads } from '../input/gamepad';
import { PauseInput } from '../input/pause-input';
import { PlayerInputs } from '../input/player-inputs';
import { isTouchDevice, TouchControls } from '../input/touch-controls';
import { FixedTimestep } from '../loop/fixed-timestep';
import { frontFighter } from './animation';
import { frameFight, MAX_CLOSE_UP } from './camera-framing';
import { DebugOverlay, isDebugEnabled } from './debug-overlay';
import { detectEvents, type FightEvent } from './fight-events';
import { FightFeedback } from './fight-feedback';
import { FighterView } from './fighter-view';
import { hitStyleOf, type HitStyle } from './hit-styles';
import { requestLandscapeFullscreen } from './fullscreen';
import { Hud } from './hud';
import { ProjectileView } from './projectile-view';
import { loadArt, SpriteFighterView } from './sprite-fighter-view';
import { VIEW_SIZE } from './view';

/** Caps the catch-up after a long stall (~83 ms of simulation at 60 Hz). */
const MAX_TICKS_PER_FRAME = 5;

const GROUND_HEIGHT = 40;
const GROUND_Y = VIEW_SIZE.height - GROUND_HEIGHT;
const GROUND_MARK_SPACING = 32;
const GROUND_MARK_SIZE = 2;

const COLORS = {
  background: 0x1b1b2f,
  ground: 0x3a3a5c,
  groundMark: 0x50507a,
  border: 0x8888aa,
  player1: 0xd9574a,
  player2: 0x4a8fd9,
} as const;

export interface FightSceneData {
  readonly setup: MatchSetup;
  readonly sfx: Sfx;
  readonly onPause: () => void;
  /** Called once, a moment after the final KO, with the winner's index. */
  readonly onMatchEnd: (winner: 0 | 1 | null) => void;
}

/** A fighter on screen: sprites when it has art, a grey box otherwise. */
interface FighterDisplay {
  update(fighter: FighterState, template: FighterTemplate, round: RoundState): void;
  setFront(front: boolean): void;
}

/** Everything that exists only while the scene runs, created in `create`, freed on shutdown. */
interface Runtime {
  readonly inputs: PlayerInputs;
  readonly pauseInput: PauseInput;
  readonly fighterViews: readonly [FighterDisplay, FighterDisplay];
  readonly projectileView: ProjectileView;
  readonly feedback: FightFeedback;
  readonly hud: Hud;
  readonly debugOverlay: DebugOverlay | undefined;
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
    this.drawStage();
    const touch = isTouchDevice()
      ? new TouchControls(document.body, requestLandscapeFullscreen)
      : undefined;

    this.runtime = {
      inputs: new PlayerInputs(window, touch, connectedGamepads()),
      pauseInput: new PauseInput(document.body),
      fighterViews: [
        this.fighterDisplay(0, COLORS.player1, debug),
        this.fighterDisplay(1, COLORS.player2, debug),
      ],
      projectileView: new ProjectileView(this, this.config, GROUND_Y, this.arts),
      feedback: new FightFeedback(this, GROUND_Y, this.sceneData.sfx, this.styles),
      hud: new Hud(this, this.config),
      debugOverlay: debug ? new DebugOverlay(document.body) : undefined,
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dispose();
    });
    this.addScreenCamera();
    this.syncViews(this.runtime);
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

  private fighterDisplay(player: 0 | 1, color: number, debug: boolean): FighterDisplay {
    const art = this.arts[player];
    return art
      ? new SpriteFighterView(this, art, player, GROUND_Y, debug)
      : new FighterView(this, color, GROUND_Y, debug);
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
        for (const event of this.tickEvents) runtime.feedback.react(event);
      }
    }
    runtime.feedback.update();

    runtime.debugOverlay?.record(
      { frameMs: deltaMs, ticks, tickTimeMs: performance.now() - startMs },
      this.describeState,
    );
    this.syncViews(runtime);
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

  private syncViews(runtime: Runtime): void {
    const [viewA, viewB] = runtime.fighterViews;
    const [a, b] = this.state.fighters;
    this.front = frontFighter(this.front, a, b);
    viewA.setFront(this.front === 0);
    viewB.setFront(this.front === 1);
    viewA.update(a, this.config.fighters[0], this.state.round);
    viewB.update(b, this.config.fighters[1], this.state.round);
    runtime.projectileView.update(this.state.projectiles, this.state.frame);
    runtime.hud.update(this.state);

    const framing = frameFight({
      xs: [
        ...this.state.fighters.map((fighter) => toPx(fighter.x)),
        ...this.state.projectiles.map((projectile) => toPx(projectile.x)),
      ],
      highestFeet: Math.max(...this.state.fighters.map((fighter) => toPx(fighter.y))),
      viewLeft: toPx(this.state.cameraX) - VIEW_SIZE.width / 2,
      groundY: GROUND_Y,
      closeUp: this.closeUp,
    });
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

  private readonly describeState = (): string => {
    const [a, b] = this.state.fighters;
    return [
      `frame  ${this.state.frame}  ${this.state.round.phase}  hitstop=${this.state.hitstop}`,
      `P1     ${describeFighter(a)}`,
      `P2     ${describeFighter(b)}`,
    ].join('\n');
  };

  /** Static grey-box stage; the 1 px screen border makes scaling artifacts easy to spot. */
  private drawStage(): void {
    const stageWidth = toPx(this.config.stage.width);
    this.cameras.main.setBackgroundColor(COLORS.background);

    const ground = this.add.graphics();
    ground.fillStyle(COLORS.ground);
    ground.fillRect(0, GROUND_Y, stageWidth, GROUND_HEIGHT);
    ground.fillStyle(COLORS.groundMark);
    for (let x = 0; x <= stageWidth; x += GROUND_MARK_SPACING) {
      ground.fillRect(x, GROUND_Y + GROUND_MARK_SIZE, GROUND_MARK_SIZE, GROUND_MARK_SIZE);
    }

    const border = this.add.graphics().setScrollFactor(0).setDepth(1);
    border.lineStyle(1, COLORS.border);
    border.strokeRect(0.5, 0.5, VIEW_SIZE.width - 1, VIEW_SIZE.height - 1);
  }
}

function describeFighter(fighter: FighterState): string {
  const x = Math.round(toPx(fighter.x));
  const y = Math.round(toPx(fighter.y));
  const move = fighter.move ? ` ${fighter.move}` : '';
  return `${fighter.action}${move}[${fighter.actionFrame}] hp=${fighter.health} x=${x} y=${y}`;
}
