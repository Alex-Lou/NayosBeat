/**
 * Each fighter's gameplay as the tools measure its strips against it: its moves (hitboxes,
 * hurtboxes, pushboxes) and its clips (which frames show when).
 */

import { NAYO_CLIPS } from '../../src/art/nayo/clips.ts';
import { RIFF_CLIPS } from '../../src/art/riff/clips.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import { NAYO } from '../../src/data/fighters/nayo.ts';
import { RIFF } from '../../src/data/fighters/riff.ts';
import type { Clips } from './clips.ts';
import type { Fighter } from './fighter.ts';

export interface FrameData {
  readonly template: FighterTemplate;
  readonly clips: Clips;
}

const FRAME_DATA: Readonly<Record<string, FrameData>> = {
  nayo: { template: NAYO, clips: NAYO_CLIPS },
  riff: { template: RIFF, clips: RIFF_CLIPS },
};

export function frameDataOf(fighter: Fighter): FrameData {
  const data = FRAME_DATA[fighter.name];
  if (!data) throw new Error(`No frame data for ${fighter.name}`);
  return data;
}
