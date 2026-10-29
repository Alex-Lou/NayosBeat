/**
 * Riff (street punk, Rushdown), as the punk girl of Zen-Tazzer: a cropped black biker jacket
 * (the collar popped, the sleeves pushed up past the elbows, a round magenta patch on the near
 * sleeve, silver zippers down its open front), a black crop top over a toned bare midriff, a
 * studded belt with a silver buckle and a chain hanging in a loop off the hip, ripped black jeans
 * (skin through the holes at the thigh and the knee, bunched over the boots), fingerless black
 * leather gloves, black combat boots with a magenta triangle on the collar, a silver choker. Her
 * head is the reference's own (head.ts).
 *
 * Everything is placed in world pixels (character space, see skeleton.ts) and drawn ART_SCALE
 * times finer. What hangs lags behind the body: the fringe rides the first spring of index.ts,
 * the belt's chain the second, the jacket's hem flares behind fast moves.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import { STILL, type Motion } from '../fighter.ts';
import { clamp, creases, headLocal, stripeAcross, unit } from '../parts.ts';
import type { Material, PixelCanvas, Point } from '../raster.ts';
import { add, scale, sub, type Side, type Skeleton } from '../skeleton.ts';
import { drawSmear, type Ink } from '../vfx.ts';
import { RIFF_BODY } from './body.ts';
import { stampHead } from './head.ts';
import { EFFECTS, farOf, MATERIAL, matteOf } from './palette.ts';

export { paletteOf, type Colorway } from './palette.ts';

const S = ART_SCALE;
const M = MATERIAL;

/**
 * Bare skin: no back light of its own (a 1 px rim along a thin forearm comes out as a dotted
 * jaggy); the planes turned to the back light get it by hand (rimRun).
 */
const SKIN = matteOf(M.skin);
const SKIN_FAR = farOf(SKIN);
/**
 * The neck, slim: the skin's base on its front, turning into shadow on its back third (drawn by
 * hand in drawNeck), no light tone, no back light.
 */
const NECK: Material = { ...SKIN, light: SKIN.base };
/** The jaw's cast shadow on the neck, and the shadow down its back. */
const NECK_SHADOW: Material = { ...NECK, base: SKIN.shadow, light: SKIN.shadow };
/**
 * The leather jacket, its satin sheen in the gloss tone. No automatic back light: a 1 px line
 * along every top and back edge outlines her like a sticker and flattens the forms. The back
 * light is drawn by hand on the planes turned to it only (the top of the shoulders, the outside
 * of the upper arm), in short broken runs of the gloss tone (RIM_RUN), the rim tone itself kept
 * for a pixel or two of accent (RIM_ACCENT).
 */
const JACKET: Material = {
  ...matteOf(M.jacket),
  gloss: M.jacket.gloss ?? M.jacket.light,
  glossCut: 0.92,
};
const JACKET_FAR: Material = { ...farOf(JACKET), base: JACKET.shadow, light: JACKET.base };
/** The sleeves: no specular spot (on a sleeve it reads as a stray pixel). */
const SLEEVE = matteOf(JACKET);
const RIM_RUN = M.jacket.gloss ?? M.jacket.light;
const RIM_ACCENT = M.jacket.rim ?? RIM_RUN;
const TOP: Material = matteOf(M.top);
/** Denim: no back light either. */
const JEANS = matteOf(M.jeans);
const JEANS_FAR = farOf(JEANS);
const LEATHER: Material = { ...M.leather, glossCut: 0.9 };
const LEATHER_FAR = farOf(LEATHER);
const BOOT: Material = { ...M.boot, glossCut: 0.82 };
const BOOT_FAR = farOf(BOOT);
const SOLE = matteOf(M.sole);
const ACCENT = M.magenta;
/** The pale threads across a rip, and the worn shine of the jeans. */
const THREAD = M.jeans.rim ?? M.jeans.light;
const DENIM_SHINE = M.jeans.gloss ?? M.jeans.light;

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of the short hanging parts (the jacket's hem), in world pixels. */
  readonly swing: Point;
  /** How far the tip of each spring of index.ts lags (world pixels): fringe, chain. */
  readonly hang: Readonly<{ fringe: Point; chain: Point }>;
}

/** Draws Riff in the cell whose left edge is `cellX`. */
export function drawRiff(
  canvas: PixelCanvas,
  skeleton: Skeleton,
  cellX: number,
  motion: Motion = STILL,
): void {
  const at = (p: Point): Point => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S });
  const [fringe = { x: 0, y: 0 }, chain = fringe] = motion.hang ?? [];
  const ctx: Ctx = {
    canvas,
    fx: EFFECTS,
    s: skeleton,
    at,
    torso: (distance, across) =>
      add(add(skeleton.hip, scale(skeleton.up, distance)), scale(skeleton.front, across)),
    swing: {
      x: clamp(-motion.vx * 1.1, -2.4, 2.4),
      y: clamp(-motion.vy * 0.5, -2, 2),
    },
    hang: { fringe, chain },
  };

  // Motion trails behind the body; the other effects go on the front layer (see sheet.ts).
  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 5.4 * S, 4.6 * S, 0, JEANS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  // The neck goes behind the collar: the popped collar frames it.
  drawNeck(ctx);
  drawTorso(ctx);
  drawJacket(ctx);
  drawCollar(ctx);
  drawChoker(ctx);
  drawHead(ctx);
  drawBeltChain(ctx);
  drawArm(ctx, skeleton.near, 'near');
}

