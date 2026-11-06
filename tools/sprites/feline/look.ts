/**
 * Feline (issue #155, Pack_01 `01_garde.png`, Pack_02 and the poses pack), at ART_SCALE = 2:
 * - A wild silver-white mane (`drawMane`): a soft volume and pointed locks in three layers,
 *   bursting back from under her black headband (`head.ts`) to the middle of her back, hanging
 *   mostly upright when she leans and lagging on spring 0;
 * - A thick, plush C tail (`drawTail`) out of her lower back, swelling to a fluffy tip at thigh
 *   height, lagging on spring 1; raised along her back when there is no room behind her;
 * - Both stay within her hurtboxes' back edge (`MANE_BACK`, `TAIL_BACK`), scaled down whole
 *   rather than cut;
 * - Pale porcelain skin; a sleeveless black techwear crop-top with a high collar (cyan LED) and
 *   a rounded bust, over a short band of bare, pinched midriff; high-waisted baggy black cargo
 *   trousers over round hips (belt, silver buckle, hip pouch with a cyan LED, hanging chain,
 *   `//` thigh dashes) and buckled combat boots;
 * - Slender arms with a black shoulder band carrying the cyan `▼` emblem, a buckled bicep strap,
 *   a wrist bracer with a diagonal LED and fingerless gloves.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import { STILL, type Motion } from '../fighter.ts';
import { clamp, creases, headLocal, stripeAcross, unit } from '../parts.ts';
import { type Material, type PixelCanvas, type Point } from '../raster.ts';
import { add, BODY, scale, sub, type Side, type Skeleton } from '../skeleton.ts';
import { drawSmear, type Ink } from '../vfx.ts';
import { stampHead } from './head.ts';
import { DETAIL, EFFECTS, farOf, MATERIAL, matteOf, noGloss } from './palette.ts';

export { paletteOf, type Colorway } from './palette.ts';

const S = ART_SCALE;

const M = MATERIAL;
const SKIN = noGloss(M.skin);
const SKIN_FAR = farLit(SKIN);
const HAIR_SNOW: Material = noGloss({
  ...M.hair,
  deep: M.hair.base,
  shadow: M.hair.light,
  base: M.hair.gloss ?? M.hair.light,
  light: M.hair.gloss ?? M.hair.light,
});
const HAIR_MID: Material = noGloss({
  ...M.hair,
  deep: M.hair.shadow,
  shadow: M.hair.base,
  base: M.hair.light,
  light: M.hair.gloss ?? M.hair.light,
});
const HAIR_SHADE: Material = noGloss({
  ...M.hair,
  deep: M.hair.deep,
  shadow: M.hair.shadow,
  base: M.hair.base,
  light: M.hair.light,
});
const TOP: Material = { ...M.jacket, glossCut: 0.88 };
const TOP_FAR = farLit(TOP);
const LEATHER: Material = { ...M.leather, glossCut: 0.88 };
const LEATHER_FAR = farLit(LEATHER);
const PANTS = noGloss(M.pants);
const PANTS_FAR = farLit(PANTS);
const POCKET = matteOf(M.pocket);
const BOOT: Material = { ...M.boot, glossCut: 0.86 };
const BOOT_FAR = farLit(BOOT);
const SOLE = matteOf(M.sole);
const METAL: Material = { ...M.metal, glossCut: 0.68 };

function farLit(material: Material): Material {
  const far = farOf(material);
  return material.rim === undefined ? far : { ...far, rim: material.rim };
}

function shade(material: Material): Material {
  return noGloss({ ...material, base: material.deep, light: material.shadow });
}

interface Ctx extends Ink {
  readonly s: Skeleton;
  readonly torso: (distance: number, across: number) => Point;
  readonly maneSwing: Point;
  readonly tailSwing: Point;
}

/** Draws Feline in the cell whose left edge is `cellX`. */
export function drawFeline(
  canvas: PixelCanvas,
  skeleton: Skeleton,
  cellX: number,
  motion: Motion = STILL,
): void {
  const at = (p: Point): Point => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S });
  const hang0 = motion.hang?.[0] ?? { x: -motion.vx * 1.2, y: -motion.vy * 0.6 };
  const hang1 = motion.hang?.[1] ?? { x: -motion.vx * 1.5, y: -motion.vy * 0.8 };
  const ctx: Ctx = {
    canvas,
    fx: EFFECTS,
    s: skeleton,
    at,
    torso: (distance, across) =>
      add(add(skeleton.hip, scale(skeleton.up, distance)), scale(skeleton.front, across)),
    maneSwing: {
      x: clamp(hang0.x * 1.4 - motion.vx * 0.8, -3.2, 3.2),
      y: clamp(hang0.y * 1.2 - motion.vy * 0.5, -2.4, 2.4),
    },
    tailSwing: {
      x: clamp(hang1.x * 1.6 - motion.vx * 0.9, -3.6, 3.6),
      y: clamp(hang1.y * 1.4 - motion.vy * 0.6, -2.8, 2.8),
    },
  };

  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawTail(ctx);
  drawMane(ctx);
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  // Slim feminine pelvis under the belt; the baggy cargo flare happens lower on the thigh.
  canvas.ellipse(at(skeleton.hip), 4.0 * S, 3.6 * S, 0, PANTS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  drawNeck(ctx);
  drawTorso(ctx);
  drawHead(ctx);
  drawArm(ctx, skeleton.near, 'near');
}

