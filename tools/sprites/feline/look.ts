/**
 * Feline (issue #155 comment 6660565057: Pack_01..Pack_05):
 * Agile dimensional cat-fighter with upright white cat ears, a huge flowing silver-white mane
 * (`drawMane`), and a sinuous S-curved white feline tail (`drawTail`); a black techwear crop-top
 * with a high collar over a toned bare midriff; bare shoulders with a black shoulder pad bearing a
 * glowing cyan triangle (`▼`, `drawShoulderTriangle`); black fingerless gauntlets with cyan wrist
 * trim; baggy black techwear cargo trousers with thigh straps, cyan-piped cargo pockets and a
 * silver hip chain; and high-laced black combat boots with cyan LED accents.
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
const HAIR: Material = { ...M.hair, glossCut: 0.78 };
const HAIR_FAR = farLit(HAIR);
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
const PLASTIC: Material = { ...M.plastic, glossCut: 0.84 };

function farLit(material: Material): Material {
  const far = farOf(material);
  return material.rim === undefined ? far : { ...far, rim: material.rim };
}

interface Ctx extends Ink {
  readonly s: Skeleton;
  readonly torso: (distance: number, across: number) => Point;
  readonly swing: Point;
}

/** Draws Feline in the cell whose left edge is `cellX`. */
export function drawFeline(
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
      x: clamp(-motion.vx * 1.2, -2.6, 2.6),
      y: clamp(-motion.vy * 0.6, -2.0, 2.0),
    },
  };

  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawTail(ctx);
  drawMane(ctx);
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 5.2 * S, 4.5 * S, 0, PANTS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  drawNeck(ctx);
  drawTorso(ctx);
  drawHead(ctx);
  drawArm(ctx, skeleton.near, 'near');
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

// ---------------------------------------------------------------------------------------------
// Feline signature silhouette: voluminous silver-white mane & S-curved feline tail

/**
 * Voluminous silver-white feline mane flowing behind her head and shoulders (as in
 * Apercu_Pack_02_Feline_CORRIGE.png). Tucks in when crouched or lying down so it stays inside the
 * hurtbox envelope.
 */
function drawMane(ctx: Ctx): void {
  const { canvas, at, s, swing } = ctx;
  if (s.head.y < 18) return;
  const standing = clamp((s.hip.y - 22) / 12, 0.35, 1);
  const root = add(s.head, add(scale(s.front, -3.2), scale(s.up, 2.2)));
  const sx = swing.x * standing;
  const sy = swing.y * standing;

  // Multi-plume fluffy silver-white mane fanning out behind her head and shoulders, with spiky tips.
  const crown = add(root, { x: (-3.8 + sx * 0.4) * standing, y: 2.2 + sy * 0.3 });
  const upperTip = add(crown, { x: (-4.2 + sx * 0.6) * standing, y: 0.6 + sy * 0.3 });
  const mid = add(root, { x: (-5.8 + sx * 0.6) * standing, y: -1.8 + sy * 0.4 });
  const midTip = add(mid, { x: (-3.6 + sx * 0.8) * standing, y: -1.6 + sy * 0.4 });
  const lower = add(root, { x: (-5.0 + sx * 0.5) * standing, y: -5.2 * standing + sy * 0.5 });
  const lowerTip = add(lower, { x: (-3.2 + sx * 0.7) * standing, y: -3.2 * standing + sy * 0.5 });

  canvas.capsule(at(root), at(crown), 4.0 * S, 3.6 * S, HAIR_FAR, {
    group: 'maneFar',
    bevel: 1.4 * S,
  });
  canvas.capsule(at(crown), at(upperTip), 3.4 * S, 1.4 * S, HAIR_FAR, {
    group: 'maneFar',
    bevel: 1.2 * S,
  });
  canvas.capsule(at(root), at(mid), 4.8 * S, 4.4 * S, HAIR, {
    group: 'mane',
    bevel: 1.6 * S,
  });
  canvas.capsule(at(mid), at(midTip), 4.0 * S, 1.5 * S, HAIR, {
    group: 'mane',
    bevel: 1.3 * S,
  });
  canvas.capsule(at(mid), at(lower), 4.2 * S, 3.4 * S, HAIR, {
    group: 'mane',
    bevel: 1.5 * S,
  });
  canvas.capsule(at(lower), at(lowerTip), 3.2 * S, 1.3 * S, HAIR, {
    group: 'mane',
    bevel: 1.2 * S,
  });
}

