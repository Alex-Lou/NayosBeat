/**
 * The light a fighter's effects shed on their own body (docs/art/nayo-essence.md): the generator
 * knows where every effect of a frame is, so each one becomes a light, in its color, with a reach
 * and a power that follow its size and its life (a ring fading out lights less). The body is shaded
 * by them in raster.ts (`EffectLighting`), and the light stays frozen in the sprite: nothing is
 * computed in the game.
 */

import { ANCHOR, ART_SCALE } from '../../src/art/types.ts';
import type { EffectLight } from './raster.ts';
import type { Effect, Glow, Pose } from './skeleton.ts';

const S = ART_SCALE;

/**
 * The lights of a frame, in world pixels (character space): those of its effects, then its own
 * glows. Floor dust and the guard's arc give none.
 */
export function glowsOf(pose: Pose): Glow[] {
  return [...(pose.effects ?? []).flatMap(glowsOfEffect), ...(pose.glows ?? [])];
}

/** The light of one effect (see glowsOf). */
export function glowsOfEffect(effect: Effect): Glow[] {
  switch (effect.kind) {
    case 'disc':
      // A record of light in the hand: it lights the glove, the forearm, the jaw.
      return [glow(effect.center, effect.radius * 4 + 8, 1.05, effect.tone)];
    case 'energy':
      return [glow(effect.center, effect.radius * 4 + 8, 1.1, effect.tone)];
    case 'flash':
      return [glow(effect.center, effect.radius * 3.5 + 8, 1.3, effect.tone)];
    case 'ring': {
      const fading = 1 - effect.progress;
      return [glow(effect.center, Math.min(effect.radius, 24) + 6, 0.5 * fading, effect.tone)];
    }
    case 'speed':
      return [glow(effect.center, effect.length * 1.2 + 4, 0.4, effect.tone)];
    case 'column': {
      // A column of light: three lights up its lit height, fading as it dies down.
      const fading = 1 - effect.progress * 0.6;
      return [0.15, 0.45, 0.8].map((t) =>
        glow(
          { x: effect.base.x, y: effect.base.y + effect.height * t },
          effect.width * 2.5 + 10,
          1.1 * fading,
          effect.tone,
        ),
      );
    }
    case 'shards':
      return [glow(effect.center, effect.radius + 4, 0.55 * (1 - effect.progress), effect.tone)];
    case 'smear': {
      // A trail glows faintly where the limb is (its last point).
      const head = effect.points[effect.points.length - 1];
      return head ? [glow(head, effect.width * 3 + 6, 0.35, effect.tone)] : [];
    }
    case 'grooves':
      return [glow(effect.center, effect.radius + 4, 0.3 * (1 - effect.progress), effect.tone)];
    case 'arc': {
      const mid = { x: (effect.from.x + effect.to.x) / 2, y: (effect.from.y + effect.to.y) / 2 };
      return [
        glow(effect.from, 16, 0.65, effect.tone),
        glow(mid, 20, 0.85, effect.tone),
        glow(effect.to, 18, 0.75, effect.tone),
      ];
    }
    case 'plasma':
      return [glow(effect.center, effect.radius * 2.4 + 10, 1.15, effect.tone)];
    case 'shield':
    case 'dust':
    case 'notes':
      return [];
  }
}

/**
 * The lights of a frame drawn in the cell whose left edge is `cellX` of a canvas, in its pixels;
 * only those that light something.
 */
export function effectLightsOf(pose: Pose, cellX: number, cellSize: number): EffectLight[] {
  return glowsOf(pose)
    .filter(({ power, reach }) => power > 0 && reach > 0)
    .map(({ center, reach, power, tone }) => ({
      x: cellX + ANCHOR.x + center.x * S,
      y: ANCHOR.y - center.y * S,
      reach: reach * S,
      power,
      color: tone,
      left: cellX,
      right: cellX + cellSize,
    }));
}

function glow(
  center: Glow['center'],
  reach: number,
  power: number,
  tone: Glow['tone'] = 'sound',
): Glow {
  return { center, reach, power, tone };
}
