/**
 * Shared vocabulary of Saphir's animation: the reference poses every strip starts from.
 * Character space (see skeleton.ts): feet anchor at the origin, x toward the opponent, y up, in
 * world pixels; a flat foot on the ground has its ankle at SAPHIR_BODY.ankle.
 */

import type { Point } from '../../raster.ts';
import { blend, planted as plantedOn, type Effect, type Foot, type Pose } from '../../skeleton.ts';
import { SAPHIR_BALL as BALL, SAPHIR_BODY } from '../body.ts';

export { blend, type Effect, type Foot, type Pose };

export const at = (x: number, y: number): Point => ({ x, y });

/** A foot planted at `x` on her own shoes (see skeleton.ts). */
export function planted(x: number, angle = 0): Foot {
  return plantedOn(x, angle, SAPHIR_BODY);
}

/** Motion trail of a fast limb through `points` (tail first), `width` px wide at the limb. */
export function smear(width: number, ...points: readonly (readonly [number, number])[]): Effect {
  return { kind: 'smear', width, points: points.map(([x, y]) => at(x, y)) };
}

/**
 * A foot on its ball, the heel `angle` degrees up (negative), the ball of the foot on the floor
 * at `x`: the toe box lies flat in front of it (look.ts bends the shoe there), the way a
 * kickboxer's lead foot rests.
 */
export function onBall(x: number, angle: number): Foot {
  const a = (angle * Math.PI) / 180;
  const { ankle } = SAPHIR_BODY;
  return {
    x: x - ankle * Math.sin(a) - BALL * Math.cos(a),
    y: ankle * Math.cos(a) - BALL * Math.sin(a),
    angle,
  };
}

/** A foot off the floor, its ankle at (`x`, `y`), turned `angle` degrees (positive: toes up). */
export function raised(x: number, y: number, angle = 0): Foot {
  return { x, y, angle };
}

/**
 * Where her hands rest with the torso of `pose`: clasped at the small of her back, the elbows
 * out behind her. Her signature (docs/saphir.md §9): she fights with her legs alone, the hands
 * leave her back only to grab.
 */
export function behindBack(pose: Pose): Pose {
  const t = (pose.torso * Math.PI) / 180;
  const up = { x: Math.sin(t), y: Math.cos(t) };
  const back = { x: -Math.cos(t), y: Math.sin(t) };
  const hand = (distance: number, behind: number): Point =>
    at(
      pose.hip.x + up.x * distance + back.x * behind,
      pose.hip.y + up.y * distance + back.y * behind,
    );
  return {
    ...pose,
    nearFist: hand(0.5, 3),
    farFist: hand(1, 2.5),
    bends: { ...pose.bends, nearElbow: 'back', farElbow: 'back' },
  };
}

/**
 * `pose` with one arm out of her back, its fist `reach` px from the shoulder toward `angle`
 * degrees on screen (0 toward the opponent, 90 up, -90 down), the elbow folding the natural way.
 * A shoulder swings an arm back only 60 degrees from hanging: with the torso at `t` degrees
 * (positive leaning forward), `angle` stays between -150 - t and 90 - t. Placed before the
 * pose's spin (it turns with the body) and its mirror (Pose.turned). Her big kicks free one hand
 * to balance the leg, her leaps and falls both (docs/saphir.md §9).
 */
export function armOut(pose: Pose, side: 'near' | 'far', angle: number, reach = 17): Pose {
  const t = (pose.torso * Math.PI) / 180;
  const a = (angle * Math.PI) / 180;
  const shoulder = SAPHIR_BODY.shoulder;
  const fist = at(
    pose.hip.x + Math.sin(t) * shoulder + Math.cos(a) * reach,
    pose.hip.y + Math.cos(t) * shoulder + Math.sin(a) * reach,
  );
  // The elbow folds the way a body folds it: behind an arm hanging back (the arm nearly
  // straight, or the upper arm swings past the shoulder's reach), under an arm out in front, in
  // front of an arm raised overhead. `fromDown` is the arm's angle from hanging along
  // the torso, toward its front (anatomy.ts measures the same).
  const fromDown = angle + 90 + pose.torso;
  const elbow = fromDown < 30 ? 'back' : fromDown < 150 ? 'down' : 'front';
  return side === 'near'
    ? { ...pose, nearFist: fist, bends: { ...pose.bends, nearElbow: elbow } }
    : { ...pose, farFist: fist, bends: { ...pose.bends, farElbow: elbow } };
}

/** How the arms of some frames of a strip leave her back, by frame. */
export type Arms = Readonly<Record<number, (pose: Pose) => Pose>>;

/** A strip's frames with the hands at her back, then the arms of `arms` let out. */
export function withArms(frames: readonly Pose[], arms: Arms = {}): readonly Pose[] {
  return frames.map((pose, frame) => {
    const back = behindBack(pose);
    return arms[frame]?.(back) ?? back;
  });
}

/**
 * The guard, her signature: upright and in profile, the hands clasped at the small of her back,
 * the chin up, the weight on the rear leg and the lead foot on its toes, poised like a dancer's:
 * she will fight with her legs alone (docs/saphir.md §9). Nothing like Nayo's crouched boxer or
 * Riff's brawler: no fists up, nothing to read but the feet. The torso nearly upright (2
 * degrees), the head over the back and not ahead of it, raised a little; under head.ts's 20
 * degrees, the mask is the one drawn, never turned.
 */
export const GUARD: Pose = behindBack({
  hip: at(-3, 34),
  torso: 2,
  head: -3,
  nearFoot: onBall(10, -30),
  farFoot: planted(-14),
  nearFist: at(0, 0),
  farFist: at(0, 0),
});