// ---------------------------------------------------------------------------------------------
// Arms and hands

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const group = `${which}Arm`;
  const f = side.forearm;
  // The sleeve is pushed up just past the elbow, rolled into a thick cuff; the forearm is bare.
  // Slim: the sleeve about 10 sprite pixels across, as in the reference.
  const cuffEnd = add(side.elbow, scale(f, 2.6));
  const skin = near ? SKIN : SKIN_FAR;
  const sleeve = near ? SLEEVE : JACKET_FAR;
  // The bare forearm first: the cuff and the glove cover its ends.
  canvas.capsule(at(cuffEnd), at(side.wrist), 1.7 * S, 1.45 * S, skin, { group: `${group}Skin` });
  if (near) forearmShading(ctx, side, cuffEnd, group);
  // The far shoulder sits a little lower and smaller: the chest hides most of it.
  const shoulder = near ? side.shoulder : add(side.shoulder, { x: 0, y: -1 });
  canvas.circle(at(shoulder), (near ? 2.9 : 2.6) * S, sleeve, { group });
  canvas.capsule(at(shoulder), at(side.elbow), 2.6 * S, 2.3 * S, sleeve, { group });
  canvas.capsule(at(side.elbow), at(cuffEnd), 2.3 * S, 2.2 * S, sleeve, { group });
  // The rolled cuff: a band a little wider than the sleeve, its lower edge in shadow.
  const cuffStart = add(side.elbow, scale(f, 0.9));
  const cuff = near ? SLEEVE : JACKET_FAR;
  slab(ctx, cuffStart, cuffEnd, 2.6, 2.5, cuff, `${group}Cuff`);
  stripeAcross(ctx, cuffStart, cuffEnd, [0.5], shade(cuff), 2.5, `${group}Cuff`);
  sleeveFolds(ctx, side, cuffStart, near ? JACKET.deep : JACKET.outline);
  if (near) {
    // The back light on the outside of the upper arm and the top of the shoulder only, broken
    // at the folds; the leather's sheen down the middle of the upper arm.
    const back = backSide(side.shoulder, side.elbow);
    rimRun(ctx, side.shoulder, side.elbow, 2.6, 2.3, back, [0.02, 0.3], RIM_RUN, group);
    rimRun(ctx, side.shoulder, side.elbow, 2.6, 2.3, back, [0.42, 0.66], RIM_RUN, group);
    rimRun(
      ctx,
      cuffStart,
      cuffEnd,
      2.6,
      2.5,
      backSide(cuffStart, cuffEnd),
      [0.1, 0.5],
      RIM_RUN,
      `${group}Cuff`,
    );
    const accent = at(add(side.shoulder, scale(back, 2.2)));
    canvas.dot(accent.x, accent.y, RIM_ACCENT);
    const along = sub(side.elbow, side.shoulder);
    const lit = upSide(side.shoulder, side.elbow);
    const on = (t: number, w: number): Point =>
      add(add(side.shoulder, scale(along, t)), scale(lit, w));
    streak(ctx, on(0.5, 0.9), on(0.72, 0.8), { ...JACKET, base: JACKET.light }, group, 0.45);
    drawPatch(ctx, side);
  }
  drawHand(ctx, side, near);
}

/**
 * The bare near forearm turned as a limb, not a flat capsule: a run of shadow along its
 * underside, and the wrist bone catching a pixel of light just above the glove.
 */
function forearmShading(ctx: Ctx, side: Side, cuffEnd: Point, group: string): void {
  const under = scale(upSide(cuffEnd, side.wrist), -1);
  streak(
    ctx,
    add(add(cuffEnd, scale(side.forearm, 0.6)), scale(under, 1.2)),
    add(sub(side.wrist, scale(side.forearm, 1.6)), scale(under, 1.0)),
    { ...SKIN, base: SKIN.shadow, light: SKIN.shadow },
    `${group}Skin`,
    0.7,
  );
  const bone = ctx.at(add(sub(side.wrist, scale(side.forearm, 2.1)), scale(under, -0.7)));
  ctx.canvas.dot(bone.x, bone.y, M.skin.light);
}

/**
 * A few short curved fold marks on the sleeve, 3 or 4 pixels each: in the crook of the elbow
 * and just above the rolled cuff (no long seams across the sleeve).
 */
function sleeveFolds(ctx: Ctx, side: Side, cuffStart: Point, tone: number): void {
  const a = unit(sub(side.shoulder, side.elbow));
  const b = side.forearm;
  const crook = unit(add(a, b));
  const bent = Math.hypot(crook.x, crook.y) > 0.1 && a.x * b.x + a.y * b.y > -0.94;
  const across = { x: -a.y, y: a.x };
  // Above the cuff, across the upper arm: a short arc bowing toward the shoulder.
  fold(ctx, add(cuffStart, scale(a, 2.2)), across, a, 4, tone);
  if (!bent) return;
  // In the crook of the elbow: two short arcs fanning from the inside of the bend.
  fold(ctx, add(side.elbow, scale(crook, 1.4)), unit(sub(a, b)), crook, 3, tone);
  fold(ctx, add(add(side.elbow, scale(crook, 0.9)), scale(a, 1.6)), across, crook, 3, tone);
}

/** A fold mark: `length` pixels along `direction` (world, unit), bowing toward `bow`. */
function fold(
  ctx: Ctx,
  center: Point,
  direction: Point,
  bow: Point,
  length: number,
  tone: number,
): void {
  const c = ctx.at(center);
  const d = { x: direction.x, y: -direction.y };
  const w = { x: bow.x, y: -bow.y };
  let last = '';
  for (let k = 0; k < length; k++) {
    const t = k - (length - 1) / 2;
    const curve = -0.35 * (t * t - ((length - 1) / 2) ** 2) * 0.5;
    const x = Math.round(c.x + d.x * t + w.x * curve);
    const y = Math.round(c.y + d.y * t + w.y * curve);
    if (`${x},${y}` === last) continue;
    last = `${x},${y}`;
    ctx.canvas.dot(x, y, tone);
  }
}

/**
 * The round magenta patch on the near sleeve, high on the upper arm: 8 sprite pixels across, a
 * dark rim, a bright magenta disc and a light swirl (the reference's, as bright as the fringe),
 * drawn pixel by pixel (a round badge reads the same at any angle of the arm).
 */
const PATCH: readonly string[] = [
  '..oooo..',
  '.ommmmo.',
  'omllllmo',
  'omldmlmo',
  'omlmdlmo',
  'ommllmso',
  '.osmmso.',
  '..oooo..',
];

function drawPatch(ctx: Ctx, side: Side): void {
  const c = ctx.at(add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.34)));
  pixels(ctx, PATCH, c.x - 4, c.y - 4, {
    o: ACCENT.outline,
    s: ACCENT.base,
    m: ACCENT.light,
    l: ACCENT.gloss ?? ACCENT.light,
    d: ACCENT.base,
  });
}

/** Writes a small hand-drawn stamp with its top-left pixel at (x, y), through `tones`. */
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

/**
 * A straight piece of a limb from `from` to `to` (world), cut square at both ends (a cuff, a
 * strap), shaded as a cylinder along it.
 */
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

