/**
 * Draws the home screen's key art into src/ui/accueil-fond.png: a vinyl, sound waves, speaker
 * stacks and a crowd, not a fight stage. `npm run accueil`.
 */

import { writeFile } from 'node:fs/promises';
import { Canvas, dithered, Mask, tone } from '../stage/kit/canvas.ts';
import { noise, Random } from '../stage/kit/random.ts';
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
  ['smokeViolet', '#5b3a8644'],
  ['smokeCyan', '#30e8ff33'],
  ['smokeWarm', '#e07a2244'],
  ['spotCore', '#fff4c822'],
  ['spotWarm', '#f0c94a44'],
  ['spotOrange', '#e07a2255'],
  ['sheenCyan', '#c8fcffaa'],
  ['sheenWarm', '#f0c94a88'],
  ['skinDeep', '#6a2a24'],
  ['skin', '#b85a3e'],
  ['skinLight', '#e88a5a'],
  ['skinPale', '#ffc08a'],
  ['hair', '#0b0b10'],
  ['hairLight', '#26262f'],
  ['jacket', '#18181f'],
  ['jacketLight', '#2e2e3a'],
  ['jacketEdge', '#4a4a5e'],
  ['shirt', '#c8c8d8'],
  ['shirtShade', '#8a8a9e'],
  ['hoodDeep', '#3a1f26'],
  ['hood', '#52303a'],
  ['hoodLight', '#6c414a'],
  ['hoodEdge', '#8a5a64'],
  ['boltGlow', '#2f6cff44'],
  ['boltDeep', '#0b2a7a'],
  ['boltBlue', '#2f6cff'],
  ['boltCyan', '#7ce8ff'],
  ['boltCore', '#e8fbff'],
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

const CROWD_FRAMES = 8;
const BACK_CROWD_HEIGHT = 90;
const FRONT_CROWD_HEIGHT = 120;
const SMOKE_HEIGHT = 120;
const DJ_WIDTH = 220;
const DJ_HEIGHT = 230;
const DJ_FRAMES = 8;
const SHEEN_SIZE = 400;
const SHEEN_FRAMES = 8;

interface Dancer {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly phase: number;
  readonly style: number;
  readonly phone: boolean;
}

interface CrowdSpec {
  readonly height: number;
  readonly count: number;
  readonly radius: readonly [number, number];
  readonly y: readonly [number, number];
  readonly color: SlotName;
  readonly rim: readonly [SlotName, SlotName];
  readonly phoneChance: number;
  readonly seed: number;
}

/** A small, darker row behind: the crowd goes back before the DJ. */
const BACK_CROWD: CrowdSpec = {
  height: BACK_CROWD_HEIGHT,
  count: 54,
  radius: [4, 8],
  y: [8, 72],
  color: 'violet',
  rim: ['violetGlow', 'cyanDeep'],
  phoneChance: 0.1,
  seed: 41,
};

/** The front row, larger and warmer: it dances in front of the DJ's booth. */
const FRONT_CROWD: CrowdSpec = {
  height: FRONT_CROWD_HEIGHT,
  count: 38,
  radius: [6, 12],
  y: [10, 108],
  color: 'ink',
  rim: ['sodium', 'neonCyan'],
  phoneChance: 0.28,
  seed: 53,
};

function dancers(spec: CrowdSpec): Dancer[] {
  const random = new Random(spec.seed);
  return Array.from({ length: spec.count }, () => ({
    x: random.int(6, WIDTH - 6),
    y: random.int(spec.y[0], spec.y[1]),
    radius: random.int(spec.radius[0], spec.radius[1]),
    phase: random.next() * Math.PI * 2,
    style: random.int(0, 2),
    phone: random.chance(spec.phoneChance),
  }));
}

