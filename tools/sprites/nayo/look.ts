/**
 * Nayo (Sound Clash): boxer-DJ, bomber with ribbed trims, headphones around the neck, white
 * hand wraps, grey joggers, white sneakers. Two colorways share every pixel and differ only by
 * palette: the second one tells the players apart in a mirror match.
 */

import { ANCHOR } from '../../../src/art/types.ts';
import type { Rgba } from '../png.ts';
import type { PixelCanvas, Point, Ramp } from '../raster.ts';
import {
  add,
  BODY,
  radians,
  scale,
  sub,
  type Effect,
  type Face,
  type Side,
  type Skeleton,
} from '../skeleton.ts';

export type Colorway = 'main' | 'alt';

/** Palette slots; both colorways fill the same slots. */
const SHARED = {
  skin: ['#2a1712', '#7d4a32', '#a86a4a', '#d08f68'],
  hair: ['#0c0a10', '#1c1824', '#2b2536', '#3f3750'],
  joggers: ['#121119', '#2f2d40', '#43415a', '#5d5b78'],
  white: ['#3d3b4f', '#9e9cb4', '#d9d7e6', '#ffffff'],
  smear: ['#e9e6ff', '#b8b2e0'],
} as const;

const ORANGE = ['#4a1a06', '#b5460e', '#f07a1e', '#ffb35c'] as const;
const CYAN = ['#0d3a4a', '#1d8fb0', '#4fd6ff', '#d8f8ff'] as const;

const COLORWAYS = {
  // Black bomber, orange trims, cyan sound.
  main: { jacket: ['#0b0a12', '#1f1c2e', '#2d2a42', '#46425f'], trim: ORANGE, energy: CYAN },
  // Burgundy bomber, cyan trims, orange sound.
  alt: { jacket: ['#1a0710', '#4a1328', '#6e1e3a', '#9a3354'], trim: CYAN, energy: ORANGE },
} as const;

/** Deeper tone of each material for the far limbs, per colorway. */
const DEEP = {
  main: { jacket: '#15131f', trim: '#8a3208' },
  alt: { jacket: '#330b1a', trim: '#16708c' },
} as const;

export function paletteOf(colorway: Colorway): readonly Rgba[] {
  const { jacket, trim, energy } = COLORWAYS[colorway];
  const colors = [
    '#00000000', // 0: transparent
    ...SHARED.skin, // 1-4
    ...SHARED.hair, // 5-8
    ...jacket, // 9-12
    ...trim, // 13-16
    ...SHARED.joggers, // 17-20
    ...SHARED.white, // 21-24
    '#5a3424', // 25: deep skin
    DEEP[colorway].jacket, // 26
    '#22202f', // 27: deep joggers
    '#7a7891', // 28: deep white
    DEEP[colorway].trim, // 29
    ...energy, // 30-33
    ...SHARED.smear, // 34-35
  ];
  return colors.map(hexToRgba);
}

const ramp = (first: number): Ramp => ({
  outline: first,
  shadow: first + 1,
  base: first + 2,
  light: first + 3,
});
/** Same material, one step darker: for the limbs on the far side of the body. */
const far = (near: Ramp, deep: number): Ramp => ({
  outline: near.outline,
  shadow: deep,
  base: near.shadow,
  light: near.base,
});

const SKIN = ramp(1);
const HAIR = ramp(5);
const JACKET = ramp(9);
const TRIM = ramp(13);
const JOGGERS = ramp(17);
const WHITE = ramp(21);
const ENERGY = ramp(30);
const SMEAR: Ramp = { outline: 35, shadow: 35, base: 34, light: 34 };
const FAR = {
  jacket: far(JACKET, 26),
  joggers: far(JOGGERS, 27),
  white: far(WHITE, 28),
  trim: far(TRIM, 29),
};

type At = (p: Point) => Point;

