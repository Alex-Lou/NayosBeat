/**
 * Saphir (Sound Clash, docs/saphir.md §9): a stage outfit in op-art. A short ivory jacket cut
 * straight down the back, its high collar up to the jaw, closed on a black line across the chest;
 * a sapphire sash at the waist; wide dance trousers banded in black, each band bowed so that the
 * cloth seems to turn; black gloves; two-tone savate shoes. The mask is the head (head.ts).
 * Drawn in profile like Nayo, upright: nothing hangs, nothing swings.
 *
 * The bands are few and wide (2 world px and more): they read as one pattern at the game's
 * scale and never shimmer (docs/flashs.md).
 *
 * Everything is placed in world pixels (character space, see skeleton.ts) and drawn ART_SCALE
 * times finer.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import { STILL, type Motion } from '../fighter.ts';
import { clamp, creases, headLocal, unit } from '../parts.ts';
import type { Material, PixelCanvas, Point } from '../raster.ts';
import { add, scale, sub, type Side, type Skeleton } from '../skeleton.ts';
import { drawSmear, type Ink } from '../vfx.ts';
import { SAPHIR_BODY } from './body.ts';
import { stampHead } from './head.ts';
import { EFFECTS, farOf, MATERIAL, matteOf, noGloss } from './palette.ts';

export { paletteOf, type Colorway } from './palette.ts';

const S = ART_SCALE;

const M = MATERIAL;
const SKIN = noGloss(M.skin);
const CLOTH = matteOf(M.cloth);
const CLOTH_FAR: Material = { ...farOf(CLOTH), base: CLOTH.shadow, light: CLOTH.base };
const BAND = matteOf(M.band);
const BAND_FAR = farOf(BAND);
/** The sash, in the mask's lacquer. */
const SASH: Material = { ...M.mask, glossCut: 0.8 };
const GLOVE: Material = { ...M.shoe, glossCut: 0.86 };
const GLOVE_FAR = farOf(GLOVE);
const SHOE: Material = { ...M.shoe, glossCut: 0.88 };
const SHOE_FAR = farOf(SHOE);
const SPAT = matteOf(M.spat);
const SPAT_FAR = farOf(SPAT);
const SOLE = matteOf(M.sole);

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of the jacket's hem, in world pixels. */
  readonly swing: Point;
}

/** Draws Saphir in the cell whose left edge is `cellX`. */
export function drawSaphir(
  canvas: PixelCanvas,
  skeleton: Skeleton,
  cellX: number,
  motion: Motion = STILL,
): void {
  const at = (p: Point): Point => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S });
  const ctx: Ctx = {
    canvas,
    fx: EFFECTS,
    s: skeleton,
    at,
    torso: (distance, across) =>
      add(add(skeleton.hip, scale(skeleton.up, distance)), scale(skeleton.front, across)),
    swing: { x: clamp(-motion.vx * 0.8, -1.6, 1.6), y: clamp(-motion.vy * 0.4, -1.2, 1.2) },
  };

  // Motion trails behind the body; the other effects go on the front layer (see sheet.ts).
  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 5.0 * S, 4.4 * S, 0, CLOTH, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  drawNeck(ctx);
  drawTorso(ctx);
  stampHead(canvas, skeleton.face, at(skeleton.head), skeleton.headAngle);
  drawArm(ctx, skeleton.near, 'near');
}

// ---------------------------------------------------------------------------------------------
// Arms and hands

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const cloth = near ? CLOTH : CLOTH_FAR;
  const group = `${which}Arm`;
  const cuff = sub(side.wrist, scale(side.forearm, 1.4));

  // The jacket's sleeve, slim, a black band at the cuff, the glove over the wrist.
  canvas.circle(at(side.shoulder), 3.0 * S, cloth, { group });
  canvas.capsule(at(side.shoulder), at(side.elbow), 2.9 * S, 2.5 * S, cloth, { group });
  canvas.capsule(at(side.elbow), at(cuff), 2.5 * S, 2.3 * S, cloth, { group });
  creases(ctx, side.shoulder, side.elbow, cuff, cloth, group);
  bowedBands(
    ctx,
    side.elbow,
    cuff,
    [0.55],
    2.6,
    2.4,
    () => 1.1,
    -0.5,
    near ? BAND : BAND_FAR,
    group,
  );
  canvas.capsule(at(cuff), at(side.wrist), 1.9 * S, 1.8 * S, near ? GLOVE : GLOVE_FAR, {
    group: `${group}Cuff`,
  });
  drawHand(ctx, side, near);
}

