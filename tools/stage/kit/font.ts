/**
 * A 5 × 7 capital font for the stages' signs, our own: each letter on a grid of 5 columns, with
 * two rows above for an accent. Only the letters the signs spell. And a few Chinese characters,
 * 9 × 9, drawn by hand (HAN).
 */

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.####'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
};

/** Accents, drawn on the two rows above a letter. */
const ACCENTS: Readonly<Record<string, { letter: string; rows: readonly string[] }>> = {
  É: { letter: 'E', rows: ['...#.', '..#..'] },
  Ô: { letter: 'O', rows: ['..#..', '.#.#.'] },
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 7;
/** Rows above the letter for its accent. */
export const ACCENT_ROWS = 2;

/** The pixels of `text` at `scale` (each font pixel a square), one call per pixel lit. */
export function spell(
  text: string,
  scale: number,
  spacing: number,
  put: (x: number, y: number, letter: number) => void,
): number {
  let left = 0;
  Array.from(text).forEach((char, letter) => {
    const accent = ACCENTS[char];
    const rows = GLYPHS[accent?.letter ?? char];
    if (!rows) throw new Error(`The stages' font has no « ${char} »`);
    const grid = [...(accent?.rows ?? ['.....', '.....']), ...rows];
    grid.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row.charAt(x) !== '#') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            put(left + x * scale + dx, (y - ACCENT_ROWS) * scale + dy, letter);
          }
        }
      }
    });
    left += (GLYPH_WIDTH + spacing) * scale;
  });
  return left - spacing * scale;
}

/**
 * Chinese characters for the signs of a city's stages (docs/art/decor-rue.md §10), each on a grid of
 * 9 × 9, drawn by hand: only those the signs write.
 */
const HAN: Readonly<Record<string, readonly string[]>> = {
  // 洗, to wash: the water's three strokes, then 先.
  洗: [
    '#...#.#..',
    '.#..#####',
    '......#..',
    '#..######',
    '.#...#.#.',
    '.....#.#.',
    '.#..#..#.',
    '.#..#..#.',
    '#..#...##',
  ],
  // 衣, clothes.
  衣: [
    '....#....',
    '#########',
    '...#.....',
    '..#...#..',
    '.##..#...',
    '#.#.#....',
    '..#.##...',
    '..#...#..',
    '..#....##',
  ],
};

export const HAN_SIZE = 9;

/** The pixels of Chinese `text` at `scale`, as `spell` does, each character HAN_SIZE wide. */
export function spellHan(
  text: string,
  scale: number,
  spacing: number,
  put: (x: number, y: number, letter: number) => void,
): number {
  let left = 0;
  Array.from(text).forEach((char, letter) => {
    const rows = HAN[char];
    if (!rows) throw new Error(`The stages' font has no « ${char} »`);
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row.charAt(x) !== '#') continue;
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) put(left + x * scale + dx, y * scale + dy, letter);
        }
      }
    });
    left += (HAN_SIZE + spacing) * scale;
  });
  return left - spacing * scale;
}
