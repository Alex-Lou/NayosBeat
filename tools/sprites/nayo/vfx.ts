/**
 * Nayo's effects, in Tazz's language (Zen-Tazzer): energy that streaks, splashes and breaks off
 * into sparkles. Two colors: sound (motion trails, energy, waves, rings, speed lines, the
 * uppercut's column: the neon color, swapped by the second colorway) and strike (impact
 * flashes: gold and orange). Effects are drawn in exact palette slots, never shaded nor
 * outlined: crisp 1 px streaks and spiky shapes in a few tones, a translucent glow at their
 * edge, and loose sparkle pixels. The hottest tone (near white) is kept to a few pixels: the
 * effects read as colored light, not as white blobs. The scatter is seeded by the effect's own
 * world parameters, so a strip always draws the same and an effect that lasts several frames
 * keeps its breaks and sparkles in place.
 */

import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../../src/art/types.ts';
import type { Bounds, PixelCanvas, Point } from '../raster.ts';
import type { Effect, Tone } from '../skeleton.ts';
import { DETAIL } from './palette.ts';

const S = ART_SCALE;

/** Tone ranks, dimmest first: where two strokes of one effect cross, the brighter one shows. */
const GLOW = 0;
const DEEP = 1;
const BASE = 2;
const LIGHT = 3;
const CORE = 4;
/** The dark smoky heart of a heavy hit spark (Tazz's): it covers every other tone. */
const SMOKE = 5;
type Rank = typeof GLOW | typeof DEEP | typeof BASE | typeof LIGHT | typeof CORE | typeof SMOKE;
/** What a shape paints at a pixel: a rank, or nothing. */
type Paint = Rank | typeof NONE;
const NONE = -1;

/** Palette slot of each rank: the translucent glow, deepest to brightest, then the smoke. */
type Tones = readonly [
  glow: number,
  deep: number,
  base: number,
  light: number,
  core: number,
  smoke: number,
];

const TONES: Readonly<Record<Tone, Tones>> = {
  sound: [
    DETAIL.soundGlow,
    DETAIL.soundDeep,
    DETAIL.sound,
    DETAIL.soundLight,
    DETAIL.soundCore,
    DETAIL.soundDeep,
  ],
  strike: [
    DETAIL.strikeGlow,
    DETAIL.strikeDeep,
    DETAIL.strike,
    DETAIL.strikeLight,
    DETAIL.strikeCore,
    DETAIL.strikeSmoke,
  ],
};
/** Motion trails: the sound color over the trail's own, fainter glow. */
const TRAIL: Tones = [
  DETAIL.trailFaint,
  DETAIL.soundDeep,
  DETAIL.sound,
  DETAIL.soundLight,
  DETAIL.soundCore,
  DETAIL.soundDeep,
];
/** Floor dust: beige, lit on top; the glow rank is a grey fleck of grit. */
const DUST: Tones = [
  DETAIL.dustLight,
  DETAIL.sandDeep,
  DETAIL.sand,
  DETAIL.sandLight,
  DETAIL.sandLight,
  DETAIL.sandDeep,
];

/** Where to draw: the canvas, and the world point (character space) to cell pixel mapping. */
export interface Ink {
  readonly canvas: PixelCanvas;
  readonly at: (p: Point) => Point;
}

/** Ink for the cell whose left edge is `cellX`, anchored at the feet. */
export function inkAt(canvas: PixelCanvas, cellX: number): Ink {
  return { canvas, at: (p) => ({ x: cellX + ANCHOR.x + p.x * S, y: ANCHOR.y - p.y * S }) };
}

/** Draws a front effect (anything but a motion trail, which goes behind the body). */
export function drawEffect(ink: Ink, effect: Effect): void {
  switch (effect.kind) {
    case 'smear':
      drawSmear(ink, effect.points, effect.width);
      return;
    case 'energy':
      drawEnergy(ink, effect.center, effect.radius);
      return;
    case 'wave':
      drawWave(ink, effect.center, effect.phase);
      return;
    case 'flash':
      drawFlash(ink, effect.center, effect.radius, effect.tone);
      return;
    case 'ring':
      drawRing(
        ink,
        effect.center,
        effect.radius,
        effect.progress,
        TONES[effect.tone],
        effect.squash ?? 1,
      );
      return;
    case 'speed':
      drawSpeed(ink, effect);
      return;
    case 'column':
      drawColumn(ink, effect.base, effect.height, effect.width, effect.progress);
      return;
    case 'shards':
      drawShards(ink, effect.center, effect.radius, effect.progress, TONES[effect.tone]);
      return;
    case 'shield':
      drawShield(ink, effect.center, effect.radius, effect.progress);
      return;
    case 'dust':
      drawDust(ink, effect.x, effect.size, effect.progress);
      return;
  }
}

// ---------------------------------------------------------------------------------------------
// Motion trails

/**
 * Motion trail of a fast limb (Tazz's energy streaks). At the limb, a ")" bow wave hugs its
 * front: a crescent, thicker and brighter on a longer (faster) path, white-hot at its apex.
 * From its tips and around the limb, 1 px streaks run back along the path, 2 to 4 px apart: a
 * bright middle one the whole length, 2 px wide near the limb; streaks just outside the limb,
 * stepped and torn like Tazz's; and on fast limbs outer ones that peel off early and flare out
 * like a wake. Sparkles cluster around the limb and spray flies off the bow wave. Curved paths
 * (kicks) make concentric arcs. A trail skimming the floor rides up on it instead of being cut.
 * The bow wave stays a few pixels past the limb: the hitbox tests measure the trail too.
 */
