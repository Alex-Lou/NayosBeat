/**
 * Shapes of the high definition effects, drawn once as textures with soft edges. Most are white
 * (alpha only), tinted by HitFx. A few are painted in their own colors and drawn as they are:
 * Nayo's burst and its fiery shards, after Tazz's hit effect in Zen-Tazzer (cel-shaded bands
 * from a hot yellow heart to a dark ember rim, a smoky core), which no tint of a white shape
 * could give. The burst is a flipbook (see HD_FLIPBOOKS): it goes away by changing shape, as
 * drawn effects do, not by fading into a ghost of itself. Pure functions: alpha and color at
 * (u, v), both from -1 to 1 across the texture.
 */

type Rgb = readonly [number, number, number];

const WHITE: Rgb = [255, 255, 255];

export interface HdShape {
  readonly width: number;
  readonly height: number;
  readonly alpha: (u: number, v: number) => number;
  /** Painted shapes only: their color at (u, v), 0 to 255 per channel. */
  readonly color?: (u: number, v: number) => Rgb;
  /**
   * Painted shapes only: the color of their clear pixels, the one of their outline, so that
   * filtering leaves no fringe of another color around them.
   */
  readonly clear?: Rgb;
  /** Samples per pixel along each axis, to smooth hard edges (1 by default). */
  readonly samples?: number;
}

