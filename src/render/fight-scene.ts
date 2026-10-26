import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { SUBPIXELS_PER_PIXEL, TICK_RATE } from '../core/constants';
import { createInitialState, type FighterState } from '../core/state';
import { step } from '../core/step';
import { assertValidTemplates } from '../core/validate';
import { POLYVALENT, RUSHDOWN } from '../data/fighters';
import { TRAINING_STAGE } from '../data/stages';
import { PlayerInputs } from '../input/player-inputs';
import { isTouchDevice, TouchControls } from '../input/touch-controls';
import { FixedTimestep } from '../loop/fixed-timestep';
import { DebugOverlay, isDebugEnabled } from './debug-overlay';
import { FighterView } from './fighter-view';
import { requestLandscapeFullscreen } from './fullscreen';
import { Hud } from './hud';
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

const MATCH: MatchConfig = {
  stage: TRAINING_STAGE,
  fighters: [POLYVALENT, RUSHDOWN],
};
assertValidTemplates(MATCH.fighters);

/**
 * Runs the simulation at a fixed tick rate and displays it.
 * It only reads the core state: game rules live in `core/`.
 */
export class FightScene extends Phaser.Scene {
  private state = createInitialState(MATCH);
  private readonly timestep = new FixedTimestep(1000 / TICK_RATE, MAX_TICKS_PER_FRAME);
  private inputs: PlayerInputs | undefined;
  private fighterViews: [FighterView, FighterView] | undefined;
  private hud: Hud | undefined;
  private debugOverlay: DebugOverlay | undefined;

  constructor() {
    super('fight');
  }

  create(): void {
    const debug = isDebugEnabled();
    this.drawStage();
    this.fighterViews = [
      new FighterView(this, COLORS.player1, GROUND_Y, debug),
      new FighterView(this, COLORS.player2, GROUND_Y, debug),
    ];
    this.hud = new Hud(this, MATCH);

    const touch = isTouchDevice()
      ? new TouchControls(document.body, requestLandscapeFullscreen)
      : undefined;
    this.inputs = new PlayerInputs(window, touch);

    if (debug) this.debugOverlay = new DebugOverlay(document.body);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.dispose, this);
    this.syncViews();
  }

  override update(_time: number, deltaMs: number): void {
    if (!this.inputs) return;

    const ticks = this.timestep.advance(deltaMs);
    const startMs = this.debugOverlay ? performance.now() : 0;

    // Devices are sampled once per display frame and held for every tick of that frame.
    const inputs = this.inputs.read();
    for (let i = 0; i < ticks; i++) {
      this.state = step(this.state, inputs, MATCH);
    }

    this.debugOverlay?.record(
      { frameMs: deltaMs, ticks, tickTimeMs: performance.now() - startMs },
      this.describeState,
    );
    this.syncViews();
  }

  private syncViews(): void {
    const [viewA, viewB] = this.fighterViews ?? [];
    const [a, b] = this.state.fighters;
    viewA?.update(a, MATCH.fighters[0]);
    viewB?.update(b, MATCH.fighters[1]);
    this.hud?.update(this.state);

    const cameraLeft = this.state.cameraX / SUBPIXELS_PER_PIXEL - VIEW_SIZE.width / 2;
    this.cameras.main.setScroll(Math.round(cameraLeft), 0);
  }

  private dispose(): void {
    this.inputs?.dispose();
    this.inputs = undefined;
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
    const stageWidth = MATCH.stage.width / SUBPIXELS_PER_PIXEL;
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