export function drawSmear(ink: Ink, worldPoints: readonly Point[], width: number): void {
  const curve = sampleCurve(worldPoints.map(ink.at));
  const tail = worldPoints[0];
  const limb = worldPoints[worldPoints.length - 1];
  const end = curve.samples[curve.samples.length - 1];
  if (!tail || !limb || !end || curve.length < 2) return;
  const layer = new Layer(ink, TRAIL, ANCHOR.y);
  const random = randomFrom(tail.x, tail.y, limb.x, limb.y, width);
  // How fast the limb went: its path's length in world pixels, over one frame.
  const power = clamp01((curve.length / S - 14) / 30);
  // Around the limb (`width` thick): the bow wave and the streaks from its tips.
  const bow = (width * S) / 2 + 2 + power * 4;
  // Where the limb is heading: the chord over its last stretch (a hook's last tangent turns).
  const before = sampleAt(curve, 1 - Math.min(0.5, (10 * S) / curve.length));
  const lead = unit({ x: end.x - before.x, y: end.y - before.y });
  const flare = 0.2 + 0.7 * power;

  type Kind = 'middle' | 'inner' | 'tip' | 'outer';
  const streaks: { o: number; kind: Kind }[] = [{ o: 0, kind: 'middle' }];
  // A short, slow trail keeps to a few streaks: packed, they would read as hatching.
  for (const sign of [-1, 1]) {
    const inner = bow - 2 - random() * 1.5;
    if (inner > 2 && power > 0.2) streaks.push({ o: sign * inner, kind: 'inner' });
    streaks.push({ o: sign * bow, kind: 'tip' });
    const outer = random() < power * 1.4 ? 1 + Math.round(power * 2) : 0;
    for (let k = 0, o = bow; k < outer; k++) {
      o += 2.5 + random() * 2;
      streaks.push({ o: sign * o, kind: 'outer' });
    }
  }
  const widest = Math.max(...streaks.map((streak) => Math.abs(streak.o)));
  // How far across the band reaches at a sample: the wake flares out toward the tail.
  const spreadAt = (along: number): number => 1 + flare * (1 - along);
  // Riding on the floor: the band lifts where its lowest streak would sink below it.
  const floor = ANCHOR.y - 1;
  const lift = (sample: Sample): number =>
    Math.max(0, sample.y + Math.abs(sample.tx) * widest * spreadAt(sample.along) - floor);
  const settle = (p: Point, up: number): Point => {
    const y = p.y - up;
    // Whatever still sinks bounces off the floor.
    return { x: p.x, y: y > floor ? floor - (y - floor) * 0.6 : y };
  };

  for (const { o, kind } of streaks) {
    const [from = 0, to = 0, tearAt = 0, tearSize = 0, stepAt = 0, step = 0] = draws(random, 6);
    const start =
      kind === 'middle'
        ? from * 0.05
        : kind === 'outer'
          ? 0.35 + from * 0.35
          : kind === 'tip'
            ? 0.08 + from * 0.35
            : 0.2 + from * 0.3;
    // The outer streaks peel off before the limb; the others run into it or into the bow wave.
    const stop = kind === 'outer' ? 0.8 + to * 0.15 : 1;
    const tear = start + (stop - start) * (0.15 + tearAt * 0.45);
    const tearLength = kind === 'middle' ? 0 : (2 + tearSize * 3) / curve.length;
    // A 1 px step across, somewhere along it: energy, not a ruler line.
    const stepFrom = start + (stop - start) * (0.2 + stepAt * 0.5);
    const jag = kind === 'middle' ? 0 : step < 0.5 ? -1 : 1;
    const along = curve.samples.filter((sample) => sample.along >= start && sample.along <= stop);
    const points = along.map((sample) => {
      // The streaks along the limb close in toward the tail (a swoosh), the outer ones open out
      // (a wake).
      const shape = kind === 'outer' ? spreadAt(sample.along) : 0.45 + 0.55 * sample.along ** 0.8;
      const across = o * shape + (sample.along > stepFrom ? jag : 0);
      return settle(offsetOf(sample, across), lift(sample));
    });
    trace(layer, points, (heat) => {
      const s = start + (stop - start) * heat;
      if (s > tear && s < tear + tearLength) return NONE;
      if (kind === 'middle') {
        return heat > 0.62 ? CORE : heat > 0.12 ? LIGHT : heat > 0.04 ? BASE : DEEP;
      }
      if (kind === 'outer') return heat > 0.55 ? LIGHT : heat > 0.2 ? BASE : DEEP;
      return heat > 0.4 ? LIGHT : heat > 0.12 ? BASE : DEEP;
    });
    // The middle streak is 2 px wide near the limb, tapering to 1 px.
    if (kind === 'middle') {
      const twin = along
        .filter((sample) => sample.along > 0.5)
        .map((sample) => settle(offsetOf(sample, 1), lift(sample)));
      trace(layer, twin, (t) => (t > 0.45 ? LIGHT : BASE), true);
    }
  }

  // The bow wave: a crescent around the front of the limb, from one tip streak to the other.
  const apex = settle(end, lift(end));
  const thick = 1 + power * 1.6;
  const normal = { x: -end.ty, y: end.tx };
  for (let y = Math.floor(apex.y - bow - 1); y <= Math.ceil(apex.y + bow + 1); y++) {
    for (let x = Math.floor(apex.x - bow - 1); x <= Math.ceil(apex.x + bow + 1); x++) {
      const dx = x + 0.5 - apex.x;
      const dy = y + 0.5 - apex.y;
      const forward = dx * lead.x + dy * lead.y;
      if (forward < 0) continue;
      const d = Math.hypot(dx, dy);
      // 0 at the apex, 1 at the tips beside the limb.
      const k = Math.abs(dx * normal.x + dy * normal.y) / (d || 1);
      const t = thick * (1 - k * k) + 0.45;
      if (d > bow + 0.5 || d < bow + 0.5 - t) continue;
      const s = (bow + 0.5 - d) / t;
      const rank =
        k < 0.3 && s < 0.4 && power > 0.45 ? CORE : s < 0.5 ? LIGHT : s < 0.85 ? BASE : DEEP;
      layer.plot(x, y, k > 0.85 ? lower(rank) : rank);
      if (rank >= LIGHT) {
        layer.plot(x + 1, y, GLOW);
        layer.plot(x - 1, y, GLOW);
        layer.plot(x, y + 1, GLOW);
        layer.plot(x, y - 1, GLOW);
      }
    }
  }

  // Sparkles: around the bow wave, and breaking off the streaks, mostly near the limb.
  const around = 3 + Math.round(power * 6);
  for (let i = 0; i < around; i++) {
    const [angle = 0, away = 0, which = 0] = draws(random, 3);
    const direction = rotate(lead, (angle - 0.5) * 3.8);
    const d = bow + 2 + away * (3 + power * 7);
    const rank = which < 0.15 ? CORE : which < 0.65 ? LIGHT : BASE;
    layer.plot(apex.x + direction.x * d, apex.y + direction.y * d, rank);
  }
  const loose = Math.round(curve.length / 10 + 3);
  for (let i = 0; i < loose; i++) {
    const [where = 0, away = 0, which = 0, dash = 0] = draws(random, 4);
    const s = 1 - where ** 0.7 * 0.7;
    const sample = sampleAt(curve, s);
    const side = (which < 0.5 ? -1 : 1) * (widest * spreadAt(s) * (0.75 + away * 0.5) + 1.5);
    const p = settle(offsetOf(sample, side), lift(sample));
    const rank = which < 0.05 ? CORE : which < 0.5 ? LIGHT : which < 0.85 ? BASE : DEEP;
    layer.plot(p.x, p.y, rank);
    // A 2 px dash toward the tail: the sparkle streaks too.
    if (dash < 0.35) layer.plot(p.x - sample.tx, p.y - sample.ty, lower(rank));
  }
  // Spray flung ahead of a fast limb: short dashes fanning out of the bow wave.
  const spray = Math.round(power * 4.5);
  for (let i = 0; i < spray; i++) {
    const [angle = 0, distance = 0, size = 0] = draws(random, 3);
    const direction = rotate(lead, (angle - 0.5) * 2.4);
    const from = bow + 2 + distance * 3;
    const p = { x: apex.x + direction.x * from, y: apex.y + direction.y * from };
    const length = 1.5 + size * 2.5;
    trace(layer, [p, { x: p.x + direction.x * length, y: p.y + direction.y * length }], (t) =>
      t < 0.5 ? LIGHT : BASE,
    );
  }
  layer.draw();
}

// ---------------------------------------------------------------------------------------------
// Bursts

/**
 * Where a strike snaps out, in three strengths that differ by shape, not only by size (strike
 * tone, gold): a light hit is a small 5-spike tick; a heavy one is Tazz's hit spark, a jagged
 * star with a dark smoky heart, spikes yellow inside and dark at the rim, ")))" motion arcs and
 * teardrop shards; a big one (radius 6 and up: specials, launchers) adds a cyan splash ring
 * under the gold, Nayo's sound in his biggest hits. The longest spike runs along the blow, the
 * one back over the knuckles is short so they stay visible. Sound flashes are Tazz's spiky
 * cyan splash.
 */
function drawFlash(ink: Ink, center: Point, radius: number, tone: Tone): void {
  const c = pixelCenter(ink.at(center));
  const r = radius * S;
  const random = randomFrom(center.x, center.y, radius);
  if (tone === 'sound') {
    drawSplash(ink, c, r, random);
    return;
  }
  if (radius < 4.5) {
    drawTick(ink, c, r, random);
    return;
  }
  if (radius >= 6) drawSoundRing(ink, c, r, random);
  drawSpark(ink, c, r, random, radius >= 6);
}

/** A light hit: a small, sharp 5-spike tick, one sparkle cross, a few loose pixels. */
function drawTick(ink: Ink, c: Point, r: number, random: () => number): void {
  const layer = new Layer(ink, TONES.strike);
  const shape: readonly (readonly [angle: number, length: number, width: number])[] = [
    [0, 1.5, 0.4],
    [0.95, 1.2, 0.36],
    [-0.9, 1.15, 0.36],
    [2.3, 0.85, 0.32],
    [-2.35, 0.8, 0.32],
  ];
  const spikes = shape.map(([angle, length, width], i) => ({
    angle: angle + (i === 0 ? 0 : (random() - 0.5) * 0.3),
    length: r * length * (0.9 + random() * 0.2),
    width,
  }));
  starburst(layer, c, r * 0.42, spikes, [0, 0.5, 0.8]);
  layer.plot(c.x, c.y, CORE);
  layer.halo();
  const angle = 0.6 + random() * 1.6;
  cross(layer, c.x + Math.cos(angle) * r * 1.5, c.y - Math.sin(angle) * r * 1.5, 1, LIGHT);
  for (let i = 0; i < 3; i++) {
    const a = (random() - 0.5) * 3.4;
    const d = r * (1.2 + random() * 0.6);
    layer.plot(c.x + Math.cos(a) * d, c.y - Math.sin(a) * d, pick(random, [LIGHT, BASE, DEEP]));
  }
  layer.draw();
}