/** Draws Nayo in the cell whose left edge is `cellX`. */
export function drawNayo(canvas: PixelCanvas, skeleton: Skeleton, cellX: number): void {
  const at: At = (p) => ({ x: cellX + ANCHOR.x + p.x, y: ANCHOR.y - p.y });

  for (const effect of skeleton.effects) if (effect.kind === 'smear') drawSmear(canvas, effect, at);
  drawArm(canvas, skeleton.far, at, { jacket: FAR.jacket, trim: FAR.trim, wrap: FAR.white }, false);
  drawLeg(
    canvas,
    skeleton.far,
    at,
    { joggers: FAR.joggers, shoe: FAR.white, sole: FAR.trim },
    false,
  );
  canvas.circle(at(skeleton.hip), 6, JOGGERS);
  drawLeg(canvas, skeleton.near, at, { joggers: JOGGERS, shoe: WHITE, sole: TRIM }, true);
  drawTorso(canvas, skeleton, at);
  drawHead(canvas, skeleton, at);
  drawHeadphones(canvas, skeleton, at);
  drawArm(canvas, skeleton.near, at, { jacket: JACKET, trim: TRIM, wrap: WHITE }, true);
  for (const effect of skeleton.effects) if (effect.kind !== 'smear') drawGlow(canvas, effect, at);
}

/** Draws only an effect (the flying projectile) in the cell whose left edge is `cellX`. */
export function drawEffect(canvas: PixelCanvas, effect: Effect, cellX: number): void {
  const at: At = (p) => ({ x: cellX + ANCHOR.x + p.x, y: ANCHOR.y - p.y });
  if (effect.kind === 'smear') drawSmear(canvas, effect, at);
  else drawGlow(canvas, effect, at);
}

interface ArmColors {
  readonly jacket: Ramp;
  readonly trim: Ramp;
  readonly wrap: Ramp;
}

function drawArm(canvas: PixelCanvas, side: Side, at: At, colors: ArmColors, edge: boolean): void {
  const cuff = sub(side.wrist, scale(side.forearm, 2.2));
  canvas.circle(at(side.shoulder), 4, colors.jacket, { edge });
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.6, 3.2, colors.jacket, { edge });
  canvas.capsule(at(side.elbow), at(cuff), 3.2, 3, colors.jacket, { edge });
  canvas.capsule(at(cuff), at(side.wrist), 3.2, 3.2, colors.trim, { edge, flat: true });
  if (side.hand === 'open') {
    // Flat hand: palm and fingers along the forearm, thumb on the upper side.
    const tip = add(side.wrist, scale(side.forearm, 5.5));
    canvas.capsule(at(side.wrist), at(tip), 2.6, 2.1, colors.wrap, { edge });
    const thumb = add(add(side.wrist, scale(side.forearm, 1.5)), { x: 0, y: 2.2 });
    canvas.circle(at(thumb), 1.2, colors.wrap, { edge });
  } else {
    canvas.circle(at(add(side.wrist, scale(side.forearm, 2))), 3.2, colors.wrap, { edge });
  }
}

interface LegColors {
  readonly joggers: Ramp;
  readonly shoe: Ramp;
  readonly sole: Ramp;
}

function drawLeg(canvas: PixelCanvas, side: Side, at: At, colors: LegColors, edge: boolean): void {
  canvas.capsule(at(side.hip), at(side.knee), 5.6, 4.6, colors.joggers, { edge });
  canvas.capsule(at(side.knee), at(side.ankle), 4.6, 3.4, colors.joggers, { edge });
  canvas.capsule(at(side.heel), at(side.toe), BODY.footRadius, BODY.footRadius, colors.shoe, {
    edge,
  });
  // Colored sole stripe along the bottom of the sneaker.
  const along = sub(side.toe, side.heel);
  const length = Math.hypot(along.x, along.y) || 1;
  const down = scale({ x: along.y / length, y: -along.x / length }, BODY.footRadius - 0.5);
  canvas.capsule(at(add(side.heel, down)), at(add(side.toe, down)), 0.8, 0.8, colors.sole, {
    flat: true,
  });
}