/** Stamps a small hand-drawn pixel grid at `(x, y)` in cell coordinates. */
function pixels(
  ctx: Ctx,
  rows: readonly string[],
  x: number,
  y: number,
  tones: Readonly<Record<string, number | undefined>>,
): void {
  const left = Math.round(x);
  const top = Math.round(y);
  rows.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const tone = tones[row.charAt(dx)];
      if (tone !== undefined) ctx.canvas.dot(left + dx, top + dy, tone);
    }
  });
}

function neonLine(ctx: Ink, a: Point, b: Point, glowing = false): void {
  const from = ctx.at(a);
  const to = ctx.at(b);
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
  for (let i = 0; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    const end = i === 0 || i === steps;
    ctx.canvas.dot(x, y, glowing ? DETAIL.neonCore : end ? DETAIL.neon : DETAIL.neonLight);
  }
}

function slab(
  ctx: Ctx,
  from: Point,
  to: Point,
  halfFrom: number,
  halfTo: number,
  material: Material,
  group: string,
): void {
  const { canvas, at } = ctx;
  const u = unit(sub(to, from));
  const v = { x: -u.y, y: u.x };
  canvas.polygon(
    [
      at(add(from, scale(v, halfFrom))),
      at(add(to, scale(v, halfTo))),
      at(sub(to, scale(v, halfTo))),
      at(sub(from, scale(v, halfFrom))),
    ],
    material,
    { group, axis: { x: u.x, y: -u.y } },
  );
}

// ---------------------------------------------------------------------------------------------
// Wild mane (`drawMane`) & plush C tail (`drawTail`)

/**
 * A lock of the mane in the head's frame: `b` toward her back, `u` along her spine, from a base on
 * the skull to a pointed tip; `width` across the base, `bend` bows its middle (+ toward `u`).
 */
interface Lock {
  readonly base: readonly [number, number];
  readonly tip: readonly [number, number];
  readonly width: number;
  readonly bend: number;
}

/**
 * The wild mane (Pack_01 `01_garde.png`, Pack_02 `intro_01_pose_assuree.png`): a big mass of
 * pointed silver-white locks bursting back from under the headband, as wide as her shoulders and
 * falling to the middle of her back. Three layers (shade, mid, snow) so it reads as volume, not a
 * flat cut-out; every tip lags with spring 0 (`maneSwing`), more the longer the lock.
 */
const MANE_SHADE: readonly Lock[] = [
  { base: [0, 3], tip: [10, 4], width: 6.5, bend: 1.0 },
  { base: [1, 1.5], tip: [15.5, 1.5], width: 9, bend: 2.2 },
  { base: [1, -1.5], tip: [16, -8], width: 9, bend: 2.0 },
  { base: [0.5, -4], tip: [13, -15.5], width: 9, bend: 1.6 },
  { base: [-0.5, -5.5], tip: [7.5, -20.5], width: 8, bend: 1.0 },
  { base: [-1, -6.5], tip: [2.5, -21.5], width: 5, bend: 0.4 },
];
const MANE_MID: readonly Lock[] = [
  { base: [-0.5, 3], tip: [8, 4], width: 5, bend: 0.8 },
  { base: [0, 2], tip: [12.5, 2.5], width: 7, bend: 1.8 },
  { base: [0, -1], tip: [13, -6], width: 7, bend: 1.6 },
  { base: [0, -3.5], tip: [10, -12.5], width: 7, bend: 1.2 },
  { base: [-1, -5], tip: [4.5, -17], width: 5.5, bend: 0.6 },
];
const MANE_SNOW: readonly Lock[] = [
  { base: [-0.5, 3], tip: [6, 3.8], width: 2, bend: 0.6 },
  { base: [0, 2.2], tip: [10, 2.8], width: 2.6, bend: 1.4 },
  { base: [0, -0.8], tip: [10, -4.6], width: 2.4, bend: 1.2 },
  { base: [-0.5, -3.4], tip: [7, -9.5], width: 2.2, bend: 0.8 },
];