/**
 * Smooth S-curved white feline tail attached at the small of her back (`torso(2.5, -4.2)`),
 * arching gracefully out and curling up at the tip like Apercu_Pack_02_Feline_CORRIGE.png.
 */
function drawTail(ctx: Ctx): void {
  const { canvas, at, torso, s, swing } = ctx;
  if (s.hip.y < 20) return;
  const standing = clamp((s.hip.y - 20) / 14, 0.35, 1);
  const p0 = torso(3.0, -4.2);
  const p1 = add(p0, {
    x: (-3.2 + swing.x * 0.3) * standing,
    y: 1.8 * standing + swing.y * 0.2,
  });
  const p2 = add(p1, {
    x: (-3.6 + swing.x * 0.5) * standing,
    y: -1.4 * standing + swing.y * 0.3,
  });
  const p3 = add(p2, {
    x: (-1.8 + swing.x * 0.6) * standing,
    y: -3.2 * standing + swing.y * 0.4,
  });
  const p4 = add(p3, {
    x: (2.0 + swing.x * 0.5) * standing,
    y: -1.6 * standing,
  });
  canvas.capsule(at(p0), at(p1), 1.8 * S, 2.0 * S, HAIR_FAR, { group: 'tail', bevel: 1.1 * S });
  canvas.capsule(at(p1), at(p2), 2.0 * S, 2.1 * S, HAIR, { group: 'tail', bevel: 1.2 * S });
  canvas.capsule(at(p2), at(p3), 2.1 * S, 2.0 * S, HAIR, { group: 'tail', bevel: 1.2 * S });
  canvas.capsule(at(p3), at(p4), 2.0 * S, 1.5 * S, HAIR, { group: 'tail', bevel: 1.1 * S });
}

// ---------------------------------------------------------------------------------------------
// Arms: bare shoulders, black shoulder pad with glowing cyan triangle (`▼`), fingerless gauntlets

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const skin = near ? SKIN : SKIN_FAR;
  const leather = near ? LEATHER : LEATHER_FAR;
  const top = near ? TOP : TOP_FAR;
  const group = `${which}Arm`;
  const gauntletStart = add(side.elbow, scale(side.forearm, 1.2));
  const cuffStart = sub(side.wrist, scale(side.forearm, 1.8));

  // Bare upper arm & elbow.
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.1 * S, 2.7 * S, skin, { group });
  canvas.capsule(at(side.elbow), at(gauntletStart), 2.7 * S, 2.6 * S, skin, { group });

  // Black tactical shoulder pad + bicep strap.
  const u = unit(sub(side.elbow, side.shoulder));
  const v = { x: -u.y, y: u.x };
  const sp = (du: number, dv: number): Point =>
    at(add(side.shoulder, add(scale(u, du), scale(v, dv))));
  canvas.polygon([sp(-2.2, -3.2), sp(-1.0, 3.4), sp(4.2, 3.2), sp(5.0, 0.2), sp(3.8, -3.2)], top, {
    group: `${group}Pad`,
    bevel: 1.3 * S,
  });
  stripeAcross(ctx, side.shoulder, side.elbow, [0.46], leather, 3.1, group);

  // Fingerless forearm gauntlet with cyan LED wrist trim.
  canvas.capsule(at(gauntletStart), at(cuffStart), 2.8 * S, 2.5 * S, leather, { group });
  canvas.capsule(at(cuffStart), at(side.wrist), 2.5 * S, 2.3 * S, top, { group });
  if (near) {
    drawShoulderTriangle(ctx, side);
    const fAlong = unit(sub(side.wrist, side.elbow));
    const fAcross = { x: -fAlong.y, y: fAlong.x };
    const wristA = add(cuffStart, scale(fAcross, -2.0));
    const wristB = add(cuffStart, scale(fAcross, 2.0));
    neonLine(ctx, wristA, wristB, true);
  }
  drawHand(ctx, side, near);
}

/** Glowing cyan downward triangle (`▼`) on Feline's lead shoulder pad (Apercu_Pack_02). */
function drawShoulderTriangle(ctx: Ctx, side: Side): void {
  const { canvas, at } = ctx;
  const along = unit(sub(side.elbow, side.shoulder));
  const across = { x: -along.y, y: along.x };
  const center = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.24));
  const pt = (u: number, v: number): Point => add(center, add(scale(along, u), scale(across, v)));
  canvas.polygon([at(pt(-1.0, -1.8)), at(pt(-1.0, 1.8)), at(pt(2.0, 0.0))], PLASTIC, {
    group: 'nearArmPadTri',
  });
  neonLine(ctx, pt(-0.7, -1.3), pt(-0.7, 1.3), true);
  neonLine(ctx, pt(-0.7, -1.3), pt(1.5, 0.0), true);
  neonLine(ctx, pt(-0.7, 1.3), pt(1.5, 0.0), true);
}

