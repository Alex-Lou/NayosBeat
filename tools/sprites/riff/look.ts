/**
 * Riff (b-girl, Rushdown): an oversize matte violet hoodie, hood down and rolled behind the
 * neck, yellow drawstrings swinging and a yellow diamond printed on the lead sleeve, ribbed
 * cuffs and a ribbed hem that gathers it at the hips; black cargo shorts over black leggings,
 * small white knee pads, white and violet high-tops with yellow laces and heel tab, white terry
 * sweatbands with a yellow stripe, bare hands. Her head (head.ts) wears the backwards cap, her
 * braids hang from it. At 1x she reads as four big areas: a violet top, auburn braids, dark
 * legs, white extremities (wrists, knees, feet) that draw her dance moves, with yellow sparks
 * of accent all over (about 1.5% of her pixels).
 *
 * Everything is placed in world pixels (character space, see skeleton.ts) and drawn ART_SCALE
 * times finer. What hangs (braids, drawstrings, the hoodie's hem) lags behind the body's
 * motion: the braids ride the springs of index.ts, so every strip gets follow-through.
 */

import { ANCHOR, ART_SCALE } from '../../../src/art/types.ts';
import { STILL, type Motion } from '../fighter.ts';
import { clamp, creases, headLocal, stripeAcross, unit } from '../parts.ts';
import type { Material, PixelCanvas, Point } from '../raster.ts';
import { add, scale, sub, type Side, type Skeleton } from '../skeleton.ts';
import { drawSmear, type Ink } from '../vfx.ts';
import { RIFF_BODY } from './body.ts';
import { BRAID_ROOTS, BRAID_SPLAY, onHead, stampBraid, stampHead, type BraidSide } from './head.ts';
import { EFFECTS, farOf, MATERIAL, matteOf, noGloss } from './palette.ts';

export { paletteOf, type Colorway } from './palette.ts';

const S = ART_SCALE;
const M = MATERIAL;

const SKIN = noGloss(M.skin);
const SKIN_FAR = farOf(SKIN);
/** The neck, in the shadow of the jaw: no light tone, no back light. */
const NECK: Material = { ...matteOf(SKIN), light: SKIN.shadow, base: SKIN.shadow };
/** The jaw's cast shadow on the neck. */
const NECK_SHADOW: Material = { ...NECK, base: SKIN.deep, light: SKIN.deep, shadow: SKIN.deep };
const HOODIE = noGloss(M.primary);
const HOODIE_FAR: Material = { ...farOf(HOODIE), base: HOODIE.shadow, light: HOODIE.base };
/**
 * The sleeves: the hoodie's base is their main plane (its light tone only rims their top and
 * front, see `rimmed`), so the hoodie reads violet, not lilac.
 */
const SLEEVE: Material = { ...HOODIE, light: HOODIE.base };
const SLEEVE_FAR: Material = { ...HOODIE_FAR, light: HOODIE_FAR.base };
/** Ribbed cuffs and hem, the hood's lining: one tone down. */
const RIB = shade(HOODIE);
const RIB_FAR = shade(HOODIE_FAR);
/** The elbow's fold: the hoodie's shadow tone (drawn flat, see elbowFold). */
const FOLD: Material = { ...HOODIE, base: HOODIE.shadow };
const FOLD_FAR: Material = { ...HOODIE_FAR, base: HOODIE_FAR.deep };
const WHITE: Material = { ...M.white, glossCut: 0.86 };
const WHITE_FAR = farOf(WHITE);
/** Knee pads: matte foam, mostly in the white's shadow and base, a thin light top edge. */
const PAD = matteOf(M.white);
const PAD_FAR = farOf(PAD);
const TERRY = matteOf(M.white);
const TERRY_FAR = farOf(TERRY);
const PANEL = noGloss(M.primary);
const PANEL_FAR = farOf(PANEL);
/**
 * The shorts' twill: its shadow tone is the main plane (shadow and base bands alike), the base
 * tone the lit side, so they read lighter than the stage and apart from the leggings.
 */
