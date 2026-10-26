/**
 * Nayo (Sound Clash): black techwear lit by cyan neon. A cropped quilted tech jacket with a
 * high stand-up collar and a glowing emblem on the sleeve, a charcoal shirt, a belt, cargo
 * pants with a LED strip on the pocket, combat boots, fingerless gloves, and studio headphones
 * around the neck (metal and black cups, a neon ring). Spiky black hair, cyan eyes.
 *
 * Everything is placed in world pixels (character space, see skeleton.ts) and drawn ART_SCALE
 * times finer. Parts that hang (hair spikes, jacket front) trail behind the
 * body's motion, so every strip gets follow-through for free.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import type { Material, PixelCanvas, Point } from '../raster.ts';
import { add, BODY, radians, scale, sub, type Side, type Skeleton } from '../skeleton.ts';
import { stampHead } from './head.ts';
import { DETAIL, farOf, MATERIAL, matteOf } from './palette.ts';
import { drawSmear, type Ink } from './vfx.ts';

export { paletteOf, type Colorway } from './palette.ts';

/** Body motion at this frame, in world pixels per tick (x toward the opponent, y up). */
export interface Motion {
  readonly vx: number;
  readonly vy: number;
}

export const STILL: Motion = { vx: 0, vy: 0 };

const S = ART_SCALE;

const M = MATERIAL;
const SKIN = noGloss(M.skin);
const SKIN_FAR = farOf(SKIN);
const JACKET: Material = { ...M.jacket, glossCut: 0.92 };
const JACKET_FAR: Material = { ...farOf(JACKET), base: JACKET.shadow, light: JACKET.base };
const SHIRT = matteOf(M.shirt);
const LEATHER: Material = { ...M.leather, glossCut: 0.9 };
const LEATHER_FAR = farOf(LEATHER);
const PANTS = noGloss(M.pants);
const PANTS_FAR = farOf(PANTS);
const POCKET = matteOf(M.pocket);
const BOOT: Material = { ...M.boot, glossCut: 0.9 };
const BOOT_FAR = farOf(BOOT);
const SOLE = matteOf(M.sole);
const METAL: Material = { ...M.metal, glossCut: 0.7 };
const PLASTIC: Material = { ...M.plastic, glossCut: 0.86 };

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of hanging parts, in world pixels. */
  readonly swing: Point;
}

/** Draws Nayo in the cell whose left edge is `cellX`. */
export function drawNayo(
  canvas: PixelCanvas,
  skeleton: Skeleton,
  cellX: number,
  motion: Motion = STILL,
): void {
  const at = (p: Point): Point => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S });
  const ctx: Ctx = {
    canvas,
    s: skeleton,
    at,
    torso: (distance, across) =>
      add(add(skeleton.hip, scale(skeleton.up, distance)), scale(skeleton.front, across)),
    swing: {
      x: clamp(-motion.vx * 1.1, -2.6, 2.6),
      y: clamp(-motion.vy * 0.5, -2, 2),
    },
  };

  // Motion trails behind the body; the other effects go on the front layer (see sheet.ts).
  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width);
  }
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 5.4 * S, 4.6 * S, 0, PANTS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  drawTorso(ctx);
  drawNeck(ctx);
  drawCollar(ctx);
  drawHeadphoneBand(ctx);
  drawHead(ctx);
  drawArm(ctx, skeleton.near, 'near');
  // The cups rest on the collar, over the lead shoulder.
  drawHeadphones(ctx);
}

// ---------------------------------------------------------------------------------------------
// Neon accents: exact palette slots, never shaded (they light themselves)

/** A neon line from `a` to `b` (world points): bright core, colored edge. */
function neonLine(ctx: Ink, a: Point, b: Point, width = 1): void {
  const from = ctx.at(a);
  const to = ctx.at(b);
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y)));
  for (let i = 0; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    const end = i === 0 || i === steps;
    ctx.canvas.dot(x, y, end ? DETAIL.neon : DETAIL.neonLight);
    if (width > 1) ctx.canvas.dot(x + 1, y, DETAIL.neon);
  }
}

// ---------------------------------------------------------------------------------------------
// Arms and hands

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const jacket = near ? JACKET : JACKET_FAR;
  const group = `${which}Arm`;
  const cuffStart = sub(side.wrist, scale(side.forearm, 2.0));

  // Quilted sleeve, puffy at the shoulder, an elastic cuff at the wrist.
  canvas.circle(at(side.shoulder), 3.9 * S, jacket, { group });
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.7 * S, 3.2 * S, jacket, { group });
  canvas.capsule(at(side.elbow), at(cuffStart), 3.2 * S, 2.8 * S, jacket, { group });
  canvas.capsule(at(cuffStart), at(side.wrist), 2.5 * S, 2.4 * S, jacket, { group });
  const seam = { ...jacket, base: jacket.shadow, light: jacket.base };
  stripeAcross(ctx, side.shoulder, side.elbow, [0.45], seam, 3.8, group);
  stripeAcross(ctx, side.elbow, cuffStart, [0.5], seam, 3.3, group);
  stripeAcross(
    ctx,
    cuffStart,
    side.wrist,
    [0.1],
    { ...jacket, base: jacket.deep, light: jacket.shadow },
    2.6,
    group,
  );
  creases(ctx, side.shoulder, side.elbow, cuffStart, jacket, group);
  if (near) drawEmblem(ctx, side);
  drawHand(ctx, side, near);
}