/**
 * A heavy hit (Tazz's hit spark): 10 or 12 jagged spikes around a dark smoky heart, yellow
 * inside, orange, dark at the rim; short ")))" arcs ahead of it (three on a big hit), three
 * teardrop shards.
 */
function drawSpark(ink: Ink, c: Point, r: number, random: () => number, big: boolean): void {
  const layer = new Layer(ink, TONES.strike);
  const count = big ? 12 : 10;
  const spacing = (2 * Math.PI) / count;
  const spikes = Array.from({ length: count }, (_, i) => {
    const angle = i * spacing + (i === 0 ? 0 : (random() - 0.5) * spacing * 0.5);
    const forward = Math.cos(angle);
    const along = forward > 0 ? 1 + forward ** 3 * 0.45 : 1 + forward * 0.42;
    const length = r * (i % 2 === 0 ? 1.4 : 0.9) * along * (0.88 + random() * 0.24);
    // The long spike along the blow is a needle, not a bar.
    return { angle, length, width: spacing * (i === 0 ? 0.3 : 0.44) };
  });
  starburst(layer, c, r * 0.42, spikes, [0, 0.55, 0.82]);
  smoke(layer, c, r * 0.3, spikes);
  // A few hot pixels at the rim of the smoke, where the fire is brightest.
  for (let i = 0; i < 2; i++) {
    const angle = random() * 2 * Math.PI;
    const d = r * 0.34 + 1;
    layer.plot(c.x + Math.cos(angle) * d, c.y - Math.sin(angle) * d, CORE);
  }
  // The ")))" of the blow: short concentric arcs ahead of the star, above its long spike.
  const forward = spikes[0]?.length ?? r;
  const arcs: readonly Rank[] = big ? [LIGHT, BASE, DEEP] : [LIGHT, BASE];
  for (const [index, bright] of arcs.entries()) {
    arc(layer, c, forward * 0.7 + index * 3.5, 0.45, 0.34 - index * 0.05, bright);
  }
  layer.halo();
  debris(layer, c, r, random, 3);
  layer.draw();
}

/**
 * The cyan under a big hit: a broken splash ring of sound around the gold star, thin rays
 * shooting between its spikes. Drawn first, so the gold covers it.
 */
function drawSoundRing(ink: Ink, c: Point, r: number, random: () => number): void {
  const layer = new Layer(ink, TONES.sound);
  const outer = r * 1.22;
  const thickness = 2.5;
  const gaps = Array.from({ length: 4 }, (_, i) => ((i + 0.3 + random() * 0.4) / 4) * 2 * Math.PI);
  layer.fill(squareAround(c, outer + 1), (x, y) => {
    const d = Math.hypot(x - c.x, y - c.y);
    if (d > outer || d < outer - thickness) return NONE;
    const angle = Math.atan2(c.y - y, x - c.x);
    if (gaps.some((gap) => Math.abs(wrap(angle - gap)) < 0.2)) return NONE;
    return d > outer - 1 ? LIGHT : d > outer - 2 ? BASE : DEEP;
  });
  for (let i = 0; i < 7; i++) {
    const angle = ((i + 0.5 + (random() - 0.5) * 0.6) / 7) * 2 * Math.PI;
    const from = outer - 1;
    const to = outer + r * (0.45 + random() * 0.4);
    trace(
      layer,
      [
        { x: c.x + Math.cos(angle) * from, y: c.y - Math.sin(angle) * from },
        { x: c.x + Math.cos(angle) * to, y: c.y - Math.sin(angle) * to },
      ],
      (t) => (t < 0.4 ? LIGHT : t < 0.75 ? BASE : DEEP),
    );
  }
  layer.halo();
  for (let i = 0; i < 5; i++) {
    const angle = random() * 2 * Math.PI;
    const d = outer + 2 + random() * r * 0.8;
    layer.plot(c.x + Math.cos(angle) * d, c.y - Math.sin(angle) * d, pick(random, [LIGHT, BASE]));
  }
  layer.draw();
}

/**
 * A sound flash (Tazz's power splash): a ragged burst of cyan wedges, light inside, dark at the
 * rim, spray lines and sparkles flying out of it.
 */
function drawSplash(ink: Ink, c: Point, r: number, random: () => number): void {
  const layer = new Layer(ink, TONES.sound);
  const count = 18;
  const spacing = (2 * Math.PI) / count;
  // Wedges of mixed lengths, long and short in turn, ragged: a splash, not a snowflake.
  const spikes = Array.from({ length: count }, (_, i) => {
    const angle = i * spacing + (random() - 0.5) * spacing * 0.6;
    const forward = Math.cos(angle);
    const along = 1 + Math.max(0, forward) ** 2 * 0.25;
    const length = r * (i % 2 === 0 ? 1.45 : 0.95) * along * (0.7 + random() * 0.5);
    return { angle, length, width: spacing * (i % 2 === 0 ? 0.55 : 0.45) };
  });
  starburst(layer, c, r * 0.55, spikes, [0, 0.55, 0.82]);
  // Light at its heart, with a few hot pixels: colored, not a white blob.
  for (let i = 0; i < 3; i++) {
    const angle = random() * 2 * Math.PI;
    const d = r * (0.35 + random() * 0.2);
    layer.plot(c.x + Math.cos(angle) * d, c.y - Math.sin(angle) * d, CORE);
  }
  layer.halo();
  // Spray: thin dashes shooting out between the spikes.
  for (let i = 0; i < 6; i++) {
    const angle = ((i + random()) / 6) * 2 * Math.PI;
    const from = r * (1.35 + random() * 0.3);
    const to = from + 2 + random() * r * 0.4;
    trace(
      layer,
      [
        { x: c.x + Math.cos(angle) * from, y: c.y - Math.sin(angle) * from },
        { x: c.x + Math.cos(angle) * to, y: c.y - Math.sin(angle) * to },
      ],
      (t) => (t < 0.5 ? LIGHT : BASE),
    );
  }
  debris(layer, c, r, random, 0);
  layer.draw();
}

/**
 * Sound gathered in the hands: a ball, light at its heart, crackling with short spikes, a glow
 * around it and sparks orbiting it.
 */
function drawEnergy(ink: Ink, center: Point, radius: number): void {
  const c = pixelCenter(ink.at(center));
  const r = radius * S;
  const layer = new Layer(ink, TONES.sound);
  const random = randomFrom(center.x, center.y, radius);
  // Stubby bumps around the ball, and a few thin crackles shooting farther out.
  const spikes = Array.from({ length: 10 }, (_, i) => {
    const crackle = i % 3 === 0;
    return {
      angle: ((i + random() * 0.6) / 10) * 2 * Math.PI,
      length: r * (crackle ? 1.9 + random() * 0.6 : 1.15 + random() * 0.25),
      width: crackle ? 0.16 : 0.34,
    };
  });
  starburst(layer, c, r * 0.9, spikes, [0.22, 0.6, 0.86]);
  // A wider, broken halo: the ball hums.
  const reach = r * 1.6 + S;
  layer.fill(squareAround(c, reach), (x, y) => {
    const d = Math.hypot(x - c.x, y - c.y);
    const angle = Math.atan2(y - c.y, x - c.x);
    return d < reach && Math.sin(angle * 3 + r) > -0.3 ? GLOW : NONE;
  });
  const sparks = 3 + Math.round(r / 3);
  for (let i = 0; i < sparks; i++) {
    const angle = random() * 2 * Math.PI;
    const distance = r * (1.7 + random() * 0.8) + S;
    const x = c.x + Math.cos(angle) * distance;
    const y = c.y + Math.sin(angle) * distance;
    if (random() < 0.35) cross(layer, x, y, 1, LIGHT);
    else layer.plot(x, y, pick(random, [LIGHT, LIGHT, BASE]));
  }
  layer.draw();
}