const SHORTS: Material = {
  ...matteOf(M.shorts),
  base: M.shorts.shadow,
  light: M.shorts.base,
};
const SHORTS_FAR = farOf(SHORTS);
const POCKET = shade(SHORTS);
/** The light edge of the shorts' rolled hem and of the pocket flap. */
const SHORTS_EDGE: Material = { ...SHORTS, base: M.shorts.light };
const LEGGINGS: Material = { ...M.leggings, glossCut: 0.93 };
const LEGGINGS_FAR = farOf(LEGGINGS);
const SOLE = matteOf(M.sole);
const ACCENT = M.accent;
/** The accent as a flat stripe: its base tone only, never shaded. */
const ACCENT_FLAT: Material = {
  ...ACCENT,
  deep: ACCENT.base,
  shadow: ACCENT.base,
  light: ACCENT.base,
};

interface Ctx extends Ink {
  readonly s: Skeleton;
  /** Point on the torso: `distance` up from the hip along the spine, `across` toward the front. */
  readonly torso: (distance: number, across: number) => Point;
  /** Trailing offset of the short hanging parts (hem, drawstrings), in world pixels. */
  readonly swing: Point;
  /** How far each braid's tip lags (world pixels), from the springs of index.ts. */
  readonly braids: Readonly<Record<BraidSide, Point>>;
}

/** Draws Riff in the cell whose left edge is `cellX`. */
export function drawRiff(
  canvas: PixelCanvas,
  skeleton: Skeleton,
  cellX: number,
  motion: Motion = STILL,
): void {
  const at = (p: Point): Point => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S });
  const [near = { x: 0, y: 0 }, far = near] = motion.hang ?? [];
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
    braids: { near, far },
  };

  // Motion trails behind the body; the other effects go on the front layer (see sheet.ts).
  for (const effect of skeleton.effects) {
    if (effect.kind === 'smear') drawSmear(ctx, effect.points, effect.width);
  }
  drawArm(ctx, skeleton.far, 'far');
  drawLeg(ctx, skeleton.far, 'far');
  canvas.ellipse(at(skeleton.hip), 5.4 * S, 4.2 * S, 0, SHORTS, { group: 'hips' });
  drawLeg(ctx, skeleton.near, 'near');
  // The neck goes behind the hoodie: its neckline covers the base of the neck.
  drawNeck(ctx);
  drawHoodie(ctx);
  drawHood(ctx);
  // The braids hang down her back, over the hood: the far one behind the head, the near one
  // over the back of the near shoulder (under it, the sleeve would cut it off).
  drawBraid(ctx, 'far');
  stampHead(canvas, skeleton.face, at(skeleton.head), skeleton.headAngle);
  drawArm(ctx, skeleton.near, 'near');
  drawBraid(ctx, 'near');
  // The drawstrings hang down the front of the chest, over the near shoulder's edge.
  drawDrawstrings(ctx);
}

// ---------------------------------------------------------------------------------------------
// Arms and hands

/** Back and down, in world pixels: the shift that leaves a shape's light rim on top and front. */
const RIM: Point = { x: -0.6, y: -0.6 };

function drawArm(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const near = which === 'near';
  const group = `${which}Arm`;
  const f = side.forearm;
  // Up the forearm from the hand: the sweatband just under the hand, the sleeve's ribbed cuff
  // above it, the sleeve pushed up to there.
  const bandEnd = sub(side.wrist, scale(f, 0.1));
  const bandStart = sub(side.wrist, scale(f, 1.6));
  const cuff = sub(side.wrist, scale(f, 2.7));
  // Dropped shoulder: the sleeve starts low and wide, then bags down to the cuff. Drawn twice:
  // in the hoodie's tones, then shifted back and down in the sleeve's (no light tone), so only a
  // thin light rim stays on its top and front edges.
  const sleeve = (offset: Point, material: Material): void => {
    const { canvas, at } = ctx;
    const o = (p: Point): Point => at(add(p, offset));
    canvas.circle(o(side.shoulder), 3.8 * S, material, { group });
    canvas.capsule(o(side.shoulder), o(side.elbow), 3.6 * S, 3.3 * S, material, { group });
    canvas.circle(o(side.elbow), 3.3 * S, material, { group });
    slab(ctx, add(side.elbow, offset), add(cuff, offset), 3.3, 2.9, material, group);
  };
  sleeve({ x: 0, y: 0 }, near ? HOODIE : HOODIE_FAR);
  sleeve(RIM, near ? SLEEVE : SLEEVE_FAR);
  if (near) drawPrint(ctx, add(side.shoulder, scale(sub(side.elbow, side.shoulder), 0.42)), group);
  // The fold inside the bent elbow: one short line of the hoodie's shadow tone.
  elbowFold(ctx, side.shoulder, side.elbow, cuff, near ? FOLD : FOLD_FAR, group);
  slab(ctx, cuff, bandStart, 2.6, 2.5, near ? RIB : RIB_FAR, `${group}Cuff`);
  const terry = near ? TERRY : TERRY_FAR;
  slab(ctx, bandStart, bandEnd, 2.2, 2.2, terry, `${group}Band`);
  // A yellow stripe around the middle of the lead band (on the far one it would only add noise
  // next to the drawstrings).
  if (near) stripeAcross(ctx, bandStart, bandEnd, [0.5], ACCENT_FLAT, 2.2, `${group}Band`);
  drawHand(ctx, side, near);
}

