import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { moveOf } from '../core/moves';
import type { GameState } from '../core/state';
import { addedDelta, brightestBackdrop } from './luminance';
import { toneColor, type MoveLight, type Signature, type Tone } from './signatures';

/**
 * The lights the moves cast around them (docs/art/nayo-vfx.md §2), pure: read from the state on
 * each tick (a move's light over its frames, a disc in flight), never interpolated (D23), nothing
 * written back (D17). From them: the pools of light on the floor, the shadows stretched away from
 * them, the glow on the opponent near them.
 */

/** A source of light, in world px: `height` over the floor; `by`, whose move lights it. */
export interface Light {
  x: number;
  height: number;
  color: number;
  /** 0 to 1. */
  strength: number;
  by: 0 | 1;
}

/** At most this many lights at once: a move's and a disc's per fighter, and the flares. */
export const MAX_LIGHTS = 8;

/** A move's light rises over this many of its frames, and fades over this many. */
const RISE = 2;
const FADE = 4;
/** A disc in flight lights this strongly. */
const DISC_STRENGTH: Readonly<Record<Tone, number>> = { energy: 0.75, platine: 1 };

/** A fixed set of lights, reused every tick: no allocation. */
export function lightPool(): Light[] {
  return Array.from({ length: MAX_LIGHTS }, () => ({
    x: 0,
    height: 0,
    color: 0,
    strength: 0,
    by: 0 as const,
  }));
}

/**
 * How strongly `light` shines on action frame `frame` of its move (0 outside its frames): up
 * over RISE frames, held, down over FADE.
 */
export function moveLightStrength(light: MoveLight, frame: number): number {
  if (frame < light.from || frame > light.to) return 0;
  const up = Math.min(1, (frame - light.from + 1) / RISE);
  const down = Math.min(1, (light.to - frame + 1) / FADE);
  return light.strength * Math.min(up, down);
}

/** How high over the feet `light` is on action frame `frame` (it may rise with the blow). */
export function moveLightHeight(light: MoveLight, frame: number): number {
  const span = light.to - light.from;
  const along = span > 0 ? Math.min(1, Math.max(0, (frame - light.from) / span)) : 0;
  return light.height + ((light.toHeight ?? light.height) - light.height) * along;
}

/**
 * Fills `out` (from `lightPool`) with the lights of the state: each fighter's move that lights
 * (`signatures`, by player; `energies`, their colors), each disc of theirs in flight. Returns how
 * many it filled.
 */
export function collectLights(
  state: GameState,
  config: MatchConfig,
  signatures: readonly [Signature | null, Signature | null],
  energies: readonly [number, number],
  out: Light[],
): number {
  let count = 0;
  const push = (by: 0 | 1, x: number, height: number, color: number, strength: number): void => {
    const light = out[count];
    if (!light || strength <= 0) return;
    light.by = by;
    light.x = x;
    light.height = height;
    light.color = color;
    light.strength = strength;
    count++;
  };
  for (const by of [0, 1] as const) {
    const signature = signatures[by];
    if (!signature) continue;
    const fighter = state.fighters[by];
    const spec = fighter.move ? signature.moves[fighter.move]?.light : undefined;
    if (spec) {
      const frame = fighter.actionFrame;
      const x = toPx(fighter.x) + fighter.facing * spec.reach;
      const height = toPx(fighter.y) + moveLightHeight(spec, frame);
      push(by, x, height, toneColor(spec.tone, energies[by]), moveLightStrength(spec, frame));
    }
  }
  for (const projectile of state.projectiles) {
    const tone = signatures[projectile.owner]?.discs[projectile.move];
    if (!tone) continue;
    const box = moveOf(config.fighters[projectile.owner], projectile.move).projectile?.hitbox;
    const height = box ? toPx(box.y + box.height / 2) : 0;
    const color = toneColor(tone, energies[projectile.owner]);
    push(projectile.owner, toPx(projectile.x), height, color, DISC_STRENGTH[tone]);
  }
  return count;
}

/** How the lights fall on one fighter, standing at x (world px). */
export interface Cast {
  /** -1 to 1: its shadow pushed to the left or to the right, and how far. */
  lean: number;
  /** The light on its body from the other fighter's moves: its color, 0 to 1. */
  glowColor: number;
  glow: number;
}

