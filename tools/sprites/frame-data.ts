/**
 * Each fighter's gameplay as the tools measure its strips against it: its moves (hitboxes,
 * hurtboxes, pushboxes) and its clips (which frames show when).
 */

import type { FighterTemplate } from '../../src/core/config.ts';
import type { Clips } from './clips.ts';
import type { Fighter } from './fighter.ts';
import { toolFighterNamed } from './fighters.ts';

export interface FrameData {
  readonly template: FighterTemplate;
  readonly clips: Clips;
}

export function frameDataOf(fighter: Fighter): FrameData {
  const data = toolFighterNamed(fighter.name);
  if (!data) throw new Error(`No frame data for ${fighter.name}`);
  return data;
}