function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const skin = near ? GLOVE : GLOVE_FAR;
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  // Hand axes: u along the forearm from the wrist, v toward the thumb.
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));

  if (side.hand === 'open') {
    canvas.polygon(
      [p(0.1, -1.6), p(2.4, -1.8), p(3.2, -0.8), p(3.4, 3.2), p(2.4, 4.0), p(1.4, 3.4), p(0, 1.4)],
      skin,
      { group, bevel: 1.2 * S },
    );
    canvas.capsule(p(0.8, -1.2), p(2.2, -2.2), 0.75 * S, 0.65 * S, skin, {
      group: `${group}Thumb`,
    });
    return;
  }
  // A gloved fist: the knuckles forward, the thumb folded over the fingers.
  canvas.polygon(
    [
      p(0.2, -2.0),
      p(3.2, -2.2),
      p(4.4, -1.4),
      p(4.6, 1.0),
      p(3.8, 2.0),
      p(0.9, 2.2),
      p(-0.1, 1.2),
      p(-0.2, -0.9),
    ],
    skin,
    { group, bevel: 1.4 * S },
  );
  canvas.decal(
    [p(3.7, -2.0), p(3.9, -2.0), p(3.9, 1.2), p(3.7, 1.2)],
    { ...skin, base: skin.shadow, light: skin.base },
    group,
    { flat: true },
  );
  canvas.capsule(p(1.8, 1.6), p(3.4, 1.2), 0.8 * S, 0.7 * S, skin, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs and shoes

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const cloth = near ? CLOTH : CLOTH_FAR;
  const band = near ? BAND : BAND_FAR;
  const group = `${which}Leg`;
  drawShoe(ctx, side, near);
  // Wide dance trousers: the thigh, then the leg flaring down over the top of the shoe.
  // The hem stops above the sole: its flare covers the top of the shoe, never the floor.
  const hem = add(side.knee, scale(sub(side.ankle, side.knee), 0.85));
  canvas.capsule(at(side.hip), at(side.knee), 4.4 * S, 3.8 * S, cloth, { group });
  canvas.capsule(at(side.knee), at(hem), 3.8 * S, 4.6 * S, cloth, { group });
  creases(ctx, side.hip, side.knee, hem, cloth, group);
  // The op-art: two black stripes waving down the leg, swelling toward the hem, crossing
  // phases so the cloth seems to twist.
  const leg = [side.hip, side.knee, hem];
  wavyStripe(ctx, leg, [4.4, 3.8, 4.6], -0.42, 0.3, 0, band, group);
  wavyStripe(ctx, leg, [4.4, 3.8, 4.6], 0.4, 0.3, Math.PI, band, group);
}

/**
 * A stripe along a limb's polyline `points` (half widths `widths` at each point): its middle at
 * `center` (−1 behind, 1 in front, in half widths), waving `amplitude` half widths about it,
 * its thickness a quarter of the limb's. Clipped to `group`: the limb's contour stays.
 */
function wavyStripe(
  ctx: Ctx,
  points: readonly Point[],
  widths: readonly number[],
  center: number,
  amplitude: number,
  phase: number,
  material: Material,
  group: string,
): void {
  const STEPS = 14;
  const left: Point[] = [];
  const right: Point[] = [];
  const segments = points.length - 1;
  for (let i = 0; i <= STEPS; i++) {
    const f = (i / STEPS) * segments;
    const k = Math.min(segments - 1, Math.floor(f));
    const local = f - k;
    const a = points[k];
    const b = points[k + 1];
    if (!a || !b) return;
    const w = (widths[k] ?? 0) + ((widths[k + 1] ?? 0) - (widths[k] ?? 0)) * local;
    const u = unit(sub(b, a));
    const v = { x: -u.y, y: u.x };
    const p = add(a, scale(sub(b, a), local));
    const middle = (center + amplitude * Math.sin(phase + (i / STEPS) * Math.PI * 2.2)) * w;
    const half = w * 0.24;
    left.push(ctx.at(add(p, scale(v, middle - half))));
    right.push(ctx.at(add(p, scale(v, middle + half))));
  }
  ctx.canvas.decal([...left, ...right.reverse()], material, group);
}

/**
 * Bands across a limb from `from` to `to`, at the fractions `ts` of its length: each one
 * `thick(t)` world px wide, its middle bowed `bend` px down the limb from its edges, across a
 * limb `w0` to `w1` px wide (half widths). Clipped to `group`: the limb's contour stays.
 */