/**
 * How far back the mane and the tail may reach (world px), standing and crouched: the back edge
 * of her hurtboxes (src/data/fighters/feline.ts), which follow the drawing (tests/tools/
 * hurtboxes.test.ts). Bounds of the first design, kept.
 */
const MANE_BACK = { stand: -25.0, crouch: -16.0 } as const;
const TAIL_BACK = { stand: -24.8, crouch: -16.2 } as const;
/** The lowest a lock or the tail is drawn (world px): never under the floor (ko, knockdown). */
const GROUND = 0.5;

/**
 * The scale that keeps a shape reaching `reach` behind `root` (world px) within `bound`; when the
 * root itself is past the bound (lying, tumbling), a fixed half size instead of a flip.
 */
function fitBehind(root: number, reach: number, bound: number): number {
  if (root + reach >= bound) return 1;
  if (root <= bound) return 0.5;
  return Math.max(0.25, (root - bound) / -reach);
}

function drawMane(ctx: Ctx): void {
  const { canvas, at, s, maneSwing } = ctx;
  if (s.head.y < 16) return;
  const root = add(s.head, add(scale(s.front, -1.6), scale(s.up, 0.6)));
  // The locks hang in a frame tipped most of the way back to upright: leaning in, the mane falls
  // behind her instead of standing up over her head.
  const up = unit(add(scale(s.up, 0.35), { x: 0, y: 0.65 }));
  const back = { x: -up.y, y: up.x };
  // Lying low (crouch, sweep) the mane keeps its shape but drops its longest locks a little.
  const fall = clamp((s.head.y - 30) / 30, 0.7, 1);
  const offset = (b: number, u: number, lag: number): Point => ({
    x: back.x * b + up.x * u * fall + maneSwing.x * lag,
    y: back.y * b + up.y * u * fall + maneSwing.y * lag,
  });
  // The mane stays within her hurtbox's back edge (`MANE_BACK`): past it, the whole mane is
  // scaled down around its root (it keeps its shape) instead of being cut flat.
  const reach = Math.min(
    ...[...MANE_SHADE.map((l) => offset(l.tip[0], l.tip[1], 1.3).x), offset(13, -4.5, 0.4).x],
  );
  const bound = s.hip.y < 26 ? MANE_BACK.crouch : MANE_BACK.stand;
  const k = fitBehind(root.x, reach, bound);
  const point = (b: number, u: number, lag: number): Point => {
    const o = offset(b, u, lag);
    return at({ x: root.x + o.x * k, y: Math.max(GROUND, root.y + o.y * k) });
  };
  const lock = (l: Lock, material: Material, decal: boolean): void => {
    const [bb, bu] = l.base;
    const [tb, tu] = l.tip;
    const along = unit({ x: tb - bb, y: tu - bu });
    const across = { x: -along.y, y: along.x };
    const length = Math.hypot(tb - bb, tu - bu);
    const lag = (t: number): number => clamp((length * t) / 12, 0, 1.3);
    const side = (t: number, w: number): Point => {
      const b = bb + (tb - bb) * t + across.x * (w + l.bend * Math.sin(Math.PI * t));
      const u = bu + (tu - bu) * t + across.y * (w + l.bend * Math.sin(Math.PI * t));
      return point(b, u, lag(t));
    };
    const half = l.width / 2;
    const shape = [
      side(0, half),
      side(0.45, half * 0.9),
      side(0.8, half * 0.45),
      point(tb, tu, lag(1)),
      side(0.8, -half * 0.35),
      side(0.45, -half * 0.8),
      side(0, -half),
    ];
    if (decal) canvas.decal(shape, material, 'mane', { flat: true });
    else canvas.polygon(shape, material, { group: 'mane', flat: true });
  };
  // A soft volume behind the locks, so the mane reads as one fluffy mass and only its fringe is
  // pointed.
  canvas.ellipse(point(5.5, -4.5, 0.4), 7.5 * S * k, 9 * S * k, s.headAngle, HAIR_SHADE, {
    group: 'mane',
    flat: true,
  });
  for (const l of MANE_SHADE) lock(l, HAIR_SHADE, false);
  canvas.ellipse(point(4.5, -2.5, 0.3), 5.5 * S * k, 7.5 * S * k, s.headAngle, HAIR_MID, {
    group: 'mane',
    flat: true,
  });
  for (const l of MANE_MID) lock(l, HAIR_MID, false);
  for (const l of MANE_SNOW) lock(l, HAIR_SNOW, true);
}

/** The tail's shape turned 75 degrees up around its root (clockwise, y up): raised along the back. */
function raise(p: { x: number; y: number; r: number }): { x: number; y: number; r: number } {
  const c = Math.cos((-75 * Math.PI) / 180);
  const n = Math.sin((-75 * Math.PI) / 180);
  return { x: p.x * c - p.y * n, y: p.x * n + p.y * c, r: p.r };
}

