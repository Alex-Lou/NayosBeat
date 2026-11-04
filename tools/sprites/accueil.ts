/**
 * Draws the home screen's key art into src/ui/accueil-fond.png: a vinyl, sound waves, speaker
 * stacks and a crowd, not a fight stage. `npm run accueil`.
 */

import { writeFile } from 'node:fs/promises';
import { Canvas, dithered, Mask, tone } from '../stage/kit/canvas.ts';
import { Random } from '../stage/kit/random.ts';
import { encodeIndexedPng, type Rgba } from './png.ts';

const WIDTH = 960;
const HEIGHT = 540;
const OUT = new URL('../../src/ui/', import.meta.url);

const SLOTS = [
  ['clear', '#00000000'],
  ['ink', '#05030a'],
  ['night', '#0a0614'],
  ['deep', '#120b22'],
  ['violet', '#1b1230'],
  ['violetLight', '#25183f'],
  ['violetGlow', '#3a2458'],
  ['neonViolet', '#5b3a86'],
  ['magentaDeep', '#5c123e'],
  ['magenta', '#b81e7c'],
  ['neonMagenta', '#ff3ca0'],
  ['cyanDeep', '#063844'],
  ['cyanMid', '#00687e'],
  ['cyan', '#00b8d0'],
  ['neonCyan', '#30e8ff'],
  ['orangeDeep', '#4a1e08'],
  ['orangeMid', '#8a3a10'],
  ['orange', '#c4561c'],
  ['sodium', '#e07a22'],
  ['yellow', '#f0c94a'],
  ['cream', '#fff4c8'],
  ['platine', '#ece8de'],
  ['speaker', '#151222'],
  ['speakerEdge', '#2a2340'],
  ['grille', '#332b4a'],
] as const;

type SlotName = (typeof SLOTS)[number][0];
const SLOT = new Map<SlotName, number>(SLOTS.map(([name], index) => [name, index]));
const slot = (name: SlotName): number => {
  const index = SLOT.get(name);
  if (index === undefined) throw new Error(`No slot ${name}`);
  return index;
};
const palette: Rgba[] = SLOTS.map(([, hex]) => rgba(hex));

function rgba(hex: string): Rgba {
  const value = hex.replace('#', '');
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
    a: value.length >= 8 ? Number.parseInt(value.slice(6, 8), 16) : 255,
  };
}

const RAMP = (['ink', 'night', 'deep', 'violet'] as const).map(slot);

function background(canvas: Canvas): void {
  canvas.paint(0, 0, WIDTH, HEIGHT, (x, y) => {
    const glow = Math.max(0, 1 - Math.hypot((x - 600) / 460, (y - 300) / 330));
    return tone(RAMP, 0.35 + (y / HEIGHT) * 2.2 + glow * 1.1, x, y);
  });
  // Two broad shafts, dithered rather than blended.
  shaft(
    canvas,
    [
      [20, 0],
      [230, 0],
      [700, HEIGHT],
      [330, HEIGHT],
    ],
    'violetGlow',
    0.1,
  );
  shaft(
    canvas,
    [
      [900, 0],
      [960, 0],
      [740, HEIGHT],
      [560, HEIGHT],
    ],
    'orangeDeep',
    0.08,
  );
}

function shaft(
  canvas: Canvas,
  points: readonly (readonly [number, number])[],
  color: SlotName,
  density: number,
): void {
  const mask = new Mask(WIDTH, HEIGHT);
  mask.polygon(points);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      if (mask.has(x, y) && dithered(density, x, y)) canvas.set(x, y, slot(color));
    }
  }
}

function ring(
  canvas: Canvas,
  cx: number,
  cy: number,
  radius: number,
  thick: number,
  color: number,
): void {
  canvas.paint(
    cx - radius - thick,
    cy - radius - thick,
    radius * 2 + thick * 2,
    radius * 2 + thick * 2,
    (x, y) => {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      return d <= radius && d > radius - thick ? color : undefined;
    },
  );
}

function disc(canvas: Canvas, cx: number, cy: number, radius: number): void {
  canvas.ellipse(cx - radius, cy - radius, radius * 2, radius * 2, slot('ink'));
  canvas.paint(cx - radius, cy - radius, radius * 2, radius * 2, (x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
    if (d > radius) return undefined;
    const angle = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
    if (d > radius - 6) return slot('orangeMid');
    if (d > radius - 9) return slot('orange');
    if (d > radius - 12) return slot('ink');
    const groove = Math.floor((radius - d) / 6) % 2 === 0 ? 'deep' : 'violet';
    const light =
      d > radius * 0.58 && angle > -2.7 && angle < -1.1 && Math.floor((radius - d) / 3) % 3 === 0;
    return slot(light ? 'violetGlow' : groove);
  });
  // The label, its cyan ring and the spindle.
  canvas.ellipse(cx - 52, cy - 52, 104, 104, slot('violet'));
  ring(canvas, cx, cy, 50, 3, slot('cyanMid'));
  canvas.ellipse(cx - 34, cy - 34, 68, 68, slot('deep'));
  ring(canvas, cx, cy, 33, 2, slot('cyan'));
  canvas.ellipse(cx - 7, cy - 7, 14, 14, slot('ink'));
  canvas.fill(cx - 2, cy - 2, 4, 4, slot('sodium'));
  // A mark on the rim, as on the logo's vinyl.
  canvas.fill(cx + 120, cy - 72, 8, 3, slot('yellow'));
}

