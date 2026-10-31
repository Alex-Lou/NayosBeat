import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE, type Clip, type ClipId } from '../../src/art/types';
import { NAYO } from '../../src/data/fighters/nayo';
import { CELL_MARGIN, LOWEST_ROW } from '../../tools/sprites/cell';
import { activeFrames, strikeOf, strikesOf, type ShownStrike } from '../../tools/sprites/clips';
import { GUARD } from '../../tools/sprites/nayo/poses/common';
import {
  isAnimated,
  NAYO_POSES,
  V2_SHEETS,
  type V2Sheet,
} from '../../tools/sprites/nayo/poses/index';
import type { PixelCanvas, Point } from '../../tools/sprites/raster';
import { drawEffectsSheet, drawSheet } from '../../tools/sprites/sheet';
import { solve, type Pose } from '../../tools/sprites/skeleton';
import { reachCheck } from './fighters';
import { extent, reach } from './strip-pixels';

/**
 * Nayo's combat v2 strips (docs/combat-v2.md §11.1, §11.2) and combos v3 strips
 * (docs/combos-v3.md §5) against the spec (frame counts), the game (the clips that play them,
 * the hitbox of each move that plays one: the Marteau plays the Overhand's strip) and the rules
 * of the animation brief. A new strip starts as a placeholder.
 *
 * Strips in progress: only their frame count is checked. A strip is in progress while it is on
 * this list, or while its pose file says it is not animated yet (`ANIMATED = false`, the
 * combos v3 strips); once it is animated, every check runs on it. A strip still made of its
 * placeholder poses stays in progress.
 */
const IN_PROGRESS: ReadonlySet<V2Sheet> = new Set<V2Sheet>([]);

interface Rules {
  /** Its number of frames in the spec. */
  readonly frames: number;
  /** Its poses until it is animated. */
  readonly placeholder: Pose;
  /**
   * An anti-air: the drawing must also reach the top of the hitbox (§9.5). For a strike
   * measured on its effects, they must fill the hitbox up to its top too.
   */
  readonly up?: true;
  /**
   * Its front effects strike, not the body (the Mégabasse's speaker rings): they are what must
   * reach the hitbox's far edge, and no farther; the body is not measured.
   */
  readonly reachFrom?: 'fx';
  /** A move started from neutral: the first frame carries on from the guard. */
  readonly fromGuard?: true;
  /**
   * 'exact': idle takes over right after the last frame, which is the guard. 'near': a
   * reaction's last frame, held through the stun, one small step from the guard.
   */
  readonly toGuard?: 'exact' | 'near';
  /** One of his moves: the game moves him (dashes, steps), the poses stay anchored. */
  readonly anchored?: true;
  /** A dash along the floor: at most a small hop off it. */
  readonly hop?: true;
}

/** The victims' placeholder: the shaken guard a standing hit holds. */
const SHAKEN = NAYO_POSES.hitHigh[4] ?? GUARD;

const MOVE = { placeholder: GUARD, fromGuard: true, toGuard: 'exact', anchored: true } as const;

const RULES: Readonly<Record<V2Sheet, Rules>> = {
  dashForward: { ...MOVE, frames: 6, hop: true },
  dashBack: { ...MOVE, frames: 6, hop: true },
  // Chained from the jab, then from the cross.
  chainLight: { frames: 6, placeholder: GUARD, toGuard: 'exact', anchored: true },
  lightFinisher: { frames: 7, placeholder: GUARD, toGuard: 'exact', anchored: true },
  forwardLight: { ...MOVE, frames: 6 },
  forwardHeavy: { ...MOVE, frames: 9 },
  backHeavy: { ...MOVE, frames: 7, up: true },
  grab: { ...MOVE, frames: 6 },
  // From the grab, back to the hold or out of it with a throw.
  hold: { frames: 2, placeholder: GUARD, anchored: true },
  pummel: { frames: 4, placeholder: GUARD, anchored: true },
  throwForward: { frames: 8, placeholder: GUARD, toGuard: 'exact', anchored: true },
  throwBack: { frames: 9, placeholder: GUARD, toGuard: 'exact', anchored: true },
  held: { frames: 2, placeholder: SHAKEN },
  // Flies off into airHit and the knockdown.
  thrownBack: { frames: 4, placeholder: SHAKEN },
  tech: { frames: 4, placeholder: GUARD, toGuard: 'exact' },
  hitHigh: { frames: 5, placeholder: GUARD, toGuard: 'near' },
  hitMid: { frames: 5, placeholder: GUARD, toGuard: 'near' },
  hitLow: { frames: 5, placeholder: GUARD, toGuard: 'near' },
  // Ends on his back: the knockdown follows.
  trip: { frames: 4, placeholder: GUARD },
  getup: { frames: 5, placeholder: GUARD, toGuard: 'exact' },
  // Combos v3 (docs/combos-v3.md §5), drawn ahead of their gameplay. The Crochet au foie
  // follows the Crochet (from its last frames' body), the Remontant chassé the Cross, the
  // Crochet or the Double direct (backHeavy's frames 2-6 after a call step: an anti-air).
  chainHeavy: { frames: 7, placeholder: GUARD, toGuard: 'exact', anchored: true },
  chainLaunch: { frames: 7, placeholder: GUARD, up: true, toGuard: 'exact', anchored: true },
  // The Mégabasse starts from the guard's stance on the cue, held through the freeze flash; its
  // speaker rings strike, filling the hitbox forward and up.
  super: {
    frames: 10,
    placeholder: GUARD,
    fromGuard: true,
    up: true,
    reachFrom: 'fx',
    toGuard: 'exact',
    anchored: true,
  },
};