/**
 * Shards flying forward out of an impact (Tazz's teardrops), in a cone along the blow: pointed
 * at both ends, round near the head, bright then darker as they fly and shrink.
 */
function drawShards(ink: Ink, center: Point, radius: number, progress: number, tones: Tones): void {
  const layer = new Layer(ink, tones);
  const directions = [-70, -45, -22, -5, 12, 30, 50, 72];
  const distance = radius * (0.35 + 0.65 * progress);
  const size = (1 - progress * 0.7) * 2.2;
  const bright = progress < 0.4 ? LIGHT : progress < 0.75 ? BASE : DEEP;
  for (const [index, degrees] of directions.entries()) {
    const angle = (degrees * Math.PI) / 180;
    const reach = distance * (index % 2 === 0 ? 1 : 0.78);
    const head = { x: center.x + Math.cos(angle) * reach, y: center.y + Math.sin(angle) * reach };
    const tail = {
      x: center.x + Math.cos(angle) * (reach - size * 2.6),
      y: center.y + Math.sin(angle) * (reach - size * 2.6),
    };
    drop(layer, [ink.at(tail), ink.at(head)], size * S * 0.5, bright);
  }
  layer.halo();
  layer.draw();
}

// ---------------------------------------------------------------------------------------------
// Waves, rings, guards

/**
 * The sound wave in flight: a crackling orb pushing crescents ")))" ahead of it (thick in the
 * middle, pointed at the tips), and a comet tail of speed streaks behind it. Over its loop
 * (`phase` 0 to 1) the crescents move out by exactly one spacing, a new one swelling in at the
 * orb while the outer one fades out, and the tail's breaks scroll back a whole number of times:
 * the last frame flows into the first.
 */
function drawWave(ink: Ink, center: Point, phase: number): void {
  const c = ink.at(center);
  const layer = new Layer(ink, TONES.sound);
  // The same tail and sparkles in every frame: only the phase moves them.
  const random = randomFrom(center.x, center.y);
  const first = 6.5;
  const spacing = 3;
  // Each crescent's look depends on how far out it is (0 at the orb, 1 at the outer one).
  const crescents = [-1, 0, 1, 2, 3].map((j) => {
    const out = (j + phase) / 3;
    const swell = clamp01((out + 1 / 3) * 3);
    const fade = clamp01((4 / 3 - out) * 3);
    const size = Math.min(swell, fade);
    return {
      outer: (first + (j + phase) * spacing) * S,
      thickness: (2.4 - clamp01(out) * 1.1) * S * size,
      span: ((66 - clamp01(out) * 20) * Math.PI) / 180,
      dim: out < 0.3 ? 0 : out < 0.75 ? 1 : 2,
      fading: fade < 1 || swell < 1,
    };
  });
  const reach = (first + 4 * spacing) * S + 2;
  layer.fill({ left: c.x, right: c.x + reach, top: c.y - reach, bottom: c.y + reach }, (x, y) => {
    const d = Math.hypot(x - c.x, y - c.y);
    const tip = Math.abs(Math.atan2(y - c.y, x - c.x));
    let paint: Paint = NONE;
    for (const crescent of crescents) {
      if (crescent.thickness <= 0) continue;
      const a = tip / crescent.span;
      if (a > 1) continue;
      const thickness = crescent.thickness * (1 - a * a) + 0.6;
      if (d > crescent.outer || d < crescent.outer - thickness) continue;
      const s = (crescent.outer - d) / thickness;
      // A bright leading edge, the tips a tone dimmer.
      const top = s < 0.45 ? LIGHT : s < 0.8 ? BASE : DEEP;
      const rank = lower(top, crescent.dim + (a > 0.75 ? 1 : 0) + (crescent.fading ? 1 : 0));
      paint = Math.max(paint, rank) as Paint;
    }
    return paint;
  });
  const orb = 4.4 * S;
  // Spikes longest along the flight line; their lengths flicker twice around the loop.
  starburst(
    layer,
    c,
    orb * 0.78,
    Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * 2 * Math.PI,
      length:
        orb *
        ((i === 0 ? 1.55 : i === 4 ? 1.35 : i % 2 === 0 ? 1.2 : 1.05) +
          0.15 * Math.sin(2 * Math.PI * phase * 2 + i * 2.4)),
      width: 0.36,
    })),
    [0.25, 0.62, 0.86],
  );
  // Glow around the orb and the crescents only: between the tail's lines it would blur them.
  layer.halo();
  // The tail: lines streaming back from the orb, the middle ones longest, each broken by a gap
  // that scrolls back once or twice per loop.
  for (const offset of [-3, -2, -1, 0, 1, 2, 3]) {
    const [size = 0, start = 0, speed = 0] = draws(random, 3);
    const edge = Math.abs(offset) / 3;
    const y = c.y + offset * S * 1.1;
    const from = c.x - orb * (0.55 + edge * 0.3);
    const length = (12 - edge * 6 + size * 3) * S;
    const gap = (start + phase * (speed < 0.5 ? 1 : 2)) % 1;
    trace(
      layer,
      [
        { x: from, y },
        { x: from - length, y },
      ],
      (t) => {
        if (edge > 0.3 && Math.abs(t - gap) < 0.09) return NONE;
        if (t < 0.2) return edge < 0.4 ? LIGHT : BASE;
        if (t < 0.6) return edge < 0.7 ? BASE : DEEP;
        return t < 0.85 ? BASE : DEEP;
      },
    );
  }
  // Sparkles left behind, drifting back through the loop.
  for (let i = 0; i < 9; i++) {
    const [along = 0, across = 0, which = 0] = draws(random, 3);
    const back = (along + phase) % 1;
    const x = c.x + reach * 0.4 - back * reach * 1.4;
    const y = c.y + (across * 2 - 1) * reach * 0.75;
    if (Math.hypot(x - c.x, y - c.y) < orb * 1.6) continue;
    const rank = lower(which < 0.15 ? CORE : which < 0.6 ? LIGHT : BASE, back > 0.75 ? 1 : 0);
    if (i % 4 === 0) cross(layer, x, y, 1, rank);
    else layer.plot(x, y, rank);
  }
  layer.draw();
}

/**
 * A ring spreading from a point (`squash` flattens it on the floor): a crisp band broken into
 * arcs, cyan, its leading edge lit when born (white-hot on every other arc), thinner and darker
 * as it fades; sparkles fly off its rim. Seeded by the ring itself, so its breaks and sparkles
 * stay in place from frame to frame and it reads as one shockwave spreading. A floor ring
 * flattens as it grows rather than lose its near arc past the bottom of the cell.
 */