/** The glowing emblem on the upper sleeve: a neon square ring. */
function drawEmblem(ctx: Ctx, side: Side): void {
  const along = unit(sub(side.elbow, side.shoulder));
  const across = { x: -along.y, y: along.x };
  const center = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.38));
  const corner = (u: number, v: number): Point =>
    add(center, add(scale(along, u), scale(across, v)));
  const square = [corner(-1.7, -1.7), corner(1.7, -1.7), corner(1.7, 1.7), corner(-1.7, 1.7)];
  for (let i = 0; i < square.length; i++) {
    const a = square[i];
    const b = square[(i + 1) % square.length];
    if (a && b) neonLine(ctx, a, b);
  }
  const core = ctx.at(center);
  ctx.canvas.dot(core.x, core.y, DETAIL.neonDeep);
}

function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const glove = near ? LEATHER : LEATHER_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  // Hand axes: u along the forearm from the wrist, v toward the thumb.
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));

  if (side.hand === 'open') {
    // Palm pushing forward: the gloved hand stands up from the wrist, bare fingers on top.
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
      glove,
      { group, bevel: 1.4 * S },
    );
    canvas.decal([p(2.4, 1.6), p(3.7, 1.6), p(3.7, 4.0), p(2.6, 4.7), p(1.8, 3.9)], skin, group);
    canvas.capsule(p(1.0, -1.4), p(2.6, -2.6), 0.85 * S, 0.75 * S, skin, {
      group: `${group}Thumb`,
    });
    return;
  }
  // Fingerless glove: a flat knuckle face forward, bare fingers folded under it.
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
    glove,
    { group, bevel: 1.6 * S },
  );
  canvas.decal([p(3.4, -2.7), p(5.5, -2.0), p(5.5, -0.2), p(3.4, -0.6)], skin, group);
  canvas.decal(
    [p(4.3, -2.7), p(4.6, -2.7), p(4.6, -0.4), p(4.3, -0.4)],
    { ...skin, base: skin.shadow, light: skin.base },
    group,
    {
      flat: true,
    },
  );
  // Thumb, bare, folded over the fingers.
  canvas.capsule(p(2.2, 1.9), p(4.0, 1.5), 0.9 * S, 0.8 * S, skin, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs and boots

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const pants = near ? PANTS : PANTS_FAR;
  const group = `${which}Leg`;
  canvas.capsule(at(side.hip), at(side.knee), 4.7 * S, 3.8 * S, pants, { group });
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.62));
  canvas.capsule(at(side.knee), at(top), 3.8 * S, 3.4 * S, pants, { group });
  if (near) drawCargoPocket(ctx, side, group);
  creases(ctx, side.hip, side.knee, side.ankle, pants, group);
  drawBoot(ctx, side, near);
  // The pants bunching over the top of the boot: a band wider than the shin, flat ends.
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

function drawCargoPocket(ctx: Ctx, side: Side, group: string): void {
  const { canvas, at } = ctx;
  const along = sub(side.knee, side.hip);
  const length = Math.hypot(along.x, along.y) || 1;
  const u = scale(along, 1 / length);
  const v = { x: -u.y, y: u.x };
  const world = (t: number, w: number): Point => add(side.hip, add(scale(along, t), scale(v, w)));
  const point = (t: number, w: number): Point => at(world(t, w));
  canvas.decal(
    [point(0.36, -2.6), point(0.36, 2.8), point(0.8, 2.5), point(0.8, -2.3)],
    POCKET,
    group,
  );
  canvas.decal(
    [point(0.36, -2.6), point(0.36, 2.8), point(0.46, 2.8), point(0.46, -2.6)],
    { ...POCKET, base: POCKET.shadow, light: POCKET.base },
    group,
  );
  // LED strip down the pocket.
  neonLine(ctx, world(0.5, 1.4), world(0.74, 1.3));
}