/** Length of (x, y). Math.hypot is several times slower, and painting calls this a lot. */
function distance(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(from: number, to: number, value: number): number {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  // Most pixels blend nothing: no new color for them.
  if (t <= 0) return a;
  if (t >= 1) return b;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Cel-shaded bands: `first` below the first edge, then each color past its edge, barely mixed. */
function bands(value: number, first: Rgb, steps: readonly (readonly [number, Rgb])[]): Rgb {
  let color = first;
  for (const step of steps) {
    // Read by index, not destructured: this runs for every pixel.
    const edge = step[0];
    const next = step[1];
    if (value <= edge - 0.02) break;
    color =
      value >= edge + 0.02 ? next : mix(color, next, smoothstep(edge - 0.02, edge + 0.02, value));
  }
  return color;
}

/** A fixed pseudo-random number from 0 to 1 for a pair of integers. */
function hash(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Smooth value noise, about one bump per unit (smoke). */
function noise(x: number, y: number): number {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = smoothstep(0, 1, x - i);
  const fy = smoothstep(0, 1, y - j);
  const top = hash(i, j) + (hash(i + 1, j) - hash(i, j)) * fx;
  const bottom = hash(i, j + 1) + (hash(i + 1, j + 1) - hash(i, j + 1)) * fx;
  return top + (bottom - top) * fy;
}

/**
 * Nayo's strike, darkest to hottest: his gold (HitStyle.strike) between ember and yellow. The
 * hottest stays a saturated pale gold: a cream one reads as white.
 */
const FIRE = {
  rim: [0x5a, 0x12, 0x0a],
  ember: [0xd6, 0x3a, 0x0c],
  orange: [0xff, 0x78, 0x14],
  gold: [0xff, 0xa5, 0x26],
  yellow: [0xff, 0xd6, 0x3a],
  pale: [0xff, 0xe0, 0x70],
} as const satisfies Record<string, Rgb>;

/** The smoke left in the heart of the burst, a cold slate against the fire. */
const SMOKE = {
  dark: [0x1c, 0x1a, 0x2a],
  mid: [0x33, 0x33, 0x4a],
  light: [0x5c, 0x5e, 0x7c],
} as const satisfies Record<string, Rgb>;

/** A spike of a starburst: direction (radians, 0 along +u), tip distance, half width (radians). */
type Spike = readonly [angle: number, length: number, width: number];

function degrees(spikes: readonly (readonly [number, number, number])[]): readonly Spike[] {
  return spikes.map(([angle, length, width]) => [
    (angle * Math.PI) / 180,
    length,
    (width * Math.PI) / 180,
  ]);
}

/** The same spikes, longer and thinner (a starburst bursting into rays). */
function stretched(spikes: readonly Spike[], length: number, width: number): readonly Spike[] {
  return spikes.map(([angle, l, w]) => [angle, l * length, w * width]);
}

/** Angle between two directions, 0 to pi. */
function angleBetween(a: number, b: number): number {
  const delta = Math.abs(a - b) % (Math.PI * 2);
  return delta > Math.PI ? Math.PI * 2 - delta : delta;
}

/**
 * Distance from the center to the edge of a starburst in a direction. Each spike is a triangle
 * with straight sides, from its tip to the valley circle at its half width.
 */
function starRadius(spikes: readonly Spike[], valley: number, theta: number): number {
  let radius = valley;
  for (const spike of spikes) {
    const angle = spike[0];
    const length = spike[1];
    const width = spike[2];
    const delta = angleBetween(theta, angle);
    if (delta >= width) continue;
    // Polar equation of the line through (length, 0) and (valley, width).
    const side =
      (length * valley * Math.sin(width)) /
      (length * Math.sin(delta) + valley * Math.sin(width - delta));
    radius = Math.max(radius, side);
  }
  return radius;
}

const STAR_STEPS = 2048;

/** The edge of a starburst by direction, tabulated once: painting samples it a million times. */
function starburst(spikes: readonly Spike[], valley: number): (theta: number) => number {
  const turn = Math.PI * 2;
  const table = Float64Array.from({ length: STAR_STEPS + 1 }, (_, i) =>
    starRadius(spikes, valley, (i / STAR_STEPS) * turn),
  );
  return (theta) => {
    const t = ((((theta / turn) % 1) + 1) % 1) * STAR_STEPS;
    const i = Math.floor(t);
    const from = table[i] ?? valley;
    return from + ((table[i + 1] ?? valley) - from) * (t - i);
  };
}

/** 1 on the hot streak running down the middle of a spike, fading out toward its tip. */
function spikeStreak(
  spikes: readonly Spike[],
  r: number,
  theta: number,
  thickness: number,
): number {
  let streak = 0;
  for (const spike of spikes) {
    const angle = spike[0];
    const length = spike[1];
    const width = spike[2];
    const delta = angleBetween(theta, angle);
    if (delta >= width || r >= length) continue;
    const half = thickness * (1 - r / length);
    streak = Math.max(streak, smoothstep(half, half * 0.35, r * Math.sin(delta)));
  }
  return streak;
}

/** The spike a direction points into (the closest to it, for its share of its width). */
function spikeAt(spikes: readonly Spike[], theta: number): number {
  let best = 0;
  let closest = Infinity;
  for (let i = 0; i < spikes.length; i++) {
    const spike = spikes[i];
    const delta = spike ? angleBetween(theta, spike[0]) / spike[2] : Infinity;
    if (delta < closest) {
      closest = delta;
      best = i;
    }
  }
  return best;
}

/**
 * The blast: a fat, jagged starburst after Tazz's first frame, its longest spikes along the blow
 * (+u) and up ahead, its shortest toward the attacker (-u, his face up behind), so that the
 * blow's direction reads and his face stays clear.
 */
const BLAST_SPIKES = degrees([
  [0, 0.9, 16],
  [24, 0.74, 12],
  [50, 0.6, 12],
  [78, 0.7, 13],
  [106, 0.54, 9],
  [131, 0.68, 13],
  [156, 0.52, 11],
  [180, 0.6, 13],
  [-166, 0.5, 9],
  [-146, 0.54, 12],
  [-121, 0.56, 11],
  [-96, 0.7, 13],
  [-70, 0.58, 11],
  [-45, 0.8, 13],
  [-21, 0.64, 10],
]);
const BLAST_VALLEY = 0.38;
const blastRadius = starburst(BLAST_SPIKES, BLAST_VALLEY);

/** Radius of the smoky heart of the blast, ragged where the fire licks into it. */
function blastCore(theta: number): number {
  return (
    0.17 +
    0.035 * Math.sin(9 * theta + 0.5) +
    0.02 * Math.sin(5 * theta + 1.3) +
    0.015 * Math.sin(14 * theta)
  );
}

/** Smoke: mottled slate, darker at its edge where it meets the fire. */
function smoke(u: number, v: number, edge: number): Rgb {
  const puff = noise(u * 9 + 3.1, v * 9 + 1.7) * 0.65 + noise(u * 19, v * 19) * 0.35;
  const color = mix(SMOKE.mid, SMOKE.light, smoothstep(0.45, 0.85, puff));
  return mix(color, SMOKE.dark, smoothstep(0.55, 1, edge));
}

/** The blast's spikes thinning out as it breaks up, around a growing heart of smoke. */
const BREAK_SPIKES = stretched(BLAST_SPIKES, 1.04, 0.7);
const breakRadius = starburst(BREAK_SPIKES, 0.32);
const BREAK_HEART = 1.15;

/**
 * The flare the blast breaks into (Tazz's second frame): a few long thin rays along the blow
 * and one diagonal pair, short ones between them and none toward the attacker's face.
 */
const FLARE_SPIKES = degrees([
  [0, 0.92, 11],
  [-22, 0.86, 10],
  [24, 0.8, 10],
  [-50, 0.7, 8],
  [48, 0.42, 6],
  [74, 0.36, 5],
  [100, 0.6, 9],
  [130, 0.72, 9],
  [156, 0.32, 6],
  [178, 0.44, 13],
  [-156, 0.3, 7],
  [-128, 0.27, 6],
  [-100, 0.62, 10],
  [-76, 0.38, 6],
]);
const flareRadius = starburst(FLARE_SPIKES, 0.24);

/** Radius of the flare's smoky heart, and the ember lip around it. */
function flareHeart(theta: number): number {
  return 0.115 + 0.025 * Math.sin(7 * theta + 0.4) + 0.012 * Math.sin(17 * theta);
}
const FLARE_LIP = 0.045;

/** The flare's rays, last: longer, thinner, broken into dashes toward their tips. */
const EMBER_SPIKES = stretched(FLARE_SPIKES, 1.04, 0.65);
const emberRadius = starburst(EMBER_SPIKES, 0.12);
/** Where smoke wisps may still hang around the hole the burst leaves. */
const EMBER_WISPS = 0.17;

function emberHole(theta: number): number {
  return 0.05 + 0.02 * Math.sin(5 * theta + 1) + 0.012 * Math.sin(13 * theta + 2);
}

/** 1 on the dashes of an ember ray, 0 between them (its base stays whole). */
function emberDash(r: number, theta: number): number {
  const i = spikeAt(EMBER_SPIKES, theta);
  const along = r / (EMBER_SPIKES[i]?.[1] ?? 1);
  if (along < 0.42) return 1;
  const phase = along * 5.5 + hash(i, 4);
  return phase - Math.floor(phase) < 0.6 ? 1 : 0;
}

/** Wisps of smoke around the burst's hole: 1 where smoke remains. */
function emberWisp(u: number, v: number, r: number): number {
  const puff = noise(u * 11 + 7.3, v * 11 + 2.9) * (1 - r / EMBER_WISPS);
  return puff > 0.22 ? 1 : 0;
}

/**
 * Nayo's power splash, after Tazz's power hits: a spray of thin spikes, long ahead (+u), short
 * behind. Shown in his energy color behind the burst, whose far side it reaches past.
 */
const SPLASH_SPIKES: readonly Spike[] = Array.from({ length: 24 }, (_, i) => {
  const angle = ((i + 0.6 * (hash(i, 7) - 0.5)) / 24) * Math.PI * 2 - Math.PI;
  const ahead = Math.cos(angle) * 0.5 + 0.5;
  const length = (0.26 + 0.7 * ahead ** 2.2) * (0.7 + 0.3 * hash(i, 3));
  return [angle, Math.min(0.95, length), ((4 + 4 * hash(i, 5)) * Math.PI) / 180];
});
const splashRadius = starburst(SPLASH_SPIKES, 0.13);

/** Width of Nayo's neon aura, against the blast it surrounds. */
export const AURA_SCALE = 1.7;
/** The blast blurred: wider, rounder spikes. */
const auraRadius = starburst(stretched(BLAST_SPIKES, 1, 1.6), 0.42);

/**
 * The motion arc, in its texture's pixels: its apex `apex` right of the texture's center, on a
 * circle of `radius` centered to the left; it fades out `reach` above and below the axis.
 */
export const ARC = { width: 64, height: 256, apex: 22, radius: 220, reach: 118 } as const;

/** The guard's edge, in its texture's pixels: an arc of a circle centered far to the left. */
const GUARD = { center: -150, radius: 205 } as const;

/** The shock front's edge, in its texture's pixels: likewise, nearer the texture's edge. */
const FRONT = { center: -170, radius: 222 } as const;

/** Teardrop shard, in its texture's pixels: a round head leading (+u), a tail tapering behind. */
const DROP = { width: 64, height: 24, head: 20, radius: 10, tail: -30 } as const;

/** 0 on the axis of the teardrop, 1 on its outline, above 1 outside it. */
function dropDistance(u: number, v: number): number {
  const x = (u * DROP.width) / 2;
  const y = (v * DROP.height) / 2;
  if (x >= DROP.head) return distance(x - DROP.head, y) / DROP.radius;
  if (x <= DROP.tail) return 2;
  const half = DROP.radius * ((x - DROP.tail) / (DROP.head - DROP.tail)) ** 0.9;
  return Math.abs(y) / half;
}

/** A painted key of the burst: opaque inside its outline (no see-through smoke). */
function burstKey(
  inside: (r: number, theta: number, u: number, v: number) => boolean,
  color: (r: number, theta: number, u: number, v: number) => Rgb,
): HdShape {
  return {
    width: 256,
    height: 256,
    samples: 3,
    clear: FIRE.rim,
    alpha: (u, v) => (inside(distance(u, v), Math.atan2(v, u), u, v) ? 1 : 0),
    color: (u, v) => color(distance(u, v), Math.atan2(v, u), u, v),
  };
}

export const HD_SHAPES = {
  /** Round glow, hot in the middle. */
  glow: {
    width: 128,
    height: 128,
    alpha: (u, v) => clamp01(1 - distance(u, v)) ** 2.2,
  },
  /** Thin bright ring with a faint halo (shockwaves). */
  ring: {
    width: 128,
    height: 128,
    alpha: (u, v) => {
      const r = distance(u, v);
      return clamp01(
        Math.exp(-(((r - 0.86) / 0.06) ** 2)) + 0.3 * Math.exp(-(((r - 0.8) / 0.18) ** 2)),
      );
    },
  },
  /** Blade cut: thick in the middle, pointed at both ends. */
  cut: {
    width: 128,
    height: 16,
    alpha: (u, v) => {
      const half = Math.sqrt(clamp01(1 - u * u));
      const across = Math.abs(v) / Math.max(half, 1e-6);
      return across >= 1 ? 0 : (1 - across * across) * (1 - u ** 4);
    },
  },
  /** Spark streak, stretched along its motion. */
  spark: {
    width: 32,
    height: 8,
    alpha: (u, v) => clamp01(1 - distance(u, v)) ** 1.4,
  },
  /** Diamond shard. */
  shard: {
    width: 16,
    height: 16,
    alpha: (u, v) => clamp01(1 - (Math.abs(u) + Math.abs(v)) ** 3),
  },
  /** Burst, first key: the blast at its hottest, a pale gold heart where its smoke will be. */
  burstFlash: burstKey(
    (r, theta) => r < blastRadius(theta),
    (r, theta) => {
      const d = r / blastRadius(theta);
      const fire = bands(d, FIRE.pale, [
        [0.42, FIRE.yellow],
        [0.7, FIRE.gold],
        [0.84, FIRE.orange],
        [0.93, FIRE.ember],
      ]);
      const streak = spikeStreak(BLAST_SPIKES, r, theta, 0.07) * (1 - smoothstep(0.8, 0.92, d));
      return mix(fire, FIRE.pale, streak);
    },
  ),
  /** Burst: the blast (Tazz's first frame), mostly yellow, its heart already smoke. */
  burstBlast: burstKey(
    (r, theta) => r < blastRadius(theta),
    (r, theta, u, v) => {
      const core = blastCore(theta);
      if (r < core) return smoke(u, v, r / core);
      const d = r / blastRadius(theta);
      // Mostly yellow, like Tazz's: the orange and embers only near the edge.
      const fire = bands(d, FIRE.pale, [
        [0.32, FIRE.yellow],
        [0.62, FIRE.gold],
        [0.75, FIRE.orange],
        [0.86, FIRE.ember],
        [0.94, FIRE.rim],
      ]);
      const streak = spikeStreak(BLAST_SPIKES, r, theta, 0.06) * (1 - smoothstep(0.78, 0.9, d));
      // A dark seam where the fire meets the smoke.
      const seam = 1 - smoothstep(0, 0.035, r - core);
      return mix(mix(fire, FIRE.pale, streak), FIRE.rim, seam * 0.8);
    },
  ),
  /** Burst breaking up: thinner, longer spikes, cooler, around a grown heart of smoke. */
  burstBreak: burstKey(
    (r, theta) => r < Math.max(breakRadius(theta), blastCore(theta) * BREAK_HEART),
    (r, theta, u, v) => {
      const heart = blastCore(theta) * BREAK_HEART;
      if (r < heart) return smoke(u, v, r / heart);
      const d = r / breakRadius(theta);
      const fire = bands(d, FIRE.yellow, [
        [0.55, FIRE.gold],
        [0.72, FIRE.orange],
        [0.86, FIRE.ember],
        [0.95, FIRE.rim],
      ]);
      const streak = spikeStreak(BREAK_SPIKES, r, theta, 0.04) * (1 - smoothstep(0.75, 0.9, d));
      // A ragged ember lip around the smoke.
      const lip = 1 - smoothstep(0.01, 0.05, r - heart);
      return mix(mix(fire, FIRE.pale, streak), FIRE.ember, lip);
    },
  ),
  /**
   * Burst: the flare (Tazz's second frame), thin rays around an opaque heart of smoke. Thin
   * rays have no dark rim: it would take them over.
   */
  burstFlare: burstKey(
    (r, theta) => r < Math.max(flareRadius(theta), flareHeart(theta) + FLARE_LIP),
    (r, theta, u, v) => {
      const heart = flareHeart(theta);
      if (r < heart) return smoke(u, v, r / heart);
      if (r < heart + FLARE_LIP) return mix(FIRE.ember, FIRE.orange, (r - heart) / FLARE_LIP);
      const d = r / flareRadius(theta);
      const fire = bands(d, FIRE.yellow, [
        [0.32, FIRE.gold],
        [0.58, FIRE.orange],
        [0.84, FIRE.ember],
      ]);
      const streak = spikeStreak(FLARE_SPIKES, r, theta, 0.03) * (1 - smoothstep(0.7, 0.88, d));
      return mix(fire, FIRE.pale, streak);
    },
  ),
  /**
   * Burst, last key: the flare's rays broken into dashes of embers, wisps of smoke around the
   * small ragged hole the blow left.
   */
  burstEmbers: burstKey(
    (r, theta, u, v) => {
      if (r < emberHole(theta)) return false;
      if (r < emberRadius(theta) && emberDash(r, theta) > 0) return true;
      return r < EMBER_WISPS && emberWisp(u, v, r) > 0;
    },
    (r, theta, u, v) => {
      if (!(r < emberRadius(theta) && emberDash(r, theta) > 0)) {
        return smoke(u, v, 1 - r / EMBER_WISPS);
      }
      const d = r / emberRadius(theta);
      const fire = bands(d, FIRE.gold, [
        [0.4, FIRE.orange],
        [0.74, FIRE.ember],
      ]);
      const streak = spikeStreak(EMBER_SPIKES, r, theta, 0.025) * (1 - smoothstep(0.6, 0.85, d));
      return mix(fire, FIRE.yellow, streak);
    },
  ),
  /**
   * Nayo's neon aura around the blast, tinted in his energy: strongest just past its edge,
   * reaching out along its spikes (see AURA_SCALE).
   */
  aura: {
    width: 128,
    height: 128,
    alpha: (u, v) => {
      const d = (distance(u, v) * AURA_SCALE) / auraRadius(Math.atan2(v, u));
      const rim = smoothstep(0.6, 1, d) * Math.exp(-((Math.max(0, d - 1) / 0.24) ** 2));
      return clamp01(rim + 0.08 * clamp01(1 - d / AURA_SCALE));
    },
  },
  /** Nayo's power splash: thin spikes, solid at the root, thinning out to their tips. */
  splash: {
    width: 256,
    height: 256,
    samples: 2,
    alpha: (u, v) => {
      const r = distance(u, v);
      const theta = Math.atan2(v, u);
      const edge = splashRadius(theta);
      if (r >= edge) return 0;
      const length = SPLASH_SPIKES[spikeAt(SPLASH_SPIKES, theta)]?.[1] ?? 1;
      return 1 - 0.45 * smoothstep(0.6, 1, r / length);
    },
  },
  /** Painted teardrop shard of fire, flying head first (to the right). */
  drop: {
    width: DROP.width,
    height: DROP.height,
    samples: 3,
    clear: FIRE.rim,
    alpha: (u, v) => (dropDistance(u, v) < 1 ? 1 : 0),
    color: (u, v) => {
      const d = dropDistance(u, v);
      const fire = bands(d, FIRE.pale, [
        [0.28, FIRE.yellow],
        [0.5, FIRE.gold],
        [0.68, FIRE.orange],
        [0.84, FIRE.rim],
      ]);
      // The tail cools to embers.
      return mix(fire, FIRE.ember, smoothstep(0.1, -0.85, u) * smoothstep(0.84, 0.5, d) * 0.85);
    },
  },
  /**
   * Thin neon crescent bulging to the right, tapered at both ends (motion arcs): a piece of a
   * circle much wider than the texture (see ARC), so its texels all go to the line.
   */
  arc: {
    width: ARC.width,
    height: ARC.height,
    alpha: (u, v) => {
      const x = (u * ARC.width) / 2;
      const y = (v * ARC.height) / 2;
      const taper = Math.cos(Math.min(1, Math.abs(y) / ARC.reach) * (Math.PI / 2));
      const offset = Math.abs(distance(x - (ARC.apex - ARC.radius), y) - ARC.radius);
      const half = 0.8 + 3 * taper;
      const line = smoothstep(half + 1, half, offset) * taper ** 0.3;
      return clamp01(line + 0.3 * taper * Math.exp(-((offset / 7) ** 2)));
    },
  },
  /**
   * Shock front pushed along the blow (to the right): a bright crescent edge, a soft wake of
   * pressure trailing behind it, tapered at both ends.
   */
  front: {
    width: 128,
    height: 256,
    alpha: (u, v) => {
      const x = u * 64;
      const y = v * 128;
      const inside = FRONT.radius - distance(x - FRONT.center, y);
      const taper = clamp01(1 - (y / 120) ** 2) ** 0.8;
      const edge = Math.exp(-((inside / 2.6) ** 2));
      const wake = inside > 0 ? 0.55 * Math.exp(-inside / 20) : 0;
      return clamp01((edge + wake) * taper);
    },
  },
  /**
   * Energy shield bulging to the right (a guard deflecting a blow): a bright edge, a fill
   * fading inward, faint scan lines.
   */
  guard: {
    width: 128,
    height: 256,
    alpha: (u, v) => {
      // In texture pixels: the edge is an arc of a wide circle, tapered at both ends.
      const x = u * 64;
      const y = v * 128;
      const inside = GUARD.radius - distance(x - GUARD.center, y);
      const taper = clamp01(1 - (y / 118) ** 2) ** 0.7;
      const edge = Math.exp(-((inside / 2.2) ** 2));
      const fill = inside > 0 ? 0.5 * Math.exp(-inside / 16) * (0.8 + 0.2 * Math.cos(y * 0.9)) : 0;
      return clamp01((edge + fill) * taper);
    },
  },
  /** Four-pointed sparkle, a cross of fine rays around a hot point. */
  twinkle: {
    width: 64,
    height: 64,
    alpha: (u, v) => {
      const arm = (along: number, across: number): number =>
        Math.exp(-((across / (0.03 + 0.05 * (1 - Math.abs(along)))) ** 2)) *
        (1 - Math.abs(along)) ** 2.2;
      const heart = clamp01(1 - distance(u, v) / 0.3) ** 2;
      return clamp01(Math.max(arm(u, v), arm(v, u)) + heart * 0.7);
    },
  },
  /** Fast streak: a bright head (right), a fine tail fading behind it. */
  streak: {
    width: 128,
    height: 8,
    alpha: (u, v) => {
      const t = (u + 1) / 2;
      // A round head ending short of the texture's edge.
      const half = 0.85 * Math.min(1, t * 1.15) ** 1.3 * Math.sqrt(clamp01((0.96 - t) / 0.08));
      const across = Math.abs(v) / Math.max(half, 1e-6);
      return across >= 1 ? 0 : (1 - across * across) * t ** 0.7;
    },
  },
  /** Billowing puff of smoke, soft and uneven (tinted dark: the smoke a KO leaves behind). */
  puff: {
    width: 64,
    height: 64,
    alpha: (u, v) => {
      const body = clamp01(1 - distance(u, v)) ** 1.4;
      return clamp01(body * (0.5 + 0.9 * noise(u * 3.2 + 5.1, v * 3.2 + 2.3)) * 1.8);
    },
  },
} as const satisfies Record<string, HdShape>;

export type HdShapeName = keyof typeof HD_SHAPES;

/**
 * Shapes one piece shows one after the other (its keys), packed side by side into one texture
 * as its frames, each drawn as large as its texture allows and shown `scales` times the piece's
 * size: Nayo's burst, from the hot flash to the blast, breaking up, the flare and its embers
 * (Tazz's two frames, and the ones between and after them). The flare's thin rays reach a
 * little past the blast, or it would read as shrinking.
 */
export const HD_FLIPBOOKS = {
  burst: {
    keys: ['burstFlash', 'burstBlast', 'burstBreak', 'burstFlare', 'burstEmbers'],
    scales: [1, 1, 1.06, 1.14, 1.2],
  },
} as const satisfies Record<string, { keys: readonly HdShapeName[]; scales: readonly number[] }>;

/** Texture coordinate (-1 to 1) of a point of a row or column of `size` pixels. */
function coordinate(pixel: number, size: number): number {
  return (pixel / size) * 2 - 1;
}

/**
 * Size of a shape's texture drawn with less detail (0.5: half its width and height), for
 * canvases too coarse to show all of it. Small shapes keep theirs: they have little to spare.
 */
export function sizeOf(shape: HdShape, detail = 1): { width: number; height: number } {
  if (detail >= 1 || shape.width < 128 || shape.height < 128) return shape;
  return { width: Math.ceil(shape.width * detail), height: Math.ceil(shape.height * detail) };
}

/** The rows `from` to `to` (excluded) of a shape drawn at a level of detail, within its height. */
function rowsOf(shape: HdShape, detail: number, from: number, to: number): [number, number] {
  const { height } = sizeOf(shape, detail);
  const start = Math.min(height, Math.max(0, from));
  return [start, Math.min(height, Math.max(start, to))];
}

/**
 * Alpha of the pixels of rows `from` to `to` of a shape, row by row (0 to 255), and their color
 * into `rgba` if given. Supersampled shapes have hard edges: only the pixels whose corners
 * disagree are on one, and only those are sampled finely, their color too, so that a thin band
 * along an edge stays smooth.
 */
function render(
  shape: HdShape,
  detail: number,
  from: number,
  to: number,
  rgba?: Uint8ClampedArray,
): Uint8ClampedArray {
  const { width, height } = sizeOf(shape, detail);
  const [start, end] = rowsOf(shape, detail, from, to);
  const samples = shape.samples ?? 1;
  const color = rgba ? shape.color : undefined;
  const clear = shape.clear ?? WHITE;
  const alphas = new Uint8ClampedArray(width * (end - start));
  const at = (x: number, y: number): number =>
    clamp01(shape.alpha(coordinate(x, width), coordinate(y, height)));
  const corners =
    samples > 1
      ? Float64Array.from({ length: (width + 1) * (end - start + 1) }, (_, i) =>
          at(i % (width + 1), start + Math.floor(i / (width + 1))),
        )
      : undefined;
  for (let y = start; y < end; y++) {
    const row = y - start;
    for (let x = 0; x < width; x++) {
      const pixel = row * width + x;
      let alpha: number;
      let rgb = WHITE;
      const corner = corners?.[row * (width + 1) + x];
      if (
        corners &&
        corners[row * (width + 1) + x + 1] === corner &&
        corners[(row + 1) * (width + 1) + x] === corner &&
        corners[(row + 1) * (width + 1) + x + 1] === corner
      ) {
        alpha = corner ?? 0;
        if (color && alpha > 0)
          rgb = color(coordinate(x + 0.5, width), coordinate(y + 0.5, height));
      } else {
        let sum = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        for (let sy = 0; sy < samples; sy++) {
          for (let sx = 0; sx < samples; sx++) {
            const u = coordinate(x + (sx + 0.5) / samples, width);
            const v = coordinate(y + (sy + 0.5) / samples, height);
            const a = clamp01(shape.alpha(u, v));
            sum += a;
            if (color && a > 0) {
              const c = color(u, v);
              red += c[0] * a;
              green += c[1] * a;
              blue += c[2] * a;
            }
          }
        }
        alpha = sum / samples ** 2;
        if (color && sum > 0) rgb = [red / sum, green / sum, blue / sum];
      }
      alphas[pixel] = Math.round(alpha * 255);
      if (!rgba) continue;
      if (color && alpha === 0) rgb = clear;
      rgba[pixel * 4] = rgb[0];
      rgba[pixel * 4 + 1] = rgb[1];
      rgba[pixel * 4 + 2] = rgb[2];
      rgba[pixel * 4 + 3] = alphas[pixel] ?? 0;
    }
  }
  return alphas;
}

/** Alpha of every pixel of a shape, row by row (0 to 255), at a level of detail (see sizeOf). */
export function rasterize(shape: HdShape, detail = 1): Uint8ClampedArray {
  return render(shape, detail, 0, Infinity);
}

/**
 * Color and alpha of the pixels of a shape, row by row (RGBA, 0 to 255, not premultiplied), at
 * a level of detail (see sizeOf): white where the shape has no color of its own. All its rows,
 * or those from `from` to `to` (excluded), to paint it a few rows at a time.
 */
export function paint(shape: HdShape, detail = 1, from = 0, to = Infinity): Uint8ClampedArray {
  const { width } = sizeOf(shape, detail);
  const [start, end] = rowsOf(shape, detail, from, to);
  const rgba = new Uint8ClampedArray(width * (end - start) * 4);
  render(shape, detail, start, end, rgba);
  return rgba;
}
