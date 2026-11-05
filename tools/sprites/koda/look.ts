/**
 * Koda (Sound Clash): BlazBlue / Guilty Gear / Street Fighter inspired high-resolution pixel art
 * design. Wild emerald-green hair with a martial headband and flowing ribbon tails; an open
 * high-collar storm-teal trench/frock coat with long split coat tails that whip in the wind and
 * double silver button rows, worn open over a bare sculpted chest with a glowing jade acoustic
 * core; winged silver plate shoulder pauldrons and heavy silver forearm gauntlets equipped with
 * glowing jade tuning-blades; dark forest-black hakama-cut trousers, silver shin-greaves and
 * martial foot wraps.
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
const JACKET: Material = { ...M.jacket, glossCut: 0.9 };
const JACKET_FAR = farLit(JACKET);
const SLEEVE = noGloss(JACKET);
const LINING = matteOf(M.shirt);
const LEATHER: Material = { ...M.leather, glossCut: 0.88 };
const LEATHER_FAR = farLit(LEATHER);
const PANTS = noGloss(M.pants);
const PANTS_FAR = farLit(PANTS);
const LAPEL = matteOf(M.pocket);
const WRAP: Material = { ...M.boot, glossCut: 0.88 };
const WRAP_FAR = farLit(WRAP);
const SOLE = matteOf(M.sole);
const METAL: Material = { ...M.metal, glossCut: 0.65 };
const METAL_FAR = farLit(METAL);
const PLASTIC: Material = { ...M.plastic, glossCut: 0.84 };

function farLit(material: Material): Material {
  const far = farOf(material);
  return material.rim === undefined ? far : { ...far, rim: material.rim };
}

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of hanging parts (coat tails, headband ribbons, hair spikes), in world px. */
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
      x: clamp(-motion.vx * 1.2, -2.8, 2.8),
      y: clamp(-motion.vy * 0.6, -2.2, 2.2),
    },
  };

  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawHeadbandTails(ctx);
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

/** Flowing martial-arts headband ribbons trailing behind Koda's head. */
function drawHeadbandTails(ctx: Ctx): void {
  const { canvas, at, s, swing } = ctx;
  if (s.head.y < 18) return;
  const standing = clamp((s.hip.y - 22) / 12, 0.25, 1);
  const knot = add(s.head, add(scale(s.front, -4.2), scale(s.up, 0.8)));
  const mid = add(knot, {
    x: (-3.2 + swing.x * 0.6) * standing,
    y: -1.6 + swing.y * 0.4,
  });
  const tip1 = add(mid, {
    x: (-2.8 + swing.x * 0.7) * standing,
    y: -2.2 + swing.y * 0.6,
  });
  const tip2 = add(mid, {
    x: (-2.2 + swing.x * 0.6) * standing,
    y: 0.8 + swing.y * 0.4,
  });
  canvas.capsule(at(knot), at(mid), 1.0 * S, 0.8 * S, WRAP, { group: 'headbandTail' });
  canvas.capsule(at(mid), at(tip1), 0.8 * S, 0.45 * S, WRAP, { group: 'headbandTail' });
  canvas.capsule(at(knot), at(tip2), 0.75 * S, 0.4 * S, WRAP_FAR, { group: 'headbandTailFar' });
  neonLine(ctx, knot, mid, true);
}

