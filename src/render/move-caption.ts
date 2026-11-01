import type Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { moveOf } from '../core/moves';
import type { GameState } from '../core/state';
import type { Framing } from './camera-framing';
import { besideX } from './caption-stack';
import type { FightEvent } from './fight-events';
import { PIXEL_FONT } from './hud';
import { VIEW_SIZE } from './view';

/** Ticks a move's name stays on its line (docs/combat-v2.md §15). */
export const CAPTION_TICKS = 40;
/**
 * The line of the names, fixed on the screen under the HUD (view px): its top, its letters'
 * height. No sound word reaches it (docs/polish/AUDIT-ET-PLAN.md, P10).
 */
export const CAPTION_LINE = { y: 40, height: 8 } as const;
/** The highest a sound word's top may go in training: under the line, its stroke, a pixel more. */
export const UNDER_CAPTIONS = CAPTION_LINE.y + CAPTION_LINE.height + 2;
/** From the screen's edges, in view pixels. */
const LINE_MARGIN = 2;

const PLAYERS = [0, 1] as const;

interface Caption {
  readonly text: Phaser.GameObjects.Text;
  /** Match tick the move started on; -Infinity before the first. */
  since: number;
}

/**
 * Training mode only: the name of each move as it starts ("Vinyle", "Pied fendu"), for
 * CAPTION_TICKS, so a player learns what they just did: on a line fixed on the screen under the
 * HUD, above its fighter, where no sound word goes (P10). One text per fighter, created up front;
 * its string is only rewritten when the move changes.
 */
export class MoveCaption {
  private readonly captions: readonly [Caption, Caption];

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
  ) {
    // Fixed on the screen, with the HUD: its camera never zooms, the pixel font stays sharp.
    const caption = (): Caption => ({
      text: scene.add
        .text(0, CAPTION_LINE.y, '', {
          fontFamily: PIXEL_FONT,
          fontSize: '8px',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 2,
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(10)
        .setVisible(false),
      since: -Infinity,
    });
    this.captions = [caption(), caption()];
  }

  /**
   * `frame`: the match tick the event happened on. A super locked by the Finisher takes its
   * name (« Le Quatre », « Larsen »: docs/finisher.md §1.12), on its first contact only (§1.2).
   */
  react(event: FightEvent, frame: number): void {
    if (event.type !== 'attack' && event.type !== 'finisherLock') return;
    const caption = this.captions[event.by];
    const name =
      event.type === 'attack'
        ? moveOf(this.config.fighters[event.by], event.move).name
        : event.name;
    if (caption.text.text !== name) caption.text.setText(name);
    caption.since = frame;
  }

  /**
   * Each name shows for CAPTION_TICKS after its move started, on its line, above its fighter as
   * the fight's camera (`framing`) shows it, inside the screen.
   */
  update(state: GameState, framing: Framing): void {
    const { width } = VIEW_SIZE;
    for (const player of PLAYERS) {
      const { text, since } = this.captions[player];
      const shown = state.frame - since < CAPTION_TICKS;
      text.setVisible(shown);
      if (!shown) continue;
      const half = text.width / 2 + LINE_MARGIN;
      const x = (toPx(state.fighters[player].x) - framing.left) * framing.closeUp;
      text.setX(Math.round(Math.min(Math.max(x, half), width - half)));
    }
    // Both names at once, close together: the later one goes beside the other, both readable.
    const [first, second] = this.captions;
    if (!first.text.visible || !second.text.visible) return;
    const [earlier, later] = first.since <= second.since ? [first, second] : [second, first];
    const x = besideX(later.text, earlier.text, width);
    if (x !== null) later.text.setX(Math.round(x));
  }
}
