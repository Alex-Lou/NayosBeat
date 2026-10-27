import type { FighterTemplate } from '../core/config';
import { CORE_MOVE_IDS } from '../core/move-data';
import { moveDuration } from '../core/moves';
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

  for (const id of [...STATE_CLIP_IDS, ...CORE_MOVE_IDS]) {
    for (const problem of clipProblems(art.clips[id], art)) check(false, `clip ${id}: ${problem}`);
  }
  if (art.projectile) {
    for (const problem of clipProblems(art.projectile, art)) check(false, `projectile: ${problem}`);
  }
  for (const sheet of Object.keys(art.fx ?? {})) {
    check(art.sheets[sheet] !== undefined, `effects of unknown sheet ${sheet}`);
  }

  const expected: [string, Clip, number][] = [
    ['preJump', art.clips.preJump, template.preJumpFrames],
    ['landing', art.clips.landing, template.landingFrames],
    ['knockdown', art.clips.knockdown, template.knockdownFrames],
    ...CORE_MOVE_IDS.map((id): [string, Clip, number] => [
      id,
      art.clips[id],
      moveDuration(template.moves[id]),
    ]),
  ];
  for (const [id, clip, duration] of expected) {
    const total = clipDuration(clip);
    check(total === duration, `clip ${id} lasts ${total} ticks, its gameplay lasts ${duration}`);
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