function drawTorso(canvas: PixelCanvas, s: Skeleton, at: At): void {
  const along = (distance: number, across: number): Point =>
    at(add(add(s.hip, scale(s.up, distance)), scale(s.front, across)));

  // Bomber body: wide shoulders, ribbed hem at the waist.
  canvas.polygon(
    [along(-2, -7.5), along(-2, 7), along(21, 9), along(25, 5.5), along(25, -6), along(21, -9.5)],
    JACKET,
    { edge: true },
  );
  canvas.polygon([along(-2, -7.5), along(-2, 7), along(0.6, 7.3), along(0.6, -7.8)], TRIM, {
    flat: true,
  });
  // Open front: white tee between the jacket panels.
  canvas.polygon([along(0.6, 3.4), along(0.6, 6), along(23, 5.8), along(23, 2.6)], WHITE);
  // Neck, then the ribbed collar around its base.
  canvas.capsule(at(add(s.hip, scale(s.up, 23))), at(s.neck), 2.8, 2.6, SKIN);
  canvas.capsule(along(24.5, -4), along(24.5, 3.5), 1.6, 1.6, TRIM, { flat: true });
}

/** Headphones resting on the collar: dark band, big ear cup on the nape side. */
function drawHeadphones(canvas: PixelCanvas, s: Skeleton, at: At): void {
  const along = (distance: number, across: number): Point =>
    at(add(add(s.hip, scale(s.up, distance)), scale(s.front, across)));
  canvas.capsule(along(25.5, -4.2), along(26, 3), 1.1, 1.1, HAIR, { flat: true });
  const cup = along(25.2, -2.6);
  canvas.circle(cup, 3.4, TRIM, { edge: true });
  canvas.circle(cup, 1.6, HAIR, { flat: true });
}

function drawHead(canvas: PixelCanvas, s: Skeleton, at: At): void {
  const angle = radians(s.headAngle);
  // Head-local offsets: x forward (face), y up, turned with the head.
  const local = (dx: number, dy: number): Point =>
    at(
      add(s.head, {
        x: dx * Math.cos(angle) + dy * Math.sin(angle),
        y: -dx * Math.sin(angle) + dy * Math.cos(angle),
      }),
    );
  const center = local(0, 0);

  canvas.circle(center, BODY.headRadius, SKIN, { edge: true });
  // Jaw and chin, slightly forward.
  canvas.capsule(local(0.5, -1.5), local(3.2, -4.4), 3.6, 2.8, SKIN);
  // Nose and ear.
  canvas.circle(local(6, -0.8), 1.1, SKIN);
  canvas.circle(local(-1.4, -0.6), 1.5, SKIN, { edge: true });

  // Short hair, high top fade: fills the top and the back of the head.
  const hairCenter = local(-0.6, 1.2);
  const r = BODY.headRadius + 0.6;
  canvas.fill(
    (x, y) => {
      const inCap = Math.hypot(x - hairCenter.x, y - hairCenter.y) <= r;
      // Back to head-local offsets (inverse of `local`; image y points down).
      const dx = (x - center.x) * Math.cos(angle) + (y - center.y) * Math.sin(angle);
      const dy = (x - center.x) * Math.sin(angle) - (y - center.y) * Math.cos(angle);
      // Hairline: back and top of the head, receding over the forehead.
      const covered = dy > 2.4 || dx < -3 || (dy > 0 && dx < -1);
      return inCap && covered && !(dx > 3 && dy < 3.6);
    },
    { left: center.x - 9, right: center.x + 9, top: center.y - 10, bottom: center.y + 9 },
    HAIR,
  );
  // A few twists on top.
  for (const [dx, dy] of [
    [-3.5, 6],
    [-0.5, 7],
    [2.5, 6.4],
  ] as const) {
    canvas.capsule(local(dx, dy - 1.5), local(dx - 0.6, dy + 0.6), 1.6, 1.1, HAIR);
  }

  drawFace(canvas, s.face, local);
}

