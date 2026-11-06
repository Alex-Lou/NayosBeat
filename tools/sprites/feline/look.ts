/**
 * Feline (issue #155 comments 6660565057 & 6673436650: `poing_01_garde.png` & Pack_01..Pack_05):
 * Slender, curvy anime cat-fighter rendered at ART_SCALE = 2 with:
 * - Voluminous snow-white high ponytail (`drawMane`) sculpted in 3 feathery, pointed locks rising
 *   above the black scrunchie (driven by spring 0 for fluid overlapping secondary motion), leaving
 *   her two coral-pink cat ears (`head.ts`) completely clear;
 * - Long, seamless, smooth C-hook white feline tail (`drawTail`) drawn as a continuous shaded
 *   ribbon (no capsule seam rings!) driven by spring 1;
 * - Pinched hourglass bare midriff (`5.4 px` at the waist, S-curved lower back, navel and soft
 *   abdominal shading) under a sculpted sleeveless black techwear crop-top with a rounded feminine
 *   bust, under-bust shadow/strap, and a high collar with a cyan LED dash;
 * - Slender porcelain arms (`2.1 * S` upper arm, `1.75 * S` forearm) with a hand-drawn cyan `▼`
 *   triangle stamp (`SHOULDER_TRI`) on the bare deltoid, a buckled black bicep strap, a wrist
 *   bracer with a diagonal cyan LED, and compact fingerless combat gloves;
 * - Baggy streetwear cargo trousers (tapered at the waist, wide at the knee/calf) with a hand-drawn
 *   silver belt buckle (`BUCKLE`), a 3D hip pouch with a vertical cyan LED, a hanging silver chain
 *   looping to a thigh buckle, two diagonal cyan thigh dashes (`//`), and buckled combat boots with
 *   a cyan ankle LED and a crisp silver-white lugged sole.
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
// Sculpted feathery high ponytail (`drawMane`) & seamless C-hook feline tail (`drawTail`)

/**
 * Voluminous snow-white high ponytail (`poing_01_garde.png`), sculpted as three layered, pointed
 * feathery plumes (polygons with strand shading, never round capsule balls!) that burst up-back
 * from the black scrunchie behind her cat ears and sway with `maneSwing`.
 */
function drawMane(ctx: Ctx): void {
  const { canvas, at, s, maneSwing } = ctx;
  if (s.head.y < 16) return;
  const standing = clamp((s.hip.y - 18) / 14, 0.38, 1);
  const crouch = s.hip.y < 26;
  const minX = crouch ? -16.0 : -25.0;
  const root = add(s.head, add(scale(s.front, -5.2), scale(s.up, 2.2)));
  const sx = maneSwing.x * standing;
  const sy = maneSwing.y * standing;
  const p = (dx: number, dy: number, lag = 1): Point =>
    at({
      x: Math.max(minX, root.x + (dx + sx * lag) * standing),
      y: Math.max(18, root.y + dy * standing + sy * lag),
    });

  // Lower/far plume cascading down behind the shoulder.
  canvas.polygon(
    [
      p(0.0, -1.5, 0.1),
      p(-4.5, -2.5, 0.4),
      p(-9.5, -5.5, 0.7),
      p(-13.8, -10.5, 1.0),
      p(-9.0, -10.8, 0.8),
      p(-4.2, -7.8, 0.5),
      p(0.5, -4.5, 0.2),
    ],
    HAIR_SHADE,
    { group: 'mane', flat: true },
  );

  // Middle feathery plume sweeping out and down-left with a pointed tip.
  const midPoly = [
    p(0.5, 1.0, 0.1),
    p(-4.2, 2.2, 0.3),
    p(-9.8, 0.5, 0.6),
    p(-15.2, -3.2, 0.95),
    p(-11.0, -5.2, 0.75),
    p(-6.2, -4.5, 0.45),
    p(-0.5, -2.5, 0.15),
  ];
  canvas.polygon(midPoly, HAIR_MID, { group: 'mane', flat: true });
  canvas.decal(
    [p(-0.5, 0.8, 0.1), p(-5.0, 1.6, 0.35), p(-12.5, -1.8, 0.8), p(-8.5, -2.4, 0.55)],
    HAIR_SNOW,
    'mane',
    { flat: true },
  );

  // Upper crown plume arching high above the scrunchie (`y = 74..76` in `poing_01_garde.png`) and
  // tapering to a sharp windswept tip.
  const topPoly = [
    p(1.0, 1.5, 0.05),
    p(-2.2, 5.8, 0.25),
    p(-7.2, 6.4, 0.5),
    p(-13.4, 3.8, 0.85),
    p(-9.2, 1.4, 0.6),
    p(-3.8, 0.8, 0.3),
    p(0.5, -0.2, 0.1),
  ];
  canvas.polygon(topPoly, HAIR_MID, { group: 'mane', flat: true });
  canvas.decal(
    [
      p(0.5, 2.0, 0.1),
      p(-2.5, 5.4, 0.25),
      p(-7.0, 5.8, 0.5),
      p(-11.5, 3.8, 0.75),
      p(-6.0, 2.6, 0.4),
    ],
    HAIR_SNOW,
    'mane',
    { flat: true },
  );
}

/**
 * Long, seamless, smooth C-hook white feline tail (`poing_01_garde.png`), drawn as a continuous
 * polygon ribbon with snow-white top highlight and soft silver underside shadow (zero internal
 * capsule rings!), swaying fluidly with `tailSwing`.
 */
