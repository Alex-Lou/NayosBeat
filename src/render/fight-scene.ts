import Phaser from 'phaser';
import { TICK_RATE } from '../core/constants';
import { createInitialState } from '../core/state';
import { step } from '../core/step';
import { FixedTimestep } from '../loop/fixed-timestep';
import { DebugOverlay, isDebugEnabled } from './debug-overlay';
import { VIEW_SIZE } from './view';

/** Caps the catch-up after a long stall (~83 ms of simulation at 60 Hz). */
const MAX_TICKS_PER_FRAME = 5;

const GROUND_HEIGHT = 40;
const COLORS = {
  background: 0x1b1b2f,
  ground: 0x3a3a5c,
  border: 0x8888aa,
} as const;

/**
 * Runs the simulation at a fixed tick rate and displays it.
 * It only reads the core state: game rules live in `core/`.
 */
export class FightScene extends Phaser.Scene {
  private state = createInitialState();
  private readonly timestep = new FixedTimestep(1000 / TICK_RATE, MAX_TICKS_PER_FRAME);
  private debugOverlay: DebugOverlay | undefined;

  constructor() {
    super('fight');
  }

  create(): void {
    this.drawPlaceholderStage();

    if (isDebugEnabled()) {
      this.debugOverlay = new DebugOverlay(document.body);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.debugOverlay?.destroy();
        this.debugOverlay = undefined;
      });
    }
  }

  override update(_time: number, deltaMs: number): void {
    const ticks = this.timestep.advance(deltaMs);
    const startMs = this.debugOverlay ? performance.now() : 0;

    for (let i = 0; i < ticks; i++) {
      this.state = step(this.state);
    }

    this.debugOverlay?.record({
      frameMs: deltaMs,
      ticks,
      tickTimeMs: performance.now() - startMs,
      simFrame: this.state.frame,
    });
  }

  /** Static grey-box stage; the 1 px border makes scaling artifacts easy to spot. */
  private drawPlaceholderStage(): void {
    const { width, height } = VIEW_SIZE;
    this.cameras.main.setBackgroundColor(COLORS.background);

    const graphics = this.add.graphics();
    graphics.fillStyle(COLORS.ground);
    graphics.fillRect(0, height - GROUND_HEIGHT, width, GROUND_HEIGHT);
    graphics.lineStyle(1, COLORS.border);
    graphics.strokeRect(0.5, 0.5, width - 1, height - 1);
  }
}
