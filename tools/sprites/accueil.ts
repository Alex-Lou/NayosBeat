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

const CROWD_HEIGHT = 120;
const CROWD_FRAMES = 8;
const DJ_WIDTH = 160;
const DJ_HEIGHT = 180;
const DJ_FRAMES = 8;

interface Dancer {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly phase: number;
  readonly style: number;
  readonly phone: boolean;
}

function dancers(): Dancer[] {
  const random = new Random(41);
  return Array.from({ length: 76 }, () => ({
    x: random.int(6, WIDTH - 6),
    y: random.int(10, 105),
    radius: random.int(5, 11),
    phase: random.next() * Math.PI * 2,
    style: random.int(0, 2),
    phone: random.chance(0.22),
  }));
}

function crowdFrame(people: readonly Dancer[], frame: number): Canvas {
  const canvas = new Canvas(WIDTH, CROWD_HEIGHT);
  const time = (frame / CROWD_FRAMES) * Math.PI * 2;
  for (const person of people) {
    const bob = Math.round(Math.sin(person.phase + time) * 4);
    const sway = Math.round(Math.cos(person.phase * 0.7 + time) * 3);
    const cx = person.x + sway;
    const cy = person.y + bob;
    const { radius } = person;
    canvas.ellipse(cx - radius, cy - radius, radius * 2, radius * 2, slot('ink'));
    canvas.ellipse(cx - radius - 5, cy + radius, radius * 2 + 10, 32, slot('ink'));
    const shoulder = cy + radius;
    const lift = Math.round((Math.sin(person.phase + time * 1.6) + 1) * 9);
    if (person.style === 0) {
      canvas.fill(cx - radius - 4, shoulder, 4, 16, slot('ink'));
      canvas.fill(cx + radius, shoulder, 4, 16, slot('ink'));
    } else if (person.style === 1) {
      canvas.line(
        cx - radius + 2,
        shoulder,
        cx - radius - 10,
        shoulder - 18 - lift,
        slot('ink'),
        4,
      );
      canvas.fill(cx - radius - 15, shoulder - 22 - lift, 6, 6, slot('ink'));
      if (person.phone) canvas.fill(cx - radius - 14, shoulder - 26 - lift, 3, 4, slot('neonCyan'));
    } else {
      const left = shoulder - 20 - lift;
      const right = shoulder - 16 - Math.round(lift * 0.7);
      canvas.line(cx - radius + 2, shoulder, cx - radius - 9, left, slot('ink'), 4);
      canvas.line(cx + radius - 2, shoulder, cx + radius + 9, right, slot('ink'), 4);
      canvas.fill(cx - radius - 14, left - 4, 6, 6, slot('ink'));
      canvas.fill(cx + radius + 5, right - 4, 6, 6, slot('ink'));
      if (person.phone) canvas.fill(cx + radius + 6, right - 8, 3, 4, slot('neonCyan'));
    }
  }
  // A rim light on the crowd's top edges: warm on the left, cyan on the right.
  canvas.paint(0, 0, WIDTH, CROWD_HEIGHT, (x, y) => {
    if (canvas.get(x, y) !== slot('ink') || canvas.get(x, y - 1) !== 0) return undefined;
    return slot(x > 700 ? 'neonCyan' : x < 170 ? 'orange' : 'sodium');
  });
  return canvas;
}

function crowdSheet(): Canvas {
  const people = dancers();
  const sheet = new Canvas(WIDTH * CROWD_FRAMES, CROWD_HEIGHT);
  for (let frame = 0; frame < CROWD_FRAMES; frame++) {
    sheet.draw(crowdFrame(people, frame), frame * WIDTH, 0);
  }
  return sheet;
}