function drawBoot(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const leather = near ? BOOT : BOOT_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  // Foot axes: u from heel to toe, v up from the sole.
  const toe = sub(side.toe, side.heel);
  const length = Math.hypot(toe.x, toe.y) || 1;
  const u = scale(toe, 1 / length);
  const v = { x: -u.y, y: u.x };
  // Origin under the ankle, on the ground: the skeleton's heel-toe line runs through the
  // middle of the shoe, half its thickness above the sole.
  const sole = add(side.heel, add(scale(u, 2.6), scale(v, -BODY.footRadius)));
  const world = (a: number, b: number): Point => add(sole, add(scale(u, a), scale(v, b)));
  const p = (a: number, b: number): Point => at(world(a, b));

  // Combat boot. The shaft follows the shin from the ankle (at 0, 4.6 here) to the top of the
  // boot, so its back hugs the Achilles tendon whatever the foot does; the foot (heel counter,
  // rounded toe cap) follows the foot. One group: no contour where they meet.
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.62));
  canvas.capsule(at(top), at(side.ankle), 3.5 * S, 3.2 * S, leather, { group });
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
    leather,
    { group, bevel: 2.2 * S },
  );
  // Laces up the front of the shaft (the side of the toes).
  const down = unit(shin);
  const across = { x: -down.y, y: down.x };
  const front = across.x * u.x + across.y * u.y >= 0 ? across : scale(across, -1);
  for (let t = 0.1; t <= 0.9; t += 0.2) {
    const lace = at(add(add(side.ankle, scale(sub(top, side.ankle), t)), scale(front, 2.5)));
    canvas.dot(lace.x, lace.y, leather.deep);
    canvas.dot(lace.x + 1, lace.y, leather.light);
  }
  // Thick lugged sole.
  canvas.polygon([p(-3.6, -0.1), p(8.0, -0.1), p(8.1, 1.4), p(-3.7, 1.4)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
  for (let a = -2.8; a < 7.6; a += 1.6) {
    const lug = p(a, 0.1);
    canvas.dot(lug.x, lug.y, SOLE.deep);
  }
  // LED strip down the back of the shaft.
  if (near) {
    const back = scale(front, -2.6);
    neonLine(ctx, add(add(side.ankle, scale(sub(top, side.ankle), 0.15)), back), add(top, back));
  }
}

// ---------------------------------------------------------------------------------------------
// Torso: shirt, belt, quilted jacket

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  // The torso is a barrel along the spine (image axes: y down).
  const axis = { x: s.up.x, y: -s.up.y };
  // The open front flaps behind the motion.
  const flare = clamp(-swing.x * 0.6, -1.2, 1.6);
  // A chest turned toward the viewer slides the open front forward, the back away.
  const open = 2.5 * s.twist;
  const back = -1.5 * s.twist;
  // The rolled lead shoulder lifts the jacket's shoulder line.
  const lift = s.shrug * 0.8;

  // Charcoal shirt, tucked into the belt, showing in the open front.
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
    SHIRT,
    { group: 'shirt', axis, tilt: { x: 0.25, y: 0 } },
  );
  // Belt and its buckle at the waist.
  canvas.polygon(
    [t(0.2, -6.0 + back), t(0.2, 7.2 + open), t(2.6, 7.4 + open), t(2.6, -6.2 + back)],
    LEATHER,
    {
      group: 'belt',
      axis,
    },
  );
  canvas.polygon(
    [t(0.5, 4.6 + open), t(0.5, 6.6 + open), t(2.3, 6.6 + open), t(2.3, 4.6 + open)],
    METAL,
    {
      group: 'buckle',
      bevel: 0.8 * S,
    },
  );

  // Far panel of the open jacket, at the front of the chest.
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

  // Near panel and back of the cropped jacket: puffy, V-taper to an elastic hem.
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
  // Quilting: horizontal stitch lines across the puffer, and the elastic hem.
  const stitch = noGloss({ ...JACKET, base: JACKET.shadow, light: JACKET.base });
  for (const distance of [8.4, 13.4, 18.4]) {
    canvas.decal(
      [
        t(distance, -9.4 + back),
        t(distance, 2.8 + open),
        t(distance + 0.45, 2.8 + open),
        t(distance + 0.45, -9.4 + back),
      ],
      stitch,
      'jacket',
    );
  }
  canvas.decal(
    [t(2.6, -7 + back), t(2.6, 3 + open), t(4.0, 3 + open), t(4.0, -7.2 + back)],
    noGloss({ ...JACKET, base: JACKET.shadow, light: JACKET.base, shadow: JACKET.deep }),
    'jacket',
  );
  // Zipper along the opening.
  canvas.decal(
    [
      t(3.6, 1.8 - flare + open),
      t(3.6, 2.3 - flare + open),
      t(23.8, 1.6 + open),
      t(23.8, 1.1 + open),
    ],
    METAL,
    'jacket',
    { flat: true },
  );
}

/** The high stand-up collar around the neck. */
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
  // Inner collar shadow.
  canvas.decal(
    [t(27.2, -1.0), t(28.8, -1.4), t(28.2, 2.0), t(27.0, 2.4)],
    { ...JACKET, base: JACKET.deep, light: JACKET.shadow },
    'collar',
  );
}