/** Fingerless leather gloves, a strap around the wrist; the fingers bare. */
function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const glove = near ? LEATHER : LEATHER_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const fold: Material = { ...skin, base: skin.shadow, light: skin.shadow };
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  // Hand axes: u along the forearm from the wrist, v toward the thumb.
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));
  // The glove's cuff and its strap, over the end of the forearm.
  const strapFrom = sub(side.wrist, scale(f, 1.8));
  const strapTo = add(side.wrist, scale(f, 0.4));
  slab(ctx, strapFrom, strapTo, 1.8, 1.9, glove, `${group}Cuff`);
  stripeAcross(
    ctx,
    strapFrom,
    strapTo,
    [0.45],
    { ...glove, base: glove.light, light: glove.light },
    1.9,
    `${group}Cuff`,
  );

  if (side.hand === 'open') {
    drawOpenHand(ctx, side, glove, skin, fold, group);
    return;
  }
  // A fist, about 8 by 8 sprite pixels: the glove over the back of the hand, the bare fingers
  // folded on the knuckle face toward the opponent (three rows, a fold between each), the thumb
  // across their bottom.
  canvas.polygon(
    [p(0.2, -1.8), p(3.0, -2.0), p(4.3, -1.6), p(4.7, 0.2), p(4.3, 1.7), p(1.0, 1.9), p(0.1, 1.2)],
    glove,
    { group, bevel: 1.3 * S },
  );
  // Knuckles pointing down (the hand resting on the hip), the near hand shows the back of the
  // glove angled down and forward, a 1 px rim of light on its knuckle ridge; the bare fingers
  // curl over the front of the hip bone (two folds between them, the last one in shadow), the
  // thumb tucked behind.
  if (near && f.y < -0.35) {
    canvas.decal(
      [p(2.7, -1.9), p(3.2, -1.9), p(3.2, 1.8), p(2.7, 1.8)],
      { ...glove, base: glove.light },
      group,
      {
        flat: true,
      },
    );
    canvas.decal([p(3.3, -1.8), p(4.8, -1.4), p(4.8, 1.6), p(3.3, 1.7)], skin, group);
    for (const dv of [-0.5, 0.6]) {
      canvas.decal(
        [p(3.4, dv - 0.14), p(4.9, dv - 0.14), p(4.9, dv + 0.14), p(3.4, dv + 0.14)],
        fold,
        group,
        { flat: true },
      );
    }
    wristStud(ctx, side);
    return;
  }
  canvas.decal([p(3.3, -1.8), p(4.9, -1.5), p(4.9, 1.7), p(3.3, 1.7)], skin, group);
  for (const dv of [-0.7, 0.45]) {
    canvas.decal(
      [p(3.3, dv - 0.14), p(4.9, dv - 0.14), p(4.9, dv + 0.14), p(3.3, dv + 0.14)],
      fold,
      group,
      { flat: true },
    );
  }
  canvas.capsule(p(2.6, -1.6), p(4.0, -1.2), 0.7 * S, 0.6 * S, skin, { group: `${group}Thumb` });
  if (near) wristStud(ctx, side);
}

/** How far an open hand bends at the wrist to point its fingers at the opponent (degrees). */
const WRIST_BEND = 90;

/**
 * An open hand offered palm up, the fingers pointing at the opponent: the beckon of her taunts
 * (« come on »). Whatever the forearm does, the hand bends at the wrist toward the opponent, by
 * up to WRIST_BEND: a forearm raised upright gives a hand flat and level, palm to the sky. Seen
 * from the side, the leather back of the glove underneath, the bare palm and the fingers on
 * top, 2 or 3 art pixels of skin past the glove, their tips curling up.
 */
function drawOpenHand(
  ctx: Ctx,
  side: Side,
  glove: Material,
  skin: Material,
  fold: Material,
  group: string,
): void {
  const { canvas, at } = ctx;
  const f = side.forearm;
  const angle = Math.atan2(f.y, f.x);
  const limit = (WRIST_BEND * Math.PI) / 180;
  const turned = angle - clamp(angle, -limit, limit);
  // u along the fingers, n out of the palm (up when the hand lies flat).
  const u = { x: Math.cos(turned), y: Math.sin(turned) };
  const n = { x: -u.y, y: u.x };
  const q = (du: number, dn: number): Point => at(add(side.wrist, add(scale(u, du), scale(n, dn))));
  // The fingers first, the glove's palm over their roots.
  canvas.polygon(
    [q(1.6, -1.3), q(3.8, -1.2), q(4.6, -0.7), q(4.9, 0.1), q(4.6, 0.9), q(3.4, 0.6), q(1.6, 0.8)],
    skin,
    { group, bevel: 1.1 * S },
  );
  canvas.decal([q(2.9, -0.32), q(4.6, -0.32), q(4.6, -0.08), q(2.9, -0.08)], fold, group, {
    flat: true,
  });
  canvas.polygon(
    [q(-1.2, -1.6), q(2.7, -1.7), q(3.1, -1.0), q(2.9, 0.2), q(1.2, 0.5), q(-1.2, 0.6)],
    glove,
    { group: `${group}Glove`, bevel: 1.2 * S },
  );
  // The bare palm in the glove's opening, turned to the sky, and the thumb up beside it.
  canvas.decal([q(0.6, 0.2), q(2.8, 0.1), q(2.6, 0.7), q(0.8, 0.9)], skin, group);
  canvas.capsule(q(1.0, 0.8), q(1.7, 1.3), 0.65 * S, 0.55 * S, skin, { group: `${group}Thumb` });
}

/** The glove's wrist strap: a 1 px silver stud on its middle. */
function wristStud(ctx: Ctx, side: Side): void {
  const stud = ctx.at(sub(side.wrist, scale(side.forearm, 0.7)));
  ctx.canvas.dot(stud.x, stud.y, M.metal.base);
}

// ---------------------------------------------------------------------------------------------
// Legs and boots

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const jeans = near ? JEANS : JEANS_FAR;
  const group = `${which}Leg`;
  const shin = sub(side.ankle, side.knee);
  // The boot's shaft reaches a little under halfway up the shin; the jeans bunch over it.
  const top = add(side.knee, scale(shin, 0.58));
  canvas.capsule(at(side.hip), at(side.knee), 4.1 * S, 3.0 * S, jeans, { group });
  canvas.capsule(at(side.knee), at(top), 2.9 * S, 3.2 * S, jeans, { group });
  creases(ctx, side.hip, side.knee, side.ankle, jeans, group);
  drawDenim(ctx, side, near, group, top);
  drawRips(ctx, side, near);
  drawBoot(ctx, side, near, top);
  // The jeans bunching over the top of the boot: a band wider than the shin, flat ends.
  const u = unit(shin);
  const v = { x: -u.y, y: u.x };
  const band = (t: number, w: number): Point => at(add(top, add(scale(shin, t), scale(v, w))));
  canvas.polygon([band(-0.08, -3.6), band(-0.08, 3.6), band(0.06, 3.5), band(0.06, -3.5)], jeans, {
    group: `${group}Hem`,
    bevel: 1.2 * S,
  });
  stripeAcross(ctx, top, side.ankle, [-0.02], shade(jeans), 3.5, `${group}Hem`);
}