function drawRing(
  ink: Ink,
  center: Point,
  radius: number,
  progress: number,
  tones: Tones,
  squash: number,
): void {
  const c = ink.at(center);
  const layer = new Layer(ink, tones);
  const outer = radius * S * (0.35 + 0.65 * progress);
  const flat =
    squash < 1 ? Math.max(0.08, Math.min(squash, (CELL_SIZE - 2 - c.y) / outer)) : squash;
  // Thick and bright when born, thin and dark when fading.
  const thickness = Math.max(S, outer * 0.32 * (1 - progress));
  const random = randomFrom(center.x, center.y, radius, squash);
  // A ring flat on the floor opens wide at the back, behind the feet, and keeps its front arc
  // nearly whole; a tall one (a blow's shockwave) is open at the back, a ")" pushed forward;
  // a ring in the air breaks in four.
  const gaps = (
    squash < 0.6
      ? [
          { angle: -Math.PI / 2 + (random() - 0.5) * 0.6, width: 0.75 + progress * 0.45 },
          { angle: Math.PI * (0.25 + random() * 0.5), width: 0.08 + progress * 0.2 },
        ]
      : squash > 1.2
        ? [
            { angle: Math.PI, width: 1.25 + progress * 0.35 },
            { angle: (random() - 0.5) * 1.2, width: 0.08 + progress * 0.15 },
          ]
        : Array.from({ length: 4 }, (_, i) => ({
            angle: ((i + random() * 0.7) / 4) * 2 * Math.PI,
            width: 0.1 + random() * 0.1 + progress * 0.3,
          }))
  ).sort((a, b) => wrap(a.angle) - wrap(b.angle));
  const age = progress < 0.35 ? 0 : progress < 0.7 ? 1 : 2;
  const bands: readonly (readonly Rank[])[] = [
    [LIGHT, BASE, DEEP],
    [BASE, BASE, DEEP],
    [BASE, DEEP, DEEP],
  ];
  const band = bands[age] ?? [];
  layer.fill(
    {
      left: c.x - outer - 2,
      right: c.x + outer + 2,
      top: c.y - (outer + 2) * flat,
      bottom: c.y + (outer + 2) * flat,
    },
    (x, y) => {
      const dx = x - c.x;
      const dy = (y - c.y) / flat;
      const rho = Math.hypot(dx, dy);
      // Distance to the outer edge in pixels, as thick where the ellipse is flattened.
      const outside = ((rho - outer) * rho) / (Math.hypot(dx, dy / flat) || 1);
      const depth = -outside;
      if (outside > 1 || depth > thickness + 1) return NONE;
      const angle = Math.atan2(dy, dx);
      if (gaps.some((gap) => Math.abs(wrap(angle - gap.angle)) < gap.width)) return NONE;
      if (outside > 0 || depth > thickness) return GLOW;
      // The leading pixel: lit while fresh, white-hot only in dashes on every other arc.
      if (depth < 1 && age < 2) {
        const arc = gaps.filter((gap) => wrap(gap.angle) < angle).length;
        const dash = Math.floor((angle * outer) / 3) % 2 === 0;
        return age === 0 && arc % 2 === 0 && dash ? CORE : LIGHT;
      }
      const s = depth / thickness;
      return band[s < 0.4 ? 0 : s < 0.8 ? 1 : 2] ?? NONE;
    },
  );
  const sparkles = Math.round(outer / 5);
  for (let i = 0; i < sparkles; i++) {
    const [angle = 0, distance = 0, which = 0] = draws(random, 3);
    const a = angle * 2 * Math.PI;
    const d = outer + 2 + distance * (3 + progress * 6);
    const rank = lower(which < 0.5 ? LIGHT : BASE, age);
    layer.plot(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * flat, rank);
  }
  layer.draw();
}

/**
 * A guard facing the attacker (behind the point): three crescents "(((" of sound, split into
 * plates, bright when raised and fading with `progress`.
 */
function drawShield(ink: Ink, center: Point, radius: number, progress: number): void {
  const c = ink.at(center);
  const layer = new Layer(ink, TONES.sound);
  const outer = radius * S * (0.75 + 0.35 * progress);
  const fade = progress < 0.3 ? 0 : progress < 0.65 ? 1 : 2;
  const crescents = [0, 1, 2].map((index) => ({
    outer: outer - index * 3 * S,
    thickness: Math.max(1.5, (2.4 - index * 0.6) * S * (1 - progress * 0.5)),
    span: 1.15 - index * 0.2,
    bright: ([CORE, LIGHT, BASE] as const)[index] ?? BASE,
  }));
  layer.fill(squareAround(c, outer + 1), (x, y) => {
    const d = Math.hypot(x - c.x, y - c.y);
    // Facing back (toward the attacker), split into plates.
    const angle = Math.atan2(y - c.y, c.x - x);
    if (Math.abs(Math.abs(angle) - 0.42) < 0.07) return NONE;
    let paint: Paint = NONE;
    for (const crescent of crescents) {
      const a = Math.abs(angle) / crescent.span;
      if (a > 1) continue;
      const thickness = crescent.thickness * (1 - a * a) + 0.5;
      if (d > crescent.outer || d < crescent.outer - thickness) continue;
      const s = (crescent.outer - d) / thickness;
      const rank = lower(s > 0.45 ? crescent.bright : lower(crescent.bright), fade);
      paint = Math.max(paint, rank) as Paint;
    }
    return paint;
  });
  layer.halo();
  layer.draw();
}

// ---------------------------------------------------------------------------------------------
// Lines and columns

/**
 * Speed dashes streaming behind a fast part (Tazz's dash lines): a few sparse 1 px lines across
 * `spread`, unevenly spaced and staggered. The main one, nearest the middle, starts right at
 * `center` and runs the full length; the others start farther back, are shorter toward the
 * edges, and one breaks into dotted pixels.
 */
function drawSpeed(ink: Ink, effect: Extract<Effect, { kind: 'speed' }>): void {
  const layer = new Layer(ink, TONES[effect.tone]);
  const angle = (effect.direction * Math.PI) / 180;
  const back = { x: -Math.cos(angle), y: -Math.sin(angle) };
  const across = { x: -back.y, y: back.x };
  const { center, length, spread } = effect;
  const random = randomFrom(center.x, center.y, length, effect.direction);
  const count = Math.max(3, Math.round(spread * 0.6));
  // Uneven spacing: each gap 1 to 3 times the smallest.
  const steps = Array.from({ length: count - 1 }, () => 1 + random() * 2);
  const total = steps.reduce((sum, step) => sum + step, 0) || 1;
  let walked = 0;
  const offsets = [0, ...steps.map((step) => (walked += step))].map(
    (o) => ((o / total) * 2 - 1) * spread,
  );
  const main = offsets.reduce(
    (best, o, k) => (Math.abs(o) < Math.abs(offsets[best] ?? Infinity) ? k : best),
    0,
  );
  const dotted = (main + 1 + Math.floor(random() * (count - 1))) % count;
  const along = (from: Point, distance: number): Point => ({
    x: from.x + back.x * distance,
    y: from.y + back.y * distance,
  });
  for (const [k, offset] of offsets.entries()) {
    const edge = Math.min(1, Math.abs(offset) / spread);
    const lead = k === main;
    const [stagger = 0, size = 0] = draws(random, 2);
    const head = along(
      { x: center.x + across.x * offset, y: center.y + across.y * offset },
      lead ? 0 : length * (0.1 + stagger * 0.3),
    );
    const long = length * (lead ? 1 : (1 - edge * 0.45) * (0.5 + size * 0.4));
    trace(layer, [ink.at(head), ink.at(along(head, long))], (t, index) => {
      if (k === dotted && t > 0.4 && index % 2 === 1) return NONE;
      if (t < 0.12) return lead ? CORE : LIGHT;
      if (t < 0.4) return edge < 0.6 ? LIGHT : BASE;
      return t < 0.8 ? BASE : DEEP;
    });
  }
  // Two short dashes and a few loose pixels around the lines.
  for (let i = 0; i < 2; i++) {
    const [u = 0, v = 0] = draws(random, 2);
    const offset = (u * 2 - 1) * spread * 1.2;
    const head = along(
      { x: center.x + across.x * offset, y: center.y + across.y * offset },
      length * (0.3 + v * 0.5),
    );
    trace(layer, [ink.at(head), ink.at(along(head, 1.5))], (t) => (t < 0.5 ? BASE : DEEP));
  }
  for (let i = 0; i < count; i++) {
    const [u = 0, v = 0] = draws(random, 2);
    const offset = (u * 2.4 - 1.2) * spread;
    const p = ink.at(
      along({ x: center.x + across.x * offset, y: center.y + across.y * offset }, length * v * 0.9),
    );
    layer.plot(p.x, p.y, pick(random, [LIGHT, BASE, BASE, DEEP]));
  }
  layer.draw();
}

/**
 * The uppercut's "drop": a geyser of sound gushing up from the floor, then falling back like an
 * equalizer bar. Rising, it is a light beam over a translucent body, streaks of mixed heights
 * torn toward their tops, a ragged crown of spray spikes where it bursts open at the top, and
 * the floor splashing at its foot. Falling back (from progress 0.55), it is cut into the blocks
 * of a level meter, darkening, with its peak hanging above it a moment (the peak hold) and
 * drops raining off. Seeded by its foot, so its streaks and spray stay put from frame to frame.
 */