function djFrame(frame: number): Canvas {
  const canvas = new Canvas(DJ_WIDTH, DJ_HEIGHT);
  const time = (frame / DJ_FRAMES) * Math.PI * 2;
  const bob = Math.round(Math.sin(time) * 2);
  // The booth, its decks and its LEDs.
  canvas.fill(6, 118, 148, 56, slot('speaker'));
  canvas.fill(6, 118, 148, 4, slot('speakerEdge'));
  canvas.fill(10, 126, 140, 2, slot('deep'));
  for (const [deck, offset] of [
    [26, 0],
    [100, 1.2],
  ] as const) {
    const cx = deck + 16;
    const cy = 136;
    canvas.fill(deck, 126, 32, 20, slot('speakerEdge'));
    canvas.ellipse(cx - 12, cy - 12, 24, 24, slot('ink'));
    ring(canvas, cx, cy, 11, 2, slot('violetGlow'));
    const angle = time + offset;
    canvas.fill(
      cx + Math.round(Math.cos(angle) * 6) - 1,
      cy + Math.round(Math.sin(angle) * 6) - 1,
      2,
      2,
      slot('orange'),
    );
  }
  canvas.fill(66, 128, 28, 18, slot('speakerEdge'));
  for (let fader = 0; fader < 3; fader++) {
    canvas.fill(70 + fader * 8, 132, 3, 10, slot(fader === 1 ? 'cyan' : 'cream'));
  }
  for (let led = 0; led < 11; led++) {
    const color = (led + frame) % 3 === 0 ? 'orange' : (led + frame) % 3 === 1 ? 'cyan' : 'magenta';
    canvas.fill(12 + led * 13, 160, 4, 4, slot(color));
  }
  // The DJ: silhouette, headphones and one hand in the air.
  const headX = 80;
  const headY = 38 + bob;
  canvas.ellipse(50, 52 + bob, 60, 66, slot('ink'));
  canvas.ellipse(headX - 15, headY - 15, 30, 30, slot('ink'));
  canvas.fill(headX - 18, headY + 1, 36, 3, slot('neonCyan'));
  canvas.fill(headX - 20, headY - 9, 5, 10, slot('ink'));
  canvas.fill(headX + 15, headY - 9, 5, 10, slot('ink'));
  canvas.line(56, 70 + bob, 38, 120 + bob, slot('ink'), 7);
  canvas.fill(34, 116 + bob, 8, 8, slot('ink'));
  const raised = Math.sin(time) > 0;
  if (raised) {
    canvas.line(104, 70 + bob, 122, 32 + bob, slot('ink'), 7);
    canvas.fill(118, 26 + bob, 8, 8, slot('ink'));
  } else {
    canvas.line(104, 70 + bob, 112, 116 + bob, slot('ink'), 7);
    canvas.fill(108, 112 + bob, 8, 8, slot('ink'));
  }
  canvas.paint(0, 0, DJ_WIDTH, 118, (x, y) => {
    if (canvas.get(x, y) !== slot('ink') || canvas.get(x, y - 1) !== 0) return undefined;
    return slot(x < 70 ? 'orange' : 'neonCyan');
  });
  return canvas;
}

function djSheet(): Canvas {
  const sheet = new Canvas(DJ_WIDTH * DJ_FRAMES, DJ_HEIGHT);
  for (let frame = 0; frame < DJ_FRAMES; frame++) {
    sheet.draw(djFrame(frame), frame * DJ_WIDTH, 0);
  }
  return sheet;
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
  speakers(canvas);
  dust(canvas);
}

function selectScene(canvas: Canvas): void {
  background(canvas);
  columns(canvas);
  dust(canvas);
}

function stageScene(canvas: Canvas): void {
  background(canvas);
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

const crowd = crowdSheet();
await writeFile(
  new URL('menu-crowd.png', OUT),
  await encodeIndexedPng(crowd.width, crowd.height, crowd.pixels, palette),
);
const dj = djSheet();
await writeFile(
  new URL('menu-dj.png', OUT),
  await encodeIndexedPng(dj.width, dj.height, dj.pixels, palette),
);