/** The moves that strike with each strip (the strikes and the grab), each with its own box. */
const STRIKES = strikesOf(NAYO_CLIPS, NAYO);

/** The strike a strip shows, with a hitbox (the strikes and the grab). */
const strikeOfStrip = (sheet: V2Sheet) => strikeOf(NAYO_CLIPS, NAYO, sheet);

/** The reach checks of a strip: one per move of the game that plays it, each with its own box. */
function reachChecksOf(sheet: V2Sheet): { name: string; strike: ShownStrike }[] {
  return STRIKES.filter((strike) => strike.sheet === sheet).map((strike) => ({
    name: reachCheck(strike.id),
    strike,
  }));
}

/**
 * §9.5: on every active frame, inside the hitbox's band, the striking limb (or its trail)
 * reaches the far edge of the hitbox, at most this short of it or this far past it. An impact
 * flash may burst past the point of contact. An anti-air's hitbox also covers what its rising
 * arc sweeps above and in front of the fist: there the front effects count toward the reach.
 */
const REACH_SHORT = 3;
const REACH_PAST = 4;
/** The first frame of a move: the body (hips, neck, head) and the feet barely move. */
const START_BODY = 8;
const START_FEET = 6;
/** The last frame: the guard ('exact'), or one small step from it, the feet on its marks. */
const END_EXACT = 2;
const END_NEAR = 6;
const END_NEAR_FEET = 2;
/** Rule 4b: a lean or a small step of the hips, never the whole body sliding. */
const ANCHOR_HIP = 6;
/** The highest a dash may hop off the floor, in world pixels. */
const HOP = 8;

interface Layers {
  readonly body: PixelCanvas;
  readonly fx: PixelCanvas | undefined;
}

const canvases = new Map<V2Sheet, Layers>();
function layersOf(sheet: V2Sheet): Layers {
  const cached = canvases.get(sheet);
  if (cached) return cached;
  const layers = { body: drawSheet(sheet), fx: drawEffectsSheet(sheet) };
  canvases.set(sheet, layers);
  return layers;
}

type Part = 'body' | 'limb' | 'foot';
interface Joint {
  readonly name: string;
  readonly part: Part;
  /** Distance to the same joint in the guard, in world pixels. */
  readonly off: number;
}

const FEET = ['ankle', 'heel', 'toe'] as const;
const LIMBS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', ...FEET] as const;

function jointsOf(pose: Pose): { name: string; part: Part; at: Point }[] {
  const skeleton = solve(pose);
  return [
    { name: 'hips', part: 'body', at: skeleton.hip },
    { name: 'neck', part: 'body', at: skeleton.neck },
    { name: 'head', part: 'body', at: skeleton.head },
    ...(['near', 'far'] as const).flatMap((side) =>
      LIMBS.map((joint) => ({
        name: `${side} ${joint}`,
        part: (FEET as readonly string[]).includes(joint) ? ('foot' as const) : ('limb' as const),
        at: skeleton[side][joint],
      })),
    ),
  ];
}

const GUARD_JOINTS = jointsOf(GUARD);

/** Every joint of `pose`, with how far it is from the guard. */
function offGuard(pose: Pose): Joint[] {
  return jointsOf(pose).map(({ name, part, at }, index) => {
    const guard = GUARD_JOINTS[index]?.at ?? at;
    return { name, part, off: Math.hypot(at.x - guard.x, at.y - guard.y) };
  });
}

