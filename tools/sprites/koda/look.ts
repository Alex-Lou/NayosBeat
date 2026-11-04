/**
 * Koda (Sound Clash): transformed from the LPC character (issue #174) into high-resolution volume
 * pixel art. Spiky emerald-green hair, cyan-blue eyes; an open storm-teal / blue-gray frock coat
 * with silver button rows down both lapels and coat skirts flaring over the hips, worn open over a
 * bare sculpted chest; layered silver plate shoulder pauldrons and forearm vambraces with glowing
 * jade resonator slits; bare martial hands with wrist wraps; dark forest-black formal trousers and
 * bare martial feet with ankle wraps.
 *
 * Everything is placed in world pixels (character space, see skeleton.ts) and drawn ART_SCALE
 * times finer.
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
const JACKET: Material = { ...M.jacket, glossCut: 0.92 };
const JACKET_FAR = farLit(JACKET);
const SLEEVE = noGloss(JACKET);
const LINING = matteOf(M.shirt);
const LEATHER: Material = { ...M.leather, glossCut: 0.9 };
const LEATHER_FAR = farLit(LEATHER);
const PANTS = noGloss(M.pants);
const PANTS_FAR = farLit(PANTS);
const LAPEL = matteOf(M.pocket);
const WRAP: Material = { ...M.boot, glossCut: 0.9 };
const WRAP_FAR = farLit(WRAP);
const SOLE = matteOf(M.sole);
const METAL: Material = { ...M.metal, glossCut: 0.68 };
const METAL_FAR = farLit(METAL);
const PLASTIC: Material = { ...M.plastic, glossCut: 0.86 };

function farLit(material: Material): Material {
  const far = farOf(material);
  return material.rim === undefined ? far : { ...far, rim: material.rim };
}

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of hanging parts (coat skirts, hair spikes), in world pixels. */
  readonly swing: Point;
}

/** Draws Koda in the cell whose left edge is `cellX`. */
export function drawKoda(
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
    swing: {
      x: clamp(-motion.vx * 1.1, -2.6, 2.6),
      y: clamp(-motion.vy * 0.5, -2, 2),
    },
  };

  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 5.4 * S, 4.6 * S, 0, PANTS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  drawCoatSkirt(ctx);
  drawNeck(ctx);
  drawTorso(ctx);
  drawCollar(ctx);
  drawHead(ctx);
  drawArm(ctx, skeleton.near, 'near');
  drawResonatorClasp(ctx);
}

// ---------------------------------------------------------------------------------------------
// Resonator neon accents

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

// ---------------------------------------------------------------------------------------------
// Arms: silver plate pauldrons, coat upper sleeves, silver forearm vambraces, bare martial hands

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const sleeve = near ? SLEEVE : JACKET_FAR;
  const metal = near ? METAL : METAL_FAR;
  const wrap = near ? LEATHER : LEATHER_FAR;
  const group = `${which}Arm`;
  const cuffStart = sub(side.wrist, scale(side.forearm, 2.0));

  // Upper sleeve of the frock coat, from shoulder to elbow.
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.6 * S, 3.1 * S, sleeve, { group });
  // Silver plate shoulder pauldron (060 armour__silver_.png): domed steel plate over the shoulder.
  canvas.circle(at(side.shoulder), 3.9 * S, metal, { group: `${group}Pauldron` });
  stripeAcross(
    ctx,
    side.shoulder,
    side.elbow,
    [0.24],
    { ...metal, base: metal.shadow, light: metal.gloss ?? metal.light },
    3.9,
    `${group}Pauldron`,
  );
  // Silver forearm vambrace / gauntlet from elbow to wrist wrap.
  canvas.capsule(at(side.elbow), at(cuffStart), 3.2 * S, 2.8 * S, metal, { group });
  // Martial leather wrist wrap.
  canvas.capsule(at(cuffStart), at(side.wrist), 2.5 * S, 2.4 * S, wrap, { group });
  const plateSeam = { ...metal, base: metal.shadow, light: metal.light };
  stripeAcross(ctx, side.elbow, cuffStart, [0.35, 0.72], plateSeam, 3.2, group);
  creases(ctx, side.shoulder, side.elbow, cuffStart, sleeve, group);
  if (near) drawPauldronResonator(ctx, side);
  drawHand(ctx, side, near);
}

