import Phaser from 'phaser';
import { cpuStep, createCpu, type CpuState } from '../ai/cpu';
import type { Sfx } from '../audio/sfx';
import { matchConfigOf, player2Behavior, type MatchSetup } from '../app/match-setup';
import type { MatchConfig } from '../core/config';
import { TICK_RATE, toPx } from '../core/constants';
import type { InputBits } from '../core/input';
import { matchWinner } from '../core/round';
import { MATCH_END_FRAMES } from '../core/rules';
import { createInitialState, type FighterState, type GameState } from '../core/state';
import { step } from '../core/step';
import { assertValidMatch } from '../core/validate';
import { connectedGamepads } from '../input/gamepad';
import { PauseInput } from '../input/pause-input';
import { PlayerInputs } from '../input/player-inputs';
import { isTouchDevice, TouchControls } from '../input/touch-controls';
import { FixedTimestep } from '../loop/fixed-timestep';
import { DebugOverlay, isDebugEnabled } from './debug-overlay';
import { detectEvents, type FightEvent } from './fight-events';
import { FightFeedback } from './fight-feedback';
import { FighterView } from './fighter-view';
import { requestLandscapeFullscreen } from './fullscreen';
import { Hud } from './hud';
import { ProjectileView } from './projectile-view';
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

/** Everything that exists only while the scene runs, created in `create`, freed on shutdown. */
interface Runtime {
  readonly inputs: PlayerInputs;
  readonly pauseInput: PauseInput;
  readonly fighterViews: readonly [FighterView, FighterView];
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
  private paused = false;
  private matchEndReported = false;
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
    this.timestep = new FixedTimestep(1000 / TICK_RATE, MAX_TICKS_PER_FRAME);
    const behavior = player2Behavior(data.setup);
    this.cpu = behavior === 'human' ? undefined : createCpu(1, behavior, Date.now() | 0);
    this.paused = false;
    this.matchEndReported = false;
  }

  create(): void {
    const debug = isDebugEnabled();
    this.drawStage();
    const touch = isTouchDevice()
      ? new TouchControls(document.body, requestLandscapeFullscreen)
      : undefined;

    this.runtime = {
      inputs: new PlayerInputs(window, touch, connectedGamepads()),
      pauseInput: new PauseInput(document.body),
      fighterViews: [
        new FighterView(this, COLORS.player1, GROUND_Y, debug),
        new FighterView(this, COLORS.player2, GROUND_Y, debug),
      ],
      projectileView: new ProjectileView(this, this.config, GROUND_Y),
      feedback: new FightFeedback(this, GROUND_Y, this.sceneData.sfx),
      hud: new Hud(this, this.config),
      debugOverlay: debug ? new DebugOverlay(document.body) : undefined,
    };

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dispose();
    });
    this.syncViews(this.runtime);
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

    // Devices are sampled once per display frame and held for every tick of that frame.
    const [player1, player2] = runtime.inputs.read(pads);
    for (let i = 0; i < ticks; i++) {
      this.tickInputs[0] = player1;
      this.tickInputs[1] = this.cpu ? this.cpuInput(this.cpu) : player2;
      const previous = this.state;
      this.state = step(previous, this.tickInputs, this.config);
      detectEvents(previous, this.state, this.config, this.tickEvents);
      for (const event of this.tickEvents) runtime.feedback.react(event);
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
    viewA.update(a, this.config.fighters[0]);
    viewB.update(b, this.config.fighters[1]);
    runtime.projectileView.update(this.state.projectiles);
    runtime.hud.update(this.state);

    const cameraLeft = Math.round(toPx(this.state.cameraX) - VIEW_SIZE.width / 2);
    this.cameras.main.setScroll(cameraLeft + runtime.feedback.shakeX, runtime.feedback.shakeY);
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