/**
 * The denim's wear: whiskers fanning from the hip and a stack of wrinkles over the boot, the
 * outer seam down the leg (one continuous line a tone down, a single worn pixel of shine where
 * it bends at the knee), and on the near leg a short run of back light on the top of the thigh,
 * under the belt.
 */
function drawDenim(ctx: Ctx, side: Side, near: boolean, group: string, top: Point): void {
  const jeans = near ? JEANS : JEANS_FAR;
  const shine: Material = { ...jeans, base: near ? DENIM_SHINE : jeans.light };
  const leg = sub(side.knee, side.hip);
  const shin = sub(side.ankle, side.knee);
  const lit = litSide(side.hip, side.knee);
  const on = (t: number, across: number): Point =>
    add(add(side.hip, scale(leg, t)), scale(lit, across));
  streak(ctx, on(0.16, 2.6), on(0.3, 0.6), shine, group, 0.4);
  streak(ctx, on(0.3, 2.9), on(0.42, 1.2), shine, group, 0.4);
  const litShin = litSide(side.knee, side.ankle);
  const low = (t: number, across: number): Point =>
    add(add(side.knee, scale(shin, t)), scale(litShin, across));
  streak(ctx, low(0.3, 2.6), low(0.38, 0.4), shine, group, 0.4);
  streak(ctx, low(0.46, 2.6), low(0.52, 0.9), shine, group, 0.4);
  // The outer seam: on the near leg down the back third, on the far leg along its front.
  const seamTone = near ? M.jeans.shadow : M.jeans.deep;
  const thighSide = near ? backSide(side.hip, side.knee) : scale(backSide(side.hip, side.knee), -1);
  const shinSide = near ? backSide(side.knee, top) : scale(backSide(side.knee, top), -1);
  const kneeSeam = add(side.knee, scale(thighSide, near ? 1.5 : 1.9));
  seam(
    ctx,
    [
      add(add(side.hip, scale(leg, 0.14)), scale(thighSide, near ? 1.9 : 2.2)),
      kneeSeam,
      add(add(side.knee, scale(shin, 0.5)), scale(shinSide, near ? 1.6 : 2.1)),
    ],
    seamTone,
  );
  if (near) {
    const bend = ctx.at(kneeSeam);
    ctx.canvas.dot(bend.x, bend.y, DENIM_SHINE);
  }
  if (near) {
    rimRun(
      ctx,
      side.hip,
      side.knee,
      4.1,
      3.0,
      backSide(side.hip, side.knee),
      [0.12, 0.3],
      DENIM_SHINE,
      group,
    );
  }
}

/** Every pixel along a polyline (world points): a seam. */
function seam(ctx: Ctx, points: readonly Point[], tone: number): void {
  let last = '';
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const from = ctx.at(a);
    const to = ctx.at(b);
    const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
    for (let k = 0; k <= n; k++) {
      const x = Math.floor(from.x + ((to.x - from.x) * k) / n);
      const y = Math.floor(from.y + ((to.y - from.y) * k) / n);
      if (`${x},${y}` === last) continue;
      last = `${x},${y}`;
      ctx.canvas.dot(x, y, tone);
    }
  }
}

/**
 * Skin through the torn jeans, hand-drawn like the patch (a hole is not an ellipse), three tears
 * in all: a big round hole on the near knee showing the kneecap (its edge jagged, the kneecap lit
 * on its top rows and shaded on the bottom ones, a pale thread slanting across), a diagonal slash
 * along the near thigh with a frayed lip on its upper edge, and a small hole above the far knee.
 * `e` is the torn edge, `f` the frayed lip, `t` a thread.
 */
const KNEE_TEAR: readonly string[] = [
  '..ee.e...',
  '.eLLLLee.',
  'eLLLBBLLe',
  'eBBtBBBBe',
  'eBBBtBBSe',
  '.eSSBSSe.',
  '..eSSSe..',
  '...e.ee..',
];
const THIGH_SLASH: readonly string[] = ['...fff.', '..eLBSe', '.eBSSe.', 'eSe....'];
const FAR_TEAR: readonly string[] = ['.e.e.', 'eBBSe', 'eBtSe', '.eSe.'];

function drawRips(ctx: Ctx, side: Side, near: boolean): void {
  const skin = near ? SKIN : SKIN_FAR;
  const jeans = near ? JEANS : JEANS_FAR;
  const tones = {
    e: jeans.outline,
    f: near ? DENIM_SHINE : M.jeans.light,
    t: near ? THREAD : M.jeans.light,
    L: skin.light,
    B: skin.base,
    S: skin.shadow,
  };
  const thigh = sub(side.knee, side.hip);
  const at = (t: number, across: number): Point => {
    const v = backSide(side.hip, side.knee);
    return ctx.at(add(add(side.hip, scale(thigh, t)), scale(v, across)));
  };
  if (near) {
    const knee = at(0.94, -0.4);
    pixels(ctx, KNEE_TEAR, knee.x - 4, knee.y - 4, tones);
    const slash = at(0.5, -0.4);
    pixels(ctx, THIGH_SLASH, slash.x - 3, slash.y - 2, tones);
  } else {
    const knee = at(0.8, -0.9);
    pixels(ctx, FAR_TEAR, knee.x - 2, knee.y - 2, tones);
  }
}

/**
 * The magenta triangle on the boot's collar, pointing down: outlined, glossy at the top (the
 * reference's, bright enough to carry at 1x).
 */
const TRIANGLE: readonly string[] = ['ooooooo', 'ovvvvvo', '.ouuuo.', '..out..', '...o...'];
/**
 * The laces criss-crossing up the front: one X per eyelet pair, stacked straight up the shaft
 * into a ladder, the top pixel of each X catching the light.
 */
const LACE: readonly string[] = ['h.x', '.x.', 'x.x'];

/** The ball of the boot's sole, from under the ankle (world pixels): a turned-out foot pivots on it. */
const BALL = 6;
/** The length a boot turned out toward the camera keeps on screen. */
const TURNED_OUT = 0.8;

