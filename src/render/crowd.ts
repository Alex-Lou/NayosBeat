import type Phaser from 'phaser';
import { DEPTH } from './depth';

/**
 * Riff's crowd (docs/finisher.md §3.5), until L'Entrepôt's of phase 6: two rows of black
 * silhouettes drawn by the code at the foot of her flat, behind the fighters. On the reprise they
 * jump once, all together: 6 px up in 4 frames, back down in 8. Black on a dark flat (ΔL about
 * 0.02): neither a pattern nor a flash. Drawn once; only its place and opacity change.
 */

/** A figure of the crowd: its head's center (x from the stage's left, y up from the floor). */
export interface Figure {
  readonly x: number;
  readonly y: number;
  readonly head: number;
  readonly shoulders: number;
}

/** The jump, in world pixels and frames (still: none). */
export const CROWD_JUMP = { height: 6, up: 4, down: 8 } as const;
const COLOR = 0x000000;
/** The back row stands higher, the front one lower and wider apart. */
const ROWS = [
  { spacing: 13, offset: 0, y: 34, head: 4, shoulders: 13 },
  { spacing: 16, offset: 7, y: 24, head: 5, shoulders: 16 },
] as const;
/** A fixed sway of heights, never chance: the same crowd every time. */
const SWAY = [0, 2, -1, 3, 1, -2, 2, 0, -1, 1] as const;

/** The figures across `width` world pixels of stage, back row first. */
export function crowdFigures(width: number): Figure[] {
  return ROWS.flatMap((row) => {
    const figures: Figure[] = [];
    for (let i = 0, x = row.offset; x < width; i++, x += row.spacing) {
      const sway = SWAY[i % SWAY.length] ?? 0;
      figures.push({ x, y: row.y + sway, head: row.head, shoulders: row.shoulders });
    }
    return figures;
  });
}

/** How high the crowd stands `since` frames after the reprise: up, then down, once. */
export function crowdLift(since: number): number {
  const { height, up, down } = CROWD_JUMP;
  if (since < 0 || since >= up + down) return 0;
  if (since < up) return Math.round((height * (since + 1)) / up);
  return Math.round(height * (1 - (since - up + 1) / down));
}

export class Crowd {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    stageWidth: number,
  ) {
    this.graphics = scene.add
      .graphics()
      .setDepth(DEPTH.flat + 0.01)
      .setVisible(false);
    this.graphics.fillStyle(COLOR);
    for (const { x, y, head, shoulders } of crowdFigures(stageWidth)) {
      // Shoulders down to the floor, then the head over them.
      this.graphics.fillRect(x - shoulders / 2, -y + head, shoulders, y - head);
      this.graphics.fillCircle(x, -y, head);
    }
  }

  /** `alpha`: the flat's, which it stands on; `lift`: its jump (crowdLift). */
  update(alpha: number, lift: number): void {
    this.graphics
      .setVisible(alpha > 0)
      .setAlpha(alpha)
      .setY(this.groundY - lift);
  }
}