function drawTail(ctx: Ctx): void {
  const { canvas, at, torso, s, tailSwing } = ctx;
  if (s.hip.y < 12) return;
  const crouch = s.hip.y < 26;
  const reach = crouch ? 0.52 : clamp((s.hip.y - 20) / 14, 0.82, 1.0);
  const minX = crouch ? -16.2 : -24.8;
  const minY = 14.0;
  const clampT = (p: Point): Point => ({ x: Math.max(minX, p.x), y: Math.max(minY, p.y) });

  const root = torso(0.4, -3.6);
  const sx = tailSwing.x * 0.45 * reach;
  const sy = tailSwing.y * 0.4 * reach;

  // Spine of the long C-hook cat tail, from behind her hip pouch out to -14.4 px and up +11.6 px.
  const spineRaw: readonly (readonly [number, number, number])[] = [
    [0.0, 0.0, 1.6],
    [-3.6, -2.0, 1.8],
    [-7.8, -2.5, 2.0],
    [-11.8, -0.8, 2.1],
    [-14.2, 2.6, 2.2],
    [-14.4, 6.8, 2.2],
    [-12.2, 10.4, 2.2],
    [-8.6, 11.6, 2.1],
    [-5.4, 10.2, 2.0],
    [-4.4, 8.0, 1.8],
  ];
  const spine = spineRaw.map(([dx, dy, r], idx) => {
    const w = idx / (spineRaw.length - 1);
    const pt = clampT({
      x: root.x + (dx + sx * w) * reach,
      y: root.y + (dy + sy * w) * reach,
    });
    return { ...pt, r: r * (crouch ? 0.85 : 1.0) };
  });

  const leftEdge: Point[] = [];
  const rightEdge: Point[] = [];
  const innerLight: Point[] = [];
  for (let i = 0; i < spine.length; i++) {
    const cur = spine[i];
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(spine.length - 1, i + 1)];
    if (!cur || !prev || !next) continue;
    const t = unit({ x: next.x - prev.x, y: next.y - prev.y });
    const n = { x: -t.y, y: t.x };
    leftEdge.push(at(clampT(add(cur, scale(n, cur.r)))));
    rightEdge.push(at(clampT(add(cur, scale(n, -cur.r)))));
    innerLight.push(at(clampT(add(cur, scale(n, -cur.r * 0.15)))));
  }

  const ribbon = [...leftEdge, ...[...rightEdge].reverse()];
  canvas.polygon(ribbon, HAIR_MID, { group: 'tail', flat: true });

  // Plush rounded tip cap + base cap in the same 'tail' group (one unified outline!).
  const tip = spine[spine.length - 1];
  if (tip) canvas.circle(at(tip), tip.r * S, HAIR_SNOW, { group: 'tail', flat: true });

  // Snow-white highlight along the upper/inner half of the C-loop (`poing_01_garde.png`).
  const litRibbon = [...rightEdge.slice(2), ...[...innerLight.slice(2)].reverse()];
  canvas.decal(litRibbon, HAIR_SNOW, 'tail', { flat: true });
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

  // Black leather bicep strap with a 2x2 silver buckle just below the deltoid (`poing_01_garde.png`).
  const strapA = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.52));
  const strapB = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.66));
  slab(ctx, strapA, strapB, 2.1, 2.0, leather, `${group}Strap`);
  if (near) {
    const triPos = at(add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.24)));
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
  const midriff = [
    t(2.2, -4.2 + back),
    t(5.2, -2.6 + back),
    t(8.2, -2.0 + back),
    t(11.0, -2.6 + back),
    t(13.2, -3.5 + back),
    t(13.2, 4.0 + open),
    t(11.0, 3.6 + open),
    t(8.2, 3.4 + open),
    t(5.2, 3.8 + open),
    t(2.2, 4.4 + open),
  ];
  canvas.polygon(midriff, SKIN, { group: 'midriff', axis, tilt: { x: 0.22, y: 0.06 } });
  // Oblique shadow along the arched lower back, soft abdominal line, and navel.
  canvas.decal(
    [t(2.6, -4.1 + back), t(13.0, -3.4 + back), t(13.0, -2.3 + back), t(2.6, -3.0 + back)],
    { ...SKIN, base: SKIN.shadow, light: SKIN.shadow },
    'midriff',
    { flat: true },
  );
  canvas.decal(
    [t(3.6, 4.1 + open), t(12.2, 3.6 + open), t(12.2, 3.0 + open), t(3.6, 3.5 + open)],
    { ...SKIN, base: SKIN.light, light: SKIN.light },
    'midriff',
    { flat: true },
  );
  const navel = t(6.8, 1.4 + open);
  canvas.dot(navel.x, navel.y, M.skin.deep);
  canvas.dot(navel.x, navel.y + 1, M.skin.light);

  // Tactical belt riding on the low waist with hand-drawn silver rectangular buckle.
  canvas.polygon(
    [t(0.0, -4.6 + back), t(0.0, 4.8 + open), t(2.8, 4.9 + open), t(2.8, -4.6 + back)],
    LEATHER,
    { group: 'belt', axis },
  );
  const buckle = t(1.8, 2.2 + open);
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
      t(23.6, 2.0 + open),
      t(21.2, 5.2 + open),
      t(18.8, 6.5 + open),
      t(16.6, 6.3 + open),
      t(14.8, 5.0 + open),
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
  canvas.polygon([t(22.4, -3.4), t(26.8, -2.6), t(27.2, 2.0), t(22.8, 2.8)], TOP, {
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
  canvas.capsule(at(torso(22.0, 0.4)), at(local(0.0, -3.2)), 1.6 * S, 1.45 * S, SKIN, {
    group: 'neck',
  });
}

function drawHead(ctx: Ctx): void {
  const { canvas, at, s, maneSwing } = ctx;
  stampHead(canvas, s.face, at(s.head), s.headAngle, maneSwing.x * S * 0.4);
  canvas.volume(at(s.head), BODY.headRadius * S * 1.05);
}