function drawBoot(ctx: Ctx, side: Side, near: boolean, top: Point): void {
  const { canvas, at } = ctx;
  const leather = near ? BOOT : BOOT_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  // Foot axes: u from heel to toe, v up from the sole.
  const toe = sub(side.toe, side.heel);
  const u = unit(toe);
  const v = { x: -u.y, y: u.x };
  // Origin under the ankle, on the ground: the skeleton's heel-toe line runs through the middle
  // of the shoe, half its thickness above the sole.
  const sole = add(side.heel, add(scale(u, RIFF_BODY.heel), scale(v, -RIFF_BODY.footRadius)));
  // A knee turned out over its foot (the plié's rear knee, folded toward the heel) turns the
  // boot out too, its toe toward the camera: the foot foreshortens about the ball, up to 80 %.
  const middle = scale(add(side.hip, side.ankle), 0.5);
  const fold = sub(side.knee, middle);
  const turn = 1 - (1 - TURNED_OUT) * clamp(-(fold.x * u.x + fold.y * u.y) / 3, 0, 1);
  const world = (a: number, b: number): Point =>
    add(sole, add(scale(u, BALL + (a - BALL) * turn), scale(v, b)));
  const p = (a: number, b: number): Point => at(world(a, b));

  // The shaft follows the shin from the ankle to the top of the boot; the foot (heel counter,
  // a round toe cap) follows the foot. One group: no contour where they meet.
  const shin = sub(side.ankle, side.knee);
  // The shaft in the leather's base and its cool back light; the warm shine stays on the toe cap.
  const matte: Material = { ...matteOf(leather), light: leather.base };
  const shaft: Material = near ? { ...matte, rim: M.boot.rim ?? M.boot.light } : matte;
  canvas.capsule(at(top), at(side.ankle), 3.3 * S, 3.1 * S, shaft, { group });
  canvas.polygon(
    [
      p(-3.3, 0.6),
      p(-3.6, 3.8),
      p(-2.9, 6.0),
      p(2.2, 6.2),
      p(4.4, 4.4),
      p(6.6, 3.7),
      p(7.8, 2.6),
      p(7.9, 0.6),
    ],
    leather,
    { group, bevel: 2.2 * S },
  );
  // The padded collar at the top of the shaft, and the toe cap's seam.
  stripeAcross(ctx, top, side.ankle, [0.1], shade(leather), 3.3, group);
  canvas.decal([p(4.6, 1.2), p(4.9, 1.2), p(5.4, 4.0), p(5.1, 4.0)], shade(leather), group, {
    flat: true,
  });
  // Laces up the front of the shaft (the side of the toes) and over the instep: crossed laces
  // on six eyelets.
  const down = unit(shin);
  const across = { x: -down.y, y: down.x };
  const front = across.x * u.x + across.y * u.y >= 0 ? across : scale(across, -1);
  const lace = {
    x: near ? M.metal.shadow : M.metal.deep,
    h: near ? M.metal.base : M.metal.shadow,
  };
  // Up the front of the shaft from the instep to under the collar's triangle: one column, each
  // X 3 pixels under the next, the column leaning with the shaft only between the crosses.
  const bottom = at(add(add(side.ankle, scale(sub(top, side.ankle), -0.1)), scale(front, 1.1)));
  const high = at(add(add(side.ankle, scale(sub(top, side.ankle), 0.5)), scale(front, 1.1)));
  const crosses = Math.max(1, Math.floor((bottom.y - high.y) / 3) + 1);
  for (let k = 0; k < crosses; k++) {
    const f = crosses > 1 ? k / (crosses - 1) : 0;
    const x = Math.round(bottom.x + (high.x - bottom.x) * f);
    pixels(ctx, LACE, x - 1, Math.round(bottom.y) - 1 - 3 * k, lace);
  }
  // The magenta triangle on the front of the collar, pointing down, under the jeans' hem.
  const mark = at(add(add(top, scale(sub(side.ankle, top), 0.3)), scale(front, 0.9)));
  pixels(
    ctx,
    near ? TRIANGLE : TRIANGLE.slice(0, 4).map((row) => row.slice(1, 6)),
    mark.x - (near ? 3 : 2),
    mark.y - 2,
    {
      o: ACCENT.outline,
      v: near ? (ACCENT.gloss ?? ACCENT.light) : ACCENT.light,
      u: near ? ACCENT.light : ACCENT.base,
      t: ACCENT.base,
    },
  );
  // Thick lugged sole, its light welt running the whole length.
  canvas.polygon([p(-3.7, -0.1), p(8.1, -0.1), p(8.3, 1.7), p(-3.8, 1.7)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
  for (let a = -2.8; a < 7.8; a += 1.5) {
    const lug = p(a, 0.1);
    canvas.dot(lug.x, lug.y, SOLE.deep);
  }
  const from = p(-3.6, 1.45);
  const to = p(8.1, 1.45);
  const n = Math.max(1, Math.ceil(Math.abs(to.x - from.x)));
  for (let k = 0; k <= n; k++) {
    canvas.dot(from.x + ((to.x - from.x) * k) / n, from.y + ((to.y - from.y) * k) / n, SOLE.light);
  }
}

// ---------------------------------------------------------------------------------------------
// Torso: midriff, crop top, jeans' waist, belt

/**
 * Neck, from inside the collar to under the jaw: in the shadow of the jaw (no light tone), the
 * jaw's cast shadow across its top.
 */
function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(20.6, 0.6)), at(local(-2.4, -5)), 1.5 * S, 1.4 * S, NECK, {
    group: 'neck',
  });
  // The back third of the neck, turned away from the light, and one row of the jaw's shadow
  // under the jaw line of head.ts, from the ear lobe to the chin (head-local, world pixels).
  canvas.decal(
    [at(torso(20.6, -0.9)), at(local(-3.9, -5)), at(local(-3.0, -5)), at(torso(20.6, -0.1))],
    NECK_SHADOW,
    'neck',
    { flat: true },
  );
  canvas.decal(
    [at(local(-3.8, -4.4)), at(local(1, -7.6)), at(local(1, -8.1)), at(local(-3.8, -4.9))],
    NECK_SHADOW,
    'neck',
    { flat: true },
  );
}

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  // The torso is a barrel along the spine (image axes: y down), seen three quarters from the
  // front: the chest open to the viewer, the near shoulder at the back of the silhouette.
  const axis = { x: s.up.x, y: -s.up.y };
  // A chest turned toward the viewer brings the front forward, the back away.
  const open = 1.2 * s.twist;
  const back = -0.8 * s.twist;

  // The bare chest between the open jacket and the crop top: from the base of the neck down to
  // the bandeau's straight neckline, the collarbone catching a line of shadow.
  canvas.polygon(
    [t(20.2, -3.4 + back), t(23.0, -2.6), t(23.4, 1.0), t(22.8, 4.0 + open), t(20.2, 4.6 + open)],
    SKIN,
    { group: 'chest', blend: ['neck'], axis, tilt: { x: 0.3, y: 0.2 } },
  );
  canvas.decal(
    [t(22.0, -2.2), t(22.4, 0.4), t(22.1, 3.4 + open), t(21.7, 3.4 + open), t(21.6, 0.4)],
    { ...SKIN, base: SKIN.shadow, light: SKIN.shadow },
    'chest',
    { flat: true },
  );
  canvas.decal(
    [t(20.2, -3.4 + back), t(23.0, -2.6), t(23.0, -1.6), t(20.2, -2.2 + back)],
    { ...SKIN, base: SKIN.shadow, light: SKIN.shadow },
    'chest',
    { flat: true },
  );

  // The bare midriff, waist to ribs: a lean hourglass, the waist pinched at the navel, flaring
  // to the hips; the belly flat, the small of the back curved in.
  const midriff = [
    t(2.6, -4.8 + back),
    t(6.4, -4.0 + back),
    t(9.6, -3.6 + back),
    t(12.4, -3.9 + back),
    t(14.6, -4.4 + back),
    t(14.6, 4.6 + open),
    t(12.4, 4.1 + open),
    t(9.6, 3.9 + open),
    t(6.4, 4.3 + open),
    t(2.6, 4.8 + open),
  ];
  canvas.polygon(midriff, SKIN, { group: 'midriff', axis, tilt: { x: 0.2, y: 0.05 } });
  // Toned, softly: two small soft clusters of shadow between the abs under the bust, offset (no
  // line of dots), the obliques turning away into shadow along the back edge, the light down the
  // front edge, the navel.
  const groove = M.skin.shadow;
  for (const [d, cluster] of [
    [
      12.3,
      [
        [-1, 0],
        [0, 0],
        [0, 1],
      ],
    ],
    [
      10.2,
      [
        [0, 0],
        [1, 1],
      ],
    ],
  ] as const) {
    const g = t(d, 1.3 + open);
    for (const [dx, dy] of cluster) canvas.dot(g.x + dx, g.y + dy, groove);
  }
  canvas.decal(
    [t(3.0, -4.9 + back), t(14.6, -4.5 + back), t(14.6, -3.4 + back), t(3.0, -3.8 + back)],
    { ...SKIN, base: SKIN.shadow, light: SKIN.shadow },
    'midriff',
    { flat: true },
  );
  canvas.decal(
    [t(4.0, 4.9 + open), t(13.2, 4.3 + open), t(13.2, 3.75 + open), t(4.0, 4.35 + open)],
    { ...SKIN, base: SKIN.light, light: SKIN.light },
    'midriff',
    { flat: true },
  );
  const navel = t(7.6, 1.3 + open);
  canvas.dot(navel.x, navel.y, M.skin.deep);
  canvas.dot(navel.x, navel.y + 1, M.skin.deep);
  canvas.dot(navel.x, navel.y + 2, M.skin.light);

  // The crop top, a black bandeau: a straight neckline, the bust filling it at the front and
  // tucking back under it, ending at the ribs.
  canvas.polygon(
    [
      t(13.8, -4.5 + back),
      t(17.4, -5.0 + back),
      t(20.8, -4.6 + back),
      t(20.8, 3.6 + open),
      t(20.2, 5.6 + open),
      t(18.5, 6.4 + open),
      t(16.6, 6.0 + open),
      t(15.2, 5.0 + open),
      t(14.0, 4.7 + open),
      t(13.4, 4.6 + open),
    ],
    TOP,
    { group: 'top', axis, tilt: { x: 0.3, y: 0.15 } },
  );
  // The neckline's edge catching the light, and the curved shadow under the bust.
  canvas.decal(
    [t(21.0, -4.4 + back), t(21.0, 3.8 + open), t(20.3, 3.8 + open), t(20.3, -4.4 + back)],
    { ...TOP, base: TOP.light, light: TOP.light },
    'top',
    { flat: true },
  );
  canvas.decal(
    [
      t(13.2, -4.6 + back),
      t(14.6, 1.0 + open),
      t(15.6, 4.6 + open),
      t(16.8, 6.2 + open),
      t(15.6, 6.2 + open),
      t(14.4, 5.0 + open),
      t(13.2, 4.8 + open),
    ],
    shade(TOP),
    'top',
  );
  // The jersey's sheen across the top of the bust.
  canvas.decal(
    [t(19.0, 1.6 + open), t(19.8, 4.4 + open), t(19.3, 5.0 + open), t(18.6, 2.2 + open)],
    { ...TOP, base: TOP.light, shadow: TOP.base },
    'top',
    { flat: true },
  );

  drawBelt(ctx);
}