/** The joint farthest from the guard, among the joints of `parts` (all of them by default). */
function farthest(joints: readonly Joint[], ...parts: readonly Part[]): Joint {
  const among = parts.length === 0 ? joints : joints.filter((joint) => parts.includes(joint.part));
  return among.reduce((worst, joint) => (joint.off > worst.off ? joint : worst));
}

const offBy = (where: string, joint: Joint): string =>
  `${where}: ${joint.name} ${joint.off.toFixed(1)} px off the guard`;

const samePose = (a: Pose, b: Pose): boolean => JSON.stringify(a) === JSON.stringify(b);

// Named so that `-t <sheet>` picks one strip's tests (not "strips": `-t trip` would match it).
describe('Nayo combat v2', () => {
  for (const sheet of V2_SHEETS) {
    const rules = RULES[sheet];
    const poses = NAYO_POSES[sheet];
    const pending = IN_PROGRESS.has(sheet) || !isAnimated(sheet);

    describe(sheet, () => {
      it(`has ${rules.frames} frames`, () => {
        expect(NAYO_SHEETS[sheet].frames).toBe(rules.frames);
        expect(poses).toHaveLength(rules.frames);
      });

      it('stays in progress while it is a placeholder', () => {
        const placeholder = poses.every((pose) => samePose(pose, rules.placeholder));
        if (placeholder) expect(pending, `${sheet} is not animated yet`).toBe(true);
      });

      it.skipIf(pending)('stays inside its cell, away from the edges', () => {
        const { body, fx } = layersOf(sheet);
        for (let frame = 0; frame < rules.frames; frame++) {
          const { top, bottom, left, right } = extent(body, frame);
          expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
          const margin = Math.min(top, left, CELL_SIZE - 1 - right);
          expect(margin, `frame ${frame}`).toBeGreaterThanOrEqual(CELL_MARGIN);
          expect(bottom, `frame ${frame} goes below the ground`).toBeLessThanOrEqual(LOWEST_ROW);
          if (!fx) continue;
          // Effects may go a little below the ground (dust, floor rings), not off the cell.
          const effects = extent(fx, frame);
          if (effects.bottom < 0) continue;
          const room = Math.min(effects.top, effects.left, CELL_SIZE - 1 - effects.right);
          expect(room, `effects of frame ${frame}`).toBeGreaterThanOrEqual(CELL_MARGIN);
        }
      });

      for (const { name, strike } of reachChecksOf(sheet)) {
        it.skipIf(pending)(name, () => {
          const { body, fx } = layersOf(sheet);
          const fromFx = rules.reachFrom === 'fx';
          if (fromFx && !fx) throw new Error(`${sheet} strikes with its effects: it draws none`);
          // What may reach the edge, and what must not go past it.
          const striking = fromFx && fx ? [fx] : [body];
          const reaching = fromFx ? striking : rules.up && fx ? [body, fx] : [body];
          const { frames } = strike;
          expect(frames.length).toBeGreaterThan(0);
          const { x, y, width, height } = strike.box;
          const across = { from: x, to: x + width };
          const along = { from: y, to: y + height };
          // Forward; an anti-air also up to the top of the hitbox (§9.5: both ways).
          const ways = [{ up: false, span: along, edge: across.to }];
          if (rules.up) ways.push({ up: true, span: across, edge: along.to });
          for (const frame of frames) {
            for (const { up, span, edge } of ways) {
              const drawn = reach(reaching, frame, span, up);
              const limb = reach(striking, frame, span, up);
              const where = `frame ${frame} ${up ? 'up' : 'forward'}, edge ${edge}`;
              expect(drawn, `${where}: reaches ${drawn}`).toBeGreaterThanOrEqual(
                edge - REACH_SHORT,
              );
              expect(limb, `${where}: limb at ${limb}`).toBeLessThanOrEqual(edge + REACH_PAST);
            }
          }
        });
      }

      if (rules.fromGuard) {
        it.skipIf(pending)('starts from the guard', () => {
          const joints = offGuard(poses[0] ?? GUARD);
          const body = farthest(joints, 'body');
          const feet = farthest(joints, 'foot');
          expect(body.off, offBy('frame 0', body)).toBeLessThanOrEqual(START_BODY);
          expect(feet.off, offBy('frame 0', feet)).toBeLessThanOrEqual(START_FEET);
        });
      }

      const { toGuard } = rules;
      if (toGuard) {
        it.skipIf(pending)(`ends ${toGuard === 'exact' ? 'on' : 'next to'} the guard`, () => {
          const last = poses[poses.length - 1] ?? GUARD;
          const joints = offGuard(last);
          const worst = farthest(joints);
          if (toGuard === 'exact') {
            expect(worst.off, offBy('last frame', worst)).toBeLessThanOrEqual(END_EXACT);
            expect([last.nearHand ?? 'fist', last.farHand ?? 'fist']).toEqual(['fist', 'fist']);
          } else {
            const feet = farthest(joints, 'foot');
            expect(worst.off, offBy('last frame', worst)).toBeLessThanOrEqual(END_NEAR);
            expect(feet.off, offBy('last frame', feet)).toBeLessThanOrEqual(END_NEAR_FEET);
          }
        });
      }

      if (rules.anchored) {
        it.skipIf(pending)('stays anchored: the game moves him', () => {
          poses.forEach((pose, frame) => {
            const off = pose.hip.x - GUARD.hip.x;
            const message = `frame ${frame}: hips ${off.toFixed(1)} px off the guard's`;
            expect(Math.abs(off), message).toBeLessThanOrEqual(ANCHOR_HIP);
          });
        });
      }

      if (rules.hop) {
        it.skipIf(pending)('stays on the floor, a small hop at most', () => {
          const { body } = layersOf(sheet);
          for (let frame = 0; frame < rules.frames; frame++) {
            const height = (ANCHOR.y - extent(body, frame).bottom) / ART_SCALE;
            expect(height, `frame ${frame} is ${height} px off the floor`).toBeLessThanOrEqual(HOP);
          }
        });
      }
    });
  }
});

