/**
 * Nayo (Sound Clash): boxer-DJ, black bomber with orange trims, headphones around the neck,
 * white hand wraps, grey joggers, white sneakers. Palette: violet night, warm orange.
 */

import { ANCHOR } from '../../../src/art/types.ts';
import type { Rgba } from '../png.ts';
import type { PixelCanvas, Point, Ramp } from '../raster.ts';
import { add, BODY, radians, scale, sub, type Side, type Skeleton } from '../skeleton.ts';

const COLORS = [
  '#00000000', // 0: transparent
  // skin
  '#2a1712',
  '#7d4a32',
  '#a86a4a',
  '#d08f68',
  // hair (and black details)
  '#0c0a10',
  '#1c1824',
  '#2b2536',
  '#3f3750',
  // jacket
  '#0b0a12',
  '#1f1c2e',
  '#2d2a42',
  '#46425f',
  // orange trims
  '#4a1a06',
  '#b5460e',
  '#f07a1e',
  '#ffb35c',
  // joggers
  '#121119',
  '#2f2d40',
  '#43415a',
  '#5d5b78',
  // white (wraps, tee, sneakers)
  '#3d3b4f',
  '#9e9cb4',
  '#d9d7e6',
  '#ffffff',
  // far side: deeper tones of the same materials
  '#5a3424',
  '#15131f',
  '#22202f',
  '#7a7891',
  '#8a3208',
] as const;

export const PALETTE: readonly Rgba[] = COLORS.map(hexToRgba);

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
const ORANGE = ramp(13);
const JOGGERS = ramp(17);
const WHITE = ramp(21);
const FAR = {
  skin: far(SKIN, 25),
  jacket: far(JACKET, 26),
  joggers: far(JOGGERS, 27),
  white: far(WHITE, 28),
  orange: far(ORANGE, 29),
};

/** Draws Nayo in the cell whose left edge is `cellX`. */
export function drawNayo(canvas: PixelCanvas, skeleton: Skeleton, cellX: number): void {
  const at = (p: Point): Point => ({ x: cellX + ANCHOR.x + p.x, y: ANCHOR.y - p.y });

  drawArm(
    canvas,
    skeleton.far,
    at,
    { jacket: FAR.jacket, orange: FAR.orange, wrap: FAR.white },
    false,
  );
  drawLeg(
    canvas,
    skeleton.far,
    at,
    { joggers: FAR.joggers, shoe: FAR.white, sole: FAR.orange },
    false,
  );
  canvas.circle(at(skeleton.hip), 6, JOGGERS);
  drawLeg(canvas, skeleton.near, at, { joggers: JOGGERS, shoe: WHITE, sole: ORANGE }, true);
  drawTorso(canvas, skeleton, at);
  drawHead(canvas, skeleton, at);
  drawHeadphones(canvas, skeleton, at);
  drawArm(canvas, skeleton.near, at, { jacket: JACKET, orange: ORANGE, wrap: WHITE }, true);
}

interface ArmColors {
  readonly jacket: Ramp;
  readonly orange: Ramp;
  readonly wrap: Ramp;
}

function drawArm(
  canvas: PixelCanvas,
  side: Side,
  at: (p: Point) => Point,
  colors: ArmColors,
  edge: boolean,
): void {
  const fist = add(side.wrist, scale(side.forearm, 2));
  const cuff = sub(side.wrist, scale(side.forearm, 2.2));
  canvas.circle(at(side.shoulder), 4, colors.jacket, { edge });
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.6, 3.2, colors.jacket, { edge });
  canvas.capsule(at(side.elbow), at(cuff), 3.2, 3, colors.jacket, { edge });
  canvas.capsule(at(cuff), at(side.wrist), 3.2, 3.2, colors.orange, { edge, flat: true });
  canvas.circle(at(fist), 3.2, colors.wrap, { edge });
}

interface LegColors {
  readonly joggers: Ramp;
  readonly shoe: Ramp;
  readonly sole: Ramp;
}

function drawLeg(
  canvas: PixelCanvas,
  side: Side,
  at: (p: Point) => Point,
  colors: LegColors,
  edge: boolean,
): void {
  canvas.capsule(at(side.hip), at(side.knee), 5.6, 4.6, colors.joggers, { edge });
  canvas.capsule(at(side.knee), at(side.ankle), 4.6, 3.4, colors.joggers, { edge });
  canvas.capsule(at(side.heel), at(side.toe), BODY.footRadius, BODY.footRadius, colors.shoe, {
    edge,
  });
  // Orange sole stripe along the bottom of the sneaker.
  const down = { x: 0, y: -BODY.footRadius + 0.5 };
  canvas.capsule(at(add(side.heel, down)), at(add(side.toe, down)), 0.8, 0.8, colors.sole, {
    flat: true,
  });
}

function drawTorso(canvas: PixelCanvas, s: Skeleton, at: (p: Point) => Point): void {
  const along = (distance: number, across: number): Point =>
    at(add(add(s.hip, scale(s.up, distance)), scale(s.front, across)));

  // Bomber body: wide shoulders, ribbed orange hem at the waist.
  canvas.polygon(
    [along(-2, -7.5), along(-2, 7), along(21, 9), along(25, 5.5), along(25, -6), along(21, -9.5)],
    JACKET,
    { edge: true },
  );
  canvas.polygon([along(-2, -7.5), along(-2, 7), along(0.6, 7.3), along(0.6, -7.8)], ORANGE, {
    flat: true,
  });
  // Open front: white tee between the jacket panels.
  canvas.polygon([along(0.6, 3.4), along(0.6, 6), along(23, 5.8), along(23, 2.6)], WHITE);
  // Neck, then the ribbed collar around its base.
  canvas.capsule(at(add(s.hip, scale(s.up, 23))), at(s.neck), 2.8, 2.6, SKIN);
  canvas.capsule(along(24.5, -4), along(24.5, 3.5), 1.6, 1.6, ORANGE, { flat: true });
}

/** Headphones resting on the collar, under the chin: dark band, big orange ear cup. */
function drawHeadphones(canvas: PixelCanvas, s: Skeleton, at: (p: Point) => Point): void {
  const along = (distance: number, across: number): Point =>
    at(add(add(s.hip, scale(s.up, distance)), scale(s.front, across)));
  canvas.capsule(along(25.5, -4.2), along(26, 3), 1.1, 1.1, HAIR, { flat: true });
  const cup = along(25.2, -2.6);
  canvas.circle(cup, 3.4, ORANGE, { edge: true });
  canvas.circle(cup, 1.6, HAIR, { flat: true });
}

function drawHead(canvas: PixelCanvas, s: Skeleton, at: (p: Point) => Point): void {
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

  // Face: brow, eye, mouth.
  const brow = local(3.2, 1.6);
  canvas.dot(brow.x, brow.y, HAIR.outline);
  canvas.dot(brow.x + 1, brow.y, HAIR.outline);
  const eye = local(3.6, 0.2);
  canvas.dot(eye.x, eye.y, HAIR.outline);
  canvas.dot(eye.x, eye.y + 1, HAIR.outline);
  const mouth = local(4.6, -3.4);
  canvas.dot(mouth.x, mouth.y, SKIN.outline);
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
