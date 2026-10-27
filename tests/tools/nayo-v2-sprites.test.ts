import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { ANCHOR, ART_SCALE, CELL_SIZE } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { contactDistance } from '../../src/core/hold-pair';
import { NAYO } from '../../src/data/fighters/nayo';
import { clipFrameAt } from '../../src/render/animation';
import { MOVE_IDS, type MoveData, type MoveId } from '../../src/core/move-data';
import { GUARD } from '../../tools/sprites/nayo/poses/common';
import { NAYO_POSES, V2_SHEETS, type V2Sheet } from '../../tools/sprites/nayo/poses/index';
import type { PixelCanvas, Point } from '../../tools/sprites/raster';
import { drawEffectsSheet, drawSheet } from '../../tools/sprites/sheet';
import { solve, type Pose, type Side } from '../../tools/sprites/skeleton';
import { extent, reach } from './strip-pixels';

/**
 * Nayo's combat v2 strips (docs/combat-v2.md §11.1, §11.2) against the spec (frame counts), the
 * game (the clips that play them, the moves' hitboxes) and the rules of the animation brief.
 * A new strip starts as a placeholder.
 *
 * Strips in progress: only their frame count is checked. Take a strip off this list once it is
 * animated, and every check runs on it. A strip still made of its placeholder poses stays here.
 */
const IN_PROGRESS: ReadonlySet<V2Sheet> = new Set<V2Sheet>([]);

interface Rules {
  /** Its number of frames in the spec. */
  readonly frames: number;
  /** Its poses until it is animated. */
  readonly placeholder: Pose;
  /** An anti-air: the drawing must also reach the top of the hitbox (§9.5). */
  readonly up?: true;
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
};

/** The move a strip plays, with a hitbox: the strikes and the grab. */
function strikeOf(sheet: V2Sheet): { id: MoveId; move: MoveData } | null {
  const id = MOVE_IDS.find((move) => NAYO_CLIPS[move].sheet === sheet);
  const move = id && NAYO.moves[id];
  return id && move?.hitbox ? { id, move } : null;
}

/** Frames of the strip shown while the move can hit, as its clip plays it. */
function activeFrames(id: MoveId, move: MoveData): number[] {
  const clip = NAYO_CLIPS[id];
  const frames: number[] = [];
  let tick = 0;
  clip.ticks.forEach((ticks, index) => {
    const active = tick < move.startup + move.active && tick + ticks > move.startup;
    if (active) frames.push(clip.frames[index] ?? -1);
    tick += ticks;
  });
  return frames;
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
    const pending = IN_PROGRESS.has(sheet);

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

      const strike = strikeOf(sheet);
      const hitbox = strike?.move.hitbox;
      if (strike && hitbox) {
        it.skipIf(pending)('reaches the hitbox on its active frames, no farther', () => {
          const { body, fx } = layersOf(sheet);
          const reaching = rules.up && fx ? [body, fx] : [body];
          const frames = activeFrames(strike.id, strike.move);
          expect(frames.length).toBeGreaterThan(0);
          const [x, y, width, height] = [hitbox.x, hitbox.y, hitbox.width, hitbox.height].map(toPx);
          const across = { from: x ?? 0, to: (x ?? 0) + (width ?? 0) };
          const along = { from: y ?? 0, to: (y ?? 0) + (height ?? 0) };
          // Forward; an anti-air also up to the top of the hitbox (§9.5: both ways).
          const ways = [{ up: false, span: along, edge: across.to }];
          if (rules.up) ways.push({ up: true, span: across, edge: along.to });
          for (const frame of frames) {
            for (const { up, span, edge } of ways) {
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
          for (let frame = 0; frame < rules.frames; frame++) {
            const height = (ANCHOR.y - extent(body, frame).bottom) / ART_SCALE;
            expect(height, `frame ${frame} is ${height} px off the floor`).toBeLessThanOrEqual(HOP);
          }
        });
      }
    });
  }
});

/**
 * The throw backward reads as one motion (docs/combat-v2.md §4.3, §11.1): tick by tick up to
 * the release, as the game plays the pair (the clips, the sides switching on the throw's
 * sideSwitchFrame, the bodies touching), the thrown opponent's neck sits in the thrower's
 * fists, within PAIR_GAP px of the middle of his two hands (a hand: its wrist plus 2.4 px
 * along the forearm).
 */
const PAIR_GAP = 4;
const HAND = 2.4;

describe('Nayo throwing Nayo backward', () => {
  const throwBack = NAYO.moves.throwBack;
  const distance = toPx(contactDistance(NAYO, NAYO));
  const hand = (side: Side): Point => ({
    x: side.wrist.x + side.forearm.x * HAND,
    y: side.wrist.y + side.forearm.y * HAND,
  });

  for (let tick = 0; tick < throwBack.startup; tick++) {
    it(`holds the collar in his fists on tick ${tick}`, () => {
      const thrower = NAYO_CLIPS.throwBack;
      const thrown = NAYO_CLIPS.thrownBack;
      const fists = solve(
        NAYO_POSES.throwBack[thrower.frames[clipFrameAt(thrower, tick)] ?? 0] ?? GUARD,
      );
      const body = solve(
        NAYO_POSES.thrownBack[thrown.frames[clipFrameAt(thrown, tick)] ?? 0] ?? GUARD,
      );
      const near = hand(fists.near);
      const far = hand(fists.far);
      // The thrown one faces the thrower, mirrored: in front, then behind him from the switch.
      const behind = tick >= (throwBack.sideSwitchFrame ?? Infinity);
      const neck = { x: (behind ? -distance : distance) - body.neck.x, y: body.neck.y };
      const gap = Math.hypot(neck.x - (near.x + far.x) / 2, neck.y - (near.y + far.y) / 2);
      expect(gap, `neck at (${neck.x.toFixed(1)}, ${neck.y.toFixed(1)})`).toBeLessThanOrEqual(
        PAIR_GAP,
      );
    });
  }
});
