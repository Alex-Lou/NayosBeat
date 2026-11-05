/**
 * Watt (Sound Clash, Lutteur, docs/watt.md §10), as the colosse of Zen-Tazzer with a light bulb
 * for a head: a black quilted nylon jacket, open on a black tee, its hood bunched behind the
 * collar; on both arms a heavy industrial lifting exoskeleton in brushed gunmetal and brass
 * hydraulic pistons over the sleeves (a bevelled pauldron with brass hazard stripes on the
 * shoulder, a brass-capped joint at the elbow, a segmented gauntlet with a 5-LED VU-meter down
 * the forearm, high-voltage clamps with brass electrodes for hands); an octagonal sternal power
 * core with twin braided conduits on the chest; black work trousers with thigh pockets and
 * armoured knee pads; heavy lugged rangers. His head is the bulb (head.ts), screwed into a brass
 * collar socket.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import { STILL, type Motion } from '../fighter.ts';
import { clamp, creases, stripeAcross, unit } from '../parts.ts';
import type { Material, PixelCanvas, Point } from '../raster.ts';
import { add, scale, sub, type Side, type Skeleton } from '../skeleton.ts';
import { drawSmear, type Ink } from '../vfx.ts';
import { WATT_BODY } from './body.ts';
import { stampHead } from './head.ts';
import { DETAIL, EFFECTS, farOf, MATERIAL, matteOf, noGloss } from './palette.ts';

export { paletteOf, type Colorway } from './palette.ts';

const S = ART_SCALE;
const M = MATERIAL;

function farLit(material: Material): Material {
  const far = farOf(material);
  return material.rim === undefined ? far : { ...far, rim: material.rim };
}

const NYLON = noGloss(M.nylon);
const NYLON_FAR: Material = { ...farLit(NYLON), base: NYLON.shadow, light: NYLON.base };
const COTTON = noGloss(M.cotton);
const CANVAS = noGloss(M.canvas);
const CANVAS_FAR = farLit(CANVAS);
const RUBBER = matteOf(M.rubber);
const RUBBER_FAR = farLit(RUBBER);
const BOOT: Material = { ...M.boot, glossCut: 0.82 };
const BOOT_FAR = farLit(BOOT);
const SOLE = matteOf(M.rubber);
const METAL: Material = { ...M.metal, glossCut: 0.72 };
const METAL_FAR = farLit(METAL);
const BRASS: Material = { ...M.brass, glossCut: 0.75 };
const BRASS_FAR = farLit(BRASS);
const LED = DETAIL.ledCore;

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of the jacket's hem, in world pixels. */
  readonly swing: Point;
}

/** Draws Watt in the cell whose left edge is `cellX`. */
export function drawWatt(
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

  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width, effect.tone);
  }
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 6.6 * S, 5.6 * S, 0, CANVAS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  drawHood(ctx);
  stampHead(canvas, skeleton.face, at(skeleton.head), skeleton.headAngle, skeleton.turned);
  drawTorso(ctx);
  drawJacket(ctx);
  drawCollar(ctx);
  drawArm(ctx, skeleton.near, 'near');
}