function waves(canvas: Canvas, cx: number, cy: number, radius: number): void {
  const rings: readonly (readonly [number, SlotName, number])[] = [
    [radius + 40, 'cyan', 0.0],
    [radius + 82, 'neonMagenta', 0.9],
    [radius + 126, 'neonViolet', 1.8],
  ];
  for (const [r, color, phase] of rings) {
    for (let step = 0; step < 720; step++) {
      const angle = (step / 720) * Math.PI * 2 + phase;
      if (Math.floor(step / 18) % 2 === 0) continue;
      const x = Math.round(cx + Math.cos(angle) * r);
      const y = Math.round(cy + Math.sin(angle) * r);
      canvas.fill(x, y, 2, 2, slot(color));
    }
  }
}

function speakers(canvas: Canvas): void {
  const cabinets = [
    { x: -18, y: 176, width: 128, height: 84, cones: 2 },
    { x: -18, y: 268, width: 128, height: 84, cones: 2 },
    { x: -18, y: 360, width: 128, height: 84, cones: 2 },
    { x: 854, y: 176, width: 128, height: 84, cones: 1 },
    { x: 854, y: 268, width: 128, height: 84, cones: 1 },
    { x: 854, y: 360, width: 128, height: 84, cones: 1 },
  ] as const;
  for (const cabinet of cabinets) {
    canvas.fill(cabinet.x, cabinet.y, cabinet.width, cabinet.height, slot('speaker'));
    canvas.fill(cabinet.x, cabinet.y, cabinet.width, 3, slot('speakerEdge'));
    canvas.fill(cabinet.x, cabinet.y + 3, 3, cabinet.height - 3, slot('speakerEdge'));
    for (let cone = 0; cone < cabinet.cones; cone++) {
      const cx =
        cabinet.x + cabinet.width / 2 + (cabinet.cones === 2 ? (cone === 0 ? -26 : 26) : 0);
      const cy = cabinet.y + cabinet.height / 2 + (cabinet.cones === 2 ? 0 : 0);
      const radius = cabinet.cones === 2 ? 20 : 28;
      canvas.ellipse(cx - radius, cy - radius, radius * 2, radius * 2, slot('grille'));
      ring(canvas, cx, cy, radius - 3, 3, slot('violetGlow'));
      canvas.ellipse(cx - 7, cy - 7, 14, 14, slot('ink'));
      canvas.set(cx, cy, slot(cone === 0 ? 'orange' : 'cyan'));
    }
    canvas.fill(cabinet.x + cabinet.width - 12, cabinet.y + 8, 4, 4, slot('neonCyan'));
  }
}

function equalizer(canvas: Canvas): void {
  const random = new Random(7);
  for (let bar = 0; bar < 30; bar++) {
    const x = 116 + bar * 24;
    const height = 8 + Math.floor(random.next() * 38);
    const color = bar % 3 === 0 ? 'orangeMid' : bar % 3 === 1 ? 'cyanMid' : 'magentaDeep';
    canvas.fill(x, 470 - height, 8, height, slot(color));
    if (bar % 4 === 0) canvas.fill(x, 470 - height, 8, 2, slot(bar % 3 === 0 ? 'sodium' : 'cyan'));
  }
  canvas.fill(100, 470, 760, 2, slot('ink'));
}

function crowd(canvas: Canvas): void {
  const people = new Canvas(WIDTH, HEIGHT);
  const random = new Random(41);
  for (let person = 0; person < 30; person++) {
    const cx = random.int(24, WIDTH - 24);
    const headY = random.int(468, 502);
    const radius = random.int(7, 12);
    people.ellipse(cx - radius, headY - radius, radius * 2, radius * 2, slot('ink'));
    people.ellipse(cx - radius - 6, headY + radius, radius * 2 + 12, 22, slot('ink'));
    if (random.chance(0.3)) {
      const armX = cx + (random.chance(0.5) ? -1 : 1) * (radius + 2);
      people.fill(armX, headY - 26, 4, 26, slot('ink'));
      people.fill(armX - 2, headY - 30, 8, 6, slot('ink'));
    }
  }
  // A rim light on the crowd's top edges only.
  people.paint(0, 0, WIDTH, HEIGHT, (x, y) => {
    if (people.get(x, y) !== slot('ink') || people.get(x, y - 1) !== 0) return undefined;
    return slot(x > 760 ? 'neonCyan' : y > 470 ? 'sodium' : 'orange');
  });
  canvas.draw(people, 0, 0);
}