/**
 * The plush C tail (`01_garde.png`), one continuous ribbon (no seams between segments) with a
 * lilac shade inside the curl, snow-white fur outside and a fluffy tip, swaying with `tailSwing`.
 */
function drawTail(ctx: Ctx): void {
  const { canvas, at, torso, s, tailSwing } = ctx;
  if (s.hip.y < 12) return;
  // Crouched, the C tucks in (smaller) instead of being squashed against a bound.
  const reach = clamp((s.hip.y - 14) / 20, 0.62, 1.0);
  const floor = GROUND + 2;

  const root = torso(1.6, -3.8);
  const sx = tailSwing.x * 0.6;
  const sy = tailSwing.y * 0.5;

  // Spine of the plush C (Pack_01 `01_garde.png`): out of her lower back, arching up and out
  // behind her, round and down, its fluffy tip curling back in at thigh height. Radii swell from
  // the root to the tip, like a cat's.
  const spineRaw: readonly (readonly [number, number, number])[] = [
    [0.0, 0.0, 1.7],
    [-3.2, 1.8, 2.1],
    [-7.2, 2.4, 2.5],
    [-11.0, 0.8, 2.8],
    [-13.4, -2.8, 3.0],
    [-13.6, -7.2, 3.1],
    [-11.6, -11.0, 3.2],
    [-8.0, -12.8, 3.2],
    [-4.6, -12.2, 3.0],
    [-2.8, -10.2, 2.7],
  ];
  const raw = spineRaw.map(([dx, dy, r], idx) => {
    const w = idx / (spineRaw.length - 1);
    return { x: dx * reach + sx * w, y: dy * reach + sy * w, r: r * (0.8 + 0.2 * reach) };
  });
  // Past her hurtbox's back edge (`TAIL_BACK`), the whole C is scaled down around its root: it
  // stays round instead of being flattened against the bound. With no room left behind her (her
  // hips thrown back), she raises it along her back first, as a cat does.
  const bound = s.hip.y < 26 ? TAIL_BACK.crouch : TAIL_BACK.stand;
  const farthestOf = (shape: readonly { x: number; r: number }[]): number =>
    Math.min(...shape.map((p) => p.x - p.r));
  const raised = root.x + farthestOf(raw) * 0.6 < bound ? raw.map(raise) : raw;
  const k = fitBehind(root.x, farthestOf(raised), bound);
  const spine = raised.map((p) => ({
    x: root.x + p.x * k,
    y: Math.max(floor + p.r * k, root.y + p.y * k),
    r: p.r * k,
  }));
  // The spine turns counterclockwise (y up), so the left normal points inside the C.
  const inner: Point[] = [];
  const outer: Point[] = [];
  const innerShade: Point[] = [];
  const outerLight: Point[] = [];
  for (let i = 0; i < spine.length; i++) {
    const cur = spine[i];
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(spine.length - 1, i + 1)];
    if (!cur || !prev || !next) continue;
    const t = unit({ x: next.x - prev.x, y: next.y - prev.y });
    const n = { x: -t.y, y: t.x };
    inner.push(at(add(cur, scale(n, cur.r))));
    outer.push(at(add(cur, scale(n, -cur.r))));
    innerShade.push(at(add(cur, scale(n, cur.r * 0.35))));
    outerLight.push(at(add(cur, scale(n, -cur.r * 0.2))));
  }

  canvas.polygon([...inner, ...[...outer].reverse()], HAIR_MID, { group: 'tail', flat: true });
  // Plush rounded tip in the same group (one outline).
  const tip = spine[spine.length - 1];
  if (tip) canvas.circle(at(tip), tip.r * S, HAIR_MID, { group: 'tail', flat: true });
  // Soft lilac shade inside the curl, snow-white fur along the outside and on the tip.
  canvas.decal([...inner.slice(1), ...[...innerShade.slice(1)].reverse()], HAIR_SHADE, 'tail', {
    flat: true,
  });
  canvas.decal([...outer.slice(2), ...[...outerLight.slice(2)].reverse()], HAIR_SNOW, 'tail', {
    flat: true,
  });
  if (tip) {
    const lit = add(tip, { x: -tip.r * 0.25, y: tip.r * 0.25 });
    canvas.circle(at(lit), tip.r * S * 0.55, HAIR_SNOW, { group: 'tail', flat: true });
  }
}

// ---------------------------------------------------------------------------------------------
// Slender feminine arms, hand-drawn `▼` cyan shoulder triangle stamp, fingerless combat gloves