/** A light this far off (world px) shines half as much on a fighter's shadow. */
const SHADOW_REACH = 70;
/** A light right over the feet still pushes the shadow, at this many px off it fully. */
const SIDE_SOFTNESS = 12;
/** A light this high casts half the shadow a light on the floor casts. */
const SHADOW_HEIGHT = 120;
/** A light this far from the middle of a body (world px) glows on it half as much. */
const GLOW_REACH = 46;
/** The middle of a body, over its feet. */
const BODY_MIDDLE = 40;

/**
 * Fills `cast` for player `player` standing at `x`, `feet` world px over the floor, from the
 * `count` first `lights`: its shadow leans away from them, nearer and lower ones the most; the
 * other fighter's lights near it glow on it, the strongest one's color.
 */
export function castOn(
  player: 0 | 1,
  x: number,
  feet: number,
  lights: readonly Light[],
  count: number,
  cast: Cast,
): void {
  let push = 0;
  let glow = 0;
  let strongest = 0;
  cast.glowColor = 0;
  for (let i = 0; i < count; i++) {
    const light = lights[i];
    if (!light) continue;
    const dx = x - light.x;
    const near = light.strength / (1 + (dx / SHADOW_REACH) ** 2);
    const low = SHADOW_HEIGHT / (SHADOW_HEIGHT + Math.max(0, light.height - feet));
    push += near * low * (dx / (Math.abs(dx) + SIDE_SOFTNESS));
    if (light.by === player) continue;
    const distance = Math.hypot(dx, light.height - feet - BODY_MIDDLE);
    const on = light.strength / (1 + (distance / GLOW_REACH) ** 2);
    glow += on;
    if (on > strongest) {
      strongest = on;
      cast.glowColor = light.color;
    }
  }
  cast.lean = Math.max(-1, Math.min(1, push));
  cast.glow = Math.min(1, glow);
}

/** A pool of light on the floor, under a light, in world px. */
export interface Pool {
  x: number;
  width: number;
  color: number;
  /** 0 to 1: its share of the brightest a pool of its color may be. */
  weight: number;
}

/** A pool's width under a light on the floor, and how much wider each px higher makes it. */
const POOL_WIDTH = 56;
const POOL_SPREAD = 0.5;
/** A light this high lights the floor half as much. */
const POOL_HEIGHT = 90;

/** The pool under `light`, into `pool`. */
export function poolUnder(light: Light, pool: Pool): void {
  pool.x = light.x;
  pool.width = POOL_WIDTH + light.height * POOL_SPREAD;
  pool.color = light.color;
  pool.weight = light.strength * (POOL_HEIGHT / (POOL_HEIGHT + Math.max(0, light.height)));
}

/**
 * The pools drawn together never raise the floor's luminance by more than `delta` anywhere, over
 * any of the stage's colors (a glow, not a flash: docs/flashs.md §1.2). Each pool at full weight
 * is drawn at the alpha `full(color)` that alone reaches `delta` on its heart; this returns the
 * scale (0 to 1) every one of them is drawn at, so that where pools overlap, their hearts added
 * up stay within `delta`. Bound: any point lies in pools that all overlap one of them, i; their
 * hearts added up are no more than what overlaps i.
 */
export function poolScale(
  pools: readonly Pool[],
  count: number,
  full: (color: number) => number,
  stage: readonly number[],
  delta: number,
): number {
  const backdrop = brightestBackdrop(stage);
  const fits = (scale: number): boolean => {
    for (let i = 0; i < count; i++) {
      const pool = pools[i];
      if (!pool) continue;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let j = 0; j < count; j++) {
        const other = pools[j];
        if (!other || Math.abs(other.x - pool.x) >= (other.width + pool.width) / 2) continue;
        const alpha = full(other.color) * other.weight * scale;
        red += ((other.color >> 16) & 0xff) * alpha;
        green += ((other.color >> 8) & 0xff) * alpha;
        blue += (other.color & 0xff) * alpha;
      }
      const sum =
        (Math.min(255, Math.ceil(red)) << 16) |
        (Math.min(255, Math.ceil(green)) << 8) |
        Math.min(255, Math.ceil(blue));
      if (addedDelta(sum, backdrop, 1) > delta) return false;
    }
    return true;
  };
  if (fits(1)) return 1;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}