// The throw backward read as one motion, Nayo throwing Nayo: tests/tools/hold-pairs.test.ts,
// which plays it for each fighter throwing each one, with the hold and the pummels.

/**
 * The combos v3 strips' timing (docs/combos-v3.md §5): each clip lasts its move (S + A + R) in
 * §5's ticks, its active frames come on at the move's startup and are the ones §5 marks, and its
 * hitbox is §2.2's.
 */
const TIMING_SPEC = {
  chainHeavy: {
    ticks: [3, 3, 2, 3, 6, 6, 5],
    frames: [8, 3, 17],
    active: [3],
    box: { x: [8, 46], y: [24, 44] },
  },
  chainLaunch: {
    ticks: [2, 3, 2, 4, 5, 6, 6],
    frames: [7, 4, 17],
    active: [3],
    box: { x: [4, 30], y: [58, 104] },
  },
  // 12 entries: frames 2 and 3 played twice, the blows on action frames 2, 8 and 14.
  super: {
    ticks: [1, 1, 3, 3, 3, 3, 3, 6, 7, 7, 5, 5],
    frames: [2, 15, 30],
    active: [2, 3, 4],
    box: { x: [4, 60], y: [0, 90] },
  },
} as const satisfies Readonly<Partial<Record<V2Sheet, unknown>>>;

/** The clip and the strike of a combos v3 strip. */
function playOf(sheet: keyof typeof TIMING_SPEC): { clip: Clip; strike: ShownStrike } {
  const clip: Clip | undefined = NAYO_CLIPS[sheet as ClipId];
  const strike = strikeOfStrip(sheet);
  if (!clip || !strike) throw new Error(`${sheet} has no clip or no strike`);
  return { clip, strike };
}

describe('Nayo combos v3 timing', () => {
  for (const [sheet, spec] of Object.entries(TIMING_SPEC)) {
    const [startup, active, recovery] = spec.frames;
    const strip = sheet as keyof typeof TIMING_SPEC;

    it(`${sheet}: its clip plays the strip in §5's ticks`, () => {
      const { clip, strike } = playOf(strip);
      expect(clip.sheet).toBe(sheet);
      expect(clip.ticks).toEqual(spec.ticks);
      expect(clip.frames).toHaveLength(spec.ticks.length);
      expect([strike.move.startup, strike.move.active]).toEqual([startup, active]);
      const total = clip.ticks.reduce((sum, ticks) => sum + ticks, 0);
      expect(total).toBe(startup + active + recovery);
      // Every frame of the strip shows, none outside it.
      const frames = NAYO_SHEETS[strip].frames;
      expect(new Set(clip.frames)).toEqual(new Set(Array.from({ length: frames }, (_, f) => f)));
    });

    it(`${sheet}: its active frames are §5's, from its startup`, () => {
      const { clip, strike } = playOf(strip);
      const first = activeFrames(clip, strike.move)[0];
      const index = clip.frames.indexOf(first ?? -1);
      const before = clip.ticks.slice(0, index).reduce((sum, ticks) => sum + ticks, 0);
      expect(before).toBe(startup);
      expect(strike.frames).toEqual(spec.active);
      const { x, y, width, height } = strike.box;
      expect({ x: [x, x + width], y: [y, y + height] }).toEqual(spec.box);
    });
  }
});
