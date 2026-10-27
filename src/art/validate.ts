import type { FighterTemplate } from '../core/config';
import { MOVE_IDS, type MoveData, type MoveId } from '../core/move-data';
import { moveDuration } from '../core/moves';
import { THROW_TECH_STUN } from '../core/rules';
import { STATE_CLIP_IDS, type Clip, type FighterArt } from './types';

/**
 * Lists every inconsistency between a fighter's art and its gameplay data. Animations must
 * follow the frame data, never the other way around: a clip that runs longer or shorter than
 * its move would show the hit at the wrong time.
 */
export function validateArt(art: FighterArt, template: FighterTemplate): string[] {
  const errors: string[] = [];
  const check = (ok: boolean, message: string): void => {
    if (!ok) errors.push(`${art.key}: ${message}`);
  };

  for (const [sheet, spec] of Object.entries(art.sheets)) {
    check(Number.isInteger(spec.frames) && spec.frames >= 1, `sheet ${sheet} needs frames >= 1`);
    check(art.urls[sheet] !== undefined, `sheet ${sheet} has no image URL`);
  }

  // Every state, and every move the fighter has (the art follows the moves that are defined).
  const moves = MOVE_IDS.flatMap((id): [MoveId, MoveData][] => {
    const move = template.moves[id];
    return move ? [[id, move]] : [];
  });
  const clips = [...STATE_CLIP_IDS, ...moves.map(([id]) => id)];
  for (const id of clips) {
    const clip = art.clips[id];
    if (!clip) {
      check(false, `clip ${id} is missing`);
      continue;
    }
    for (const problem of clipProblems(clip, art)) check(false, `clip ${id}: ${problem}`);
  }
  if (art.projectile) {
    for (const problem of clipProblems(art.projectile, art)) check(false, `projectile: ${problem}`);
  }
  for (const sheet of Object.keys(art.fx ?? {})) {
    check(art.sheets[sheet] !== undefined, `effects of unknown sheet ${sheet}`);
  }

  const expected: [string, Clip | undefined, number][] = [
    ['preJump', art.clips.preJump, template.preJumpFrames],
    ['landing', art.clips.landing, template.landingFrames],
    // The fall and the floor, then standing up: the whole knockdown.
    [
      'knockdown',
      { ...art.clips.knockdown, ticks: [...art.clips.knockdown.ticks, ...art.clips.getup.ticks] },
      template.knockdownFrames,
    ],
    ['tech', art.clips.tech, THROW_TECH_STUN],
    // Frame for frame with the thrower, up to the release.
    ['thrownBack', art.clips.thrownBack, template.moves.throwBack.startup],
    ...moves.map(([id, move]): [string, Clip | undefined, number] => [
      id,
      art.clips[id],
      moveDuration(move),
    ]),
  ];
  for (const [id, clip, duration] of expected) {
    if (!clip) continue;
    const total = clipDuration(clip);
    const what = id === 'knockdown' ? 'clips knockdown and getup last' : `clip ${id} lasts`;
    check(total === duration, `${what} ${total} ticks, its gameplay lasts ${duration}`);
  }
  return errors;
}

export function assertValidArt(art: FighterArt, template: FighterTemplate): void {
  const errors = validateArt(art, template);
  if (errors.length > 0) throw new Error(`Invalid fighter art:\n${errors.join('\n')}`);
}

export function clipDuration(clip: Clip): number {
  return clip.ticks.reduce((sum, ticks) => sum + ticks, 0);
}

function clipProblems(clip: Clip, art: FighterArt): string[] {
  const problems: string[] = [];
  const sheet = art.sheets[clip.sheet];
  if (!sheet) return [`unknown sheet ${clip.sheet}`];
  if (clip.frames.length === 0) problems.push('has no frame');
  if (clip.frames.length !== clip.ticks.length) problems.push('needs one duration per frame');
  if (clip.frames.some((frame) => !Number.isInteger(frame) || frame < 0 || frame >= sheet.frames)) {
    problems.push(`frames must be indices of sheet ${clip.sheet} (0 to ${sheet.frames - 1})`);
  }
  if (clip.ticks.some((ticks) => !Number.isInteger(ticks) || ticks < 1)) {
    problems.push('durations must be integers >= 1');
  }
  const { loopFrom } = clip;
  if (loopFrom !== undefined && !(Number.isInteger(loopFrom) && loopFrom >= 0)) {
    problems.push('loopFrom must be an integer >= 0');
  } else if (loopFrom !== undefined && loopFrom >= clip.frames.length) {
    problems.push('loopFrom must be an index of frames');
  }
  return problems;
}
