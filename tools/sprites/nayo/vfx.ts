/**
 * Nayo's effects, in his two colors: sound (waves, energy, the uppercut's column) and strike
 * (impacts, flashes, motion trails); the second colorway swaps them. Effects are drawn in exact
 * palette slots, never shaded nor outlined: crisp shapes in three or four tones, with a
 * translucent glow at their edge.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import type { PixelCanvas, Point } from '../raster.ts';
import type { Effect, Tone } from '../skeleton.ts';
import { DETAIL } from './palette.ts';

const S = ART_SCALE;

/** Tones of a color, deepest to brightest, then the translucent glow. */
type Tones = readonly [deep: number, base: number, light: number, core: number, glow: number];

const TONES: Readonly<Record<Tone, Tones>> = {
  sound: [DETAIL.soundDeep, DETAIL.sound, DETAIL.soundLight, DETAIL.soundCore, DETAIL.soundGlow],
  strike: [
    DETAIL.strikeDeep,
    DETAIL.strike,
    DETAIL.strikeLight,
    DETAIL.strikeCore,
    DETAIL.strikeGlow,
  ],
};

/** Where to draw: the canvas, and the world point (character space) to cell pixel mapping. */
export interface Ink {
  readonly canvas: PixelCanvas;
  readonly at: (p: Point) => Point;
}

/** Ink for the cell whose left edge is `cellX`, anchored at the feet. */
export function inkAt(canvas: PixelCanvas, cellX: number): Ink {
  return { canvas, at: (p) => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S }) };
}

/** Draws a front effect (anything but a motion trail, which goes behind the body). */
export function drawEffect(ink: Ink, effect: Effect): void {
  switch (effect.kind) {
    case 'smear':
      drawSmear(ink, effect.points, effect.width);
      return;
    case 'energy':
      drawEnergy(ink, effect.center, effect.radius);
      return;
    case 'wave':
      drawWave(ink, effect.center, effect.phase);
      return;
    case 'flash':
      drawFlash(ink, effect.center, effect.radius, TONES[effect.tone]);
      return;
    case 'ring':
      drawRing(
        ink,
        effect.center,
        effect.radius,
        effect.progress,
        TONES[effect.tone],
        effect.squash ?? 1,
      );
      return;
    case 'speed':
      drawSpeed(ink, effect);
      return;
    case 'column':
      drawColumn(ink, effect.base, effect.height, effect.width, effect.progress);
      return;
    case 'shards':
      drawShards(ink, effect.center, effect.radius, effect.progress, TONES[effect.tone]);
      return;
    case 'shield':
      drawShield(ink, effect.center, effect.radius, effect.progress);
      return;
    case 'dust':
      drawDust(ink, effect.x, effect.size, effect.progress);
      return;
  }
}

/** Motion trail: thin at the tail, full width at the limb; bright core, faint edge. */
export function drawSmear(ink: Ink, worldPoints: readonly Point[], width: number): void {
  const points = worldPoints.map(ink.at);
  const half = (width * S) / 2;
  ink.canvas.ghost(
    (x, y) => {
      let best = Infinity;
      let along = 0;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy || 1e-9;
        const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
        const distance = Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
        if (distance < best) {
          best = distance;
          along = (i - 1 + t) / Math.max(1, points.length - 1);
        }
      }
      const radius = half * (0.25 + 0.75 * along);
      if (best > radius) return 0;
      return best < radius * 0.45 && along > 0.3 ? DETAIL.trail : DETAIL.trailFaint;
    },
    boundsOf(points, half),
  );
}