function drawColumn(ink: Ink, base: Point, height: number, width: number, progress: number): void {
  const bottom = ink.at(base);
  const top = height * S * (0.4 + 0.6 * progress);
  const half = (width * S) / 2;
  const layer = new Layer(ink, TONES.sound);
  const random = randomFrom(base.x, base.y);
  const widthAt = (rise: number): number => half * (1 - 0.18 * Math.min(1, rise / top));
  const dim = progress > 0.8 ? 2 : progress > 0.55 ? 1 : 0;
  const falling = progress > 0.55;
  // Falling back: the blocks of a level meter, from the top down, the cuts widening.
  const block = 6 * S;
  const decay = clamp01((progress - 0.55) / 0.45);
  const cut = falling ? 1 + Math.round(decay * 2) : 0;
  const cutAt = (rise: number): boolean =>
    cut > 0 && rise > top * (0.85 - decay) && rise % block > block - cut;

  layer.fill(
    {
      left: bottom.x - half - 1,
      right: bottom.x + half + 1,
      top: bottom.y - top,
      bottom: bottom.y,
    },
    (x, y) => {
      const rise = bottom.y - y;
      const dx = Math.abs(x - bottom.x);
      if (rise > top || dx > widthAt(rise) || cutAt(rise)) return NONE;
      // The beam: light, with a thin white-hot line low in a fresh column.
      const beam = Math.max(1.5, half * 0.2) * (1 - (rise / top) * 0.4);
      if (dx < 0.75 && rise < top * 0.4 && dim === 0) return CORE;
      if (dx < beam) return lower(rise < top * 0.75 ? LIGHT : BASE, dim);
      // The edges of the meter's blocks are lit.
      if (falling && dx > widthAt(rise) - 1) return lower(BASE, dim - 1);
      return GLOW;
    },
  );
  // Streaks of mixed heights, unevenly spread: as many draws for each one, so the narrower
  // column of a later frame keeps the same streaks.
  const sides = Math.max(1, Math.min(4, Math.round(half / 3)));
  for (let k = 0; k < 8; k++) {
    const [spot = 0, tall = 0, tear = 0] = draws(random, 3);
    if (k % 4 >= sides) continue;
    const side = k < 4 ? -1 : 1;
    const u = side * Math.min(0.95, 0.3 + (0.65 * ((k % 4) + spot * 0.6)) / Math.max(1, sides));
    const edge = Math.abs(u);
    const peak = top * (0.98 - edge * 0.3 - tall * 0.2);
    const points = Array.from({ length: Math.ceil(peak) + 1 }, (_, rise) => ({
      x: bottom.x + u * widthAt(rise),
      y: bottom.y - rise,
    }));
    const gap = 0.4 + tear * 0.35;
    trace(layer, points, (t) => {
      if (Math.abs(t - gap) < 0.04 || cutAt(t * peak)) return NONE;
      const heat = 1 - t;
      const rank =
        edge < 0.7 ? (heat > 0.35 ? LIGHT : heat > 0.1 ? BASE : DEEP) : heat > 0.4 ? BASE : DEEP;
      return lower(rank, dim);
    });
  }
  const crown = { x: bottom.x, y: bottom.y - top };
  if (!falling) {
    // The crown: thin spikes of spray bursting up and out of the top, longest straight up.
    spray(layer, crown, widthAt(top), random, 9, -Math.PI / 2, 1.3, 4 * S + half * 0.6);
    // The floor splashing at its foot, out to both sides, and a few spikes off its sides.
    if (progress < 0.5) {
      spray(layer, { x: bottom.x, y: bottom.y - 1 }, half, random, 8, -Math.PI / 2, 1.45, half);
    }
  } else {
    // The peak hold: the level's last peak, hanging over the falling bar.
    const hold = top + 3 * S + (progress - 0.55) * 14 * S;
    const w = widthAt(top);
    layer.fill(
      {
        left: bottom.x - w,
        right: bottom.x + w,
        top: bottom.y - hold - S,
        bottom: bottom.y - hold,
      },
      (x, y) => {
        if (Math.abs(x - bottom.x) > w) return NONE;
        return lower(y < bottom.y - hold - S + 1 ? LIGHT : BASE, dim - 1);
      },
    );
  }
  layer.halo();
  // Drops off the top and the sides: thrown up while it gushes, raining down as it falls back.
  for (let i = 0; i < 16; i++) {
    const [height = 0, spot = 0, which = 0, dash = 0] = draws(random, 4);
    const rise = top * (falling ? 0.3 + height * 0.75 : 0.55 + height * 0.55);
    const x = bottom.x + (spot * 2 - 1) * (widthAt(Math.min(rise, top)) + 3) * 1.5;
    if (Math.abs(x - bottom.x) < widthAt(rise) + 1 && rise < top) continue;
    const rank = lower(which < 0.1 ? CORE : which < 0.5 ? LIGHT : BASE, dim);
    layer.plot(x, bottom.y - rise, rank);
    if (dash < 0.5) layer.plot(x, bottom.y - rise + (falling ? -1 : 1), lower(rank));
  }
  layer.draw();
}

/**
 * Thin spikes of spray bursting out of `c` (cell pixels) around `facing` (radians, screen
 * angles: -PI/2 is up), `fan` to each side, the longest in the middle (`length` px), out of a
 * mouth `mouth` px wide.
 */
function spray(
  layer: Layer,
  c: Point,
  mouth: number,
  random: () => number,
  count: number,
  facing: number,
  fan: number,
  length: number,
): void {
  for (let i = 0; i < count; i++) {
    const [jitter = 0, size = 0] = draws(random, 2);
    const u = (i + 0.5 + (jitter - 0.5) * 0.6) / count;
    const turn = (u * 2 - 1) * fan;
    const angle = facing + turn;
    const from = { x: c.x + (u * 2 - 1) * mouth * 0.8, y: c.y };
    const long = length * (1 - Math.abs(turn / fan) * 0.6) * (0.55 + size * 0.6);
    trace(
      layer,
      [from, { x: from.x + Math.cos(angle) * long, y: from.y + Math.sin(angle) * long }],
      (t) => (t < 0.35 ? LIGHT : t < 0.75 ? BASE : DEEP),
    );
  }
}

// ---------------------------------------------------------------------------------------------
// Dust

/**
 * Dust kicked up from the floor at `x` (Tazz's beige puffs): a loose cloud of specks, thick
 * at the foot and lit on top, that spreads, rises and thins out with `progress`, and grit flung
 * low and wide along the floor. Specks, never solid balls: it reads as dust, not as pebbles.
 */
function drawDust(ink: Ink, x: number, size: number, progress: number): void {
  const layer = new Layer(ink, DUST);
  // The same specks from frame to frame: only how far they flew changes.
  const random = randomFrom(Math.round(x * 4), size);
  const spread = 0.7 + progress * 0.9;
  const rise = 0.6 + progress * 0.8;
  const specks = Math.round(12 + size * 8);
  // Fewer specks survive as the puff thins out.
  const kept = 1 - progress * 0.55;
  for (let i = 0; i < specks; i++) {
    // As many draws for every speck, so the others stay put when one is left out.
    const [angle = 0, distance = 0, survives = 0, tone = 0, big = 0] = draws(random, 5);
    if (survives > kept) continue;
    // Thick near the middle, a few far out: a cloud, not a disc.
    const reach = distance ** 1.3;
    const height = Math.sin(angle * Math.PI) * reach;
    const p = ink.at({
      x: x + Math.cos(angle * Math.PI) * reach * size * 1.3 * spread,
      y: 0.3 + height * size * rise,
    });
    const lit = height > 0.3 || (height > 0.12 && tone < 0.5);
    const rank = tone < 0.1 ? GLOW : lit ? (tone < 0.75 ? LIGHT : BASE) : tone < 0.55 ? BASE : DEEP;
    layer.plot(p.x, p.y, rank);
    // Bits of the thick middle are 2 px across while the puff is fresh.
    if (reach < 0.6 && big < 0.8 - progress * 0.6) {
      layer.plot(p.x + 1, p.y, rank);
      layer.plot(p.x, p.y + 1, lower(rank));
      layer.plot(p.x + 1, p.y + 1, lower(rank));
    }
  }
  const grit = 4 + Math.round(size * 1.2);
  const flight = Math.min(1, progress * 1.25);
  for (let i = 0; i < grit; i++) {
    const [side = 0, distance = 0, peak = 0, survives = 0, tone = 0] = draws(random, 5);
    if (progress > 0.85 && survives < 0.5) continue;
    const p = ink.at({
      x: x + (side < 0.5 ? -1 : 1) * size * (1 + distance * 1.6) * (0.4 + flight),
      y: 0.3 + size * (0.15 + peak * 0.5) * Math.sin(Math.PI * flight),
    });
    layer.plot(p.x, p.y, tone < 0.33 ? GLOW : tone < 0.66 ? BASE : LIGHT);
  }
  layer.draw();
}