/** A 2 to 3 pixel fold on the inside of a bent elbow, along the bend. */
function elbowFold(
  ctx: Ctx,
  shoulder: Point,
  elbow: Point,
  cuff: Point,
  material: Material,
  group: string,
): void {
  const a = unit(sub(shoulder, elbow));
  const b = unit(sub(cuff, elbow));
  const inside = add(a, b);
  // Straight (or nearly) arms have no fold.
  if (Math.hypot(inside.x, inside.y) < 0.35) return;
  const u = unit(inside);
  const v = { x: -u.y * 0.25, y: u.x * 0.25 };
  const from = add(elbow, scale(u, 0.6));
  const to = add(elbow, scale(u, 2.0));
  ctx.canvas.decal(
    [ctx.at(add(from, v)), ctx.at(add(to, v)), ctx.at(sub(to, v)), ctx.at(sub(from, v))],
    material,
    group,
    { flat: true },
  );
}

/**
 * The yellow diamond printed on the lead sleeve (the chest hides behind the lead arm in most
 * poses): 5 pixels across, flat so it stays bright.
 */
function drawPrint(ctx: Ctx, center: Point, group: string): void {
  const { canvas, at } = ctx;
  const d = 1.3;
  const corner = (x: number, y: number): Point => at(add(center, { x, y }));
  canvas.decal([corner(0, d), corner(d, 0), corner(0, -d), corner(-d, 0)], ACCENT, group, {
    flat: true,
  });
}