/** Hand-drawn glowing cyan downward triangle (`▼`) on Feline's bare deltoid (`poing_01_garde.png`). */
const SHOULDER_TRI: readonly string[] = [
  'ddddddd',
  'dcccccd',
  '.dclcd.',
  '.dclcd.',
  '..dcd..',
  '...d...',
];

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const skin = near ? SKIN : SKIN_FAR;
  const leather = near ? LEATHER : LEATHER_FAR;
  const top = near ? TOP : TOP_FAR;
  const group = `${which}Arm`;
  const bracerStart = sub(side.wrist, scale(side.forearm, 3.4));

  // Slender feminine upper arm & bare porcelain forearm (`2.1 * S` upper arm, `1.75 * S` forearm).
  canvas.capsule(at(side.shoulder), at(side.elbow), 2.15 * S, 1.85 * S, skin, { group });
  canvas.capsule(at(side.elbow), at(bracerStart), 1.8 * S, 1.6 * S, skin, { group });

  // Subtle underside limb shading on the near forearm, like Riff's.
  if (near) {
    const fAlong = unit(sub(side.wrist, side.elbow));
    const under = { x: fAlong.y, y: -fAlong.x };
    const sA = at(add(add(side.elbow, scale(fAlong, 1.0)), scale(under, 1.0)));
    const sB = at(add(sub(bracerStart, scale(fAlong, 0.4)), scale(under, 0.9)));
    canvas.decal([sA, sB, { x: sB.x, y: sB.y + 1 }, { x: sA.x, y: sA.y + 1 }], shade(skin), group, {
      flat: true,
    });
  }

  // Black shoulder band carrying the cyan triangle emblem (Pack_01 `01_garde.png`), then a leather
  // bicep strap with a 2x2 silver buckle.
  const arm = sub(side.elbow, side.shoulder);
  slab(
    ctx,
    add(side.shoulder, scale(arm, 0.08)),
    add(side.shoulder, scale(arm, 0.42)),
    2.3,
    2.1,
    top,
    `${group}Band`,
  );
  const strapA = add(side.shoulder, scale(arm, 0.54));
  const strapB = add(side.shoulder, scale(arm, 0.66));
  slab(ctx, strapA, strapB, 2.1, 2.0, leather, `${group}Strap`);
  if (near) {
    const triPos = at(add(side.shoulder, scale(arm, 0.25)));
    pixels(ctx, SHOULDER_TRI, triPos.x - 3, triPos.y - 3, {
      d: DETAIL.neonDeep,
      c: DETAIL.neonLight,
      l: DETAIL.neonCore,
    });
    const buckle = at(add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.59)));
    pixels(ctx, ['ls', 'sd'], buckle.x - 1, buckle.y - 1, {
      l: M.metal.light,
      s: M.metal.base,
      d: M.metal.deep,
    });
  }

  // Black tactical wrist bracer (`slab`) with a glowing cyan diagonal stripe (`poing_01_garde.png`).
  slab(ctx, bracerStart, side.wrist, 2.0, 1.9, top, `${group}Bracer`);
  if (near) {
    const fAlong = unit(sub(side.wrist, side.elbow));
    const fAcross = { x: -fAlong.y, y: fAlong.x };
    const ledA = add(bracerStart, add(scale(fAlong, 0.5), scale(fAcross, -1.3)));
    const ledB = add(side.wrist, add(scale(fAlong, -0.4), scale(fAcross, 1.3)));
    neonLine(ctx, ledA, ledB, true);
  }
  drawHand(ctx, side, near);
}