// ---------------------------------------------------------------------------------------------
// Drawing tools

/**
 * Pixels kept clear along the left, right and top edges of the cell: neighboring cells of a
 * strip (a single row) never touch. The bottom row is free, for the near arc of floor rings.
 */
const EDGE = 4;
/** Pixel key stride: y * ROW + x. */
const ROW = 1 << 16;

/**
 * The pixels of one effect, gathered before they are drawn: where its strokes cross the brighter
 * tone wins (light adds up, it never darkens), and nothing leaves the frame's cell.
 */
class Layer {
  private readonly ranks = new Map<number, Rank>();
  private readonly ink: Ink;
  private readonly tones: Tones;
  private readonly left: number;
  private readonly right: number;
  private readonly bottom: number;

  /** `bottom` is the lowest row drawn: motion trails stop at the floor line. */
  constructor(ink: Ink, tones: Tones, bottom = CELL_SIZE - 1) {
    const cell = ink.at({ x: 0, y: 0 }).x - ANCHOR.x;
    this.ink = ink;
    this.tones = tones;
    this.left = cell + EDGE;
    this.right = cell + CELL_SIZE - 1 - EDGE;
    this.bottom = bottom;
  }

  plot(x: number, y: number, rank: Rank): void {
    const px = Math.floor(x);
    const py = Math.floor(y);
    if (px < this.left || px > this.right || py < EDGE || py > this.bottom) return;
    const key = py * ROW + px;
    if ((this.ranks.get(key) ?? NONE) < rank) this.ranks.set(key, rank);
  }

  /** Every pixel of `bounds` that `shape` (given the pixel's center) paints. */
  fill(bounds: Bounds, shape: (x: number, y: number) => Paint): void {
    for (let y = Math.floor(bounds.top); y <= Math.ceil(bounds.bottom); y++) {
      for (let x = Math.floor(bounds.left); x <= Math.ceil(bounds.right); x++) {
        const paint = shape(x + 0.5, y + 0.5);
        if (paint !== NONE) this.plot(x, y, paint);
      }
    }
  }

  /** A 1 px translucent glow around everything drawn so far. */
  halo(): void {
    for (const [key, rank] of [...this.ranks]) {
      if (rank === GLOW) continue;
      const x = key % ROW;
      const y = Math.floor(key / ROW);
      this.plot(x + 1, y, GLOW);
      this.plot(x - 1, y, GLOW);
      this.plot(x, y + 1, GLOW);
      this.plot(x, y - 1, GLOW);
    }
  }

  draw(): void {
    for (const [key, rank] of this.ranks) {
      const x = key % ROW;
      const y = Math.floor(key / ROW);
      const color = this.tones[rank];
      this.ink.canvas.ghost(() => color, { left: x, right: x, top: y, bottom: y });
    }
  }
}

/**
 * A 1 px stroke through `points` (cell pixels), its rank from `rankAt` (`t` from 0 at the first
 * point to 1 at the last, `index` counting its pixels): single-pixel steps, without the doubled
 * corners of a naive line. With `glow`, its bright stretch gets a 1 px translucent glow on each
 * side.
 */
function trace(
  layer: Layer,
  points: readonly Point[],
  rankAt: (t: number, index: number) => Paint,
  glow = false,
): void {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y);
  }
  if (total === 0) return;
  const pixels: { x: number; y: number; t: number }[] = [];
  let walked = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (!a || !b) continue;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(length * 3));
    for (let step = 0; step <= steps; step++) {
      const f = step / steps;
      const x = Math.floor(a.x + (b.x - a.x) * f);
      const y = Math.floor(a.y + (b.y - a.y) * f);
      const previous = pixels[pixels.length - 1];
      if (previous?.x === x && previous.y === y) continue;
      pixels.push({ x, y, t: (walked + length * f) / total });
    }
    walked += length;
  }
  // Drops the pixel of an L-shaped corner between two diagonal neighbors.
  const kept: typeof pixels = [];
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    const previous = kept[kept.length - 1];
    const next = pixels[i + 1];
    if (!pixel) continue;
    if (
      previous &&
      next &&
      Math.abs(previous.x - next.x) === 1 &&
      Math.abs(previous.y - next.y) === 1
    ) {
      continue;
    }
    kept.push(pixel);
  }
  for (const [index, pixel] of kept.entries()) {
    const rank = rankAt(pixel.t, index);
    if (rank === NONE) continue;
    layer.plot(pixel.x, pixel.y, rank);
    if (glow && rank >= LIGHT) {
      layer.plot(pixel.x + 1, pixel.y, GLOW);
      layer.plot(pixel.x - 1, pixel.y, GLOW);
      layer.plot(pixel.x, pixel.y + 1, GLOW);
      layer.plot(pixel.x, pixel.y - 1, GLOW);
    }
  }
}

interface Spike {
  readonly angle: number;
  readonly length: number;
  /** Half width at the base, in radians. */
  readonly width: number;
}

/**
 * A jagged star around `c`: a body of radius `body` and sharp spikes, banded by how far a pixel
 * is toward the edge in its direction (`bands`: where core, light and base end, deep beyond;
 * a core of 0 leaves the white-hot tone out). Each spike is bright along its middle and deep
 * along its rim, like Tazz's hit spark.
 */
function starburst(
  layer: Layer,
  c: Point,
  body: number,
  spikes: readonly Spike[],
  [core, light, base]: readonly [number, number, number],
): void {
  const reach = Math.max(body, ...spikes.map((spike) => spike.length));
  layer.fill(squareAround(c, reach), (x, y) => {
    const t = starEdge(c, body, spikes, x, y);
    if (t > 1) return NONE;
    return t < core ? CORE : t < light ? LIGHT : t < base ? BASE : DEEP;
  });
}

/** How far a pixel is toward the edge of a star (see starburst) in its direction: 1 on it. */
function starEdge(c: Point, body: number, spikes: readonly Spike[], x: number, y: number): number {
  const dx = x - c.x;
  const dy = c.y - y;
  const angle = Math.atan2(dy, dx);
  let edge = body * (0.93 + 0.07 * Math.sin(angle * 5 + c.x));
  for (const spike of spikes) {
    const off = Math.abs(wrap(angle - spike.angle)) / spike.width;
    if (off < 1) edge = Math.max(edge, body + (spike.length - body) * (1 - off));
  }
  return Math.hypot(dx, dy) / edge;
}

/**
 * The dark smoky heart of a hit spark (Tazz's): solid in the middle, dithered into the yellow
 * toward its rim, and pushing short dark spikes along the star's own (a smaller star).
 */
function smoke(layer: Layer, c: Point, radius: number, spikes: readonly Spike[]): void {
  const longest = Math.max(...spikes.map((spike) => spike.length));
  const inner = spikes.map((spike) => ({
    ...spike,
    length: radius * (spike.length > longest * 0.6 ? 1.7 : 1.25),
  }));
  layer.fill(squareAround(c, radius * 1.8), (x, y) => {
    const t = starEdge(c, radius, inner, x, y);
    if (t > 1) return NONE;
    if (t < 0.55) return SMOKE;
    return (Math.floor(x) + Math.floor(y)) % 2 === 0 ? SMOKE : NONE;
  });
}

/**
 * A thin ")" arc of a blow's motion, centered on `angle` (radians, 0 = forward, up positive),
 * `span` to each side: 1 px, 2 px in the middle of a bright one, dimmer at its tips.
 */