// ---------------------------------------------------------------------------------------------
// Arms: puffer sleeve, hydraulic brass pistons, gunmetal exoskeleton, VU-meters & clamps

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at, s } = ctx;
  const near = which === 'near';
  const group = `${which}Arm`;
  const sleeve = near ? NYLON : NYLON_FAR;
  const metal = near ? METAL : METAL_FAR;
  const brass = near ? BRASS : BRASS_FAR;
  const f = side.forearm;
  const shoulder = near ? side.shoulder : add(side.shoulder, { x: 0, y: -1.2 });

  // Puffed quilted sleeve.
  canvas.circle(at(shoulder), (near ? 5.8 : 5.2) * S, sleeve, { group });
  canvas.capsule(at(shoulder), at(side.elbow), 5.2 * S, 4.2 * S, sleeve, { group });
  stripeAcross(ctx, shoulder, side.elbow, [0.42, 0.78], shade(sleeve), 5.0, group);
  if (near) puffSheen(ctx, shoulder, side.elbow, group);
  const cuff = add(side.elbow, scale(f, 1.6));
  canvas.capsule(at(side.elbow), at(cuff), 4.2 * S, 3.8 * S, sleeve, { group });

  // External brass hydraulic piston rod along the upper arm.
  const upperAlong = unit(sub(side.elbow, shoulder));
  const upperOut = upSide(shoulder, side.elbow);
  const pistonA = add(add(shoulder, scale(upperAlong, 2.5)), scale(upperOut, 2.8));
  const pistonB = add(add(side.elbow, scale(upperAlong, -1.2)), scale(upperOut, 2.2));
  canvas.capsule(at(pistonA), at(pistonB), 1.1 * S, 0.9 * S, brass, { group: `${group}Piston` });

  // Heavy segmented forearm gauntlet with a brass hydraulic rail along the bottom edge.
  const gauntletFrom = add(side.elbow, scale(f, 1.0));
  const gauntletTo = sub(side.wrist, scale(f, 0.2));
  slab(ctx, gauntletFrom, gauntletTo, 3.5, 3.1, metal, `${group}Gauntlet`);
  stripeAcross(ctx, gauntletFrom, gauntletTo, [0.33, 0.66], shade(metal), 3.3, `${group}Gauntlet`);
  const lit = upSide(gauntletFrom, gauntletTo);
  const railA = add(add(gauntletFrom, scale(f, 1.0)), scale(lit, -2.2));
  const railB = add(add(gauntletTo, scale(f, -1.0)), scale(lit, -1.9));
  streak(ctx, railA, railB, brass, `${group}Gauntlet`, 0.9);

  // Elbow hub with concentric brass servo ring.
  canvas.circle(at(side.elbow), 3.2 * S, metal, { group: `${group}Joint`, bevel: 1.1 * S });
  canvas.circle(at(side.elbow), 1.4 * S, brass, { group: `${group}JointHub` });
  const hub = at(side.elbow);
  canvas.dot(
    Math.round(hub.x),
    Math.round(hub.y),
    near ? (M.brass.gloss ?? M.brass.light) : M.brass.light,
  );

  // Bevelled shoulder pauldron with industrial brass hazard stripe.
  const q = (t: number, w: number): Point =>
    at(add(add(shoulder, scale(upperAlong, t)), scale(upperOut, w)));
  canvas.polygon(
    [q(-4.6, 1.6), q(-3.2, 6.0), q(1.2, 7.2), q(5.8, 5.8), q(6.8, 2.8), q(3.6, 2.0), q(-1.0, 1.8)],
    metal,
    { group: `${group}Plate`, bevel: 1.5 * S },
  );
  // Brass hazard stripe across the lower rim of the pauldron.
  canvas.decal([q(-2.4, 2.4), q(5.2, 2.6), q(4.8, 3.6), q(-2.0, 3.4)], brass, `${group}Plate`);

  const activeLed = s.face === 'out' ? M.metal.deep : LED;
  const secondaryLed =
    s.face === 'out' ? M.metal.deep : s.face === 'kiai' || s.face === 'effort' ? LED : DETAIL.sound;

  if (near) {
    // Three diodes on the pauldron, and a 5-LED VU-meter bar down the forearm gauntlet.
    for (const [t, w] of [
      [-0.6, 5.2],
      [1.4, 5.4],
      [3.4, 4.8],
    ] as const) {
      const led = q(t, w);
      canvas.dot(Math.round(led.x), Math.round(led.y), activeLed);
    }
    for (const [i, t] of [0.14, 0.28, 0.42, 0.56, 0.7].entries()) {
      const led = at(
        add(add(gauntletFrom, scale(sub(gauntletTo, gauntletFrom), t)), scale(lit, 2.4)),
      );
      const color = i < 3 ? activeLed : secondaryLed;
      canvas.dot(Math.round(led.x), Math.round(led.y), color);
    }
  } else {
    for (const t of [0.22, 0.44, 0.66]) {
      const led = at(
        add(add(gauntletFrom, scale(sub(gauntletTo, gauntletFrom), t)), scale(lit, 2.2)),
      );
      canvas.dot(Math.round(led.x), Math.round(led.y), secondaryLed);
    }
  }
  drawClamp(ctx, side, near);
}

