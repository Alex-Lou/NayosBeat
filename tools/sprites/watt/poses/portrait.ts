import { GUARD, type Pose } from './common.ts';

/**
 * His bust on the select screen (tools/sprites/portrait.ts): his head alone, the bulb framed as a
 * portrait drawn by hand is, the filament white hot (kiai). The tile lights his glass from inside
 * (index.ts, LIT_BULB): smoked, it read as a grey ball with a green spot.
 */
export const PORTRAIT: Pose = { ...GUARD, head: -4, face: 'kiai' };