function bowedBands(
  ctx: Ctx,
  from: Point,
  to: Point,
  ts: readonly number[],
  w0: number,
  w1: number,
  thick: (t: number) => number,
  bend: number,
  material: Material,
  group: string,
): void {
  const along = sub(to, from);
  const length = Math.hypot(along.x, along.y) || 1;
  const u = scale(along, 1 / length);
  const v = { x: -u.y, y: u.x };
  const SAMPLES = [-1, -0.5, 0, 0.5, 1];
  for (const t of ts) {
    const half = (w0 + (w1 - w0) * t) * 1.1;
    const edge = (offset: number) =>
      SAMPLES.map((k) =>
        ctx.at(
          add(from, add(scale(u, t * length + offset + bend * (1 - k * k)), scale(v, k * half))),
        ),
      );
    const top = edge(0);
    const bottom = edge(thick(t)).reverse();
    ctx.canvas.decal([...top, ...bottom], material, group);
  }
}

function drawShoe(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const leather = near ? SHOE : SHOE_FAR;
  const white = near ? SPAT : SPAT_FAR;
  const group = near ? 'nearShoe' : 'farShoe';
  // Foot axes: u from heel to toe, v up from the sole.
  const toe = sub(side.toe, side.heel);
  const length = Math.hypot(toe.x, toe.y) || 1;
  const u = scale(toe, 1 / length);
  const v = { x: -u.y, y: u.x };
  const sole = add(side.heel, add(scale(u, 2.4), scale(v, -SAPHIR_BODY.footRadius)));
  const p = (a: number, b: number): Point => at(add(sole, add(scale(u, a), scale(v, b))));

  // A low polished shoe: the white leather in the middle, the black cap and heel.
  canvas.polygon(
    [p(-3.0, 0.4), p(-3.2, 3.2), p(-1.6, 4.4), p(2.0, 4.6), p(4.4, 3.2), p(6.6, 2.6), p(7.0, 0.4)],
    white,
    { group, bevel: 1.8 * S },
  );
  canvas.decal([p(3.6, 0.2), p(7.2, 0.2), p(7.0, 2.8), p(4.6, 3.4)], leather, group);
  canvas.decal([p(-3.2, 0.2), p(-0.6, 0.2), p(-0.6, 4.2), p(-3.2, 3.4)], leather, group);
  canvas.polygon([p(-3.2, -0.1), p(7.2, -0.1), p(7.2, 0.9), p(-3.3, 0.9)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
}

// ---------------------------------------------------------------------------------------------
// Torso: the blouse, the tailored jacket

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };

  // The sash, wrapped at the waist, its knot at the back.
  canvas.polygon([t(2.6, -5.4), t(8.4, -5.4), t(8.6, 5.0), t(2.8, 5.2)], SASH, {
    group: 'sash',
    axis,
  });
  canvas.polygon([t(6.6, -5.0), t(4.2, -8.4), t(2.8, -7.6), t(4.6, -4.8)], SASH, {
    group: 'sashKnot',
    bevel: 1 * S,
  });
  // The jacket: short, ending on the sash, straight down the back, square at the shoulder.
  canvas.polygon(
    [
      t(7.6, -5.2),
      t(14, -5.4),
      t(19.6, -5.4),
      t(21.6, -4.4),
      t(22.2, 1.6),
      t(21.2, 4.4),
      t(15, 5.4),
      t(10, 5.2),
      t(7.6, 4.8),
    ],
    CLOTH,
    { group: 'jacket', axis, tilt: { x: 0.1, y: 0.15 } },
  );
  // The high collar, up the neck to the jaw.
  canvas.polygon([t(20.4, -3.2), t(25.6, -2.6), t(26.0, 2.0), t(20.6, 3.4)], CLOTH, {
    group: 'collar',
    axis,
  });
  canvas.decal([t(25.0, -2.7), t(26.1, -2.6), t(26.1, 2.1), t(25.0, 2.2)], BAND, 'collar', {
    flat: true,
  });
  // The closure: a black line from the collar across the chest down to the sash.
  canvas.decal([t(21.6, 3.8), t(22.0, 2.4), t(8.2, -1.4), t(7.8, 0.2)], BAND, 'jacket', {
    flat: true,
  });
  // The jacket's hem on the sash.
  canvas.decal(
    [t(7.4, -5.4), t(7.4, 5.0), t(8.4, 5.0), t(8.4, -5.4)],
    noGloss({ ...CLOTH, base: CLOTH.shadow, light: CLOTH.base }),
    'jacket',
  );
}

// ---------------------------------------------------------------------------------------------
// Neck

/** Neck, from the collar to under the jaw. */
function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(20.5, 0.6)), at(local(0.6, -3.0)), 2.0 * S, 1.9 * S, SKIN, {
    group: 'neck',
  });
}