/** Glowing acoustic resonator slit on the lead silver pauldron and bracer. */
function drawPauldronResonator(ctx: Ctx, side: Side): void {
  const along = unit(sub(side.elbow, side.shoulder));
  const across = { x: -along.y, y: along.x };
  const center = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.22));
  const pt = (u: number, v: number): Point => add(center, add(scale(along, u), scale(across, v)));
  neonLine(ctx, pt(-1.2, -1.6), pt(-1.2, 1.6), true);
  neonLine(ctx, pt(0.5, -1.3), pt(0.5, 1.3), true);
  const core = ctx.at(center);
  ctx.canvas.dot(core.x, core.y, DETAIL.neonDeep);
}

function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const wrap = near ? LEATHER : LEATHER_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));

  if (side.hand === 'open') {
    // Open martial-arts palm with wrist wrap at the base, bare palm and fingers extended.
    canvas.polygon(
      [
        p(0.2, -2.0),
        p(2.6, -2.2),
        p(3.4, -1.0),
        p(3.6, 3.6),
        p(2.6, 4.6),
        p(1.6, 3.8),
        p(0.0, 1.8),
      ],
      skin,
      { group, bevel: 1.4 * S },
    );
    canvas.decal([p(0.0, -1.9), p(1.4, -2.0), p(1.4, 2.0), p(0.0, 1.8)], wrap, group);
    canvas.capsule(p(1.0, -1.4), p(2.6, -2.6), 0.85 * S, 0.75 * S, skin, {
      group: `${group}Thumb`,
    });
    return;
  }
  // Bare martial fist with dark wrist wrap at the base (matching the bare fists in the LPC sheet).
  canvas.polygon(
    [
      p(0.2, -2.3),
      p(3.8, -2.5),
      p(5.2, -1.7),
      p(5.4, 1.2),
      p(4.6, 2.4),
      p(1.0, 2.6),
      p(-0.1, 1.5),
      p(-0.2, -1.1),
    ],
    skin,
    { group, bevel: 1.6 * S },
  );
  // Wrist wrap band across the back of the hand.
  canvas.decal([p(-0.1, -2.1), p(1.8, -2.3), p(1.8, 2.3), p(-0.1, 1.6)], wrap, group);
  // Knuckle shadow line.
  canvas.decal(
    [p(4.3, -2.5), p(4.6, -2.5), p(4.6, -0.4), p(4.3, -0.4)],
    { ...skin, base: skin.shadow, light: skin.base },
    group,
    { flat: true },
  );
  canvas.capsule(p(2.2, 1.9), p(4.0, 1.5), 0.9 * S, 0.8 * S, skin, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs: dark forest-black formal trousers and bare martial feet with ankle wraps

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const pants = near ? PANTS : PANTS_FAR;
  const group = `${which}Leg`;
  canvas.capsule(at(side.hip), at(side.knee), 4.7 * S, 3.8 * S, pants, { group });
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.62));
  canvas.capsule(at(side.knee), at(top), 3.8 * S, 3.4 * S, pants, { group });
  if (near) drawTrouserSeam(ctx, side, group);
  creases(ctx, side.hip, side.knee, side.ankle, pants, group);
  drawMartialFoot(ctx, side, near);
  // Tailored trouser cuff over the top of the ankle wrap.
  const u = unit(shin);
  const v = { x: -u.y, y: u.x };
  const band = (t: number, w: number): Point => at(add(top, add(scale(shin, t), scale(v, w))));
  canvas.polygon([band(-0.05, -3.9), band(-0.05, 3.9), band(0.1, 3.7), band(0.1, -3.7)], pants, {
    group: `${group}Tuck`,
    bevel: 1.4 * S,
  });
  stripeAcross(
    ctx,
    top,
    side.ankle,
    [0.03],
    { ...pants, base: pants.shadow, light: pants.base },
    3.8,
    `${group}Tuck`,
  );
}

function drawTrouserSeam(ctx: Ctx, side: Side, group: string): void {
  const { canvas, at } = ctx;
  const along = sub(side.knee, side.hip);
  const length = Math.hypot(along.x, along.y) || 1;
  const u = scale(along, 1 / length);
  const v = { x: -u.y, y: u.x };
  const world = (t: number, w: number): Point => add(side.hip, add(scale(along, t), scale(v, w)));
  const point = (t: number, w: number): Point => at(world(t, w));
  canvas.decal(
    [point(0.28, -0.8), point(0.28, 1.4), point(0.84, 1.2), point(0.84, -0.6)],
    LAPEL,
    group,
  );
  neonLine(ctx, world(0.48, 1.2), world(0.74, 1.1), true);
}

