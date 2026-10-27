import type Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import type { GameState } from '../core/state';
import { MAX_CLOSE_UP } from './camera-framing';
import { DEPTH } from './depth';
import { PIXEL_FONT } from './hud';
import { pendingHold } from './hold-ring';
import { HOLD_PROMPT } from './hud-text';
import { VIEW_SIZE } from './view';

const ARROW_AT = HOLD_PROMPT.indexOf('   ') + 1;
/**
 * Above the holder's head, over its move's name (move-caption.ts), in world pixels: the floor
 * keeps the training line and, on a phone, the thumbs' buttons.
 */
const OVER_HEAD = 24;
const MARGIN = 4;

/**
 * Training only: while a hold waits on the holder's choice, the reminder over the holder, kept
 * inside the view; its arrow points to the holder's back. Two texts written once, then only
 * moved and shown.
 */
export class HoldPrompt {
  private readonly text: Phaser.GameObjects.Text;
  private readonly arrow: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly groundY: number,
  ) {
    // Drawn at the fight camera's finest zoom, so the pixel font stays sharp.
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: PIXEL_FONT,
      fontSize: '8px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      resolution: Math.ceil((scene.scale.width / VIEW_SIZE.width) * MAX_CLOSE_UP),
    };
    const hidden = (value: string, originX: number) =>
      scene.add
        .text(0, 0, value, style)
        .setOrigin(originX, 0)
        .setDepth(DEPTH.words)
        .setVisible(false);
    this.text = hidden(HOLD_PROMPT, 0);
    this.arrow = hidden('↑', 0.5).setOrigin(0.5, 0.5);
  }

  update(state: GameState): void {
    const hold = pendingHold(state);
    if (!hold) {
      if (this.text.visible) {
        this.text.setVisible(false);
        this.arrow.setVisible(false);
      }
      return;
    }
    const holder = state.fighters[hold.holder];
    const { width, height } = this.text;
    const viewLeft = toPx(state.cameraX) - VIEW_SIZE.width / 2;
    const centered = toPx(holder.x) - width / 2;
    const left = Math.min(
      Math.max(centered, viewLeft + MARGIN),
      viewLeft + VIEW_SIZE.width - MARGIN - width,
    );
    const head = toPx(holder.y + this.config.fighters[hold.holder].standingPushbox.height);
    const top = Math.round(this.groundY - head - OVER_HEAD - height);
    // A fixed-width font: the arrow sits on its own character.
    const cell = width / HOLD_PROMPT.length;
    this.text.setPosition(Math.round(left), top).setVisible(true);
    this.arrow
      .setPosition(Math.round(left + (ARROW_AT + 0.5) * cell), top + height / 2)
      .setAngle(holder.facing === 1 ? -90 : 90)
      .setVisible(true);
  }
}