/** The headphones' band, around the back of the neck over the collar (behind the head). */
function drawHeadphoneBand(ctx: Ctx): void {
  const { canvas, at, torso } = ctx;
  const band = [torso(27.4, 1.8), torso(28.8, -0.6), torso(28.8, -3.2)];
  band.forEach((point, i) => {
    const next = band[i + 1];
    if (next) canvas.capsule(at(point), at(next), 0.6 * S, 0.6 * S, METAL, { group: 'band' });
  });
}

/** The near cup of the headphones, resting on the collar: metal shell, glossy face, neon ring. */
function drawHeadphones(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const center = torso(26.0, 2.0);
  // The cup's width lies along the chest's front direction (image axes, degrees clockwise).
  const tilt = (Math.atan2(-s.front.y, s.front.x) * 180) / Math.PI;
  canvas.ellipse(at(center), 2.5 * S, 3.0 * S, tilt, METAL, { group: 'cup' });
  canvas.ellipse(at(center), 1.8 * S, 2.3 * S, tilt, PLASTIC, { group: 'cupFace' });
  const ring = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return add(center, add(scale(s.front, Math.cos(a) * 1.1), scale(s.up, Math.sin(a) * 1.5)));
  });
  ring.forEach((point, i) => {
    const next = ring[(i + 1) % ring.length];
    if (next) neonLine(ctx, point, next);
  });
}

// ---------------------------------------------------------------------------------------------
// Head

/** Head-local offsets (x toward the face, y up, turned with the head) to world points. */
function headLocal(s: Skeleton): (dx: number, dy: number) => Point {
  const angle = radians(s.headAngle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return (dx, dy) => add(s.head, { x: dx * cos + dy * sin, y: -dx * sin + dy * cos });
}

/** Neck, from the collar to under the jaw. */
function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(22.5, 0.6)), at(local(0.4, -3.2)), 2.5 * S, 2.3 * S, SKIN, {
    group: 'neck',
  });
}

/** Tazz's head (head.ts), its loose hair trailing a little behind fast moves. */
function drawHead(ctx: Ctx): void {
  const { canvas, at, s, swing } = ctx;
  stampHead(canvas, s.face, at(s.head), s.headAngle, swing.x * S * 0.5);
}

// ---------------------------------------------------------------------------------------------
// Helpers

/** Two short folds on the inside of a bent joint (elbow, knee), in the material's shadow. */
function creases(
  ctx: Ctx,
  root: Point,
  joint: Point,
  end: Point,
  material: Material,
  group: string,
): void {
  const a = unit(sub(root, joint));
  const b = unit(sub(end, joint));
  // Inside of the bend: between the two segments.
  const inside = unit(add(a, b));
  const bent = Math.hypot(inside.x, inside.y) > 0.1 && a.x * b.x + a.y * b.y > -0.94;
  if (!bent) return;
  const fold = { ...material, base: material.deep, light: material.shadow, shadow: material.deep };
  for (const [along, length] of [
    [0.9, 2.0],
    [-0.9, 1.6],
  ] as const) {
    const start = add(
      add(joint, scale(inside, 1.4)),
      scale(a.x * along > 0 ? a : b, Math.abs(along)),
    );
    const tip = add(start, scale(inside, -length));
    const across = { x: -inside.y * 0.25, y: inside.x * 0.25 };
    ctx.canvas.decal(
      [
        ctx.at(add(start, across)),
        ctx.at(add(tip, across)),
        ctx.at(sub(tip, across)),
        ctx.at(sub(start, across)),
      ],
      fold,
      group,
    );
  }
}

/** Thin bands across a limb segment, at fractions `ts` of its length. */
function stripeAcross(
  ctx: Ctx,
  from: Point,
  to: Point,
  ts: readonly number[],
  material: Material,
  halfWidth: number,
  group: string,
): void {
  const along = sub(to, from);
  const u = unit(along);
  const v = { x: -u.y, y: u.x };
  const band = 0.22;
  for (const t of ts) {
    const a = add(from, scale(along, t));
    const corner = (du: number, dv: number): Point =>
      ctx.at(add(a, add(scale(u, du), scale(v, dv))));
    ctx.canvas.decal(
      [
        corner(-band, -halfWidth),
        corner(band, -halfWidth),
        corner(band, halfWidth),
        corner(-band, halfWidth),
      ],
      material,
      group,
    );
  }
}

/** A material without its specular highlight (it keeps its back light). */
function noGloss(material: Material): Material {
  const { outline, deep, shadow, base, light, rim } = material;
  return rim === undefined
    ? { outline, deep, shadow, base, light }
    : { outline, deep, shadow, base, light, rim };
}

function unit(p: Point): Point {
  const length = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / length, y: p.y / length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