function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const glove = near ? LEATHER : LEATHER_FAR;
  const skin = near ? SKIN : SKIN_FAR;
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));

  if (side.hand === 'open') {
    // Open feline claw-hand with black fingerless glove back and bare fingertips.
    canvas.polygon(
      [
        p(0.2, -1.9),
        p(2.5, -2.1),
        p(3.3, -0.9),
        p(3.5, 3.4),
        p(2.5, 4.4),
        p(1.5, 3.6),
        p(0.0, 1.7),
      ],
      skin,
      { group, bevel: 1.3 * S },
    );
    canvas.decal([p(0.0, -1.8), p(2.0, -1.9), p(2.0, 1.9), p(0.0, 1.7)], glove, group);
    canvas.capsule(p(1.0, -1.3), p(2.5, -2.4), 0.8 * S, 0.7 * S, skin, {
      group: `${group}Thumb`,
    });
    return;
  }
  // Fingerless gloved fist with bare knuckles and cyan stud.
  canvas.polygon(
    [
      p(0.2, -2.2),
      p(3.6, -2.4),
      p(5.0, -1.6),
      p(5.2, 1.1),
      p(4.4, 2.3),
      p(1.0, 2.5),
      p(-0.1, 1.4),
      p(-0.2, -1.0),
    ],
    glove,
    { group, bevel: 1.5 * S },
  );
  // Bare fingers at the front of the fingerless glove.
  canvas.decal([p(3.4, -2.2), p(5.0, -1.5), p(5.1, 1.0), p(3.4, 1.6)], skin, group);
  canvas.capsule(p(2.0, 1.8), p(3.8, 1.4), 0.85 * S, 0.75 * S, glove, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs: baggy black techwear cargo trousers, silver hip chain, thigh straps, cyan-LED boots

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const pants = near ? PANTS : PANTS_FAR;
  const leather = near ? LEATHER : LEATHER_FAR;
  const group = `${which}Leg`;
  // Baggy techwear cargo thighs and calves.
  canvas.capsule(at(side.hip), at(side.knee), 4.8 * S, 4.0 * S, pants, { group });
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.58));
  canvas.capsule(at(side.knee), at(top), 4.0 * S, 3.5 * S, pants, { group });
  stripeAcross(ctx, side.hip, side.knee, [0.38], leather, 4.7, group);
  if (near) drawCargoPocketAndChain(ctx, side, group);
  creases(ctx, side.hip, side.knee, side.ankle, pants, group);
  drawTechBoot(ctx, side, near);
  // Baggy cargo cuff blousing over the top of the boot.
  const u = unit(shin);
  const v = { x: -u.y, y: u.x };
  const band = (t: number, w: number): Point => at(add(top, add(scale(shin, t), scale(v, w))));
  canvas.polygon([band(-0.06, -4.1), band(-0.06, 4.1), band(0.1, 3.8), band(0.1, -3.8)], pants, {
    group: `${group}Tuck`,
    bevel: 1.4 * S,
  });
}

function drawCargoPocketAndChain(ctx: Ctx, side: Side, group: string): void {
  const { canvas, at } = ctx;
  const along = sub(side.knee, side.hip);
  const length = Math.hypot(along.x, along.y) || 1;
  const u = scale(along, 1 / length);
  const v = { x: -u.y, y: u.x };
  const world = (t: number, w: number): Point => add(side.hip, add(scale(along, t), scale(v, w)));
  const point = (t: number, w: number): Point => at(world(t, w));
  // Cargo pocket with cyan LED piping on the thigh.
  canvas.decal(
    [point(0.32, -1.6), point(0.32, 2.2), point(0.78, 2.0), point(0.78, -1.4)],
    POCKET,
    group,
  );
  neonLine(ctx, world(0.36, 1.8), world(0.74, 1.6), true);
  // Silver hip chain looping down the outer thigh.
  const c0 = at(world(0.1, -2.2));
  const c1 = at(world(0.32, -3.0));
  const c2 = at(world(0.52, -1.8));
  for (const p of [c0, c1, c2]) {
    canvas.dot(Math.round(p.x), Math.round(p.y), METAL.light);
    canvas.dot(Math.round(p.x) + 1, Math.round(p.y), METAL.shadow);
  }
}

