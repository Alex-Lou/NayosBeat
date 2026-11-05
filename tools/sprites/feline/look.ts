/**
 * Feline (issue #155 comment 6660565057: Pack_01..Pack_05, `poing_01_garde.png`):
 * - Two tall pointed white cat ears with vivid coral-pink inner triangles (stamped in `head.ts`),
 *   a black scrunchie behind them, and a voluminous multi-plume silver-white ponytail (`drawMane`);
 * - A long, plush white feline tail (`drawTail`) curving out behind her waist into a wide C-hook
 *   loop on standing, crouching, dashing, kicking and airborne poses;
 * - Sleeveless black techwear crop-top with a high collar (cyan LED dash) over a toned bare midriff;
 * - Bare shoulders with a glowing cyan downward triangle (`▼`, `drawShoulderTriangle`) directly on
 *   her deltoid, a black bicep strap with a silver buckle, a wrist bracer with a cyan diagonal LED,
 *   and fingerless combat gloves;
 * - Baggy black techwear cargo trousers with a 3D hip pouch (vertical cyan LED), a thick silver
 *   chain looping from a hip O-ring to a thigh buckle, two diagonal cyan LED dashes (`//`) on the
 *   front thigh, and high-cut black combat boots with two buckled shin straps, a cyan ankle LED,
 *   and a silver-grey lugged sole and toe cap.
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
const HAIR: Material = noGloss({
  ...M.hair,
  deep: M.hair.shadow,
  shadow: M.hair.base,
  base: M.hair.light,
  light: M.hair.gloss ?? M.hair.light,
});
const HAIR_FAR: Material = noGloss({
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
// Feline signature silhouette: high ponytail mane behind the scrunchie & long C-hook feline tail

/**
 * Voluminous silver-white ponytail bursting backward from the black scrunchie behind her cat ears
 * (`poing_01_garde.png`). Anchored well behind `s.head` (`-6.2` along `s.front`) so the space
 * above and between her two cat ears stays completely clear.
 */
function drawMane(ctx: Ctx): void {
  const { canvas, at, s, swing } = ctx;
  if (s.head.y < 16) return;
  const standing = clamp((s.hip.y - 18) / 14, 0.38, 1);
  const crouch = s.hip.y < 26;
  const minX = crouch ? -16.0 : -24.5;
  const clampP = (p: Point): Point => ({ x: Math.max(minX, p.x), y: Math.max(18, p.y) });

  // Root sits right at the black scrunchie at the back of the head, clear of the cat ears.
  const root = clampP(add(s.head, add(scale(s.front, -5.8), scale(s.up, 1.4))));
  const sx = swing.x * standing;
  const sy = swing.y * standing;

  // High-arching multi-plume ponytail (`poing_01_garde.png`): rises from the scrunchie, then sweeps
  // back and down in four feathery locks.
  const crownArch = clampP(
    add(root, { x: (-3.6 + sx * 0.3) * standing, y: 3.4 * standing + sy * 0.2 }),
  );
  const topMid = clampP(add(crownArch, { x: (-4.2 + sx * 0.5) * standing, y: -0.6 + sy * 0.3 }));
  const topTip = clampP(add(topMid, { x: (-3.2 + sx * 0.6) * standing, y: -1.4 + sy * 0.3 }));

  const upperMid = clampP(
    add(crownArch, { x: (-4.8 + sx * 0.5) * standing, y: -3.2 * standing + sy * 0.3 }),
  );
  const upperTip = clampP(
    add(upperMid, { x: (-3.8 + sx * 0.7) * standing, y: -2.0 * standing + sy * 0.4 }),
  );

  const midLock = clampP(
    add(root, { x: (-5.4 + sx * 0.6) * standing, y: -3.8 * standing + sy * 0.4 }),
  );
  const midTip = clampP(
    add(midLock, { x: (-4.0 + sx * 0.8) * standing, y: -2.8 * standing + sy * 0.4 }),
  );

  const lowLock = clampP(
    add(midLock, { x: (-2.4 + sx * 0.5) * standing, y: -4.4 * standing + sy * 0.5 }),
  );
  const lowTip = clampP(
    add(lowLock, { x: (-2.4 + sx * 0.6) * standing, y: -2.6 * standing + sy * 0.5 }),
  );

  canvas.capsule(at(root), at(crownArch), 3.8 * S, 3.8 * S, HAIR_FAR, {
    group: 'maneFar',
    bevel: 1.4 * S,
  });
  canvas.capsule(at(crownArch), at(topMid), 3.6 * S, 2.8 * S, HAIR_FAR, {
    group: 'maneFar',
    bevel: 1.3 * S,
  });
  canvas.capsule(at(topMid), at(topTip), 2.6 * S, 1.0 * S, HAIR_FAR, {
    group: 'maneFar',
    bevel: 1.0 * S,
  });
  canvas.capsule(at(crownArch), at(upperMid), 4.2 * S, 3.4 * S, HAIR, {
    group: 'mane',
    bevel: 1.5 * S,
  });
  canvas.capsule(at(upperMid), at(upperTip), 3.2 * S, 1.1 * S, HAIR, {
    group: 'mane',
    bevel: 1.2 * S,
  });
  canvas.capsule(at(root), at(midLock), 4.2 * S, 3.6 * S, HAIR, {
    group: 'mane',
    bevel: 1.5 * S,
  });
  canvas.capsule(at(midLock), at(midTip), 3.2 * S, 1.1 * S, HAIR, {
    group: 'mane',
    bevel: 1.2 * S,
  });
  canvas.capsule(at(midLock), at(lowLock), 3.4 * S, 2.5 * S, HAIR, {
    group: 'mane',
    bevel: 1.3 * S,
  });
  canvas.capsule(at(lowLock), at(lowTip), 2.3 * S, 1.0 * S, HAIR, {
    group: 'mane',
    bevel: 1.0 * S,
  });
}