/**
 * A straight piece of a limb from `from` to `to` (world), cut square at both ends (a cuff, a
 * band), shaded as a cylinder along it.
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

function drawHand(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const skin = near ? SKIN : SKIN_FAR;
  const fold = { ...skin, base: skin.shadow, light: skin.base };
  const group = near ? 'nearHand' : 'farHand';
  const f = side.forearm;
  // Hand axes: u along the forearm from the wrist, v toward the thumb.
  const v = { x: -f.y, y: f.x };
  const p = (du: number, dv: number): Point => at(add(side.wrist, add(scale(f, du), scale(v, dv))));

  if (side.hand === 'open') {
    // A loose open hand, palm out: the palm, three fingers apart enough to read (two shadow
    // lines between them, the tips stepped), the thumb out to the side.
    canvas.polygon(
      [
        p(-0.2, -1.6),
        p(2.4, -1.8),
        p(4.6, -1.7),
        p(5.4, -1.1),
        p(5.6, -0.2),
        p(5.3, 0.7),
        p(4.4, 1.4),
        p(2.2, 1.7),
        p(0, 1.5),
      ],
      skin,
      { group, bevel: 1.2 * S },
    );
    for (const dv of [-0.55, 0.45]) {
      canvas.decal(
        [p(2.8, dv - 0.12), p(5.8, dv - 0.12), p(5.8, dv + 0.12), p(2.8, dv + 0.12)],
        fold,
        group,
        {
          flat: true,
        },
      );
    }
    canvas.capsule(p(0.8, 1.3), p(2.6, 2.7), 0.8 * S, 0.7 * S, skin, { group: `${group}Thumb` });
    return;
  }
  // A loose fist: the knuckles forward, the fingers folded under them, the thumb across.
  canvas.polygon(
    [
      p(0, -2.0),
      p(3.2, -2.2),
      p(4.5, -1.5),
      p(4.7, 1.0),
      p(4.0, 2.1),
      p(0.9, 2.2),
      p(-0.2, 1.3),
      p(-0.3, -1.0),
    ],
    skin,
    { group, bevel: 1.5 * S },
  );
  canvas.decal([p(3.6, -2.3), p(3.9, -2.3), p(3.9, -0.3), p(3.6, -0.3)], fold, group, {
    flat: true,
  });
  canvas.capsule(p(1.9, 1.6), p(3.5, 1.3), 0.8 * S, 0.7 * S, skin, { group: `${group}Thumb` });
}

// ---------------------------------------------------------------------------------------------
// Legs and high-tops

function drawLeg(ctx: Ctx, side: Side, which: 'near' | 'far'): void {
  const { canvas, at } = ctx;
  const near = which === 'near';
  const leggings = near ? LEGGINGS : LEGGINGS_FAR;
  const shorts = near ? SHORTS : SHORTS_FAR;
  const group = `${which}Leg`;
  // Black leggings, slim, down into the high-tops.
  canvas.capsule(at(side.hip), at(side.knee), 3.2 * S, 2.6 * S, leggings, { group });
  canvas.capsule(at(side.knee), at(side.ankle), 2.5 * S, 2.0 * S, leggings, { group });
  creases(ctx, side.hip, side.knee, side.ankle, leggings, group);
  drawSneaker(ctx, side, near);
  // Roomy cargo shorts to mid-thigh: a rolled hem, its edge catching the light.
  const thigh = sub(side.knee, side.hip);
  const hem = add(side.hip, scale(thigh, 0.56));
  const shortsGroup = `${which}Shorts`;
  canvas.capsule(at(side.hip), at(hem), 4.9 * S, 4.6 * S, shorts, { group: shortsGroup });
  stripeAcross(ctx, side.hip, hem, [0.86], shade(shorts), 4.5, shortsGroup);
  if (near) {
    stripeAcross(ctx, side.hip, hem, [0.96], SHORTS_EDGE, 4.4, shortsGroup);
    drawCargoPocket(ctx, side, shortsGroup);
  }
  drawKneePad(ctx, side, near);
}

/** The cargo pocket on the side of the near thigh: a flap with a light edge, a yellow pull tab. */
function drawCargoPocket(ctx: Ctx, side: Side, group: string): void {
  const { canvas, at } = ctx;
  const along = sub(side.knee, side.hip);
  const u = unit(along);
  const v = { x: -u.y, y: u.x };
  const point = (t: number, w: number): Point =>
    at(add(side.hip, add(scale(along, t), scale(v, w))));
  canvas.decal(
    [point(0.2, -2.4), point(0.2, 2.6), point(0.5, 2.4), point(0.5, -2.2)],
    POCKET,
    group,
  );
  // The flap, its top edge and its front edge catching the light.
  canvas.decal(
    [point(0.2, -2.6), point(0.2, 2.8), point(0.3, 2.8), point(0.3, -2.6)],
    shade(POCKET),
    group,
  );
  canvas.decal(
    [point(0.17, -2.6), point(0.17, 2.8), point(0.22, 2.8), point(0.22, -2.6)],
    SHORTS_EDGE,
    group,
    { flat: true },
  );
  const tab = point(0.33, 0.4);
  canvas.dot(tab.x, tab.y, ACCENT.base);
  canvas.dot(tab.x, tab.y + 1, ACCENT.base);
  canvas.dot(tab.x + 1, tab.y, ACCENT.light);
}

/**
 * A round foam pad over the front of the knee, about 5 world pixels across: matte, in the
 * white's base and shadow with a thin light top edge, a violet strap under it.
 */