function puffSheen(ctx: Ctx, from: Point, to: Point, group: string): void {
  const along = sub(to, from);
  const lit = upSide(from, to);
  const on = (t: number, w: number): Point => add(add(from, scale(along, t)), scale(lit, w));
  for (const t of [0.18, 0.58]) {
    streak(ctx, on(t, 3.0), on(t + 0.16, 2.8), { ...NYLON, base: NYLON.light }, group, 0.5);
  }
}

/**
 * The exoskeleton's hydraulic clamp:
 * - when `'open'`, two heavy pincer jaws with inner brass high-voltage teeth and a live electric
 *   spark bridging the gap;
 * - when `'fist'`, a locked industrial battering block with brass knuckle busbars.
 */
function drawClamp(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at, s } = ctx;
  const metal = near ? METAL : METAL_FAR;
  const brass = near ? BRASS : BRASS_FAR;
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  const v = { x: -f.y, y: f.x };
  const k = 1.3;
  const p = (du: number, dv: number): Point =>
    at(add(side.wrist, add(scale(f, du * k), scale(v, dv * k))));
  if (side.hand === 'open') {
    // Upper pincer jaw + inner brass tooth electrode.
    canvas.polygon([p(0, -2.7), p(4.5, -2.9), p(5.7, -1.6), p(4.8, -0.5), p(0.4, -0.4)], metal, {
      group,
      bevel: 1.2 * S,
    });
    canvas.decal([p(1.8, -1.2), p(4.6, -1.4), p(4.4, -0.5), p(1.8, -0.5)], brass, group, {
      flat: true,
    });
    // Lower pincer jaw + inner brass tooth electrode.
    canvas.polygon([p(0, 0.9), p(4.1, 1.4), p(5.1, 2.7), p(3.6, 3.3), p(0.2, 2.8)], metal, {
      group: `${group}Jaw`,
      bevel: 1.2 * S,
    });
    canvas.decal([p(1.6, 1.0), p(4.0, 1.4), p(3.8, 2.1), p(1.6, 1.7)], brass, `${group}Jaw`, {
      flat: true,
    });
    if (s.face !== 'out') {
      const spark1 = p(2.6, 0.1);
      const spark2 = p(3.8, 0.4);
      canvas.dot(Math.round(spark1.x), Math.round(spark1.y), near ? LED : DETAIL.sound);
      canvas.dot(Math.round(spark2.x), Math.round(spark2.y), DETAIL.sound);
    }
    return;
  }
  canvas.polygon(
    [
      p(-0.2, -2.8),
      p(3.8, -3.0),
      p(5.4, -2.2),
      p(5.8, 0.4),
      p(5.2, 2.6),
      p(1.0, 2.8),
      p(-0.2, 1.8),
    ],
    metal,
    { group, bevel: 1.5 * S },
  );
  // Brass high-voltage contact busbar across the knuckles.
  canvas.decal([p(4.0, -2.2), p(5.6, -1.7), p(5.6, 1.9), p(4.0, 2.1)], brass, group, {
    flat: true,
  });
  for (const dv of [-1.0, 0.8]) {
    canvas.decal(
      [p(3.8, dv - 0.16), p(5.7, dv - 0.16), p(5.7, dv + 0.16), p(3.8, dv + 0.16)],
      shade(metal),
      group,
      { flat: true },
    );
  }
  canvas.capsule(p(1.8, 2.4), p(4.0, 2.0), 1.0 * S, 0.9 * S, metal, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs: work trousers, armoured knee pads with brass rivets, lugged rangers

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const cloth = near ? CANVAS : CANVAS_FAR;
  const metal = near ? METAL : METAL_FAR;
  const group = `${which}Leg`;
  const shin = sub(side.ankle, side.knee);
  const top = add(side.knee, scale(shin, 0.55));
  canvas.capsule(at(side.hip), at(side.knee), 5.4 * S, 4.2 * S, cloth, { group });
  canvas.capsule(at(side.knee), at(top), 4.0 * S, 4.2 * S, cloth, { group });
  creases(ctx, side.hip, side.knee, side.ankle, cloth, group);
  if (near) {
    const thigh = sub(side.knee, side.hip);
    const across = upSide(side.hip, side.knee);
    const pk = (t: number, w: number): Point =>
      at(add(add(side.hip, scale(thigh, t)), scale(across, w)));
    canvas.decal(
      [pk(0.34, -1.8), pk(0.34, 2.4), pk(0.72, 2.2), pk(0.72, -1.6)],
      shade(cloth),
      group,
    );
    canvas.decal([pk(0.34, -1.8), pk(0.34, 2.4), pk(0.42, 2.4), pk(0.42, -1.8)], cloth, group, {
      flat: true,
    });
  }
  drawBoot(ctx, side, near, top);
  const u = unit(shin);
  const v = { x: -u.y, y: u.x };
  const band = (t: number, w: number): Point => at(add(top, add(scale(shin, t), scale(v, w))));
  canvas.polygon([band(-0.08, -4.6), band(-0.08, 4.6), band(0.06, 4.4), band(0.06, -4.4)], cloth, {
    group: `${group}Hem`,
    bevel: 1.2 * S,
  });
  stripeAcross(ctx, top, side.ankle, [-0.02], shade(cloth), 4.4, `${group}Hem`);
  // Armoured knee pad with gunmetal cap and brass rivet.
  const pad = add(side.knee, scale(upSide(side.hip, side.knee), 0.6));
  canvas.ellipse(at(pad), 3.7 * S, 3.1 * S, 0, near ? RUBBER : RUBBER_FAR, {
    group: `${group}Pad`,
    bevel: 1.2 * S,
  });
  canvas.ellipse(at(pad), 2.2 * S, 1.8 * S, 0, metal, {
    group: `${group}PadCap`,
    bevel: 0.8 * S,
  });
  const padCenter = at(pad);
  canvas.dot(Math.round(padCenter.x), Math.round(padCenter.y), near ? M.brass.light : M.brass.base);
  stripeAcross(ctx, side.hip, side.knee, [0.86], shade(cloth), 4.4, group);
}