function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const glove = near ? LEATHER : LEATHER_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const fold: Material = { ...skin, base: skin.shadow, light: skin.shadow };
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));

  if (side.hand === 'open') {
    canvas.polygon(
      [
        p(0.2, -1.6),
        p(2.4, -1.8),
        p(3.6, -0.8),
        p(3.8, 2.8),
        p(2.6, 3.6),
        p(1.4, 2.8),
        p(0.0, 1.4),
      ],
      skin,
      { group, bevel: 1.1 * S },
    );
    canvas.decal([p(0.0, -1.5), p(1.9, -1.6), p(1.9, 1.5), p(0.0, 1.4)], glove, group);
    canvas.capsule(p(0.9, -1.1), p(2.2, -2.0), 0.65 * S, 0.55 * S, skin, {
      group: `${group}Thumb`,
    });
    return;
  }
  // Compact, feminine fingerless gloved fist (`8x8` sprite pixels, matching `poing_01_garde.png`
  // and Riff's `drawHand`), with bare porcelain fingers folded at the front and knuckle creases.
  canvas.polygon(
    [p(0.2, -1.8), p(3.0, -2.0), p(4.4, -1.5), p(4.7, 0.3), p(4.2, 1.8), p(1.0, 1.9), p(0.1, 1.2)],
    glove,
    { group, bevel: 1.3 * S },
  );
  canvas.decal([p(3.2, -1.8), p(4.7, -1.4), p(4.7, 1.6), p(3.2, 1.6)], skin, group);
  for (const dv of [-0.6, 0.45]) {
    canvas.decal(
      [p(3.2, dv - 0.14), p(4.7, dv - 0.14), p(4.7, dv + 0.14), p(3.2, dv + 0.14)],
      fold,
      group,
      { flat: true },
    );
  }
  canvas.capsule(p(1.8, 1.5), p(3.3, 1.2), 0.7 * S, 0.6 * S, glove, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs: baggy streetwear cargo trousers, 3D hip pouch, hanging silver chain, buckled combat boots

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const pants = near ? PANTS : PANTS_FAR;
  const group = `${which}Leg`;
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.58));

  // Tapered at the hip (`3.8 * S`), flaring wide and baggy at the knee (`4.3 * S`) and calf (`4.1 * S`)
  // before cinching into the combat boot (`poing_01_garde.png`).
  canvas.capsule(at(side.hip), at(side.knee), 3.8 * S, 4.0 * S, pants, { group });
  canvas.capsule(at(side.knee), at(top), 3.9 * S, 3.5 * S, pants, { group });
  creases(ctx, side.hip, side.knee, side.ankle, pants, group);
  if (near) drawCargoPocketAndChain(ctx, side, group);
  drawTechBoot(ctx, side, near, top);

  // Baggy cargo cuff blousing over the top of the boot shaft.
  const u = unit(shin);
  const v = { x: -u.y, y: u.x };
  const band = (t: number, w: number): Point => at(add(top, add(scale(shin, t), scale(v, w))));
  canvas.polygon([band(-0.07, -4.0), band(-0.07, 4.0), band(0.08, 3.6), band(0.08, -3.6)], pants, {
    group: `${group}Tuck`,
    bevel: 1.3 * S,
  });
  stripeAcross(ctx, top, side.ankle, [-0.02], shade(pants), 3.6, `${group}Tuck`);
}

function drawCargoPocketAndChain(ctx: Ctx, side: Side, group: string): void {
  const { canvas, at, tailSwing } = ctx;
  const along = sub(side.knee, side.hip);
  const length = Math.hypot(along.x, along.y) || 1;
  const u = scale(along, 1 / length);
  const v = { x: -u.y, y: u.x };
  const world = (t: number, w: number): Point => add(side.hip, add(scale(along, t), scale(v, w)));
  const point = (t: number, w: number): Point => at(world(t, w));

  // 3D black hip pouch on the outer back hip (`poing_01_garde.png`), with flap seam and vertical
  // cyan LED bar.
  canvas.polygon(
    [point(0.02, -4.8), point(0.02, -0.8), point(0.42, -1.0), point(0.42, -4.6)],
    POCKET,
    { group: `${group}Pouch`, bevel: 1.2 * S },
  );
  canvas.decal(
    [point(0.14, -4.6), point(0.14, -0.9), point(0.19, -0.9), point(0.19, -4.6)],
    shade(POCKET),
    `${group}Pouch`,
    { flat: true },
  );
  neonLine(ctx, world(0.18, -2.0), world(0.38, -2.1), true);

  // Two parallel diagonal cyan LED dashes (`//`) on the front of the leading thigh (`poing_01_garde.png`).
  neonLine(ctx, world(0.36, 1.1), world(0.46, 2.5), true);
  neonLine(ctx, world(0.48, 0.7), world(0.58, 2.1), true);

  // Silver O-ring at the belt (`t = 0.03, w = 0.5`) and hanging silver chain/strap looping down to a
  // silver buckle on the outer thigh (`t = 0.52, w = -2.2`), swaying slightly with `tailSwing`.
  const oRing = at(world(0.03, 0.4));
  pixels(ctx, ['ll', 'l.'], oRing.x - 1, oRing.y - 1, { l: M.metal.gloss ?? M.metal.light });

  const lag = clamp(tailSwing.x * 0.25, -0.8, 0.8);
  const chainPts = [
    world(0.08, 0.3),
    world(0.2, -0.1 + lag * 0.3),
    world(0.32, -0.7 + lag * 0.5),
    world(0.43, -1.5 + lag * 0.4),
    world(0.52, -2.3),
  ];
  for (let i = 0; i + 1 < chainPts.length; i++) {
    const ptA = chainPts[i];
    const ptB = chainPts[i + 1];
    if (!ptA || !ptB) continue;
    const a = at(ptA);
    const b = at(ptB);
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
    for (let k = 0; k <= n; k++) {
      const px = Math.round(a.x + ((b.x - a.x) * k) / n);
      const py = Math.round(a.y + ((b.y - a.y) * k) / n);
      canvas.dot(px, py, k % 2 === 0 ? M.metal.light : M.metal.base);
      canvas.dot(px + 1, py, M.metal.shadow);
    }
  }
  const thighBuckle = at(world(0.52, -2.3));
  pixels(ctx, ['ll', 'ss'], thighBuckle.x - 1, thighBuckle.y - 1, {
    l: M.metal.light,
    s: M.metal.shadow,
  });
}