function drawKneePad(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const group = near ? 'nearPad' : 'farPad';
  const pad = near ? PAD : PAD_FAR;
  const up = unit(sub(side.hip, side.knee));
  const down = unit(sub(side.ankle, side.knee));
  // The front of the knee: away from the inside of the bend.
  const bend = add(up, down);
  const out = Math.hypot(bend.x, bend.y) > 0.05 ? scale(unit(bend), -1) : { x: -down.y, y: down.x };
  const center = add(side.knee, scale(out, 0.4));
  const top = add(center, scale(up, 0.3));
  const bottom = add(center, scale(down, 0.4));
  canvas.capsule(at(top), at(bottom), 2.3 * S, 2.2 * S, pad, { group });
  // Again, a little lower and back, without its light tone: the light stays a thin top edge.
  const low = { x: RIM.x * 0.7, y: RIM.y * 0.9 };
  const matte: Material = { ...pad, light: pad.base };
  canvas.capsule(at(add(top, low)), at(add(bottom, low)), 2.2 * S, 2.1 * S, matte, { group });
  stripeAcross(ctx, top, bottom, [1.25], near ? PANEL : PANEL_FAR, 2.2, group);
}

function drawSneaker(ctx: Ctx, side: Side, near: boolean): void {
  const { canvas, at } = ctx;
  const white = near ? WHITE : WHITE_FAR;
  const panel = near ? PANEL : PANEL_FAR;
  const group = near ? 'nearShoe' : 'farShoe';
  // Foot axes: u from heel to toe, v up from the sole.
  const toe = sub(side.toe, side.heel);
  const u = unit(toe);
  const v = { x: -u.y, y: u.x };
  // Origin under the ankle, on the ground (the heel-toe line runs through the middle of the
  // shoe, half its thickness above the sole).
  const sole = add(side.heel, add(scale(u, RIFF_BODY.heel), scale(v, -RIFF_BODY.footRadius)));
  const tilted = (a: number, b: number): Point => add(sole, add(scale(u, a), scale(v, b)));
  // Up on the ball of the foot (the heel raised more than a few degrees), the shoe bends there:
  // the toe box stays flat on the ground, only the heel rises. `p` maps a point of the shoe
  // (along the foot from under the ankle, up from the sole) to cell pixels.
  const heelUp = u.y < -Math.sin((6 * Math.PI) / 180);
  const ballX = tilted(BALL, 0).x;
  const ground = tilted(8.3, -0.1).y + 0.1;
  const forward = u.x >= 0 ? 1 : -1;
  const world = (a: number, b: number, toeSide = a > BALL): Point =>
    heelUp && toeSide ? { x: ballX + (a - BALL) * forward, y: ground + b } : tilted(a, b);
  const p = (a: number, b: number, toeSide?: boolean): Point => at(world(a, b, toeSide));

  // The padded collar hugs the ankle, a little up the shin: a high-top, not a boot.
  const shin = sub(side.ankle, side.knee);
  const collar = add(side.ankle, scale(shin, -0.07));
  canvas.capsule(at(collar), at(side.ankle), 2.7 * S, 2.7 * S, white, { group });
  // The foot: a padded heel, the instep sloping down to a low rounded toe box.
  canvas.polygon(
    [
      p(-3.3, 0.6),
      p(-3.6, 3.6),
      p(-2.8, 5.6),
      p(1.6, 5.6),
      p(4.4, 4.0),
      p(6.6, 3.2),
      p(7.8, 2.2),
      p(7.9, 0.6),
      p(BALL, 0.6, true),
      p(BALL, 0.6, false),
    ],
    white,
    { group, bevel: 2.0 * S },
  );
  // Violet overlays: the rounded toe cap, the heel counter, and a stripe sweeping from the toe
  // box up the side to the collar.
  canvas.decal(
    [p(5.2, 1.3), p(7.6, 1.3), p(8.3, 1.8), p(8.0, 2.6), p(6.8, 3.3), p(5.6, 3.0), p(5.0, 2.2)],
    panel,
    group,
  );
  canvas.decal([p(-4, 1.4), p(-1.6, 1.4), p(-1.8, 4.2), p(-4, 4.4)], panel, group);
  canvas.decal([p(-0.6, 1.6), p(BALL, 2.2), p(BALL, 3.3), p(-0.2, 3.6)], panel, group);
  // Yellow laces up the instep, the yellow heel tab at the back of the collar.
  for (const a of [1.2, 2.4, 3.4]) {
    const lace = p(a, 5.6 - (a - 1.2) * 0.6);
    canvas.dot(lace.x, lace.y, ACCENT.base);
  }
  const down = unit(shin);
  const across = { x: -down.y, y: down.x };
  const front = across.x * u.x + across.y * u.y >= 0 ? across : scale(across, -1);
  const tab = at(add(add(collar, scale(front, -2.5)), scale(down, -1.4)));
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 2; dx++) {
      canvas.dot(tab.x + dx, tab.y + dy, dy === 2 ? ACCENT.shadow : ACCENT.base);
    }
  }
  // Thick off-white cupsole, bent at the ball with the shoe; a grey-violet line along its
  // sidewall where it lies about flat (on a tilted sole the line would stair-step into a dotted
  // blade).
  canvas.polygon(
    [
      p(-3.7, -0.1),
      p(BALL, -0.1, false),
      p(BALL, -0.1, true),
      p(8.1, -0.1),
      p(8.3, 1.6),
      p(BALL, 1.6, true),
      p(BALL, 1.6, false),
      p(-3.8, 1.6),
    ],
    SOLE,
    { group: `${group}Sole`, flat: true },
  );
  const flat = Math.abs(u.y) < Math.sin((12 * Math.PI) / 180);
  const from = flat ? -3.8 : heelUp ? BALL : undefined;
  if (from !== undefined) {
    canvas.decal(
      [p(from, 0.6, heelUp), p(8.4, 0.6), p(8.4, 0.85), p(from, 0.85, heelUp)],
      shade(SOLE),
      `${group}Sole`,
      { flat: true },
    );
  }
}

