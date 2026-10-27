import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { GRAB_TECH_FRAMES, HOLD_LIMIT_FRAMES } from '../core/rules';
import type { GameState } from '../core/state';
import { DEPTH } from './depth';

/** Around the held fighter's body, in world pixels: its center this high above the feet. */
const RADIUS = 30;
const CENTER_HEIGHT = 40;
const WIDTH = 3;
const TRACK_ALPHA = 0.25;
const RING_ALPHA = 0.9;
/** The clinch blinks white, 10 ticks on, 10 off: three times a second, no more (WCAG 2.3.1). */
const BLINK_TICKS = 10;
const BLINK_COLOR = 0xffffff;
/** A struggle press makes the ring jump: it swells this much, back in POP_TICKS ticks. */
const POP = 0.18;
const POP_TICKS = 6;
/** The ring starts at the top and drains clockwise. */
const TOP = -90;

/**
 * The ring of a hold (docs/combat-v2.md §4.5), behind the pair, around the held fighter: in the
 * holder's color, it drains until the holder must throw; each press of the held fighter makes it
 * jump (the limit shrinks, the ring swells a moment). While the tech is possible (the clinch,
 * not on a PUNITION), it blinks white: now is the time to press PRISE. Two shapes made up front,
 * their arc reset only when it changes: nothing is allocated per frame.
 */
export class HoldRing {
  private readonly track: Phaser.GameObjects.Arc;
  private readonly ring: Phaser.GameObjects.Arc;
  private shownEnd = Number.NaN;
  private shownLimit = HOLD_LIMIT_FRAMES;
  /** The match tick of the last struggle press. */
  private poppedAt = Number.NEGATIVE_INFINITY;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly colors: readonly [number, number],
  ) {
    const arc = (alpha: number): Phaser.GameObjects.Arc => {
      const shape = scene.add.arc(0, 0, RADIUS, TOP, TOP + 360, false);
      shape.isFilled = false;
      return shape.setStrokeStyle(WIDTH, 0xffffff, alpha).setDepth(DEPTH.holdRing);
    };
    this.track = arc(TRACK_ALPHA).setVisible(false);
    this.ring = arc(RING_ALPHA).setVisible(false);
  }

  update(state: GameState): void {
    const { hold } = state;
    if (!hold) {
      if (this.ring.visible) this.hide();
      return;
    }
    if (hold.limit < this.shownLimit) this.poppedAt = state.frame;
    this.shownLimit = hold.limit;

    const held = state.fighters[hold.holder === 0 ? 1 : 0];
    const x = toPx(held.x);
    const y = this.groundY - toPx(held.y) - CENTER_HEIGHT;
    const left = Math.max(0, hold.limit - hold.frame) / HOLD_LIMIT_FRAMES;
    const end = TOP + Math.round(360 * left);
    if (end !== this.shownEnd) {
      this.ring.setEndAngle(end);
      this.shownEnd = end;
    }
    const clinch = hold.techable && hold.frame < GRAB_TECH_FRAMES;
    const blink = clinch && Math.floor(state.frame / BLINK_TICKS) % 2 === 0;
    const color = blink ? BLINK_COLOR : this.colors[hold.holder];
    const pop = 1 + POP * Math.max(0, 1 - (state.frame - this.poppedAt) / POP_TICKS);
    this.ring.setStrokeStyle(WIDTH, color, RING_ALPHA).setPosition(x, y).setScale(pop);
    this.ring.setVisible(true);
    this.track.setPosition(x, y).setVisible(true);
  }

  private hide(): void {
    this.ring.setVisible(false);
    this.track.setVisible(false);
    this.shownLimit = HOLD_LIMIT_FRAMES;
    this.poppedAt = Number.NEGATIVE_INFINITY;
  }
}