function drawTechBoot(ctx: Ctx, side: Side, near: boolean, top: Point): void {
  const { canvas, at } = ctx;
  const boot = near ? BOOT : BOOT_FAR;
  const leather = near ? LEATHER : LEATHER_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  const toe = sub(side.toe, side.heel);
  const length = Math.hypot(toe.x, toe.y) || 1;
  const u = scale(toe, 1 / length);
  const v = { x: -u.y, y: u.x };
  const sole = add(side.heel, add(scale(u, 2.6), scale(v, -BODY.footRadius)));
  const world = (a: number, b: number): Point => add(sole, add(scale(u, a), scale(v, b)));
  const p = (a: number, b: number): Point => at(world(a, b));

  canvas.capsule(at(top), at(side.ankle), 3.3 * S, 3.0 * S, boot, { group });
  // Two horizontal leather boot straps with silver buckles around the shin (`poing_01_garde.png`).
  stripeAcross(ctx, top, side.ankle, [0.28, 0.68], leather, 3.3, group);
  canvas.polygon(
    [
      p(-3.4, 0.6),
      p(-3.7, 3.6),
      p(-3.0, 5.6),
      p(2.4, 5.8),
      p(4.6, 4.2),
      p(6.8, 3.6),
      p(7.8, 2.4),
      p(7.8, 0.6),
    ],
    boot,
    { group, bevel: 2.0 * S },
  );
  // Crisp silver-white lugged platform sole & grey toe cap (`poing_01_garde.png`).
  canvas.polygon([p(-3.6, -0.1), p(8.0, -0.1), p(8.1, 1.3), p(-3.7, 1.3)], METAL, {
    group: `${group}Sole`,
    flat: true,
  });
  for (let a = -2.6; a < 7.4; a += 1.6) {
    const lug = p(a, 0.1);
    canvas.dot(lug.x, lug.y, SOLE.deep);
  }
  canvas.polygon([p(5.5, 1.0), p(7.9, 1.0), p(7.8, 2.4), p(5.7, 2.4)], SOLE, {
    group: `${group}Toe`,
    flat: true,
  });
  if (near) {
    for (const frac of [0.28, 0.68]) {
      const b = at(add(top, scale(sub(side.ankle, top), frac)));
      pixels(ctx, ['ls', 'sd'], b.x + 1, b.y - 1, {
        l: M.metal.light,
        s: M.metal.base,
        d: M.metal.deep,
      });
    }
    // Diagonal cyan LED slash (`\`) on the outer ankle of the boot (`poing_01_garde.png`).
    neonLine(ctx, world(-1.4, 2.8), world(1.2, 1.5), true);
  }
}

// ---------------------------------------------------------------------------------------------
// Torso: pinched feminine hourglass midriff, sculpted bust crop-top & hand-drawn silver belt buckle