// ---------------------------------------------------------------------------------------------
// Arms: winged silver pauldrons, heavy silver gauntlets with jade tuning-blade fins, martial hands

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const sleeve = near ? SLEEVE : JACKET_FAR;
  const metal = near ? METAL : METAL_FAR;
  const wrap = near ? LEATHER : LEATHER_FAR;
  const group = `${which}Arm`;
  const cuffStart = sub(side.wrist, scale(side.forearm, 2.0));

  // Upper coat sleeve.
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.6 * S, 3.1 * S, sleeve, { group });

  // Winged silver shoulder pauldron (layered anime-fighter armor plate).
  const u = unit(sub(side.elbow, side.shoulder));
  const v = { x: -u.y, y: u.x };
  const sp = (du: number, dv: number): Point =>
    at(add(side.shoulder, add(scale(u, du), scale(v, dv))));
  canvas.polygon(
    [sp(-2.8, -3.6), sp(-1.4, 3.8), sp(3.6, 3.6), sp(4.6, 0.2), sp(3.2, -3.8)],
    metal,
    { group: `${group}Pauldron`, bevel: 1.5 * S },
  );
  stripeAcross(
    ctx,
    side.shoulder,
    side.elbow,
    [0.24],
    { ...metal, base: metal.shadow, light: metal.gloss ?? metal.light },
    3.9,
    `${group}Pauldron`,
  );

  // Heavy articulated silver forearm gauntlet (vambrace) with a tuning-blade ridge.
  canvas.capsule(at(side.elbow), at(cuffStart), 3.2 * S, 2.8 * S, metal, { group });
  const fu = unit(sub(cuffStart, side.elbow));
  const fv = { x: -fu.y, y: fu.x };
  const fp = (du: number, dv: number): Point =>
    at(add(side.elbow, add(scale(fu, du), scale(fv, dv))));
  canvas.decal([fp(1.0, -2.2), fp(6.2, -2.3), fp(7.0, -1.2), fp(1.6, -1.0)], metal, group);

  // Martial leather wrist wrap.
  canvas.capsule(at(cuffStart), at(side.wrist), 2.5 * S, 2.4 * S, wrap, { group });
  const plateSeam = { ...metal, base: metal.shadow, light: metal.light };
  stripeAcross(ctx, side.elbow, cuffStart, [0.32, 0.68], plateSeam, 3.3, group);
  creases(ctx, side.shoulder, side.elbow, cuffStart, sleeve, group);
  if (near) drawPauldronResonator(ctx, side);
  drawHand(ctx, side, near);
}

/** Glowing jade resonator conduits on the lead silver pauldron and gauntlet blade. */
function drawPauldronResonator(ctx: Ctx, side: Side): void {
  const along = unit(sub(side.elbow, side.shoulder));
  const across = { x: -along.y, y: along.x };
  const center = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.22));
  const pt = (u: number, v: number): Point => add(center, add(scale(along, u), scale(across, v)));
  neonLine(ctx, pt(-1.4, -1.8), pt(-1.4, 1.8), true);
  neonLine(ctx, pt(0.6, -1.5), pt(0.6, 1.5), true);
  // Glowing jade edge along the forearm gauntlet's tuning blade.
  const fAlong = unit(sub(side.wrist, side.elbow));
  const fAcross = { x: -fAlong.y, y: fAlong.x };
  const bladeA = add(side.elbow, add(scale(fAlong, 1.8), scale(fAcross, -2.2)));
  const bladeB = add(side.elbow, add(scale(fAlong, 6.2), scale(fAcross, -2.6)));
  neonLine(ctx, bladeA, bladeB, true);
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
    // Open martial-arts knife-hand / palm with dark wrist wrap and extended fingers.
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
    canvas.decal([p(0.0, -1.9), p(1.5, -2.0), p(1.5, 2.0), p(0.0, 1.8)], wrap, group);
    canvas.capsule(p(1.0, -1.4), p(2.6, -2.6), 0.85 * S, 0.75 * S, skin, {
      group: `${group}Thumb`,
    });
    return;
  }
  // Bare martial fist with dark wrist wrap.
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
  canvas.decal([p(-0.1, -2.1), p(1.8, -2.3), p(1.8, 2.3), p(-0.1, 1.6)], wrap, group);
  canvas.decal(
    [p(4.3, -2.5), p(4.6, -2.5), p(4.6, -0.4), p(4.3, -0.4)],
    { ...skin, base: skin.shadow, light: skin.base },
    group,
    { flat: true },
  );
  canvas.capsule(p(2.2, 1.9), p(4.0, 1.5), 0.9 * S, 0.8 * S, skin, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs: hakama-cut dark forest-black trousers, silver shin-greaves and bare martial feet

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const pants = near ? PANTS : PANTS_FAR;
  const group = `${which}Leg`;
  canvas.capsule(at(side.hip), at(side.knee), 4.8 * S, 4.0 * S, pants, { group });
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.58));
  canvas.capsule(at(side.knee), at(top), 4.0 * S, 3.5 * S, pants, { group });
  if (near) drawTrouserSeam(ctx, side, group);
  creases(ctx, side.hip, side.knee, side.ankle, pants, group);
  drawMartialFoot(ctx, side, near);
  // Hakama-like trouser blousing over the top of the silver shin-greave.
  const u = unit(shin);
  const v = { x: -u.y, y: u.x };
  const band = (t: number, w: number): Point => at(add(top, add(scale(shin, t), scale(v, w))));
  canvas.polygon([band(-0.06, -4.0), band(-0.06, 4.0), band(0.1, 3.7), band(0.1, -3.7)], pants, {
    group: `${group}Tuck`,
    bevel: 1.4 * S,
  });
  stripeAcross(
    ctx,
    top,
    side.ankle,
    [0.03],
    { ...pants, base: pants.shadow, light: pants.base },
    3.9,
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
    [point(0.24, -1.0), point(0.24, 1.6), point(0.86, 1.4), point(0.86, -0.8)],
    LAPEL,
    group,
  );
  neonLine(ctx, world(0.38, 1.3), world(0.78, 1.2), true);
}

