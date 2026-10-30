import { describe, expect, it } from 'vitest';
import { anatomyIssues, jointsOf } from '../../tools/sprites/anatomy';
import type { Fighter } from '../../tools/sprites/fighter';
import { NAYO } from '../../tools/sprites/nayo/index';
import { RIFF } from '../../tools/sprites/riff/index';
import { BODY, solve, type Pose } from '../../tools/sprites/skeleton';

/** Nayo standing tall, arms hanging, feet flat under the hips. */
const STANDING: Pose = {
  hip: { x: 0, y: 41.3 },
  torso: 0,
  head: 0,
  nearFoot: { x: BODY.hipSpread, y: BODY.ankle },
  farFoot: { x: -BODY.hipSpread, y: BODY.ankle },
  nearFist: { x: 3, y: 40 },
  farFist: { x: -1, y: 40 },
};

function near(pose: Pose) {
  const skeleton = solve(pose, BODY);
  const flat = solve({ ...pose, spin: 0 }, BODY);
  return jointsOf(skeleton, skeleton.near, flat.near, pose.nearFist, pose.nearFoot);
}

/**
 * Frames past a hard limit that read right on the picture, with why: none. A frame belongs here
 * only when no pose within the limits shows what the move must show.
 */
const ALLOWED: readonly string[] = [];

describe('anatomy (tools/sprites/anatomy.ts)', () => {
  it('reads every joint the way it bends', () => {
    const standing = near(STANDING);
    expect(Math.abs(standing.ankle - 90)).toBeLessThan(10);
    expect(Math.abs(standing.knee)).toBeLessThan(30);
    expect(anatomyIssues(STANDING, BODY)).toEqual([]);
    // Toes up close the ankle, a pointed foot opens it (the ankle stays put: only the foot turns).
    const up = near({ ...STANDING, nearFoot: { x: BODY.hipSpread, y: BODY.ankle, angle: 30 } });
    const pointed = near({ ...STANDING, nearFoot: { x: BODY.hipSpread, y: BODY.ankle, angle: -40 } });
    expect(up.ankle).toBeLessThan(standing.ankle - 20);
    expect(pointed.ankle).toBeGreaterThan(standing.ankle + 30);
    // A knee bent backward, a thigh swung far behind the back, a foot folded onto the shin.
    const bent = { ...STANDING, hip: { x: 0, y: 34 } };
    const backward = { ...bent, bends: { nearKnee: 'back' } } as const;
    expect(anatomyIssues(backward, BODY)).toContainEqual(
      expect.objectContaining({ rule: 'kneeBackward', hard: true }),
    );
    const behind = { ...STANDING, nearFoot: { x: -30, y: 42 } };
    expect(near(behind).hip).toBeLessThan(-60);
    const folded = { ...STANDING, nearFoot: { x: BODY.hipSpread, y: BODY.ankle, angle: 60 } };
    expect(anatomyIssues(folded, BODY)).toContainEqual(
      expect.objectContaining({ side: 'near', rule: 'ankleBentUp', hard: true }),
    );
  });

  it('finds a fist out of reach on a spun pose too', () => {
    const far = { ...STANDING, nearFist: { x: 40, y: 62 }, spin: 90 };
    expect(anatomyIssues(far, BODY)).toContainEqual(
      expect.objectContaining({ side: 'near', rule: 'outOfReach' }),
    );
  });

  it('keeps every frame of every strip within what a body can do', () => {
    const broken: string[] = [];
    for (const fighter of [NAYO, RIFF] as readonly Fighter[]) {
      for (const sheet of Object.keys(fighter.sheets)) {
        fighter.poses(sheet)?.forEach((pose, frame) => {
          for (const issue of anatomyIssues(pose, fighter.body)) {
            const name = `${fighter.name} ${sheet} ${frame} ${issue.side} ${issue.rule}`;
            if (issue.hard && !ALLOWED.includes(name)) broken.push(`${name} ${issue.value}`);
          }
        });
      }
    }
    expect(broken).toEqual([]);
  });
});