/** Brow, eye and mouth: a handful of pixels, so each expression is spelled out exactly. */
function drawFace(canvas: PixelCanvas, face: Face, local: (dx: number, dy: number) => Point): void {
  const dots = (color: number, ...points: readonly (readonly [number, number])[]): void => {
    for (const [dx, dy] of points) {
      const p = local(dx, dy);
      canvas.dot(p.x, p.y, color);
    }
  };
  const ink = HAIR.outline;
  switch (face) {
    case 'calm':
      dots(ink, [3.2, 1.6], [4.2, 1.6], [3.6, 0.2], [3.6, -0.8]);
      dots(SKIN.outline, [4.6, -3.4]);
      return;
    case 'smirk':
      dots(ink, [3.2, 1.6], [4.2, 1.4], [3.6, 0.2], [3.6, -0.8]);
      dots(SKIN.outline, [4.2, -3.6], [5.2, -3]);
      return;
    case 'shout':
      // Frowning brow, wide-open mouth.
      dots(ink, [3, 1.8], [4.2, 1], [3.6, 0], [3.6, -0.8]);
      dots(ink, [4.2, -3.2], [5.2, -3.2], [4.2, -4.2], [5.2, -4.2]);
      return;
    case 'hurt':
      // Squeezed eye, raised inner brow, gasping mouth.
      dots(ink, [3, 2.2], [4.2, 1.8], [3, -0.2], [4.2, -0.2]);
      dots(ink, [4.8, -3.6], [4.8, -4.6]);
      return;
    case 'out':
      // Eye shut, slack jaw.
      dots(ink, [3, 0], [4, 0], [4.8, -4]);
      dots(SKIN.outline, [3.4, 1.6], [4.4, 1.6]);
      return;
  }
}

function drawSmear(canvas: PixelCanvas, smear: Extract<Effect, { kind: 'smear' }>, at: At): void {
  const { points, width } = smear;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    if (!from || !to) continue;
    // Thin at the tail, full width at the limb.
    const r0 = (width / 2) * (0.35 + (0.65 * (i - 1)) / (points.length - 1));
    const r1 = (width / 2) * (0.35 + (0.65 * i) / (points.length - 1));
    canvas.capsule(at(from), at(to), r0, r1, SMEAR, { ghost: true, flat: true });
  }
}

function drawGlow(canvas: PixelCanvas, effect: Exclude<Effect, { kind: 'smear' }>, at: At): void {
  if (effect.kind === 'energy') {
    const c = at(effect.center);
    const r = effect.radius;
    canvas.circle(c, r, ENERGY);
    canvas.circle(c, r * 0.5, ENERGY, { flat: true });
    canvas.circle(
      { x: c.x - r * 0.15, y: c.y - r * 0.15 },
      r * 0.28,
      { ...ENERGY, base: ENERGY.light },
      { flat: true },
    );
    // Sparks around the ball.
    for (const [dx, dy] of [
      [1.4, 0.2],
      [-0.4, 1.3],
      [0.3, -1.4],
    ] as const) {
      canvas.circle({ x: c.x + dx * r, y: c.y - dy * r }, 0.9, ENERGY, { flat: true });
    }
    return;
  }
  // Sound wave: a bright core and three arcs opening toward the front, pulsing outward.
  const c = at(effect.center);
  canvas.circle(c, 4.2, ENERGY);
  canvas.circle(
    { x: c.x + 0.5, y: c.y - 0.5 },
    2,
    { ...ENERGY, base: ENERGY.light },
    { flat: true },
  );
  for (const [index, radius] of [6.5, 9.5, 12.5].entries()) {
    const outer = radius + effect.phase * 1.5;
    const thickness = 1.8 - index * 0.3;
    const span = (60 - index * 8) * (Math.PI / 180);
    canvas.fill(
      (x, y) => {
        const dx = x - c.x;
        const dy = y - c.y;
        const distance = Math.hypot(dx, dy);
        return (
          distance <= outer && distance >= outer - thickness && Math.abs(Math.atan2(dy, dx)) <= span
        );
      },
      { left: c.x, right: c.x + outer + 1, top: c.y - outer - 1, bottom: c.y + outer + 1 },
      ENERGY,
      { flat: index > 0 },
    );
  }
}

function hexToRgba(hex: string): Rgba {
  const value = Number.parseInt(hex.slice(1), 16);
  if (hex.length === 9) {
    return {
      r: (value >>> 24) & 255,
      g: (value >>> 16) & 255,
      b: (value >>> 8) & 255,
      a: value & 255,
    };
  }
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255, a: 255 };
}