/**
 * Long, plush, smooth C-hook white feline tail (`poing_01_garde.png`, `pied_06_extension_2.png`,
 * `02_balayage_tendu.png`, `07_coup_de_pied_volant.png`):
 * Sampled along a smooth 8-point elliptical C-arc behind her waist so the curve is completely round
 * and fluid with a plush rounded tip.
 */
function drawTail(ctx: Ctx): void {
  const { canvas, at, torso, s, swing } = ctx;
  // Only hide when lying flat on the ground (ko / knockdown).
  if (s.hip.y < 12) return;
  const crouch = s.hip.y < 26;
  const reach = crouch ? 0.52 : clamp((s.hip.y - 20) / 14, 0.8, 1.0);
  const minX = crouch ? -16.2 : -24.6;
  const minY = 14.0;
  const clampT = (p: Point): Point => ({ x: Math.max(minX, p.x), y: Math.max(minY, p.y) });

  const root = torso(0.8, -3.8);
  const sx = swing.x * 0.35 * reach;
  const sy = swing.y * 0.3 * reach;
  // Wide, long C-hook curve matching `poing_01_garde.png`: sweeps down-back from her waist,
  // arches far out behind her (-14 px from root), rises high, and curls its rounded tip inward.
  const offsets: readonly (readonly [number, number])[] = [
    [0, 0],
    [-4.2, -2.2],
    [-8.8, -2.6],
    [-12.6, -0.4],
    [-14.2, 3.6],
    [-13.4, 8.0],
    [-10.4, 11.0],
    [-6.8, 10.6],
    [-5.4, 8.4],
  ];
  const pts = offsets.map(([dx, dy], idx) =>
    clampT({
      x: root.x + (dx + (idx > 1 ? sx : 0)) * reach,
      y: root.y + (dy + (idx > 1 ? sy : 0)) * reach,
    }),
  );

  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (!a || !b) continue;
    const mat = i === 0 ? HAIR_FAR : HAIR;
    const rA = (i === 0 ? 1.8 : i >= pts.length - 2 ? 2.1 : 2.0) * S;
    const rB = (i >= pts.length - 2 ? 1.9 : 2.0) * S;
    canvas.capsule(at(a), at(b), rA, rB, mat, { group: 'tail', bevel: 0.9 * S });
  }
}