function drawBoot(ctx: Ctx, side: Side, near: boolean, top: Point): void {
  const { canvas, at } = ctx;
  const leather = near ? BOOT : BOOT_FAR;
  const brass = near ? BRASS : BRASS_FAR;
  const group = near ? 'nearBoot' : 'farBoot';
  const toe = sub(side.toe, side.heel);
  const u = unit(toe);
  const v = { x: -u.y, y: u.x };
  const sole = add(side.heel, add(scale(u, WATT_BODY.heel), scale(v, -WATT_BODY.footRadius)));
  const world = (a: number, b: number): Point => {
    const point = add(sole, add(scale(u, a), scale(v, b)));
    return point.y < 0 ? { x: point.x, y: 0 } : point;
  };
  const p = (a: number, b: number): Point => at(world(a, b));
  const shaft: Material = { ...matteOf(leather), light: leather.base };
  canvas.capsule(at(top), at(side.ankle), 4.0 * S, 3.8 * S, shaft, { group });
  canvas.polygon(
    [
      p(-4.0, 0.6),
      p(-4.3, 4.4),
      p(-3.4, 7.0),
      p(2.6, 7.2),
      p(5.2, 5.2),
      p(7.8, 4.4),
      p(9.2, 3.0),
      p(9.3, 0.6),
    ],
    leather,
    { group, bevel: 2.4 * S },
  );
  // Steel/brass reinforced toe cap on the ranger.
  canvas.decal([p(6.2, 0.8), p(9.1, 0.8), p(9.0, 2.8), p(6.4, 3.6)], brass, group);
  stripeAcross(ctx, top, side.ankle, [0.1], shade(leather), 4.0, group);
  canvas.decal([p(5.4, 1.2), p(5.8, 1.2), p(6.4, 4.6), p(6.0, 4.6)], shade(leather), group, {
    flat: true,
  });
  const shin = sub(side.ankle, side.knee);
  const down = unit(shin);
  const across = { x: -down.y, y: down.x };
  const front = across.x * u.x + across.y * u.y >= 0 ? across : scale(across, -1);
  const lace = { x: near ? M.metal.shadow : M.metal.deep, h: near ? M.metal.base : M.metal.shadow };
  const bottom = at(add(add(side.ankle, scale(sub(top, side.ankle), -0.1)), scale(front, 1.4)));
  const high = at(add(add(side.ankle, scale(sub(top, side.ankle), 0.6)), scale(front, 1.4)));
  const crosses = Math.max(1, Math.floor((bottom.y - high.y) / 3) + 1);
  for (let k = 0; k < crosses; k++) {
    const t = crosses > 1 ? k / (crosses - 1) : 0;
    const x = Math.round(bottom.x + (high.x - bottom.x) * t);
    pixels(ctx, LACE, x - 1, Math.round(bottom.y) - 1 - 3 * k, lace);
  }
  canvas.polygon([p(-4.4, -0.1), p(9.6, -0.1), p(9.8, 2.0), p(-4.5, 2.0)], SOLE, {
    group: `${group}Sole`,
    flat: true,
  });
  for (let a = -3.4; a < 9.2; a += 1.5) {
    const lug = p(a, 0.1);
    canvas.dot(lug.x, lug.y, SOLE.deep);
  }
}