/**
 * The jeans' low waist and the studded belt riding on it, 3 px tall: pyramid studs every 3
 * sprite pixels, a square buckle at the front (hand-drawn: a silver frame, the leather inside,
 * the prong), a belt loop where the chain hooks on.
 */
const BUCKLE: readonly string[] = ['lllllll', 'l..d..s', 'l..d..s', 'l..d..s', 'sssssss'];

function drawBelt(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const open = 1.2 * s.twist;
  const back = -0.8 * s.twist;
  canvas.polygon(
    [t(-1, -5.2 + back), t(5.0, -5.0 + back), t(4.4, 5.2 + open), t(-1, 5.0 + open)],
    JEANS,
    { group: 'waist', axis },
  );
  const belt = [t(3.4, -5.3 + back), t(6.5, -5.1 + back), t(6.0, 5.3 + open), t(2.9, 5.3 + open)];
  canvas.polygon(belt, LEATHER, { group: 'belt', axis });
  // Studs along the band, from the back to the buckle, one every 4 pixels: 2 by 2 pyramids, lit
  // on the top left, in shadow on the bottom right.
  const from = t(5.2, -4.4 + back);
  const to = t(4.9, 0.6 + open);
  const n = Math.max(1, Math.floor(Math.hypot(to.x - from.x, to.y - from.y) / 4));
  for (let k = 0; k <= n; k++) {
    const x = Math.round(from.x + ((to.x - from.x) * k) / n);
    const y = Math.round(from.y + ((to.y - from.y) * k) / n);
    pixels(ctx, ['lb', 'bs'], x, y - 1, {
      l: M.metal.light,
      b: M.metal.base,
      s: M.metal.shadow,
    });
  }
  // The belt loops the chain hangs from: a tick of the jeans over the band.
  for (const across of [-3.6, 2.4]) {
    const loop = t(5.6, across + (across < 0 ? back : open));
    canvas.dot(loop.x, loop.y, M.jeans.light);
    canvas.dot(loop.x, loop.y + 1, M.jeans.light);
    canvas.dot(loop.x, loop.y + 2, M.jeans.shadow);
  }
  const buckle = t(5.9, 2.4 + open);
  pixels(ctx, BUCKLE, buckle.x - 1, buckle.y - 1, {
    l: M.metal.light,
    s: M.metal.base,
    d: M.metal.deep,
    '.': M.leather.base,
  });
}