function arc(layer: Layer, c: Point, radius: number, angle: number, span: number, bright: Rank) {
  const points = (r: number, from: number, to: number): Point[] => {
    const steps = Math.max(2, Math.ceil(r * (to - from)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = angle + from + ((to - from) * i) / steps;
      return { x: c.x + Math.cos(a) * r, y: c.y - Math.sin(a) * r };
    });
  };
  trace(layer, points(radius, -span, span), (t) =>
    Math.abs(t - 0.5) < 0.3 ? bright : Math.abs(t - 0.5) < 0.42 ? lower(bright) : DEEP,
  );
  if (bright >= LIGHT) trace(layer, points(radius - 1, -span * 0.3, span * 0.3), () => BASE);
}

/**
 * What a burst flings out (Tazz's hit VFX): teardrop shards between its spikes, sparkle crosses
 * and loose pixels, around a burst of radius `r` at `c`.
 */
function debris(layer: Layer, c: Point, r: number, random: () => number, shards: number): void {
  for (let i = 0; i < shards; i++) {
    const angle = ((i + 0.5 + random() * 0.4) / shards) * 2 * Math.PI;
    const from = r * (1.15 + random() * 0.25);
    const to = from + r * (0.35 + random() * 0.2) + S;
    drop(
      layer,
      [
        { x: c.x + Math.cos(angle) * from, y: c.y - Math.sin(angle) * from },
        { x: c.x + Math.cos(angle) * to, y: c.y - Math.sin(angle) * to },
      ],
      Math.max(1, r * 0.11),
      LIGHT,
    );
  }
  const crosses = r < 9 ? 1 : 2;
  const first = random() * 2 * Math.PI;
  for (let i = 0; i < crosses; i++) {
    // On opposite sides: two crosses side by side would read as a smudge.
    const angle = first + i * Math.PI * (0.8 + random() * 0.4);
    const distance = r * (1.45 + random() * 0.4);
    cross(
      layer,
      c.x + Math.cos(angle) * distance,
      c.y - Math.sin(angle) * distance,
      r < 9 ? 1 : 2,
      LIGHT,
    );
  }
  const loose = 4 + Math.round(r / 2);
  for (let i = 0; i < loose; i++) {
    const angle = random() * 2 * Math.PI;
    const distance = r * (1.1 + random() * 0.9);
    layer.plot(
      c.x + Math.cos(angle) * distance,
      c.y - Math.sin(angle) * distance,
      pick(random, [LIGHT, LIGHT, BASE, BASE, DEEP]),
    );
  }
}

/**
 * A teardrop along `points` (cell pixels, tail first, straight or curved), `width` its half
 * width: pointed at both ends, roundest near the head, bright along the middle and deep at the
 * rim.
 */
function drop(layer: Layer, points: readonly Point[], width: number, bright: Rank): void {
  const curve = sampleCurve(points);
  if (curve.length === 0) return;
  layer.fill(boundsOf(points, width + 1), (x, y) => {
    let best = Infinity;
    let along = 0;
    for (const sample of curve.samples) {
      const d = Math.hypot(x - sample.x, y - sample.y);
      if (d < best) {
        best = d;
        along = sample.along;
      }
    }
    if (along <= 0 || along >= 1) return NONE;
    const half = width * Math.sin(Math.PI * along ** 1.6) + 0.5;
    if (best > half) return NONE;
    const s = best / half;
    return s < 0.45 && along > 0.3 ? bright : s < 0.8 ? lower(bright) : DEEP;
  });
}

/** A sparkle cross "+": a hot center and four arms `arm` px long, dimmer at their tips. */
function cross(layer: Layer, x: number, y: number, arm: number, rank: Rank): void {
  layer.plot(x, y, arm > 1 ? CORE : rank);
  for (let i = 1; i <= arm; i++) {
    const tone = i === arm ? lower(rank) : rank;
    layer.plot(x + i, y, tone);
    layer.plot(x - i, y, tone);
    layer.plot(x, y + i, tone);
    layer.plot(x, y - i, tone);
  }
}

// ---------------------------------------------------------------------------------------------
// Curves

interface Sample extends Point {
  /** Unit tangent, toward the limb. */
  readonly tx: number;
  readonly ty: number;
  /** Position along the curve, 0 at the tail, 1 at the limb. */
  readonly along: number;
}

interface Curve {
  readonly samples: readonly Sample[];
  readonly length: number;
}

/** Samples about every half pixel of a Catmull-Rom curve through `points`, tail first. */
function sampleCurve(points: readonly Point[]): Curve {
  const raw: Point[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (!p1 || !p2) continue;
    const p0 = points[i - 1] ?? p1;
    const p3 = points[i + 2] ?? p2;
    const steps = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) * 2));
    for (let step = 0; step < steps; step++) raw.push(catmullRom(p0, p1, p2, p3, step / steps));
  }
  const end = points[points.length - 1];
  if (end) raw.push(end);
  const distances = [0];
  for (let i = 1; i < raw.length; i++) {
    const a = raw[i - 1];
    const b = raw[i];
    distances.push((distances[i - 1] ?? 0) + (a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0));
  }
  const length = distances[distances.length - 1] ?? 0;
  const samples = raw.map((p, i): Sample => {
    const before = raw[Math.max(0, i - 1)] ?? p;
    const after = raw[Math.min(raw.length - 1, i + 1)] ?? p;
    const tangent = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    return {
      x: p.x,
      y: p.y,
      tx: (after.x - before.x) / tangent,
      ty: (after.y - before.y) / tangent,
      along: length > 0 ? (distances[i] ?? 0) / length : 0,
    };
  });
  return { samples, length };
}

function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a: number, b: number, c: number, d: number): number =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3);
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}

/** The sample at `along` (0 to 1); before the tail (negative), extended along its tangent. */
function sampleAt(curve: Curve, along: number): Sample {
  const { samples, length } = curve;
  const first = samples[0] ?? { x: 0, y: 0, tx: 1, ty: 0, along: 0 };
  if (along <= 0) {
    const back = -along * length;
    return { ...first, x: first.x - first.tx * back, y: first.y - first.ty * back, along };
  }
  return samples.find((sample) => sample.along >= along) ?? samples[samples.length - 1] ?? first;
}

/** A point `side` pixels across the curve from `sample`. */
function offsetOf(sample: Sample, side: number): Point {
  return { x: sample.x - sample.ty * side, y: sample.y + sample.tx * side };
}

// ---------------------------------------------------------------------------------------------

/** Deterministic random numbers in [0, 1) seeded by the effect's own parameters. */
function randomFrom(...seeds: readonly number[]): () => number {
  let state = 0x9e3779b9;
  for (const seed of seeds) {
    state = Math.imul(state ^ Math.round(seed * 16), 0x85ebca6b);
    state ^= state >>> 13;
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` random numbers at once. */
function draws(random: () => number, count: number): number[] {
  return Array.from({ length: count }, () => random());
}

/** One of `choices` at random (repeat a rank to make it likelier). */
function pick(random: () => number, choices: readonly [Rank, ...Rank[]]): Rank {
  return choices[Math.floor(random() * choices.length)] ?? choices[0];
}

/** One tone dimmer (never below the deepest one). */
function lower(rank: Rank, steps = 1): Rank {
  return steps === 0 ? rank : (Math.max(DEEP, Math.min(CORE, rank) - steps) as Rank);
}

/** An angle brought into [-PI, PI]. */
function wrap(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function unit(p: Point): Point {
  const length = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / length, y: p.y / length };
}

/** `p` turned by `angle` radians (cell pixels, y down: positive turns clockwise on screen). */
function rotate(p: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/**
 * The center of the pixel `p` falls in: a star drawn around it has 1 px needle tips, where one
 * around a pixel corner would end its spikes in 2 px bars.
 */
function pixelCenter(p: Point): Point {
  return { x: Math.floor(p.x) + 0.5, y: Math.floor(p.y) + 0.5 };
}

function squareAround(c: Point, radius: number): Bounds {
  return { left: c.x - radius, right: c.x + radius, top: c.y - radius, bottom: c.y + radius };
}

function boundsOf(points: readonly Point[], margin: number): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    left: Math.min(...xs) - margin,
    right: Math.max(...xs) + margin,
    top: Math.min(...ys) - margin,
    bottom: Math.max(...ys) + margin,
  };
}