/** Where a high-top bends when she rises on the ball of her foot (along the foot, see drawSneaker). */
const BALL = 3.8;

// ---------------------------------------------------------------------------------------------
// Torso: the oversize hoodie

/**
 * Neck, from inside the hood to under the jaw: in the shadow of the jaw (no light tone), the
 * jaw's cast shadow across its top.
 */
function drawNeck(ctx: Ctx): void {
  const { canvas, at, s, torso } = ctx;
  const local = headLocal(s);
  canvas.capsule(at(torso(20.5, 0.8)), at(local(0.4, -3.6)), 2.0 * S, 1.9 * S, NECK, {
    group: 'neck',
  });
  // Under the jaw line of head.ts (head-local, world pixels): two rows of deep shadow.
  canvas.decal(
    [at(local(-2.5, -1.95)), at(local(4, -5.85)), at(local(4, -7.35)), at(local(-2.5, -3.45))],
    NECK_SHADOW,
    'neck',
    { flat: true },
  );
}

function drawHoodie(ctx: Ctx): void {
  const { canvas, at, torso, swing, s } = ctx;
  const t = (distance: number, across: number): Point => at(torso(distance, across));
  // The hem flares behind the motion; the rolled lead shoulder lifts the shoulder line.
  const flare = clamp(-swing.x * 0.5, -1, 1.2);
  const lift = s.shrug * 0.8;
  const open = 1.5 * s.twist;
  // Roomy and soft: the shoulders dropped and round, the back bowed out a little over the
  // shoulder blades, the front blousing out over the ribbed hem that gathers it in at the hips.
  // Shaded as a soft pillow (a wide rounded rim), not a hard barrel: fleece, not a puffer.
  const outline = [
    t(-1.4, -5.6 + flare),
    t(0.8, -6.4 + flare * 0.5),
    t(2.6, -7.6 + flare * 0.3),
    t(6, -7.9),
    t(11, -7.9),
    t(15.6, -7.6),
    t(19.4 + lift * 0.3, -6.2),
    t(21.2, -4.0),
    t(21.8, -1.4),
    t(21.4, 2.2 + open),
    t(19.4 + lift, 5.2 + open),
    t(16.6, 7.6 + open),
    t(10, 8.6 + open),
    t(4.2, 8.8 + open),
    t(2.4, 8.2 + open),
    t(0.8, 7.0 + flare * 0.5 + open),
    t(-1.4, 6.2 + flare + open),
  ];
  canvas.polygon(outline, HOODIE, { group: 'hoodie', bevel: 4.5 * S });
  // Again, shifted back and down without its light tone: the light only rims the shoulders and
  // the front, the violet base fills the body.
  const shift = { x: RIM.x * S, y: -RIM.y * S };
  canvas.polygon(
    outline.map((p) => add(p, shift)),
    { ...HOODIE, light: HOODIE.base },
    { group: 'hoodie', bevel: 4.5 * S },
  );
  // The ribbed hem, gathered: knit ribs across it.
  canvas.decal(
    [t(-1.8, -6.0 + flare), t(-1.8, 6.6 + flare + open), t(1.0, 7.4 + open), t(1.0, -6.8)],
    RIB,
    'hoodie',
  );
  for (let across = -5.4; across < 6.6 + open; across += 1.2) {
    canvas.decal(
      [t(-1.8, across), t(-1.8, across + 0.35), t(1.0, across + 0.45), t(1.0, across + 0.1)],
      shade(RIB),
      'hoodie',
    );
  }
  // Soft folds of the roomy fleece, falling from the shoulder blade and blousing over the hem.
  canvas.decal([t(15.4, -5.0), t(3.0, -6.0), t(3.0, -5.5), t(15.4, -4.5)], shade(HOODIE), 'hoodie');
  canvas.decal([t(11.8, -1.4), t(2.6, 1.2), t(2.6, 1.7), t(11.8, -0.9)], shade(HOODIE), 'hoodie');
  // The kangaroo pocket on the front: its top seam and the slanted opening.
  const seam = shade(HOODIE);
  canvas.decal(
    [t(8.2, 2.2 + open), t(8.2, 8.8 + open), t(8.7, 8.8 + open), t(8.7, 2.2 + open)],
    seam,
    'hoodie',
  );
  canvas.decal(
    [t(8.4, 2.0 + open), t(1.6, 1.0 + open), t(1.6, 1.6 + open), t(8.4, 2.6 + open)],
    seam,
    'hoodie',
  );
}