const LACE: readonly string[] = ['h.x', '.x.', 'x.x'];

// ---------------------------------------------------------------------------------------------
// Torso: sternal transformer core, power conduits, belt cells, quilted jacket & brass collar ring

function drawHood(ctx: Ctx): void {
  const { canvas, at, torso } = ctx;
  canvas.ellipse(at(torso(23.6, -6.4)), 5.6 * S, 4.0 * S, 0.3, NYLON_FAR, {
    group: 'hood',
    bevel: 1.6 * S,
  });
}

function drawTorso(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  canvas.polygon(
    [
      t(3.0, -7.0),
      t(14.0, -7.4),
      t(24.6, -6.6),
      t(26.6, -3.0),
      t(26.4, 4.4),
      t(22.0, 7.4),
      t(12.0, 7.0),
      t(3.0, 6.6),
    ],
    COTTON,
    { group: 'tee', axis, tilt: { x: 0.3, y: 0.2 } },
  );
  // Twin brass power conduits feeding from the sternal transformer core up to the collar/shoulders.
  streak(ctx, torso(19.0, 3.2), torso(24.5, 1.5), BRASS, 'tee', 0.7);
  streak(ctx, torso(19.0, 5.2), torso(24.5, 5.8), BRASS, 'tee', 0.7);
  // Octagonal sternal transformer housing (`chestCore`) with brass rim and glowing VU diode.
  canvas.polygon(
    [
      t(15.4, 2.4),
      t(17.0, 1.6),
      t(20.6, 1.6),
      t(22.0, 2.6),
      t(21.8, 5.8),
      t(20.2, 6.4),
      t(16.8, 6.4),
      t(15.4, 5.4),
    ],
    METAL,
    { group: 'chestCore', bevel: 1.0 * S },
  );
  canvas.polygon([t(16.8, 2.6), t(20.4, 2.6), t(20.2, 5.4), t(16.6, 5.4)], BRASS, {
    group: 'chestCoreInner',
  });
  const core = t(18.6, 4.0);
  if (s.face !== 'out') {
    canvas.dot(Math.round(core.x), Math.round(core.y), LED);
    canvas.dot(Math.round(core.x) + 1, Math.round(core.y), DETAIL.sound);
    if (s.face === 'effort' || s.face === 'kiai') {
      canvas.dot(Math.round(core.x) - 1, Math.round(core.y), LED);
      canvas.dot(Math.round(core.x), Math.round(core.y) - 1, LED);
      canvas.dot(Math.round(core.x), Math.round(core.y) + 1, DETAIL.sound);
    }
  }
  // Heavy utility belt with metal buckle and brass capacitor cells.
  canvas.polygon([t(2.4, -6.8), t(5.2, -7.0), t(5.4, 6.8), t(2.6, 6.8)], RUBBER, {
    group: 'belt',
    axis,
  });
  canvas.polygon([t(2.4, 3.2), t(5.2, 3.2), t(5.2, 6.0), t(2.4, 6.0)], METAL, {
    group: 'buckle',
    bevel: 0.9 * S,
  });
  canvas.polygon([t(2.6, 0.8), t(5.0, 0.8), t(5.0, 2.4), t(2.6, 2.4)], BRASS, {
    group: 'beltCell',
  });
  if (s.face !== 'out') {
    const beltLed = t(3.8, 4.6);
    canvas.dot(Math.round(beltLed.x), Math.round(beltLed.y), DETAIL.sound);
  }
}