function drawTechBoot(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const boot = near ? BOOT : BOOT_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  const toe = sub(side.toe, side.heel);
  const length = Math.hypot(toe.x, toe.y) || 1;
  const u = scale(toe, 1 / length);
  const v = { x: -u.y, y: u.x };
  const sole = add(side.heel, add(scale(u, 2.6), scale(v, -BODY.footRadius)));
  const world = (a: number, b: number): Point => add(sole, add(scale(u, a), scale(v, b)));
  const p = (a: number, b: number): Point => at(world(a, b));

  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.6));
  canvas.capsule(at(top), at(side.ankle), 3.4 * S, 3.0 * S, boot, { group });
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
  canvas.polygon([p(-3.6, -0.1), p(8.0, -0.1), p(8.1, 1.1), p(-3.7, 1.1)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
  if (near) {
    // Cyan LED accents on the ankle collar and instep of the combat boot.
    neonLine(ctx, world(1.2, 4.6), world(3.6, 3.8), true);
    neonLine(ctx, world(4.4, 1.6), world(6.8, 1.6), true);
  }
}

// ---------------------------------------------------------------------------------------------
// Torso: toned bare midriff, black techwear crop-top with high collar & silver belt buckle

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const open = 2.0 * s.twist;
  const back = -1.2 * s.twist;
  const lift = s.shrug * 0.7;

  // Bare toned midriff between the belt and the crop-top (distance 2.5 to 12.5).
  canvas.polygon(
    [t(2.0, -5.2 + back), t(2.0, 6.2 + open), t(13.0, 6.8 + open), t(13.0, -5.6 + back)],
    SKIN,
    { group: 'midriff', axis, tilt: { x: 0.22, y: 0 } },
  );
  const skinShade = noGloss({ ...SKIN, base: SKIN.shadow, light: SKIN.base });
  canvas.decal(
    [t(5.0, 3.2 + open), t(5.0, 4.2 + open), t(11.0, 4.4 + open), t(11.0, 3.4 + open)],
    skinShade,
    'midriff',
  );

  // Tactical belt with silver buckle and cyan indicator LED.
  canvas.polygon(
    [t(0.0, -5.8 + back), t(0.0, 6.8 + open), t(2.8, 7.0 + open), t(2.8, -6.0 + back)],
    LEATHER,
    { group: 'belt', axis },
  );
  canvas.polygon(
    [t(0.3, 3.8 + open), t(0.3, 6.4 + open), t(2.5, 6.4 + open), t(2.5, 3.8 + open)],
    METAL,
    { group: 'buckle', bevel: 0.9 * S },
  );
  const beltLed = t(1.4, 1.2 + open);
  canvas.dot(Math.round(beltLed.x), Math.round(beltLed.y), DETAIL.neonLight);

  // Black techwear crop-top (distance 11.5 to 24.5) with a high collar and cross-chest strap.
  canvas.polygon(
    [
      t(11.8, -6.2 + back),
      t(18.0, -7.2 + back),
      t(22.5 + lift, -6.0 + back),
      t(25.2 + lift, -3.2),
      t(25.6, 2.2 + open),
      t(22.4, 7.6 + open),
      t(15.5, 8.2 + open),
      t(11.6, 6.8 + open),
    ],
    TOP,
    { group: 'cropTop', axis, tilt: { x: 0.15, y: 0.12 } },
  );
  // High techwear collar framing the neck.
  canvas.polygon([t(22.8, -4.6), t(27.8, -3.6), t(28.2, 2.2), t(23.2, 3.2)], TOP, {
    group: 'collar',
    axis,
    bevel: 1.0 * S,
  });
  // Diagonal harness strap across the crop-top + cyan trim line under the bust.
  canvas.decal(
    [t(11.6, -5.8 + back), t(11.6, 6.8 + open), t(13.0, 7.0 + open), t(13.0, -6.0 + back)],
    LEATHER,
    'cropTop',
  );
  neonLine(ctx, torso(12.4, -1.0 + open * 0.4), torso(12.4, 5.8 + open), true);
}

// ---------------------------------------------------------------------------------------------
// Head

function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(22.5, 0.6)), at(local(0.4, -3.2)), 2.3 * S, 2.1 * S, SKIN, {
    group: 'neck',
  });
}

function drawHead(ctx: Ctx): void {
  const { canvas, at, s, swing } = ctx;
  stampHead(canvas, s.face, at(s.head), s.headAngle, swing.x * S * 0.5);
  canvas.volume(at(s.head), BODY.headRadius * S * 1.15);
}