function drawEnergy(ink: Ink, center: Point, radius: number): void {
  const c = ink.at(center);
  const r = radius * S;
  const [deep, base, light, core, glow] = TONES.sound;
  ink.canvas.ghost(
    (x, y) => {
      const d = Math.hypot(x - c.x, y - c.y);
      // A slight wobble on the edge: the ball hums.
      const edge = r * (1 + 0.08 * Math.sin(Math.atan2(y - c.y, x - c.x) * 5));
      if (d > edge * 1.35) return 0;
      if (d > edge) return glow;
      if (d < edge * 0.32) return core;
      if (d < edge * 0.6) return light;
      if (d < edge * 0.84) return base;
      return deep;
    },
    { left: c.x - r * 1.4, right: c.x + r * 1.4, top: c.y - r * 1.4, bottom: c.y + r * 1.4 },
  );
}

/** The sound wave in flight: a bright core and three arcs opening forward, pulsing outward. */
function drawWave(ink: Ink, center: Point, phase: number): void {
  const c = ink.at(center);
  const [deep, base, light, core, glow] = TONES.sound;
  const strike = TONES.strike;
  const arcs = [6.5, 9.5, 12.5].map((radius, index) => ({
    outer: (radius + phase * 2) * S,
    thickness: (2 - index * 0.35) * S,
    span: ((62 - index * 9) * Math.PI) / 180,
    color: index === 0 ? light : index === 1 ? base : strike[1],
  }));
  const reach = (arcs[2]?.outer ?? 0) + 2;
  ink.canvas.ghost(
    (x, y) => {
      const dx = x - c.x;
      const dy = y - c.y;
      const d = Math.hypot(dx, dy);
      if (d < 2.4 * S) return core;
      if (d < 4.2 * S) return light;
      if (d < 5 * S) return deep;
      const angle = Math.abs(Math.atan2(dy, dx));
      for (const arc of arcs) {
        if (angle > arc.span) continue;
        if (d <= arc.outer && d >= arc.outer - arc.thickness) return arc.color;
        if (d <= arc.outer + S && d > arc.outer) return glow;
      }
      // A faint tail behind the core.
      if (dx < 0 && Math.abs(dy) < 2.4 * S && dx > -10 * S) return glow;
      return 0;
    },
    { left: c.x - 11 * S, right: c.x + reach, top: c.y - reach, bottom: c.y + reach },
  );
}

/**
 * A bold star: two long rays along the blow, two shorter ones across it, four short diagonals,
 * around a bright core; the deepest tone rims it so it reads on any background.
 */
function drawFlash(
  ink: Ink,
  center: Point,
  radius: number,
  [deep, base, light, core, glow]: Tones,
): void {
  const c = ink.at(center);
  const r = radius * S;
  ink.canvas.ghost(
    (x, y) => {
      const dx = x - c.x;
      const dy = y - c.y;
      const d = Math.hypot(dx, dy);
      if (d > r * 1.1) return 0;
      const angle = Math.atan2(dy, dx);
      // Reach in this direction: long along the blow, shorter across, short on the diagonals.
      const along = Math.abs(Math.cos(angle)) ** 6;
      const across = Math.abs(Math.sin(angle)) ** 8 * 0.68;
      const diagonal = Math.abs(Math.cos(angle * 2 + Math.PI)) ** 10 * 0.5;
      const reach = r * Math.max(0.4, along, across, diagonal);
      if (d > reach + S) return 0;
      if (d > reach) return glow;
      const t = d / reach;
      if (t < 0.45) return core;
      if (t < 0.68) return light;
      if (t < 0.88) return base;
      return deep;
    },
    { left: c.x - r * 1.1, right: c.x + r * 1.1, top: c.y - r * 1.1, bottom: c.y + r * 1.1 },
  );
}