function crowdFrame(people: readonly Dancer[], frame: number, spec: CrowdSpec): Canvas {
  const canvas = new Canvas(WIDTH, spec.height);
  const body = slot(spec.color);
  const time = (frame / CROWD_FRAMES) * Math.PI * 2;
  for (const person of people) {
    const bob = Math.round(Math.sin(person.phase + time) * 4);
    const sway = Math.round(Math.cos(person.phase * 0.7 + time) * 3);
    const cx = person.x + sway;
    const cy = person.y + bob;
    const { radius } = person;
    canvas.ellipse(cx - radius, cy - radius, radius * 2, radius * 2, body);
    canvas.ellipse(cx - radius - 5, cy + radius, radius * 2 + 10, 32, body);
    const shoulder = cy + radius;
    const lift = Math.round((Math.sin(person.phase + time * 1.6) + 1) * 9);
    if (person.style === 0) {
      canvas.fill(cx - radius - 4, shoulder, 4, 16, body);
      canvas.fill(cx + radius, shoulder, 4, 16, body);
    } else if (person.style === 1) {
      canvas.line(cx - radius + 2, shoulder, cx - radius - 10, shoulder - 18 - lift, body, 4);
      canvas.fill(cx - radius - 15, shoulder - 22 - lift, 6, 6, body);
      if (person.phone) canvas.fill(cx - radius - 14, shoulder - 26 - lift, 3, 4, slot('neonCyan'));
    } else {
      const left = shoulder - 20 - lift;
      const right = shoulder - 16 - Math.round(lift * 0.7);
      canvas.line(cx - radius + 2, shoulder, cx - radius - 9, left, body, 4);
      canvas.line(cx + radius - 2, shoulder, cx + radius + 9, right, body, 4);
      canvas.fill(cx - radius - 14, left - 4, 6, 6, body);
      canvas.fill(cx + radius + 5, right - 4, 6, 6, body);
      if (person.phone) canvas.fill(cx + radius + 6, right - 8, 3, 4, slot('neonCyan'));
    }
  }
  // A rim light on the top edges: each row has its own distance from the stage lights.
  canvas.paint(0, 0, WIDTH, spec.height, (x, y) => {
    if (canvas.get(x, y) !== body || canvas.get(x, y - 1) !== 0) return undefined;
    return slot(x > 700 ? spec.rim[1] : spec.rim[0]);
  });
  return canvas;
}

function crowdSheet(spec: CrowdSpec): Canvas {
  const people = dancers(spec);
  const sheet = new Canvas(WIDTH * CROWD_FRAMES, spec.height);
  for (let frame = 0; frame < CROWD_FRAMES; frame++) {
    sheet.draw(crowdFrame(people, frame, spec), frame * WIDTH, 0);
  }
  return sheet;
}

function smokeFrame(frame: number): Canvas {
  const canvas = new Canvas(WIDTH, SMOKE_HEIGHT);
  const drift = frame * 43;
  for (let y = 0; y < SMOKE_HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const n =
        noise(77, x + drift, y + frame * 5, 18) * 0.65 +
        noise(91, x * 0.7 - drift, y + 18, 32) * 0.35;
      if (n < 0.56) continue;
      const color = n > 0.67 ? 'smokeCyan' : 'smokeViolet';
      canvas.set(x, y, slot(color));
    }
  }
  return canvas;
}

function smokeSheet(): Canvas {
  const sheet = new Canvas(WIDTH * CROWD_FRAMES, SMOKE_HEIGHT);
  for (let frame = 0; frame < CROWD_FRAMES; frame++) {
    sheet.draw(smokeFrame(frame), frame * WIDTH, 0);
  }
  return sheet;
}

function spotImage(): Canvas {
  const canvas = new Canvas(320, 360);
  const outer = new Mask(320, 360);
  outer.polygon([
    [140, 0],
    [180, 0],
    [300, 360],
    [20, 360],
  ]);
  const inner = new Mask(320, 360);
  inner.polygon([
    [152, 0],
    [168, 0],
    [230, 360],
    [90, 360],
  ]);
  canvas.paint(0, 0, 320, 360, (x, y) => {
    if (!outer.has(x, y)) return undefined;
    if (inner.has(x, y) && dithered(0.35, x, y)) return slot('spotWarm');
    if (dithered(0.2, x, y)) return slot('spotOrange');
    if (dithered(0.08, x, y)) return slot('spotCore');
    return undefined;
  });
  return canvas;
}

function sheenFrame(frame: number): Canvas {
  const canvas = new Canvas(SHEEN_SIZE, SHEEN_SIZE);
  const center = SHEEN_SIZE / 2;
  const start = (frame / SHEEN_FRAMES) * Math.PI * 2;
  for (let step = 0; step < 90; step++) {
    const angle = start + (step / 90) * 1.1;
    const radius = 168 + (step % 6 === 0 ? 2 : 0);
    canvas.fill(
      Math.round(center + Math.cos(angle) * radius),
      Math.round(center + Math.sin(angle) * radius),
      2,
      2,
      slot(step % 6 === 0 ? 'sheenWarm' : 'sheenCyan'),
    );
  }
  for (let step = 0; step < 44; step++) {
    const angle = start + 0.2 + (step / 44) * 0.7;
    canvas.fill(
      Math.round(center + Math.cos(angle) * 140),
      Math.round(center + Math.sin(angle) * 140),
      1,
      1,
      slot('sheenCyan'),
    );
  }
  return canvas;
}