/** The hood, down: a thick roll behind the neck, its lining showing toward the face. */
function drawHood(ctx: Ctx): void {
  const { canvas, at, torso } = ctx;
  canvas.capsule(at(torso(20.8, -5.4)), at(torso(22.2, -0.8)), 2.1 * S, 1.9 * S, HOODIE, {
    group: 'hood',
  });
  canvas.decal(
    [at(torso(22.0, -1.4)), at(torso(23.8, -0.6)), at(torso(23.2, 1.0)), at(torso(21.6, 0.6))],
    RIB,
    'hood',
  );
}

/** The two yellow drawstrings hanging from the neckline, swinging behind the motion. */
function drawDrawstrings(ctx: Ctx): void {
  const { canvas, at, torso, swing, braids } = ctx;
  const sway = clamp(swing.x * 0.6 + braids.near.x * 0.25, -1.5, 1.5);
  for (const [across, length] of [
    [4.8, 4.8],
    [6.2, 4.4],
  ] as const) {
    const top = at(torso(20.0, across));
    const steps = Math.round(length * S);
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const x = top.x + sway * S * k * k;
      const y = top.y + i;
      const tip = i >= steps - 1;
      canvas.dot(x, y, tip ? ACCENT.light : i < 2 ? ACCENT.shadow : ACCENT.base);
    }
  }
}

/**
 * How much a braid's tip swings for each pixel its spring lags behind the neck: a plait swings
 * from the root, its tip travels farther than the head that pulls it (3 to 5 pixels in the
 * idle's step).
 */
const BRAID_GAIN = 3;

/** A braid hanging from its root under the cap, bent behind the motion by its spring. */
function drawBraid(ctx: Ctx, which: BraidSide): void {
  const { canvas, at, s, braids } = ctx;
  const root = onHead(BRAID_ROOTS[which], at(s.head), s.headAngle);
  const swing = clamp(braids[which].x * S * BRAID_GAIN, -6, 6) + BRAID_SPLAY[which];
  stampBraid(canvas, which, root, swing);
}

// ---------------------------------------------------------------------------------------------
// Helpers

/** A material one tone down (seams, ribs, folds). */
function shade(material: Material): Material {
  return matteOf({
    ...material,
    base: material.shadow,
    light: material.base,
    shadow: material.deep,
  });
}
