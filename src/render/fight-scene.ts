import Phaser from 'phaser';
import { cpuStep, createCpu, type CpuState } from '../ai/cpu';
import type { Sfx } from '../audio/sfx';
import { matchConfigOf, player2Behavior, type MatchSetup } from '../app/match-setup';
import type { MatchConfig } from '../core/config';
import { SUBPIXELS_PER_PIXEL, TICK_RATE } from '../core/constants';
import type { InputBits } from '../core/input';
import { matchWinner } from '../core/round';
import { MATCH_END_FRAMES } from '../core/rules';
import { createInitialState, type FighterState, type GameState } from '../core/state';
import { step } from '../core/step';
import { assertValidMatch } from '../core/validate';
import { PauseInput } from '../input/pause-input';
import { PlayerInputs } from '../input/player-inputs';
import { isTouchDevice, TouchControls } from '../input/touch-controls';
import { FixedTimestep } from '../loop/fixed-timestep';
import { DebugOverlay, isDebugEnabled } from './debug-overlay';
import { BURSTS, Effects } from './effects';
import { detectEvents, HEAVY_HIT_DAMAGE, type FightEvent } from './fight-events';
import { FighterView } from './fighter-view';
import { requestLandscapeFullscreen } from './fullscreen';
import { Hud } from './hud';
import { ProjectileView } from './projectile-view';
import { VIEW_SIZE } from './view';

/** Caps the catch-up after a long stall (~83 ms of simulation at 60 Hz). */
const MAX_TICKS_PER_FRAME = 5;

/** The final blow plays in slow motion for a moment (display only: the simulation is intact). */
const KO_SLOW_MOTION_FRAMES = 50;
const KO_SLOW_MOTION_SCALE = 0.35;

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

/**
 * Runs the simulation at a fixed tick rate and displays it.
 * It only reads the core state: game rules live in `core/`, CPU decisions in `ai/`.
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
  private slowMotionFrames = 0;

  private inputs: PlayerInputs | undefined;
  private pauseInput: PauseInput | undefined;
  private fighterViews: [FighterView, FighterView] | undefined;
  private hud: Hud | undefined;
  private projectileView: ProjectileView | undefined;
  private effects: Effects | undefined;
  private debugOverlay: DebugOverlay | undefined;
  /** Reused every tick to avoid allocating. */
  private readonly tickInputs: [InputBits, InputBits] = [0, 0];

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
    this.slowMotionFrames = 0;
  }

  create(): void {
    const debug = isDebugEnabled();
    this.drawStage();
    this.fighterViews = [
      new FighterView(this, COLORS.player1, GROUND_Y, debug),
      new FighterView(this, COLORS.player2, GROUND_Y, debug),
    ];
    this.projectileView = new ProjectileView(this, this.config, GROUND_Y);
    this.effects = new Effects(this, GROUND_Y);
    this.hud = new Hud(this, this.config);

    const touch = isTouchDevice()
      ? new TouchControls(document.body, requestLandscapeFullscreen)
      : undefined;
    this.inputs = new PlayerInputs(window, touch);
    this.pauseInput = new PauseInput(document.body);
    if (debug) this.debugOverlay = new DebugOverlay(document.body);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dispose();
    });
    this.syncViews();
  }

  /** Resumes after the pause menu. The paused time is not simulated. */
  resumeMatch(): void {
    this.pauseInput?.reset();
    this.paused = false;
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.inputs || this.paused) return;
    if (this.pauseInput?.consume()) {
      this.paused = true;
      this.sceneData.onPause();
      return;
    }

    const timeScale = this.slowMotionFrames > 0 ? KO_SLOW_MOTION_SCALE : 1;
    if (this.slowMotionFrames > 0) this.slowMotionFrames -= 1;
    const ticks = this.timestep.advance(deltaMs * timeScale);
    const startMs = this.debugOverlay ? performance.now() : 0;

    // Devices are sampled once per display frame and held for every tick of that frame.
    const [player1, player2] = this.inputs.read();
    for (let i = 0; i < ticks; i++) {
      this.tickInputs[0] = player1;
      this.tickInputs[1] = this.cpu ? this.cpuInput(this.cpu) : player2;
      const previous = this.state;
      this.state = step(previous, this.tickInputs, this.config);
      for (const event of detectEvents(previous, this.state, this.config)) this.react(event);
    }
    this.effects?.update();

    this.debugOverlay?.record(
      { frameMs: deltaMs, ticks, tickTimeMs: performance.now() - startMs },
      this.describeState,
    );
    this.syncViews();
    this.reportMatchEnd();
  }

  private cpuInput(cpu: CpuState): InputBits {
    const decision = cpuStep(cpu, this.state, this.config);
    this.cpu = decision.cpu;
    return decision.input;
  }

  /** Sound and visual feedback for one fight event. */
  private react(event: FightEvent): void {
    const { sfx } = this.sceneData;
    const effects = this.effects;
    switch (event.type) {
      case 'hit': {
        const heavy = event.damage >= HEAVY_HIT_DAMAGE;
        effects?.burst(event.x, event.y, heavy ? BURSTS.heavyHit : BURSTS.lightHit);
        if (heavy) effects?.shake(8, 2);
        sfx.play(heavy ? 'heavyHit' : 'lightHit');
        break;
      }
      case 'block':
        effects?.burst(event.x, event.y, BURSTS.block);
        sfx.play('block');
        break;
      case 'ko':
        effects?.burst(event.x, event.y, BURSTS.ko);
        effects?.shake(24, 3);
        effects?.flash(12);
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

  private reportMatchEnd(): void {
    const round = this.state.round;
    if (this.matchEndReported || round.phase !== 'matchEnd') return;
    if (round.phaseFrame < MATCH_END_FRAMES) return;
    this.matchEndReported = true;
    this.sceneData.onMatchEnd(matchWinner(round));
  }

  private syncViews(): void {
    const [viewA, viewB] = this.fighterViews ?? [];
    const [a, b] = this.state.fighters;
    viewA?.update(a, this.config.fighters[0]);
    viewB?.update(b, this.config.fighters[1]);
    this.projectileView?.update(this.state.projectiles);
    this.hud?.update(this.state);

    const cameraLeft = this.state.cameraX / SUBPIXELS_PER_PIXEL - VIEW_SIZE.width / 2;
    const shake = this.effects?.shakeOffset() ?? { x: 0, y: 0 };
    this.cameras.main.setScroll(Math.round(cameraLeft) + shake.x, shake.y);
  }

  private dispose(): void {
    this.inputs?.dispose();
    this.inputs = undefined;
    this.pauseInput?.dispose();
    this.pauseInput = undefined;
    this.debugOverlay?.destroy();
    this.debugOverlay = undefined;
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
    const stageWidth = this.config.stage.width / SUBPIXELS_PER_PIXEL;
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
  const x = Math.round(fighter.x / SUBPIXELS_PER_PIXEL);
  const y = Math.round(fighter.y / SUBPIXELS_PER_PIXEL);
  const move = fighter.move ? ` ${fighter.move}` : '';
  return `${fighter.action}${move}[${fighter.actionFrame}] hp=${fighter.health} x=${x} y=${y}`;
}
