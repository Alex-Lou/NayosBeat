/**
 * Cyber Arena (docs/art/decor-cyberarena.md): the developer's background, the cat-eared arena on a
 * rooftop under the moon, the city's cyan neon behind, drawn whole in art-src/cyberarena/ (far
 * and floor, in truecolor); `npm run stages` copies it as it is, so the illustration keeps its
 * pixel grain and every colour. No middle layer and no animation: the scene is one illustration.
 */

import type { Rgba } from '../../sprites/png.ts';
import { Canvas } from '../kit/canvas.ts';
import type { CodeMap, CodeStage } from '../kit/stage.ts';
import { imageOf, sizeOf } from '../kit/stage.ts';

const BLANK: Rgba = { r: 0, g: 0, b: 0, a: 0 };

function blank(name: 'far' | 'mid' | 'floor') {
  const { width, height } = sizeOf(name);
  return imageOf(new Canvas(width, height), [BLANK]);
}

let drawn: CodeStage | undefined;

export function drawCyberArena(): CodeStage {
  drawn ??= { layers: { far: blank('far'), mid: blank('mid'), floor: blank('floor') }, props: [] };
  return drawn;
}

export const CYBER_ARENA: CodeMap = {
  name: 'cyberarena',
  draw: drawCyberArena,
  atmospheres: [{ atmosphere: { moment: 'midnight', weather: 'clear' }, palette: [BLANK] }],
  rgba: true,
  noMid: true,
};