// ---------------------------------------------------------------------------------------------
// The cropped jacket and its collar

function drawJacket(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  // The hem flares behind the motion; the rolled lead shoulder lifts the shoulder line.
  const flare = clamp(-swing.x * 0.5, -1, 1.2);
  const lift = s.shrug * 0.8;
  const open = 1.6 * s.twist;
  const back = -1.0 * s.twist;

  // The far panel, hanging open past the bust at the front.
  canvas.polygon(
    [
      t(23.0, 3.4 + open),
      t(21.6, 5.4 + open),
      t(19.6, 7.0 + open),
      t(17.0, 7.5 + open),
      t(14.4, 7.0 + open),
      t(12.2, 6.8 + open + flare * 0.3),
      t(12.4, 5.0 + open),
      t(15.0, 5.1 + open),
      t(17.6, 5.4 + open),
      t(20.2, 5.0 + open),
      t(22.4, 3.6 + open),
    ],
    JACKET_FAR,
    { group: 'farPanel', axis },
  );
  zipper(
    ctx,
    [
      torso(22.2, 3.8 + open),
      torso(20.0, 5.1 + open),
      torso(17.6, 5.5 + open),
      torso(15.0, 5.2 + open),
      torso(12.6, 5.1 + open),
    ],
    true,
  );

  // The back and the near panel: a short biker cut, the back square, the hem at the ribs, the
  // open front cut in a V from the collar down past the bust (the chest and the crop top's
  // neckline show), then straight down to the hem.
  const outline = [
    t(11.8, -6.2 + back + flare),
    t(15.0, -6.2 + back),
    t(18.6, -6.9 + back),
    t(21.6 + lift * 0.4, -6.7 + back),
    t(23.4 + lift, -5.0),
    t(23.6 + lift, -3.2),
    t(23.5, -2.6),
    t(17.5, 0.2 + open * 0.3),
    t(12.2, -0.4 + open * 0.3),
  ];
  canvas.polygon(outline, JACKET, { group: 'jacket', axis, tilt: { x: 0.1, y: 0.15 } });
  // The back light on the top of the shoulder only, in two runs broken at the seam; the hem band
  // and the zipper along the opening.
  edgeRun(
    ctx,
    torso(21.8 + lift * 0.4, -6.6 + back),
    torso(23.3 + lift, -5.0),
    s.front,
    RIM_RUN,
    'jacket',
  );
  edgeRun(
    ctx,
    torso(23.4 + lift, -4.4),
    torso(23.6 + lift, -3.3),
    scale(s.up, -1),
    RIM_RUN,
    'jacket',
  );
  canvas.decal(
    [
      t(11.6, -6.3 + back + flare),
      t(11.6, -0.2 + open * 0.3),
      t(12.9, -0.2 + open * 0.3),
      t(12.9, -6.1 + back + flare * 0.6),
    ],
    shade(JACKET),
    'jacket',
  );
  zipper(ctx, [torso(23.3, -2.5), torso(17.5, 0.0 + open * 0.3), torso(12.2, -0.6 + open * 0.3)]);
  // The leather's sheen down the lapel, under the collar: one short sharp run.
  streak(ctx, torso(21.4, -2.9), torso(19.0, -2.1), { ...JACKET, base: RIM_RUN }, 'jacket', 0.9);
  // The slanted zip pocket on the near panel.
  canvas.decal(
    [t(17.0, -4.4 + back), t(15.0, -2.2), t(14.7, -2.5), t(16.7, -4.7 + back)],
    shade(JACKET),
    'jacket',
    { flat: true },
  );
  zipper(ctx, [torso(17.2, -4.2 + back), torso(15.2, -2.1)]);
}

/**
 * A silver zipper along `points` (world, top first): mid-grey teeth, a dark tooth every other
 * pixel and a light one every sixth, so it sits in the leather instead of outlining it.
 */
function zipper(ctx: Ctx, points: readonly Point[], far = false): void {
  const { canvas, at } = ctx;
  let step = 0;
  for (let i = 0; i + 1 < points.length; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (!a || !b) continue;
    const from = at(a);
    const to = at(b);
    const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const x = from.x + ((to.x - from.x) * k) / n;
      const y = from.y + ((to.y - from.y) * k) / n;
      // On the far panel, in the shade of the bust: a tone down.
      const lit = far ? M.metal.base : M.metal.light;
      const teeth = far ? M.metal.shadow : M.metal.base;
      const tone = step % 2 === 1 ? M.metal.deep : step % 6 === 0 ? lit : teeth;
      canvas.dot(x, y, tone);
      step++;
    }
  }
}

/**
 * The popped collar: a tall standing collar behind the neck on the near side, up to the ear
 * lobe, its lining toward the viewer and its top edge catching the back light; the far side
 * turned out at the front of the neck, up to the corner of the jaw. The slim neck shows between
 * them, framed, with the choker and the chain.
 */
function drawCollar(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  canvas.polygon(
    [
      t(21.6, -6.4),
      t(24.4, -7.0),
      t(27.2, -7.2),
      t(28.0, -6.2),
      t(27.6, -4.4),
      t(25.4, -2.6),
      t(22.6, -2.0),
    ],
    JACKET,
    { group: 'collarBack', axis, tilt: { x: -0.2, y: 0.2 } },
  );
  // The lining, a tone down, inside the collar's front edge.
  canvas.decal(
    [t(23.0, -3.4), t(25.6, -4.0), t(27.2, -5.4), t(27.0, -4.4), t(25.2, -2.8), t(23.0, -2.4)],
    shade(JACKET),
    'collarBack',
    { flat: true },
  );
  edgeRun(ctx, torso(27.2, -7.2), torso(28.0, -6.2), s.front, RIM_ACCENT, 'collarBack');
  edgeRun(ctx, torso(25.2, -7.0), torso(27.2, -7.2), s.front, RIM_RUN, 'collarBack');
  // The far side, turned out at the front of the neck, up to the corner of the jaw.
  canvas.polygon(
    [t(21.4, 3.0), t(23.4, 2.6), t(25.6, 3.0), t(26.2, 4.0), t(24.6, 5.6), t(22.4, 5.8)],
    JACKET_FAR,
    { group: 'collarFar', axis },
  );
  edgeRun(ctx, torso(25.6, 3.0), torso(26.2, 4.0), scale(s.up, -1), RIM_RUN, 'collarFar');
}