/** Wedge-shaped shards flying forward out of an impact, thinning as they go. */
function drawShards(
  ink: Ink,
  center: Point,
  radius: number,
  progress: number,
  [deep, base, light]: Tones,
): void {
  const directions = [-58, -30, -8, 14, 36, 62, 140, 220];
  const distance = radius * (0.35 + 0.65 * progress);
  const size = (1 - progress * 0.7) * 2.2;
  const color = progress < 0.4 ? light : progress < 0.75 ? base : deep;
  for (const [index, degrees] of directions.entries()) {
    const angle = (degrees * Math.PI) / 180;
    const reach = distance * (index % 2 === 0 ? 1 : 0.78);
    const tip = { x: center.x + Math.cos(angle) * reach, y: center.y + Math.sin(angle) * reach };
    const back = {
      x: center.x + Math.cos(angle) * (reach - size * 2.4),
      y: center.y + Math.sin(angle) * (reach - size * 2.4),
    };
    const side = { x: -Math.sin(angle) * size * 0.5, y: Math.cos(angle) * size * 0.5 };
    const corners = [
      ink.at(tip),
      ink.at({ x: back.x + side.x, y: back.y + side.y }),
      ink.at({ x: back.x - side.x, y: back.y - side.y }),
    ];
    ink.canvas.ghost((x, y) => (insideTriangle(corners, x, y) ? color : 0), boundsOf(corners, 1));
  }
}

/** A guard arc on the attacker's side, made of three plates, bright then fading. */
function drawShield(ink: Ink, center: Point, radius: number, progress: number): void {
  const [deep, base, light, core, glow] = TONES.sound;
  const c = ink.at(center);
  const outer = radius * S * (0.75 + 0.35 * progress);
  const thickness = Math.max(S, radius * S * 0.28 * (1 - progress * 0.6));
  ink.canvas.ghost(
    (x, y) => {
      const dx = x - c.x;
      const dy = y - c.y;
      const d = Math.hypot(dx, dy);
      // Facing back (toward the attacker): angles around 180 degrees, split into plates.
      const angle = Math.atan2(dy, -dx);
      if (Math.abs(angle) > 1.15) return 0;
      if (Math.abs(Math.abs(angle) - 0.4) < 0.06) return 0;
      if (d > outer + S || d < outer - thickness - S) return 0;
      if (d > outer || d < outer - thickness) return glow;
      const t = (outer - d) / thickness;
      if (progress < 0.3) return t < 0.5 ? core : light;
      if (progress < 0.65) return t < 0.5 ? light : base;
      return t < 0.5 ? base : deep;
    },
    { left: c.x - outer - S, right: c.x + S, top: c.y - outer - S, bottom: c.y + outer + S },
  );
}

function drawRing(
  ink: Ink,
  center: Point,
  radius: number,
  progress: number,
  [deep, base, light, , glow]: Tones,
  squash: number,
): void {
  const c = ink.at(center);
  const outer = radius * S * (0.35 + 0.65 * progress);
  // Thick and bright when born, thin and dark when fading.
  const thickness = Math.max(S, outer * 0.32 * (1 - progress));
  const color = progress < 0.35 ? light : progress < 0.7 ? base : deep;
  ink.canvas.ghost(
    (x, y) => {
      const d = Math.hypot(x - c.x, (y - c.y) / squash);
      if (d > outer + S || d < outer - thickness - S) return 0;
      if (d > outer || d < outer - thickness) return glow;
      return color;
    },
    {
      left: c.x - outer - S,
      right: c.x + outer + S,
      top: c.y - (outer + S) * squash,
      bottom: c.y + (outer + S) * squash,
    },
  );
}

/** Streaks behind a fast part: a few lines of varied length, brightest near the part. */
function drawSpeed(ink: Ink, effect: Extract<Effect, { kind: 'speed' }>): void {
  const [deep, base, light] = TONES[effect.tone];
  const angle = (effect.direction * Math.PI) / 180;
  const back = { x: -Math.cos(angle), y: -Math.sin(angle) };
  const across = { x: -back.y, y: back.x };
  const lines = [
    { offset: 0, length: 1, color: light },
    { offset: 0.45, length: 0.7, color: base },
    { offset: -0.5, length: 0.8, color: base },
    { offset: 0.85, length: 0.45, color: deep },
    { offset: -0.95, length: 0.5, color: deep },
  ];
  for (const line of lines) {
    const start = {
      x: effect.center.x + across.x * line.offset * effect.spread,
      y: effect.center.y + across.y * line.offset * effect.spread,
    };
    const end = {
      x: start.x + back.x * effect.length * line.length,
      y: start.y + back.y * effect.length * line.length,
    };
    const a = ink.at(start);
    const b = ink.at(end);
    ink.canvas.ghost(
      (x, y) => (distanceToSegment(x, y, a, b) <= 0.6 ? line.color : 0),
      boundsOf([a, b], 1),
    );
  }
}

