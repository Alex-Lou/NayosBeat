import { describe, expect, it } from 'vitest';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import {
  activeFrames,
  NAYO_V2_STRIPS,
  V2_SHEETS,
  type Span,
  type V2Sheet,
} from '../../tools/sprites/nayo/combat-v2';
import { GUARD } from '../../tools/sprites/nayo/poses/common';
import { NAYO_POSES } from '../../tools/sprites/nayo/poses/index';
import type { PixelCanvas, Point } from '../../tools/sprites/raster';
import { drawEffectsSheet, drawSheet } from '../../tools/sprites/sheet';
import { solve, type Pose } from '../../tools/sprites/skeleton';
import { extent, reach } from './strip-pixels';

/**
 * Nayo's combat v2 strips (docs/combat-v2.md §11.1, §11.2) against the spec (frame counts,
 * hitboxes: tools/sprites/nayo/combat-v2.ts) and the rules of the animation brief. They are not
 * played yet: each one starts as a placeholder.
 *
 * Strips in progress: only their frame count is checked. Take a strip off this list once it is
 * animated, and every check runs on it. A strip still made of its placeholder poses stays here.
 */
const IN_PROGRESS: ReadonlySet<V2Sheet> = new Set<V2Sheet>([]);

interface Rules {
  /** Its poses until it is animated. */
  readonly placeholder: Pose;
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
const SHAKEN = NAYO_POSES.hit[3] ?? GUARD;

const MOVE = { placeholder: GUARD, fromGuard: true, toGuard: 'exact', anchored: true } as const;

const RULES: Readonly<Record<V2Sheet, Rules>> = {
  dashForward: { ...MOVE, hop: true },
  dashBack: { ...MOVE, hop: true },
  // Chained from the jab, then from the cross.
  chainLight: { placeholder: GUARD, toGuard: 'exact', anchored: true },
  lightFinisher: { placeholder: GUARD, toGuard: 'exact', anchored: true },
  forwardLight: MOVE,
  forwardHeavy: MOVE,
  backHeavy: MOVE,
  grab: MOVE,
  // From the grab, back to the hold or out of it with a throw.
  hold: { placeholder: GUARD, anchored: true },
  pummel: { placeholder: GUARD, anchored: true },
  throwForward: { placeholder: GUARD, toGuard: 'exact', anchored: true },
  throwBack: { placeholder: GUARD, toGuard: 'exact', anchored: true },
  held: { placeholder: SHAKEN },
  // Flies off into airHit and the knockdown.
  thrownBack: { placeholder: SHAKEN },
  tech: { placeholder: GUARD, toGuard: 'exact' },
  hitHigh: { placeholder: GUARD, toGuard: 'near' },
  hitMid: { placeholder: GUARD, toGuard: 'near' },
  hitLow: { placeholder: GUARD, toGuard: 'near' },
  // Ends on his back: the knockdown follows.
  trip: { placeholder: GUARD },
  getup: { placeholder: GUARD, toGuard: 'exact' },
};

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
    const strip = NAYO_V2_STRIPS[sheet];
    const rules = RULES[sheet];
    const poses = NAYO_POSES[sheet];
    const pending = IN_PROGRESS.has(sheet);

    describe(sheet, () => {
      it(`has ${strip.frames} frames`, () => {
        expect(NAYO_SHEETS[sheet].frames).toBe(strip.frames);
        expect(poses).toHaveLength(strip.frames);
        if (strip.ticks) expect(strip.ticks).toHaveLength(strip.frames);
      });

      it('stays in progress while it is a placeholder', () => {
        const placeholder = poses.every((pose) => samePose(pose, rules.placeholder));
        if (placeholder) expect(pending, `${sheet} is not animated yet`).toBe(true);
      });

      it.skipIf(pending)('stays inside its cell, away from the edges', () => {
        const { body, fx } = layersOf(sheet);
        for (let frame = 0; frame < strip.frames; frame++) {
          const { top, bottom, left, right } = extent(body, frame);
          expect(bottom, `frame ${frame} is empty`).toBeGreaterThan(0);
          const margin = Math.min(top, left, CELL_SIZE - 1 - right);
          expect(margin, `frame ${frame}`).toBeGreaterThanOrEqual(4);
          expect(bottom, `frame ${frame} goes below the ground`).toBeLessThanOrEqual(ANCHOR.y + 2);
          if (!fx) continue;
          // Effects may go a little below the ground (dust, floor rings), not off the cell.
          const effects = extent(fx, frame);
          if (effects.bottom < 0) continue;
          const room = Math.min(effects.top, effects.left, CELL_SIZE - 1 - effects.right);
          expect(room, `effects of frame ${frame}`).toBeGreaterThanOrEqual(4);
        }
      });

      const { ticks, strike } = strip;
      if (ticks && strike) {
        it.skipIf(pending)('reaches the hitbox on its active frames, no farther', () => {
          const { body, fx } = layersOf(sheet);
          const reaching = strike.up && fx ? [body, fx] : [body];
          const frames = activeFrames(ticks, strike);
          expect(frames.length).toBeGreaterThan(0);
          // Forward; an anti-air also up to the top of the hitbox (§9.5: both ways).
          const ways: { up: boolean; band: Span; edge: number }[] = [
            { up: false, band: strike.y, edge: strike.x[1] },
          ];
          if (strike.up) ways.push({ up: true, band: strike.x, edge: strike.y[1] });
          for (const frame of frames) {
            for (const { up, band, edge } of ways) {
              const span = { from: band[0], to: band[1] };
              const drawn = reach(reaching, frame, span, up);
              const limb = reach([body], frame, span, up);
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
          for (let frame = 0; frame < strip.frames; frame++) {
            const height = (ANCHOR.y - extent(body, frame).bottom) / ART_SCALE;
            expect(height, `frame ${frame} is ${height} px off the floor`).toBeLessThanOrEqual(HOP);
          }
        });
      }
    });
  }
});