/**
 * Her necklaces on the bare neck and chest: a dark chain choker, its links catching the light
 * every other pixel, and a second chain sagging onto the sternum with a small pendant.
 */
function drawChoker(ctx: Ctx): void {
  const { at, torso } = ctx;
  const line = (a: Point, b: Point, tone: (k: number) => number | undefined): void => {
    const from = at(a);
    const to = at(b);
    const n = Math.max(1, Math.round(Math.hypot(to.x - from.x, to.y - from.y)));
    for (let k = 0; k <= n; k++) {
      const shade = tone(k);
      if (shade === undefined) continue;
      ctx.canvas.dot(from.x + ((to.x - from.x) * k) / n, from.y + ((to.y - from.y) * k) / n, shade);
    }
  };
  const link = (k: number): number => (k % 2 === 0 ? M.metal.deep : M.metal.light);
  // The choker, 1 px tall around the neck.
  line(torso(23.4, -1.0), torso(23.0, 2.2), link);
  // The long chain sagging to the sternum, its pendant at the low point.
  line(torso(22.9, -0.6), torso(21.4, 0.6), link);
  line(torso(21.4, 0.6), torso(22.7, 2.0), link);
  const pendant = at(torso(21.1, 0.6));
  pixels(ctx, ['lm', 'mm', 'md'], pendant.x - 1, pendant.y, {
    l: M.metal.light,
    m: M.metal.base,
    d: M.metal.deep,
  });
}

/** Her head (head.ts), the fringe's tips swinging behind the motion. */
function drawHead(ctx: Ctx): void {
  const { canvas, at, s, hang, swing } = ctx;
  const sway = (hang.fringe.x * 0.9 + swing.x * 0.3) * S;
  stampHead(canvas, s.face, at(s.head), s.headAngle, sway);
}

/**
 * The chain hanging off the belt in a loop, from the front belt loop to the back pocket, over
 * the near hip; its low point swings behind the motion.
 */
function drawBeltChain(ctx: Ctx): void {
  const { canvas, at, torso, hang } = ctx;
  const front = torso(4.6, 2.4);
  const back = torso(4.4, -3.6);
  const sag = {
    x: (front.x + back.x) / 2 + clamp(hang.chain.x * 0.8, -5, 5),
    // Its loop lifts when the body drops away under it (a fall, the top of a jump).
    y: Math.min(front.y, back.y) - 6.2 + clamp(hang.chain.y * 0.8, -2, 5),
  };
  // Quadratic curve through the sag point (its control point twice as far down).
  const control = { x: 2 * sag.x - (front.x + back.x) / 2, y: 2 * sag.y - (front.y + back.y) / 2 };
  const a = at(front);
  const b = at(back);
  const c = at(control);
  const length = Math.hypot(c.x - a.x, c.y - a.y) + Math.hypot(b.x - c.x, b.y - c.y);
  const n = Math.max(2, Math.round(length));
  let last = { x: NaN, y: NaN };
  let link = 0;
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const x = (1 - u) * (1 - u) * a.x + 2 * u * (1 - u) * c.x + u * u * b.x;
    const y = (1 - u) * (1 - u) * a.y + 2 * u * (1 - u) * c.y + u * u * b.y;
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px === last.x && py === last.y) continue;
    last = { x: px, y: py };
    const gap = link % 3 === 2;
    canvas.dot(px, py, gap ? M.metal.deep : M.metal.light);
    canvas.dot(px, py + 1, gap ? M.metal.outline : M.metal.shadow);
    link++;
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers

/** A thin flat band from `a` to `b` (world), `width` world pixels wide: a fold, a seam, a shine. */
function streak(
  ctx: Ctx,
  a: Point,
  b: Point,
  material: Material,
  group: string,
  width = 0.5,
): void {
  const u = unit(sub(b, a));
  const v = scale({ x: -u.y, y: u.x }, width / 2);
  ctx.canvas.decal(
    [ctx.at(add(a, v)), ctx.at(add(b, v)), ctx.at(sub(b, v)), ctx.at(sub(a, v))],
    material,
    group,
    { flat: true },
  );
}

/**
 * The back light by hand on a limb: a run along the edge of the segment from `a` to `b` (radii
 * `ra` and `rb`, world), on its `side` (unit, world), between the fractions `span` of its
 * length. It straddles the edge, so only the edge's last pixel inside the shape takes it.
 */
function rimRun(
  ctx: Ctx,
  a: Point,
  b: Point,
  ra: number,
  rb: number,
  side: Point,
  span: readonly [number, number],
  tone: number,
  group: string,
): void {
  const along = sub(b, a);
  const edge = (t: number, out: number): Point =>
    ctx.at(add(add(a, scale(along, t)), scale(side, ra + (rb - ra) * t + out)));
  const [t0, t1] = span;
  ctx.canvas.decal(
    [edge(t0, -0.5), edge(t1, -0.5), edge(t1, 0.5), edge(t0, 0.5)],
    { ...SLEEVE, base: tone },
    group,
    { flat: true },
  );
}

/** The same along a straight edge of a shape from `a` to `b` (world), `inward` into it. */
function edgeRun(ctx: Ctx, a: Point, b: Point, inward: Point, tone: number, group: string): void {
  const p = (q: Point, k: number): Point => ctx.at(add(q, scale(inward, k)));
  ctx.canvas.decal(
    [p(a, -0.4), p(b, -0.4), p(b, 0.5), p(a, 0.5)],
    { ...SLEEVE, base: tone },
    group,
    {
      flat: true,
    },
  );
}

/** The side of a limb segment from `a` to `b` turned to the back light (back and up). */
function backSide(a: Point, b: Point): Point {
  const u = unit(sub(b, a));
  const v = { x: -u.y, y: u.x };
  return -v.x * 0.7 + v.y * 0.5 >= 0 ? v : scale(v, -1);
}

/** The side of a limb segment from `a` to `b` turned up (unit, world): where leather shines. */
function upSide(a: Point, b: Point): Point {
  const u = unit(sub(b, a));
  const v = { x: -u.y, y: u.x };
  return v.y >= 0 ? v : scale(v, -1);
}

/** The side of a limb segment from `a` to `b` turned toward the key light (unit, world). */
function litSide(a: Point, b: Point): Point {
  const u = unit(sub(b, a));
  const v = { x: -u.y, y: u.x };
  // The key light comes from the front and the top (raster.ts).
  return v.x * 0.62 + v.y * 0.55 >= 0 ? v : scale(v, -1);
}

/** A material one tone down (seams, cuffs, folds). */
function shade(material: Material): Material {
  return matteOf({
    ...material,
    base: material.shadow,
    light: material.base,
    shadow: material.deep,
  });
}