// ---------------------------------------------------------------------------------------------
// Arms: bare shoulders with glowing cyan `▼` triangle on the skin, bicep buckle strap, wrist bracer

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const skin = near ? SKIN : SKIN_FAR;
  const leather = near ? LEATHER : LEATHER_FAR;
  const top = near ? TOP : TOP_FAR;
  const group = `${which}Arm`;
  const bracerStart = sub(side.wrist, scale(side.forearm, 3.8));

  // Bare shoulder & deltoid, plus white/porcelain forearm down to the black wrist bracer.
  canvas.capsule(at(side.shoulder), at(side.elbow), 3.1 * S, 2.7 * S, skin, { group });
  canvas.capsule(at(side.elbow), at(bracerStart), 2.7 * S, 2.5 * S, skin, { group });

  // Black bicep strap with silver buckle just below the deltoid (`poing_01_garde.png`).
  stripeAcross(ctx, side.shoulder, side.elbow, [0.58], leather, 3.0, group);
  if (near) {
    drawShoulderTriangle(ctx, side);
    const buckle = at(add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.58)));
    canvas.dot(Math.round(buckle.x), Math.round(buckle.y), METAL.light);
    canvas.dot(Math.round(buckle.x) + 1, Math.round(buckle.y), METAL.shadow);
  }

  // Black tactical wrist bracer with glowing cyan diagonal LED stripe (`poing_01_garde.png`).
  canvas.capsule(at(bracerStart), at(side.wrist), 2.8 * S, 2.5 * S, top, { group });
  if (near) {
    const fAlong = unit(sub(side.wrist, side.elbow));
    const fAcross = { x: -fAlong.y, y: fAlong.x };
    const ledA = add(bracerStart, add(scale(fAlong, 0.6), scale(fAcross, -1.6)));
    const ledB = add(side.wrist, add(scale(fAlong, -0.5), scale(fAcross, 1.6)));
    neonLine(ctx, ledA, ledB, true);
  }
  drawHand(ctx, side, near);
}

/** Glowing cyan downward triangle (`▼`) directly on Feline's bare deltoid (`poing_01_garde.png`). */
function drawShoulderTriangle(ctx: Ctx, side: Side): void {
  const along = unit(sub(side.elbow, side.shoulder));
  const across = { x: -along.y, y: along.x };
  const center = add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.24));
  const pt = (u: number, v: number): Point => add(center, add(scale(along, u), scale(across, v)));
  neonLine(ctx, pt(-0.9, -1.5), pt(-0.9, 1.5), true);
  neonLine(ctx, pt(-0.9, -1.5), pt(1.6, 0.0), true);
  neonLine(ctx, pt(-0.9, 1.5), pt(1.6, 0.0), true);
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
  // Fingerless gloved fist with bare knuckles peeking out at the front (`poing_01_garde.png`).
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
  canvas.decal([p(3.4, -2.2), p(5.0, -1.5), p(5.1, 1.0), p(3.4, 1.6)], skin, group);
  canvas.capsule(p(2.0, 1.8), p(3.8, 1.4), 0.85 * S, 0.75 * S, glove, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs: baggy black techwear cargo trousers, 3D hip pouch, silver chain, double cyan thigh dashes

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const pants = near ? PANTS : PANTS_FAR;
  const leather = near ? LEATHER : LEATHER_FAR;
  const group = `${which}Leg`;
  canvas.capsule(at(side.hip), at(side.knee), 4.8 * S, 4.0 * S, pants, { group });
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.58));
  canvas.capsule(at(side.knee), at(top), 4.0 * S, 3.5 * S, pants, { group });
  stripeAcross(ctx, side.hip, side.knee, [0.52], leather, 4.6, group);
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

  // 3D black hip pouch on the outer hip with a vertical cyan LED bar (`poing_01_garde.png`).
  canvas.polygon(
    [point(0.05, -4.4), point(0.05, -0.6), point(0.42, -0.8), point(0.42, -4.2)],
    POCKET,
    { group: `${group}Pouch`, bevel: 1.1 * S },
  );
  neonLine(ctx, world(0.16, -2.0), world(0.36, -2.1), true);

  // Two parallel diagonal cyan LED dashes (`//`) on the front of the thigh (`poing_01_garde.png`).
  neonLine(ctx, world(0.36, 1.2), world(0.48, 2.6), true);
  neonLine(ctx, world(0.48, 0.8), world(0.6, 2.2), true);

  // Thick silver chain/strap looping from the hip O-ring down to a silver buckle on the thigh.
  const ring = at(world(0.04, 0.4));
  canvas.dot(Math.round(ring.x), Math.round(ring.y), METAL.gloss ?? METAL.light);
  canvas.dot(Math.round(ring.x) + 1, Math.round(ring.y), METAL.light);
  for (const [t, w] of [
    [0.14, 0.2],
    [0.24, -0.3],
    [0.34, -1.0],
    [0.44, -1.8],
    [0.52, -2.4],
  ] as const) {
    const p = at(world(t, w));
    canvas.dot(Math.round(p.x), Math.round(p.y), METAL.light);
    canvas.dot(Math.round(p.x) + 1, Math.round(p.y), METAL.base);
  }
}