function drawJacket(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  const axis = { x: s.up.x, y: -s.up.y };
  const flare = clamp(-swing.x * 0.5, -1, 1.2);
  const lift = s.shrug * 0.6;
  const open = 1.2 * s.twist;

  canvas.polygon(
    [
      t(25.4, 4.2 + open),
      t(20.0, 8.6 + open),
      t(12.0, 9.2 + open),
      t(1.0, 8.8 + open + flare * 0.3),
      t(1.2, 6.4 + open),
      t(12.0, 6.6 + open),
      t(20.0, 6.0 + open),
      t(24.8, 4.0 + open),
    ],
    NYLON_FAR,
    { group: 'farPanel', axis },
  );
  canvas.polygon(
    [
      t(-0.6, -9.2 + flare),
      t(8.0, -9.8),
      t(16.0, -10.6),
      t(21.0 + lift * 0.4, -11.2),
      t(24.6 + lift, -10.2),
      t(27.2 + lift, -7.6),
      t(28.4 + lift, -4.2),
      t(27.4, -1.4),
      t(18.0, 1.4 + open * 0.3),
      t(8.0, 1.0 + open * 0.3),
      t(-0.4, 1.6 + open * 0.2),
    ],
    NYLON,
    { group: 'jacket', axis, tilt: { x: 0.1, y: 0.15 } },
  );
  for (const d of [5.0, 10.0, 15.0, 20.0]) {
    canvas.decal(
      [t(d, -9.6), t(d, 1.2), t(d + 0.5, 1.2), t(d + 0.5, -9.6)],
      shade(NYLON),
      'jacket',
      {
        flat: true,
      },
    );
    streak(
      ctx,
      torso(d + 2.6, -6.4),
      torso(d + 2.6, -2.2),
      { ...NYLON, base: NYLON.light },
      'jacket',
      0.5,
    );
  }
  canvas.decal(
    [t(-0.7, -9.1 + flare), t(-0.5, 1.6), t(1.0, 1.6), t(1.0, -9.0 + flare * 0.6)],
    shade(NYLON),
    'jacket',
  );
  for (const d of [5.0, 10.0, 15.0, 20.0]) {
    canvas.decal(
      [t(d, 6.2 + open), t(d, 9.0 + open), t(d + 0.5, 9.0 + open), t(d + 0.5, 6.2 + open)],
      shade(NYLON_FAR),
      'farPanel',
      { flat: true },
    );
  }
}

/** The collar and its brass socket ring around the bulb's screw base. */
function drawCollar(ctx: Ctx): void {
  const { canvas, at, torso, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  canvas.polygon(
    [t(24.6, -5.0), t(28.8, -4.6), t(29.6, -1.0), t(29.2, 3.4), t(25.6, 5.0), t(24.2, 0.4)],
    NYLON,
    {
      group: 'collar',
      axis: { x: s.up.x, y: -s.up.y },
      bevel: 1.2 * S,
    },
  );
  // Brass socket collar rim where the bulb threads into the exoskeleton harness.
  canvas.decal([t(27.8, -4.2), t(29.4, -1.0), t(29.0, 3.2), t(27.6, 2.6)], BRASS, 'collar');
}

// ---------------------------------------------------------------------------------------------
// Helpers

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

function upSide(a: Point, b: Point): Point {
  const u = unit(sub(b, a));
  const v = { x: -u.y, y: u.x };
  return v.y >= 0 ? v : scale(v, -1);
}

function shade(material: Material): Material {
  return matteOf({
    ...material,
    base: material.shadow,
    light: material.base,
    shadow: material.deep,
  });
}