/** Chevrons of sound rising in a column: the uppercut's "drop". */
function drawColumn(ink: Ink, base: Point, height: number, width: number, progress: number): void {
  const [deep, mid, light, core, glow] = TONES.sound;
  const bottom = ink.at(base);
  const top = height * S * (0.4 + 0.6 * progress);
  const half = (width * S) / 2;
  const spacing = 5 * S;
  ink.canvas.ghost(
    (x, y) => {
      const rise = bottom.y - y;
      if (rise < 0 || rise > top) return 0;
      const dx = Math.abs(x - bottom.x);
      // Narrower toward the top.
      const w = half * (1 - (rise / top) * 0.45);
      if (dx > w + S) return 0;
      // Chevrons pointing up, scrolling upward with progress.
      const band = (rise + dx * 0.6 - progress * spacing * 2) % spacing;
      const fade = rise / top;
      if (dx > w) return glow;
      if (band < S * 1.4) return fade < 0.3 ? core : fade < 0.65 ? light : mid;
      if (band < S * 2.2) return fade < 0.5 ? mid : deep;
      return dx < w * 0.25 && fade < 0.8 ? glow : 0;
    },
    {
      left: bottom.x - half - S,
      right: bottom.x + half + S,
      top: bottom.y - top,
      bottom: bottom.y,
    },
  );
}

/** A puff of dust on the floor: a few round clumps, rising and thinning out. */
function drawDust(ink: Ink, x: number, size: number, progress: number): void {
  const clumps = [
    { dx: 0, dy: 1.2, r: 1 },
    { dx: -0.8, dy: 0.6, r: 0.75 },
    { dx: 0.9, dy: 0.7, r: 0.7 },
    { dx: -1.5, dy: 0.3, r: 0.5 },
    { dx: 1.6, dy: 0.25, r: 0.45 },
  ];
  const spread = 0.6 + progress * 0.8;
  const shrink = 1 - progress * 0.6;
  for (const clump of clumps) {
    const center = ink.at({
      x: x + clump.dx * size * spread,
      y: clump.dy * size * (0.5 + progress),
    });
    const r = clump.r * size * S * 0.5 * shrink;
    ink.canvas.ghost(
      (px, py) => {
        const d = Math.hypot(px - center.x, py - center.y);
        if (d > r) return 0;
        if (py < center.y - r * 0.3) return DETAIL.dustLight;
        return d > r * 0.7 ? DETAIL.dustDeep : DETAIL.dust;
      },
      { left: center.x - r, right: center.x + r, top: center.y - r, bottom: center.y + r },
    );
  }
}

// ---------------------------------------------------------------------------------------------

function boundsOf(points: readonly Point[], margin: number) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    left: Math.min(...xs) - margin,
    right: Math.max(...xs) + margin,
    top: Math.min(...ys) - margin,
    bottom: Math.max(...ys) + margin,
  };
}

function insideTriangle(corners: readonly Point[], x: number, y: number): boolean {
  const [a, b, c] = corners;
  if (!a || !b || !c) return false;
  const side = (p: Point, q: Point): number => (q.x - p.x) * (y - p.y) - (q.y - p.y) * (x - p.x);
  const ab = side(a, b);
  const bc = side(b, c);
  const ca = side(c, a);
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
}

function distanceToSegment(x: number, y: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy || 1e-9;
  const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / lengthSquared));
  return Math.hypot(x - a.x - dx * t, y - a.y - dy * t);
}