function drawTechBoot(ctx: Ctx, side: Side, near: boolean): void {
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

  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.6));
  canvas.capsule(at(top), at(side.ankle), 3.4 * S, 3.0 * S, boot, { group });
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
  // Light silver-grey lugged sole & toe cap (`poing_01_garde.png`).
  canvas.polygon([p(-3.6, -0.1), p(8.0, -0.1), p(8.1, 1.1), p(-3.7, 1.1)], METAL, {
    group: `${group}Sole`,
    flat: true,
  });
  canvas.polygon([p(5.6, 0.8), p(7.9, 0.8), p(7.8, 2.3), p(5.8, 2.3)], SOLE, {
    group: `${group}Toe`,
    flat: true,
  });
  if (near) {
    for (const frac of [0.28, 0.68]) {
      const b = at(add(top, scale(sub(side.ankle, top), frac)));
      canvas.dot(Math.round(b.x) + 2, Math.round(b.y), METAL.light);
    }
    // Diagonal cyan LED slash (`\`) on the outer ankle of the boot (`poing_01_garde.png`).
    neonLine(ctx, world(-1.4, 2.8), world(1.2, 1.4), true);
  }
}

// ---------------------------------------------------------------------------------------------
// Torso: toned bare midriff, sleeveless black techwear crop-top with high collar & silver belt

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const open = 2.0 * s.twist;
  const back = -1.2 * s.twist;
  const lift = s.shrug * 0.7;

  // Bare toned midriff between the belt and the crop-top (distance 2.0 to 12.8).
  canvas.polygon(
    [t(2.0, -5.2 + back), t(2.0, 6.2 + open), t(13.0, 6.8 + open), t(13.0, -5.6 + back)],
    SKIN,
    { group: 'midriff', axis, tilt: { x: 0.22, y: 0 } },
  );
  const skinShade = noGloss({ ...SKIN, base: SKIN.shadow, light: SKIN.base });
  canvas.decal(
    [t(4.8, 3.4 + open), t(4.8, 4.4 + open), t(11.0, 4.6 + open), t(11.0, 3.6 + open)],
    skinShade,
    'midriff',
  );

  // Tactical belt with silver rectangular buckle (`poing_01_garde.png`).
  canvas.polygon(
    [t(0.0, -5.8 + back), t(0.0, 6.8 + open), t(2.8, 7.0 + open), t(2.8, -6.0 + back)],
    LEATHER,
    { group: 'belt', axis },
  );
  canvas.polygon(
    [t(0.3, 3.6 + open), t(0.3, 6.4 + open), t(2.5, 6.4 + open), t(2.5, 3.6 + open)],
    METAL,
    { group: 'buckle', bevel: 0.9 * S },
  );

  // Sleeveless black techwear crop-top (distance 11.8 to 24.8) with under-bust strap.
  canvas.polygon(
    [
      t(11.8, -6.2 + back),
      t(18.0, -7.0 + back),
      t(22.5 + lift, -5.8 + back),
      t(25.2 + lift, -3.0),
      t(25.6, 2.2 + open),
      t(22.4, 7.6 + open),
      t(15.5, 8.2 + open),
      t(11.6, 6.8 + open),
    ],
    TOP,
    { group: 'cropTop', axis, tilt: { x: 0.15, y: 0.12 } },
  );
  // High techwear collar with cyan LED dash at the collar rim (`poing_01_garde.png`).
  canvas.polygon([t(22.8, -4.6), t(27.8, -3.6), t(28.2, 2.4), t(23.2, 3.4)], TOP, {
    group: 'collar',
    axis,
    bevel: 1.0 * S,
  });
  neonLine(ctx, torso(25.8, -1.8), torso(26.2, 1.4), true);
  // Under-bust tactical strap.
  canvas.decal(
    [t(11.6, -5.8 + back), t(11.6, 6.8 + open), t(13.2, 7.0 + open), t(13.2, -6.0 + back)],
    LEATHER,
    'cropTop',
  );
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