const BUCKLE: readonly string[] = ['llllll', 'l.dd.s', 'l.dd.s', 'ssssss'];

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const open = 1.4 * s.twist;
  const back = -0.9 * s.twist;
  const lift = s.shrug * 0.6;

  // Slender, pinched feminine hourglass midriff (`poing_01_garde.png` & Riff's `drawTorso`):
  // Arched lower back (`-2.0` at the waist) and flat toned belly (`+3.4`), flaring into the hips.
  // High-waisted cargo (Pack_01 `01_garde.png`): the trousers rise to the navel over round hips,
  // fuller at the back (`-5.6`) than the narrow waist above them.
  canvas.polygon(
    [
      t(-1.5, -5.0 + back),
      t(1.5, -5.6 + back),
      t(4.6, -4.6 + back),
      t(6.2, -3.9 + back),
      t(6.2, 4.4 + open),
      t(4.6, 4.8 + open),
      t(1.5, 5.0 + open),
      t(-1.5, 4.6 + open),
    ],
    PANTS,
    { group: 'hips', axis, tilt: { x: 0.18, y: 0 } },
  );

  // A short band of bare midriff between the high waist and the crop-top, pinched at the waist.
  const midriff = [
    t(5.6, -3.7 + back),
    t(8.4, -3.0 + back),
    t(11.0, -3.1 + back),
    t(13.2, -3.6 + back),
    t(13.2, 4.0 + open),
    t(11.0, 3.6 + open),
    t(8.4, 3.5 + open),
    t(5.6, 4.1 + open),
  ];
  canvas.polygon(midriff, SKIN, { group: 'midriff', axis, tilt: { x: 0.22, y: 0.06 } });
  // Shadow along the arched lower back, soft light down the belly, and the navel.
  canvas.decal(
    [t(5.8, -3.6 + back), t(13.0, -3.5 + back), t(13.0, -2.5 + back), t(5.8, -2.7 + back)],
    { ...SKIN, base: SKIN.shadow, light: SKIN.shadow },
    'midriff',
    { flat: true },
  );
  canvas.decal(
    [t(6.4, 3.8 + open), t(12.2, 3.6 + open), t(12.2, 3.0 + open), t(6.4, 3.2 + open)],
    { ...SKIN, base: SKIN.light, light: SKIN.light },
    'midriff',
    { flat: true },
  );
  const navel = t(8.2, 1.6 + open);
  canvas.dot(navel.x, navel.y, M.skin.shadow);
  canvas.dot(navel.x, navel.y + 1, M.skin.light);

  // Tactical belt on the high waist with a hand-drawn silver rectangular buckle.
  canvas.polygon(
    [t(4.0, -4.7 + back), t(4.0, 4.7 + open), t(6.4, 4.4 + open), t(6.4, -4.0 + back)],
    LEATHER,
    { group: 'belt', axis },
  );
  const buckle = t(5.8, 2.2 + open);
  pixels(ctx, BUCKLE, buckle.x - 1, buckle.y - 1, {
    l: M.metal.light,
    s: M.metal.base,
    d: M.metal.deep,
    '.': M.leather.base,
  });

  // Sculpted feminine sleeveless black techwear crop-top (`poing_01_garde.png`):
  // Narrow ribcage and back (`-3.6` to `-4.2`), flaring forward into a rounded feminine bust curve
  // (`+6.4` at `d = 17.5`) and tucking sharply back in under the bust (`+4.0` at `d = 13.0`).
  canvas.polygon(
    [
      t(12.2, -3.6 + back),
      t(16.5, -4.2 + back),
      t(21.0 + lift, -3.8 + back),
      t(23.5 + lift, -2.4),
      t(25.2, 3.4 + open),
      t(24.8, 6.2 + open),
      t(23.0, 7.0 + open),
      t(20.6, 7.3 + open),
      t(19.0, 7.0 + open),
      t(16.6, 6.8 + open),
      t(14.6, 5.2 + open),
      t(12.2, 4.0 + open),
    ],
    TOP,
    { group: 'cropTop', axis, tilt: { x: 0.26, y: 0.14 } },
  );
  // Curved shadow under the bust and highlight sheen across the upper bust (like Riff's `drawTorso`).
  canvas.decal(
    [
      t(12.2, -3.5 + back),
      t(13.8, 1.2 + open),
      t(15.0, 4.8 + open),
      t(16.4, 6.2 + open),
      t(15.2, 6.2 + open),
      t(13.8, 4.6 + open),
      t(12.2, 4.0 + open),
    ],
    shade(TOP),
    'cropTop',
  );
  canvas.decal(
    [t(18.4, 2.2 + open), t(19.6, 5.2 + open), t(18.8, 5.8 + open), t(17.6, 2.8 + open)],
    { ...TOP, base: TOP.light, shadow: TOP.base },
    'cropTop',
    { flat: true },
  );
  // Under-bust tactical strap.
  canvas.decal(
    [t(12.0, -3.5 + back), t(12.0, 4.0 + open), t(13.3, 4.2 + open), t(13.3, -3.6 + back)],
    LEATHER,
    'cropTop',
  );

  // High techwear collar with glowing cyan LED dash (`poing_01_garde.png`).
  canvas.polygon([t(22.4, -3.4), t(26.8, -2.6), t(27.4, 3.8), t(23.0, 5.2)], TOP, {
    group: 'collar',
    axis,
    bevel: 0.9 * S,
  });
  neonLine(ctx, torso(25.2, -1.4), torso(25.5, 1.2), true);
}

// ---------------------------------------------------------------------------------------------
// Slender feminine neck & stamped head

function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(22.0, 0.4)), at(local(0.0, -3.2)), 1.8 * S, 1.6 * S, SKIN, {
    group: 'neck',
  });
}

function drawHead(ctx: Ctx): void {
  const { canvas, at, s, maneSwing } = ctx;
  stampHead(canvas, s.face, at(s.head), s.headAngle, maneSwing.x * S * 0.4);
  canvas.volume(at(s.head), BODY.headRadius * S * 1.05);
}