function drawMartialFoot(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const wrap = near ? WRAP : WRAP_FAR;
  const metal = near ? METAL : METAL_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  const toe = sub(side.toe, side.heel);
  const length = Math.hypot(toe.x, toe.y) || 1;
  const u = scale(toe, 1 / length);
  const v = { x: -u.y, y: u.x };
  const sole = add(side.heel, add(scale(u, 2.6), scale(v, -BODY.footRadius)));
  const world = (a: number, b: number): Point => add(sole, add(scale(u, a), scale(v, b)));
  const p = (a: number, b: number): Point => at(world(a, b));

  // Silver-plated shin-greave over dark martial ankle wrap, then bare heel and toes with instep
  // strap.
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.62));
  canvas.capsule(at(top), at(side.ankle), 3.4 * S, 3.0 * S, wrap, { group });
  const down = unit(shin);
  const across = { x: -down.y, y: down.x };
  const front = across.x * u.x + across.y * u.y >= 0 ? across : scale(across, -1);
  // Front silver shin-plate.
  const shinPt = (t: number, w: number): Point =>
    at(add(add(top, scale(sub(side.ankle, top), t)), scale(front, w)));
  canvas.decal(
    [shinPt(0.08, 0.4), shinPt(0.08, 3.2), shinPt(0.88, 2.8), shinPt(0.88, 0.4)],
    metal,
    group,
  );

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
  canvas.decal([p(-1.2, 0.8), p(3.8, 0.8), p(3.4, 5.2), p(-1.6, 5.2)], wrap, group);
  canvas.polygon([p(-3.6, -0.1), p(8.0, -0.1), p(8.1, 1.1), p(-3.7, 1.1)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
  if (near) {
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
// Torso: bare chest with glowing jade acoustic core, long split frock-coat tails, high collar

/**
 * Long split BlazBlue/Guilty-Gear frock-coat tails below the waist: they hang down over the thighs
 * when standing/jumping and automatically tuck when crouched (`s.hip.y < 28`) so they never exceed
 * the crouching hurtbox.
 */
function drawCoatSkirt(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const standing = clamp((s.hip.y - 24) / 12, 0, 1);
  if (standing <= 0.05) return;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const length = 3.4 + 4.8 * standing;
  const flare = clamp(-swing.x * 0.7, -1.5, 1.8) * (0.4 + 0.6 * standing);
  const open = 2.0 * s.twist;
  const back = -1.4 * s.twist;

  // Far front coat tail.
  canvas.polygon(
    [
      t(0.6, 5.2 + open),
      t(0.6, 7.6 + open),
      t(-length * 0.85, 8.2 + flare * 0.5 + open),
      t(-length * 0.9, 4.6 + flare * 0.5 + open),
    ],
    JACKET_FAR,
    { group: 'farSkirt', axis },
  );
  // Near and back split coat tail, sweeping down with a sharp angled cut.
  canvas.polygon(
    [
      t(0.8, -5.8 + back),
      t(-length, -6.6 - flare * 0.6 + back),
      t(-length * 1.05, 2.0 - flare * 0.4 + open),
      t(0.8, 2.6 + open),
    ],
    JACKET,
    { group: 'nearSkirt', axis, tilt: { x: 0.08, y: 0.12 } },
  );
  // Silver-and-dark lapel border along the bottom and front edge of the coat tail.
  canvas.decal(
    [
      t(-length, -6.6 - flare * 0.6 + back),
      t(-length * 1.05, 2.0 - flare * 0.4 + open),
      t(-length + 1.4, 2.0 - flare * 0.4 + open),
      t(-length + 1.2, -6.4 - flare * 0.6 + back),
    ],
    LAPEL,
    'nearSkirt',
  );
  if (standing > 0.3) {
    neonLine(
      ctx,
      torso(-1.0, 1.6 - flare * 0.2 + open),
      torso(-length + 1.4, 1.4 - flare * 0.4 + open),
      true,
    );
  }
}

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const flare = clamp(-swing.x * 0.6, -1.2, 1.6);
  const open = 2.5 * s.twist;
  const back = -1.5 * s.twist;
  const lift = s.shrug * 0.8;

  // Bare sculpted chest and abs inside the open frock coat.
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
  // Glowing jade acoustic resonator core on his sternum.
  const sternum = torso(17.5, 5.2 + open);
  neonLine(ctx, add(sternum, { x: -0.6, y: 0 }), add(sternum, { x: 0.6, y: 0 }), true);

  // Wide martial-arts obi/belt with twin silver buckle plates.
  canvas.polygon(
    [t(0.0, -6.0 + back), t(0.0, 7.3 + open), t(3.0, 7.5 + open), t(3.0, -6.2 + back)],
    LEATHER,
    { group: 'belt', axis },
  );
  canvas.polygon(
    [t(0.4, 4.2 + open), t(0.4, 6.8 + open), t(2.6, 6.8 + open), t(2.6, 4.2 + open)],
    METAL,
    { group: 'buckle', bevel: 0.9 * S },
  );

  // Far panel of the open frock coat.
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

  // Near panel and back of the storm-teal frock coat.
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

  // Wide dark lapel facing and vertical acoustic conduit line down the frock coat.
  canvas.decal(
    [
      t(3.0, 0.8 - flare + open),
      t(3.0, 2.6 - flare + open),
      t(23.8, 1.5 + open),
      t(23.8, -0.2 + open),
    ],
    LAPEL,
    'jacket',
  );
  canvas.decal(
    [t(3.2, -3.6 + back), t(3.2, -2.6 + back), t(22.0, -3.8 + back), t(22.0, -4.8 + back)],
    LINING,
    'jacket',
  );
  neonLine(ctx, torso(5.0, -1.2 + open * 0.4), torso(21.0, -1.6 + open * 0.4), true);

  // Double row of gleaming silver coat buttons down the lapels.
  for (const dist of [5.5, 9.5, 13.5, 17.5, 21.0]) {
    const nearBtn = t(dist, 1.6 - flare * (1 - dist / 24) + open);
    canvas.dot(nearBtn.x, nearBtn.y, METAL.light);
    canvas.dot(nearBtn.x + 1, nearBtn.y, METAL.deep);
    const farBtn = t(dist, 7.6 + flare * (1 - dist / 24) + open);
    canvas.dot(farBtn.x, farBtn.y, METAL.base);
  }
}

/** High flared anime-fighter trench collar framing the neck and jaw, edged with silver trim. */
function drawCollar(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  canvas.polygon(
    [
      t(22.2, -7.2),
      t(28.8, -5.8),
      t(29.6, -2.8),
      t(29.0, 2.6),
      t(27.6, 3.6),
      t(23.2, 3.6),
      t(23.6, -1.0),
    ],
    JACKET,
    { group: 'collar', axis, tilt: { x: 0.2, y: 0.1 } },
  );
  // Silver trim along the top rim of the high collar.
  canvas.decal([t(28.0, -5.6), t(29.5, -2.8), t(28.9, 2.5), t(27.8, 2.2)], METAL, 'collar');
  canvas.decal(
    [t(27.2, -1.0), t(28.8, -1.4), t(28.2, 2.0), t(27.0, 2.4)],
    { ...JACKET, base: JACKET.deep, light: JACKET.shadow },
    'collar',
  );
}

/** Ornate silver tuning-fork clasp at the throat of the frock coat. */
function drawResonatorClasp(ctx: Ctx): void {
  const { canvas, at, torso } = ctx;
  const center = torso(25.2, 2.2);
  const top = torso(27.2, 2.0);
  const bottom = torso(23.2, 2.4);
  const back = torso(25.2, 0.2);
  const front = torso(25.2, 4.2);
  // Diamond-shaped silver crest instead of Nayo's round headphone cup!
  canvas.polygon([at(top), at(front), at(bottom), at(back)], METAL, {
    group: 'clasp',
    bevel: 1.0 * S,
  });
  canvas.polygon(
    [at(torso(26.3, 2.1)), at(torso(25.2, 3.3)), at(torso(24.1, 2.3)), at(torso(25.2, 1.1))],
    PLASTIC,
    { group: 'claspCore' },
  );
  neonLine(ctx, torso(26.1, 2.1), torso(24.3, 2.3), true);
  neonLine(ctx, torso(25.2, 1.3), torso(25.2, 3.1), true);
  const c = at(center);
  canvas.dot(c.x, c.y, DETAIL.neonLight);
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
