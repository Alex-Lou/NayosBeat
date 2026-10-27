import type Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { moveOf } from '../core/moves';
import type { GameState } from '../core/state';
import { MAX_CLOSE_UP } from './camera-framing';
import { DEPTH } from './depth';
import type { FightEvent } from './fight-events';
import { PIXEL_FONT } from './hud';
import { VIEW_SIZE } from './view';

/** Ticks a move's name stays over its fighter (docs/combat-v2.md §15). */
export const CAPTION_TICKS = 40;
/** Above the head, in world pixels. */
const OVER_HEAD = 10;

const PLAYERS = [0, 1] as const;

interface Caption {
  readonly text: Phaser.GameObjects.Text;
  /** Match tick the move started on; -Infinity before the first. */
  since: number;
}

/**
 * Training mode only: the name of each move as it starts ("Vinyle", "Pied fendu"), over the
 * fighter for CAPTION_TICKS, so a player learns what they just did. One text per fighter,
 * created up front; its string is only rewritten when the move changes.
 */
export class MoveCaption {
  private readonly captions: readonly [Caption, Caption];

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    private readonly groundY: number,
  ) {
    // Drawn at the fight camera's finest zoom, so the pixel font stays sharp.
    const resolution = Math.ceil((scene.scale.width / VIEW_SIZE.width) * MAX_CLOSE_UP);
    const caption = (): Caption => ({
      text: scene.add
        .text(0, 0, '', {
          fontFamily: PIXEL_FONT,
          fontSize: '8px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
          resolution,
        })
        .setOrigin(0.5, 1)
        .setDepth(DEPTH.words)
        .setVisible(false),
      since: -Infinity,
    });
    this.captions = [caption(), caption()];
  }

  /** `frame`: the match tick the event happened on. */
  react(event: FightEvent, frame: number): void {
    if (event.type !== 'attack') return;
    const caption = this.captions[event.by];
    const name = moveOf(this.config.fighters[event.by], event.move).name;
    if (caption.text.text !== name) caption.text.setText(name);
    caption.since = frame;
  }

  /** Follows the fighters; each name shows for CAPTION_TICKS after its move started. */
  update(state: GameState): void {
    for (const player of PLAYERS) {
      const { text, since } = this.captions[player];
      const shown = state.frame - since < CAPTION_TICKS;
      text.setVisible(shown);
      if (!shown) continue;
      const fighter = state.fighters[player];
      const head = toPx(fighter.y + this.config.fighters[player].standingPushbox.height);
      text.setPosition(Math.round(toPx(fighter.x)), Math.round(this.groundY - head - OVER_HEAD));
    }
  }
}