function sheenSheet(): Canvas {
  const sheet = new Canvas(SHEEN_SIZE * SHEEN_FRAMES, SHEEN_SIZE);
  for (let frame = 0; frame < SHEEN_FRAMES; frame++) {
    sheet.draw(sheenFrame(frame), frame * SHEEN_SIZE, 0);
  }
  return sheet;
}

function polygon(
  canvas: Canvas,
  points: readonly (readonly [number, number])[],
  color: number,
): void {
  const mask = new Mask(canvas.width, canvas.height);
  mask.polygon(points);
  canvas.paint(0, 0, canvas.width, canvas.height, (x, y) => (mask.has(x, y) ? color : undefined));
}

function segment(
  canvas: Canvas,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w0: number,
  w1: number,
  color: number,
): void {
  const angle = Math.atan2(y1 - y0, x1 - x0);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  polygon(
    canvas,
    [
      [x0 + nx * (w0 / 2), y0 + ny * (w0 / 2)],
      [x1 + nx * (w1 / 2), y1 + ny * (w1 / 2)],
      [x1 - nx * (w1 / 2), y1 - ny * (w1 / 2)],
      [x0 - nx * (w0 / 2), y0 - ny * (w0 / 2)],
    ],
    color,
  );
}

function djFrame(frame: number): Canvas {
  const canvas = new Canvas(DJ_WIDTH, DJ_HEIGHT);
  const time = (frame / DJ_FRAMES) * Math.PI * 2;
  const scratch = Math.round(Math.sin(time * 2) * 3);
  const raised = Math.sin(time) > 0;
  // Riser, booth, decks and LEDs, behind the DJ.
  canvas.fill(4, 204, 212, 26, slot('speaker'));
  canvas.fill(4, 204, 212, 3, slot('orangeMid'));
  canvas.fill(8, 207, 204, 2, slot('deep'));
  canvas.fill(14, 154, 192, 52, slot('speaker'));
  canvas.fill(14, 154, 192, 4, slot('speakerEdge'));
  canvas.fill(18, 162, 184, 2, slot('deep'));
  for (const [deck, offset] of [
    [36, 0],
    [150, 1.1],
  ] as const) {
    const cx = deck + 24;
    const cy = 176;
    canvas.fill(deck, 164, 48, 26, slot('speakerEdge'));
    canvas.ellipse(cx - 17, cy - 17, 34, 34, slot('ink'));
    ring(canvas, cx, cy, 15, 2, slot('violetGlow'));
    const angle = time + offset;
    canvas.fill(
      cx + Math.round(Math.cos(angle) * 9) - 1,
      cy + Math.round(Math.sin(angle) * 9) - 1,
      2,
      2,
      slot('orange'),
    );
  }
  canvas.fill(96, 166, 36, 22, slot('speakerEdge'));
  for (let fader = 0; fader < 3; fader++) {
    canvas.fill(102 + fader * 11, 172, 3, 12, slot(fader === 1 ? 'cyan' : 'cream'));
  }
  for (let led = 0; led < 14; led++) {
    const color = (led + frame) % 3 === 0 ? 'orange' : (led + frame) % 3 === 1 ? 'cyan' : 'magenta';
    canvas.fill(20 + led * 13, 198, 4, 4, slot(color));
  }

  // The DJ, on his own layer: a face, a jacket and articulated arms.
  const human = new Canvas(DJ_WIDTH, DJ_HEIGHT);
  polygon(
    human,
    [
      [74, 82],
      [146, 82],
      [138, 154],
      [82, 154],
    ],
    slot('hood'),
  );
  polygon(
    human,
    [
      [99, 82],
      [121, 82],
      [118, 132],
      [102, 132],
    ],
    slot('hood'),
  );
  polygon(
    human,
    [
      [74, 82],
      [99, 84],
      [96, 132],
      [82, 154],
      [74, 118],
    ],
    slot('hood'),
  );
  polygon(
    human,
    [
      [146, 82],
      [121, 84],
      [120, 132],
      [138, 154],
      [146, 118],
    ],
    slot('hood'),
  );
  polygon(
    human,
    [
      [74, 82],
      [85, 84],
      [81, 120],
      [74, 112],
    ],
    slot('hoodLight'),
  );
  polygon(
    human,
    [
      [146, 82],
      [138, 86],
      [136, 120],
      [146, 132],
    ],
    slot('hoodEdge'),
  );
  polygon(
    human,
    [
      [82, 80],
      [100, 86],
      [94, 118],
      [84, 104],
    ],
    slot('hoodEdge'),
  );
  polygon(
    human,
    [
      [138, 80],
      [120, 86],
      [126, 118],
      [136, 104],
    ],
    slot('hoodEdge'),
  );
  polygon(
    human,
    [
      [86, 78],
      [100, 84],
      [97, 90],
      [84, 84],
    ],
    slot('hoodEdge'),
  );
  polygon(
    human,
    [
      [134, 78],
      [120, 84],
      [123, 90],
      [136, 84],
    ],
    slot('hoodEdge'),
  );
  polygon(
    human,
    [
      [101, 84],
      [110, 96],
      [119, 84],
      [115, 80],
      [110, 89],
      [105, 80],
    ],
    slot('cream'),
  );
  human.fill(109, 84, 2, 46, slot('hoodEdge'));
  human.hline(92, 132, 36, slot('hoodEdge'));
  human.line(92, 132, 84, 148, slot('hoodEdge'), 2);
  human.line(128, 132, 136, 148, slot('hoodEdge'), 2);
  human.line(74, 100, 86, 106, slot('hoodLight'), 2);
  human.line(146, 100, 134, 106, slot('hoodEdge'), 2);
  human.line(94, 62, 104, 96, slot('cyanDeep'), 2);
  human.line(104, 96, 110, 124, slot('cyanDeep'), 2);
  human.line(104, 84, 100, 116, slot('cream'), 2);
  human.line(116, 84, 120, 116, slot('cream'), 2);
  human.fill(98, 114, 4, 4, slot('cream'));
  human.fill(118, 114, 4, 4, slot('cream'));
  polygon(
    human,
    [
      [86, 74],
      [98, 64],
      [122, 64],
      [136, 76],
      [132, 96],
      [124, 82],
      [110, 78],
      [98, 82],
      [90, 96],
    ],
    slot('hoodDeep'),
  );
  polygon(
    human,
    [
      [93, 78],
      [100, 70],
      [120, 70],
      [128, 80],
      [124, 88],
      [116, 80],
      [104, 80],
      [96, 88],
    ],
    slot('hood'),
  );
  human.fill(102, 62, 16, 22, slot('skinDeep'));
  human.fill(104, 62, 12, 20, slot('skin'));

  // The head, larger and in three-quarter view: hair, face, headphones and a mic.
  human.ellipse(89, 22, 42, 46, slot('skin'));
  human.ellipse(95, 28, 21, 20, slot('skinLight'));
  human.fill(98, 37, 5, 4, slot('skinPale'));
  human.ellipse(119, 48, 12, 17, slot('skinDeep'));
  polygon(
    human,
    [
      [87, 32],
      [92, 22],
      [104, 18],
      [118, 18],
      [130, 23],
      [135, 33],
      [130, 29],
      [126, 37],
      [119, 27],
      [112, 35],
      [103, 27],
      [97, 37],
      [91, 30],
    ],
    slot('hair'),
  );
  polygon(
    human,
    [
      [106, 20],
      [118, 18],
      [130, 23],
      [126, 28],
      [115, 23],
    ],
    slot('hairLight'),
  );
  polygon(
    human,
    [
      [89, 34],
      [92, 22],
      [104, 17],
      [120, 17],
      [132, 22],
      [137, 32],
      [130, 34],
      [123, 30],
      [116, 33],
      [108, 28],
      [100, 34],
      [94, 30],
    ],
    slot('hoodDeep'),
  );
  polygon(
    human,
    [
      [120, 30],
      [136, 33],
      [143, 38],
      [130, 35],
    ],
    slot('hoodEdge'),
  );
  human.fill(129, 26, 4, 3, slot('neonCyan'));
  human.fill(87, 42, 7, 13, slot('skinDeep'));
  human.fill(88, 43, 5, 10, slot('skinLight'));
  human.fill(88, 38, 4, 12, slot('hair'));
  human.fill(128, 36, 4, 11, slot('hair'));
  human.fill(112, 41, 6, 3, slot('hair'));
  human.set(117, 42, slot('neonCyan'));
  human.fill(110, 37, 9, 2, slot('hair'));
  human.fill(123, 45, 3, 6, slot('skinLight'));
  human.set(123, 51, slot('skinDeep'));
  human.fill(114, 55, 8, 2, slot('skinDeep'));
  human.fill(117, 59, 8, 2, slot('skinLight'));
  human.fill(88, 57, 2, 2, slot('cream'));

  // Headphones, over the ears, with a small mic boom.
  for (let angle = -158; angle <= -22; angle += 8) {
    const rad = (angle * Math.PI) / 180;
    human.fill(
      Math.round(110 + Math.cos(rad) * 25),
      Math.round(45 + Math.sin(rad) * 25),
      3,
      3,
      slot('hoodEdge'),
    );
  }
  human.fill(81, 38, 14, 18, slot('hood'));
  human.fill(84, 41, 9, 13, slot('hoodEdge'));
  human.fill(86, 44, 4, 5, slot('neonCyan'));
  human.fill(124, 30, 10, 4, slot('hoodEdge'));
  human.fill(128, 58, 3, 3, slot('cream'));
  human.line(94, 52, 108, 59, slot('hoodEdge'), 2);
  human.fill(106, 57, 4, 4, slot('neonCyan'));

  // Left arm, hand scratching the deck.
  segment(human, 80, 96, 66, 124, 20, 15, slot('hood'));
  segment(human, 66, 124, 72, 150, 15, 11, slot('hood'));
  human.ellipse(65, 120, 15, 15, slot('hoodLight'));
  human.fill(58, 152, 14, 5, slot('hoodEdge'));
  human.fill(66 + scratch, 146, 14, 4, slot('hoodEdge'));
  human.fill(66 + scratch, 150, 12, 12, slot('skin'));
  human.fill(66 + scratch, 150, 12, 3, slot('skinLight'));
  human.fill(68 + scratch, 153, 2, 6, slot('skinDeep'));
  human.fill(73 + scratch, 153, 2, 6, slot('skinDeep'));

  // Right arm: raised with a record, or down on the other deck.
  segment(human, 138, 96, 156, 110, 20, 15, slot('hood'));
  human.ellipse(155, 108, 15, 15, slot('hoodLight'));
  if (raised) {
    segment(human, 156, 110, 166, 58, 15, 11, slot('hood'));
    human.fill(172, 40, 12, 5, slot('hoodEdge'));
    human.ellipse(166, 42, 36, 36, slot('ink'));
    ring(human, 166, 42, 17, 2, slot('sodium'));
    human.ellipse(157, 33, 18, 18, slot('violet'));
    ring(human, 166, 42, 9, 1, slot('neonCyan'));
    human.fill(164, 40, 4, 4, slot('yellow'));
    human.fill(160, 46, 12, 12, slot('skin'));
    human.fill(160, 46, 12, 3, slot('skinLight'));
    human.fill(163, 49, 2, 7, slot('skinDeep'));
    human.fill(168, 49, 2, 7, slot('skinDeep'));
  } else {
    segment(human, 156, 110, 150, 150, 15, 11, slot('hood'));
    human.fill(144, 146, 14, 4, slot('hoodEdge'));
    human.fill(144, 150, 12, 12, slot('skin'));
    human.fill(144, 150, 12, 3, slot('skinLight'));
    human.fill(146, 153, 2, 6, slot('skinDeep'));
    human.fill(151, 153, 2, 6, slot('skinDeep'));
  }
  human.line(82, 96, 68, 122, slot('cyan'), 2);
  human.line(138, 96, 154, 110, slot('cyan'), 2);

  // A rim light on the figure alone, warm from the spotlight and cyan from the back.
  const rim = new Canvas(DJ_WIDTH, DJ_HEIGHT);
  rim.paint(0, 0, DJ_WIDTH, DJ_HEIGHT, (x, y) => {
    if (human.get(x, y) === 0) return undefined;
    const left = human.get(x - 1, y) === 0;
    const right = human.get(x + 1, y) === 0;
    const above = human.get(x, y - 1) === 0;
    if (!left && !right && !above) return undefined;
    return left ? slot('sodium') : right ? slot('neonCyan') : slot('skinPale');
  });
  human.draw(rim, 0, 0);
  canvas.draw(human, 0, 0);
  return canvas;
}