function dust(canvas: Canvas): void {
  const random = new Random(99);
  for (let dot = 0; dot < 90; dot++) {
    const x = random.int(20, WIDTH - 20);
    const y = random.int(40, 470);
    const color = random.pick(['cream', 'yellow', 'neonCyan', 'neonMagenta'] as const);
    const size = random.chance(0.2) ? 2 : 1;
    canvas.fill(x, y, size, size, slot(color));
  }
}

function rings(
  canvas: Canvas,
  cx: number,
  cy: number,
  radii: readonly number[],
  colors: readonly SlotName[],
): void {
  radii.forEach((radius, index) => {
    const color = slot(colors[index % colors.length] ?? 'cyan');
    for (let step = 0; step < 720; step++) {
      if (Math.floor(step / 24) % 2 === 0) continue;
      const angle = (step / 720) * Math.PI * 2;
      canvas.fill(
        Math.round(cx + Math.cos(angle) * radius),
        Math.round(cy + Math.sin(angle) * radius),
        2,
        2,
        color,
      );
    }
  });
}

function columns(canvas: Canvas): void {
  const random = new Random(17);
  for (let index = 0; index < 18; index++) {
    const x = 72 + index * 48;
    const height = 80 + Math.floor(random.next() * 230);
    const color = index % 3 === 0 ? 'orange' : index % 3 === 1 ? 'cyan' : 'magenta';
    canvas.fill(x, 390 - height, 14, height, slot(color));
    canvas.fill(x, 390 - height, 14, 3, slot('cream'));
  }
}

function horizon(canvas: Canvas): void {
  const radii: readonly number[] = [140, 200, 270, 350, 440];
  radii.forEach((radius, index) => {
    const color = slot(index % 2 === 0 ? 'neonCyan' : 'neonMagenta');
    for (let step = 0; step < 360; step++) {
      if (Math.floor(step / 15) % 2 === 0) continue;
      const angle = Math.PI + (step / 360) * Math.PI;
      canvas.fill(
        Math.round(480 + Math.cos(angle) * radius),
        Math.round(540 + Math.sin(angle) * radius),
        2,
        2,
        color,
      );
    }
  });
  for (let x = 0; x < WIDTH; x += 24) canvas.fill(x, 392, 12, 2, slot('orangeDeep'));
}

function waveform(canvas: Canvas): void {
  for (let x = 0; x < WIDTH; x++) {
    const y = Math.round(280 + Math.sin(x / 54) * 34 + Math.sin(x / 19) * 10);
    canvas.fill(x, y, 2, 2, slot(x % 160 < 80 ? 'cyanMid' : 'magentaDeep'));
    if (x % 16 === 0) canvas.fill(x, y - 18, 2, 2, slot('neonCyan'));
  }
  const random = new Random(23);
  for (let led = 0; led < 48; led++) {
    canvas.fill(
      60 + random.int(0, 840),
      430 + random.int(0, 60),
      3,
      3,
      slot(led % 2 === 0 ? 'cyan' : 'orange'),
    );
  }
}

function homeScene(canvas: Canvas): void {
  background(canvas);
  disc(canvas, 600, 276, 188);
  waves(canvas, 600, 276, 188);
  speakers(canvas);
  equalizer(canvas);
  crowd(canvas);
  dust(canvas);
}

function selectScene(canvas: Canvas): void {
  background(canvas);
  columns(canvas);
  rings(canvas, 480, 290, [150, 220, 300], ['cyan', 'neonMagenta', 'neonViolet']);
  dust(canvas);
}

function stageScene(canvas: Canvas): void {
  background(canvas);
  horizon(canvas);
  speakers(canvas);
  dust(canvas);
}

function systemScene(canvas: Canvas): void {
  background(canvas);
  waveform(canvas);
  dust(canvas);
}

const SCENES: Readonly<Record<string, (canvas: Canvas) => void>> = {
  'accueil-fond': homeScene,
  'menu-select': selectScene,
  'menu-stage': stageScene,
  'menu-system': systemScene,
};

for (const [name, draw] of Object.entries(SCENES)) {
  const canvas = new Canvas(WIDTH, HEIGHT);
  draw(canvas);
  await writeFile(
    new URL(`${name}.png`, OUT),
    await encodeIndexedPng(WIDTH, HEIGHT, canvas.pixels, palette),
  );
}