function drawMartialFoot(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const wrap = near ? WRAP : WRAP_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  const toe = sub(side.toe, side.heel);
  const length = Math.hypot(toe.x, toe.y) || 1;
  const u = scale(toe, 1 / length);
  const v = { x: -u.y, y: u.x };
  const sole = add(side.heel, add(scale(u, 2.6), scale(v, -BODY.footRadius)));
  const world = (a: number, b: number): Point => add(sole, add(scale(u, a), scale(v, b)));
  const p = (a: number, b: number): Point => at(world(a, b));

  // Ankle wrap up the lower shin, then bare martial foot with instep band (matching the bare feet
  // in the LPC spritesheet while keeping the exact foot contact envelope).
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.62));
  canvas.capsule(at(top), at(side.ankle), 3.4 * S, 3.0 * S, wrap, { group });
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
    skin,
    { group, bevel: 2.0 * S },
  );
  // Dark martial foot-wrap band across the arch/instep, leaving heel and toes bare.
  canvas.decal([p(-1.2, 0.8), p(3.8, 0.8), p(3.4, 5.2), p(-1.6, 5.2)], wrap, group);
  // Thin sole pad under the foot.
  canvas.polygon([p(-3.6, -0.1), p(8.0, -0.1), p(8.1, 1.1), p(-3.7, 1.1)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
  if (near) {
    const down = unit(shin);
    const across = { x: -down.y, y: down.x };
    const front = across.x * u.x + across.y * u.y >= 0 ? across : scale(across, -1);
    const back = scale(front, -2.5);
    neonLine(
      ctx,
      add(add(side.ankle, scale(sub(top, side.ankle), 0.18)), back),
      add(top, back),
      true,
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Torso: bare sculpted chest, open blue-gray frock coat with silver button rows and coat skirts

/** Flowing frock-coat skirts below the belt over the upper thighs (055 frock_coat__bluegray_.png). */
function drawCoatSkirt(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const flare = clamp(-swing.x * 0.6, -1.2, 1.4);
  const open = 2.0 * s.twist;
  const back = -1.4 * s.twist;

  // Far front coat tail.
  canvas.polygon(
    [
      t(0.6, 5.4 + open),
      t(0.6, 7.4 + open),
      t(-3.2, 7.6 + flare * 0.5 + open),
      t(-3.4, 5.0 + flare * 0.5 + open),
    ],
    JACKET_FAR,
    { group: 'farSkirt', axis },
  );
  // Near and back coat tail over the hip.
  canvas.polygon(
    [
      t(0.8, -5.8 + back),
      t(-3.4, -6.2 - flare * 0.5 + back),
      t(-3.6, 2.2 - flare * 0.4 + open),
      t(0.8, 2.4 + open),
    ],
    JACKET,
    { group: 'nearSkirt', axis, tilt: { x: 0.08, y: 0.12 } },
  );
  // Coat tail hem trim.
  canvas.decal(
    [
      t(-3.4, -6.2 - flare * 0.5 + back),
      t(-3.6, 2.2 - flare * 0.4 + open),
      t(-2.5, 2.2 - flare * 0.4 + open),
      t(-2.3, -6.0 - flare * 0.5 + back),
    ],
    LAPEL,
    'nearSkirt',
  );
}

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const flare = clamp(-swing.x * 0.6, -1.2, 1.6);
  const open = 2.5 * s.twist;
  const back = -1.5 * s.twist;
  const lift = s.shrug * 0.8;

  // Bare sculpted chest and abs showing inside the open frock coat (as in 055 frock_coat__bluegray_).
  canvas.polygon(
    [
      t(0.6, -5.6 + back),
      t(0.4, 2.6 + open),
      t(1.2, 7.4 + open),
      t(12, 8.6 + open),
      t(22.6, 6.8 + open),
      t(23.6, 1.6 + open),
      t(8, -6.6 + back),
    ],
    SKIN,
    { group: 'chest', axis, tilt: { x: 0.25, y: 0 } },
  );
  // Pectoral and abdominal definition lines on the bare chest.
  const skinShade = noGloss({ ...SKIN, base: SKIN.shadow, light: SKIN.base });
  canvas.decal(
    [t(15.2, 2.2 + open), t(15.2, 7.8 + open), t(16.0, 7.8 + open), t(16.0, 2.2 + open)],
    skinShade,
    'chest',
  );
  canvas.decal(
    [t(9.6, 2.6 + open), t(9.6, 7.2 + open), t(10.3, 7.2 + open), t(10.3, 2.6 + open)],
    skinShade,
    'chest',
  );
  canvas.decal(
    [t(6.0, 4.8 + open), t(6.0, 5.5 + open), t(20.0, 5.5 + open), t(20.0, 4.8 + open)],
    skinShade,
    'chest',
  );

  // Waist belt and silver resonator buckle.
  canvas.polygon(
    [t(0.2, -6.0 + back), t(0.2, 7.2 + open), t(2.6, 7.4 + open), t(2.6, -6.2 + back)],
    LEATHER,
    { group: 'belt', axis },
  );
  canvas.polygon(
    [t(0.5, 4.6 + open), t(0.5, 6.6 + open), t(2.3, 6.6 + open), t(2.3, 4.6 + open)],
    METAL,
    { group: 'buckle', bevel: 0.8 * S },
  );

  // Far panel of the open frock coat, at the front of the chest.
  canvas.polygon(
    [
      t(3.0, 6.8 + flare + open),
      t(2.8, 9.0 + flare + open),
      t(11, 9.4 + open),
      t(20.4, 8.4 + open),
      t(23.6, 5.6 + open),
      t(21.8, 6.8 + open),
    ],
    JACKET_FAR,
    { group: 'farPanel', axis },
  );

  // Near panel and back of the tailored blue-gray frock coat.
  canvas.polygon(
    [
      t(2.8, -6.6 + back),
      t(9, -8.0 + back),
      t(15, -8.8 + back),
      t(19, -9.0 + back),
      t(22.4 + lift, -7.2 + back),
      t(24.4 + lift, -4.4),
      t(25.0 + lift, -0.4),
      t(24.0, 1.4 + open),
      t(14, 2.0 - flare * 0.4 + open),
      t(6.4, 2.4 - flare + open),
      t(2.8, 2.6 - flare + open),
    ],
    JACKET,
    { group: 'jacket', axis, tilt: { x: 0.1, y: 0.15 } },
  );

  // Tailored vertical seam and lapel facing down the frock coat.
  canvas.decal(
    [
      t(3.0, 1.2 - flare + open),
      t(3.0, 2.6 - flare + open),
      t(23.8, 1.5 + open),
      t(23.8, 0.2 + open),
    ],
    LAPEL,
    'jacket',
  );
  canvas.decal(
    [t(3.2, -3.2 + back), t(3.2, -2.4 + back), t(22.0, -3.6 + back), t(22.0, -4.4 + back)],
    LINING,
    'jacket',
  );

  // Silver coat buttons down both lapels (matching the button rows of 055 frock_coat__bluegray_).
  for (const dist of [5.5, 9.5, 13.5, 17.5, 21.0]) {
    const nearBtn = t(dist, 1.6 - flare * (1 - dist / 24) + open);
    canvas.dot(nearBtn.x, nearBtn.y, METAL.light);
    canvas.dot(nearBtn.x + 1, nearBtn.y, METAL.deep);
    const farBtn = t(dist, 7.6 + flare * (1 - dist / 24) + open);
    canvas.dot(farBtn.x, farBtn.y, METAL.base);
  }
}

/** High structured frock-coat collar around the neck. */
function drawCollar(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  canvas.polygon(
    [
      t(22.4, -6.8),
      t(28.2, -5.4),
      t(29.2, -3.0),
      t(28.6, 2.2),
      t(27.4, 3.2),
      t(23.2, 3.6),
      t(23.6, -1.0),
    ],
    JACKET,
    { group: 'collar', axis, tilt: { x: 0.2, y: 0.1 } },
  );
  canvas.decal(
    [t(27.2, -1.0), t(28.8, -1.4), t(28.2, 2.0), t(27.0, 2.4)],
    { ...JACKET, base: JACKET.deep, light: JACKET.shadow },
    'collar',
  );
}

/** Silver acoustic resonator clasp on the frock-coat collar, with a glowing jade ring. */
function drawResonatorClasp(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const center = torso(25.8, 2.0);
  const tilt = (Math.atan2(-s.front.y, s.front.x) * 180) / Math.PI;
  canvas.ellipse(at(center), 2.3 * S, 2.6 * S, tilt, METAL, { group: 'clasp' });
  canvas.ellipse(at(center), 1.5 * S, 1.8 * S, tilt, PLASTIC, { group: 'claspCore' });
  const ring = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return add(center, add(scale(s.front, Math.cos(a) * 1.0), scale(s.up, Math.sin(a) * 1.3)));
  });
  ring.forEach((point, i) => {
    const next = ring[(i + 1) % ring.length];
    if (next) neonLine(ctx, point, next);
  });
}

// ---------------------------------------------------------------------------------------------
// Head

function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(22.5, 0.6)), at(local(0.4, -3.2)), 2.5 * S, 2.3 * S, SKIN, {
    group: 'neck',
  });
}

function drawHead(ctx: Ctx): void {
  const { canvas, at, s, swing } = ctx;
  stampHead(canvas, s.face, at(s.head), s.headAngle, swing.x * S * 0.5);
  canvas.volume(at(s.head), BODY.headRadius * S * 1.15);
}