function boltPath(): readonly (readonly [number, number])[] {
  const random = new Random(91);
  const points: (readonly [number, number])[] = [[240, 0]];
  let x = 240;
  let y = 0;
  while (y < 268) {
    y += random.int(20, 34);
    x = Math.min(400, Math.max(80, x + random.int(-22, 22)));
    points.push([x, Math.min(268, y)]);
  }
  return points;
}

const BOLT_PATH = boltPath();

function boltFrame(frame: number): Canvas {
  const canvas = new Canvas(480, 360);
  const strength = [0, 0.35, 1, 1, 0.7, 0.3, 0, 0][frame] ?? 0;
  if (strength === 0) return canvas;
  const core = strength > 0.8;
  const drawPath = (size: number, color: SlotName): void => {
    for (let at = 1; at < BOLT_PATH.length; at++) {
      const [x0, y0] = BOLT_PATH[at - 1] ?? [240, 0];
      const [x1, y1] = BOLT_PATH[at] ?? [240, 268];
      canvas.line(x0, y0, x1, y1, slot(color), size);
    }
  };
  drawPath(core ? 9 : 7, 'boltDeep');
  drawPath(core ? 4 : 3, 'boltBlue');
  drawPath(core ? 2 : 1, 'boltCyan');
  if (core) drawPath(1, 'boltCore');

  // Branches, fixed to the path and shorter as the bolt fades.
  for (let at = 2; at < BOLT_PATH.length - 1; at += 2) {
    const [x, y] = BOLT_PATH[at] ?? [240, 0];
    const dir = at % 4 === 0 ? 1 : -1;
    const length = Math.round((18 + ((at * 7) % 22)) * strength);
    canvas.line(x, y, x + dir * length, y + Math.round(length * 0.7), slot('boltBlue'), 2);
    canvas.line(
      x,
      y,
      x + dir * Math.round(length * 0.6),
      y + Math.round(length * 0.4),
      slot('boltCyan'),
      1,
    );
  }

  // The impact: a blue star, a ring and sparks.
  const radius = Math.round(12 + strength * 18);
  ring(canvas, 240, 272, radius, 2, slot('boltCyan'));
  ring(canvas, 240, 272, radius + 8, 1, slot('boltBlue'));
  for (let ray = 0; ray < 18; ray++) {
    const angle = (ray / 18) * Math.PI * 2;
    const length = Math.round((20 + ((ray * 13) % 46)) * strength);
    canvas.line(
      240 + Math.round(Math.cos(angle) * 10),
      272 + Math.round(Math.sin(angle) * 10),
      240 + Math.round(Math.cos(angle) * (10 + length)),
      272 + Math.round(Math.sin(angle) * (10 + length)),
      slot(ray % 3 === 0 ? 'boltCore' : ray % 2 === 0 ? 'boltCyan' : 'boltBlue'),
      1,
    );
  }
  if (core) {
    canvas.ellipse(232, 264, 16, 16, slot('boltBlue'));
    canvas.ellipse(236, 268, 8, 8, slot('boltCore'));
  }
  return canvas;
}

function boltSheet(): Canvas {
  const sheet = new Canvas(480 * 8, 360);
  for (let frame = 0; frame < 8; frame++) {
    sheet.draw(boltFrame(frame), frame * 480, 0);
  }
  return sheet;
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

async function writeSheet(name: string, sheet: Canvas): Promise<void> {
  await writeFile(
    new URL(`${name}.png`, OUT),
    await encodeIndexedPng(sheet.width, sheet.height, sheet.pixels, palette),
  );
}

await writeSheet('menu-crowd-back', crowdSheet(BACK_CROWD));
await writeSheet('menu-crowd-front', crowdSheet(FRONT_CROWD));
await writeSheet('menu-smoke', smokeSheet());
await writeSheet('menu-dj', djSheet());
await writeSheet('menu-vinyl-sheen', sheenSheet());
await writeFile(
  new URL('menu-spot.png', OUT),
  await encodeIndexedPng(320, 360, spotImage().pixels, palette),
);
await writeSheet('menu-bolt', boltSheet());
