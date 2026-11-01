import { describe, expect, it } from 'vitest';
import { NAYO_CLIPS } from '../../src/art/nayo/clips';
import { NAYO_PLAYED } from '../../src/art/nayo/played';
import { NAYO_SHEETS } from '../../src/art/nayo/sheets';
import { RIFF_PLAYED } from '../../src/art/riff/played';
import { RIFF_SHEETS } from '../../src/art/riff/sheets';
import {
  ANCHOR,
  CELL_SIZE,
  playedClips,
  playedRange,
  type Clip,
  type ClipId,
  type FighterClips,
  type Played,
} from '../../src/art/types';
import { MOVE_IDS } from '../../src/core/move-data';
import { NAYO as NAYO_TEMPLATE } from '../../src/data/fighters/nayo';
import { clipFrameAt } from '../../src/render/animation';
import { activeFrames } from '../../tools/sprites/clips';
import type { Fighter } from '../../tools/sprites/fighter';
import {
  keyAt,
  markersOf,
  moved,
  planStrip,
  POSTURE_SHEETS,
  smoothClip,
  smoothFighter,
  frozenOf,
  UNSMOOTHED_CLIPS,
  type Smoothing,
  type SmoothingTable,
  type StripPlan,
} from '../../tools/sprites/inbetweens';
import { NAYO } from '../../tools/sprites/nayo/index';
import { NAYO_SMOOTHING } from '../../tools/sprites/nayo/smoothing';
import type { PixelCanvas } from '../../tools/sprites/raster';
import { RIFF_SMOOTHING } from '../../tools/sprites/riff/smoothing';
import { bottomRow, drawStrip } from '../../tools/sprites/sheet';
import { DRAWN_FIGHTERS, stripOf, type DrawnFighter } from './fighters';
import { extent } from './strip-pixels';

/**
 * The in-betweens of F2 (docs/art/animation-plan.md §3.1, §3.3): drawings more in the pilot
 * strips, played on the core's ticks (D23: nothing interpolated on screen). Every clip keeps its
 * keys on the same ticks, its length and its active frames, so neither the frame data nor the
 * boxes move; the drawings added are not duplicates, do not jerk, touch the floor where their
 * keys do and stay in the keys' box on the strips the hurtboxes are calibrated on.
 */

const TABLES: Readonly<Record<string, SmoothingTable>> = {
  Nayo: NAYO_SMOOTHING,
  Riff: RIFF_SMOOTHING,
};
const PLAYED: Readonly<Record<string, Played>> = { Nayo: NAYO_PLAYED, Riff: RIFF_PLAYED };

/** The clips of the keys alone, as the game keeps them for the animation of before. */
function keyClipsOf(fighter: DrawnFighter): FighterClips {
  const keys = fighter.art.keyClips;
  if (!keys) throw new Error(`${fighter.name} has no clips of its keys`);
  return keys;
}

const KEY_SHEETS = { Nayo: NAYO_SHEETS, Riff: RIFF_SHEETS } as const;

/**
 * The clips the generator plays from its plans, the ones played.ts holds once `npm run sprites`
 * has written them (test 3): the code is judged here, not a file it wrote earlier.
 */
function playedOf(fighter: DrawnFighter): FighterClips {
  const sheets = fighter.name === 'Nayo' ? KEY_SHEETS.Nayo : KEY_SHEETS.Riff;
  return playedClips(keyClipsOf(fighter), fighter.generator.played, sheets);
}

/** A strip's plan as the generator made it: its keys, then its in-betweens. */
function planOf(fighter: DrawnFighter, sheet: string): StripPlan {
  const keys = fighter.generator.keys(sheet)?.length ?? 0;
  return { sheet, keys, inbetweens: fighter.generator.inbetweens(sheet), dropped: [] };
}

const smoothedSheets = (fighter: DrawnFighter): string[] => Object.keys(TABLES[fighter.name] ?? {});

const totalOf = (clip: Clip): number => clip.ticks.reduce((sum, ticks) => sum + ticks, 0);

/** Every clip of the fighter: its id, as played, and as its keys alone. */
function clipsOf(fighter: DrawnFighter): [ClipId, Clip, Clip][] {
  const keys = keyClipsOf(fighter);
  return (Object.entries(playedOf(fighter)) as [ClipId, Clip][]).map(([id, clip]) => {
    const key = keys[id];
    if (!key) throw new Error(`${fighter.name} has no key clip ${id}`);
    return [id, clip, key];
  });
}

/** The fighter's generator drawing its keys alone (the strips as they were before F2). */
function keysOnly(generator: Fighter, sheet: string): Fighter {
  const frames = generator.keys(sheet)?.length ?? 0;
  return {
    ...generator,
    sheets: { ...generator.sheets, [sheet]: { frames } },
    poses: generator.keys,
    inbetweens: () => [],
  };
}

const pixelsOf = (canvas: PixelCanvas, frame: number): Uint8Array[] =>
  Array.from({ length: CELL_SIZE }, (_, row) =>
    canvas.pixels.slice(
      row * canvas.width + frame * CELL_SIZE,
      row * canvas.width + (frame + 1) * CELL_SIZE,
    ),
  );

/** The lowest row a body on the floor reaches (sheet.ts, the feet's anchor). */
const FLOOR_ROW = ANCHOR.y - 2;

describe.each(DRAWN_FIGHTERS)("$name's in-betweens", (fighter) => {
  const sheets = smoothedSheets(fighter);

  it('1. keep each key on screen on the same ticks, and every clip as long', () => {
    for (const [id, played, keys] of clipsOf(fighter)) {
      expect(totalOf(played), id).toBe(totalOf(keys));
      const plan = sheets.includes(played.sheet) ? planOf(fighter, played.sheet) : undefined;
      // Twice round a loop: it starts again on the same key at the same tick.
      const ticks = totalOf(keys) * (keys.loopFrom === undefined ? 1 : 2) + 2;
      for (let tick = 0; tick < ticks; tick++) {
        const key = keys.frames[clipFrameAt(keys, tick)];
        expect(keyAt(played, plan, tick), `${id} tick ${tick}`).toBe(key);
      }
    }
  });

  it('2. keep the active frames of every blow, all of them keys', () => {
    const keys = keyClipsOf(fighter);
    const clips = playedOf(fighter);
    for (const id of MOVE_IDS) {
      const move = fighter.template.moves[id];
      const played = clips[id];
      const key = keys[id];
      if (!move || !played || !key) continue;
      // The blows that touch: a hitbox, a grab, a projectile (the movements have no active frame
      // that touches anything).
      if (!move.hitbox && !move.projectile && move.kind !== 'grab') continue;
      const count = fighter.generator.keys(played.sheet)?.length ?? 0;
      const active = activeFrames(played, move);
      expect(active, id).toEqual(activeFrames(key, move));
      expect(
        active.every((frame) => frame < count),
        id,
      ).toBe(true);
    }
  });

  it('3. are played as played.ts says (npm run sprites is up to date)', () => {
    const played = PLAYED[fighter.name];
    const { sheets: strips, clips } = fighter.generator.played;
    for (const sheet of sheets) expect(played?.sheets[sheet], sheet).toEqual(strips[sheet]);
    const smoothedClips = (of: Played): Record<string, unknown> =>
      Object.fromEntries(
        Object.entries(of.clips).filter(([id]) =>
          sheets.includes(keyClipsOf(fighter)[id as ClipId]?.sheet ?? ''),
        ),
      );
    expect(played && smoothedClips(played)).toEqual(smoothedClips({ sheets: strips, clips }));
  });

  it('4. are no duplicates: half a world pixel at least from the drawings beside them', () => {
    for (const [id, played] of clipsOf(fighter)) {
      if (!sheets.includes(played.sheet)) continue;
      const poses = fighter.generator.poses(played.sheet) ?? [];
      const keys = fighter.generator.keys(played.sheet)?.length ?? 0;
      played.frames.forEach((frame, index) => {
        const next = played.frames[index + 1];
        if (next === undefined || next === frame || (frame < keys && next < keys)) return;
        const [a, b] = [poses[frame], poses[next]];
        if (!a || !b) throw new Error(`${id}: no pose ${frame} or ${next}`);
        const gap = moved(
          markersOf(a, fighter.generator.body),
          markersOf(b, fighter.generator.body),
        );
        expect(gap, `${id}: ${frame} to ${next}`).toBeGreaterThanOrEqual(0.5);
      });
    }
  });

  it('5. do not jerk: no joint steps more than 3 times its mean step between two keys', () => {
    const { body } = fighter.generator;
    for (const sheet of sheets) {
      const keys = fighter.generator.keys(sheet) ?? [];
      const inbetweens = fighter.generator.inbetweens(sheet);
      const pairs = new Map<string, number[]>();
      inbetweens.forEach(({ from, to }, rank) => {
        const pair = `${from}>${to}`;
        pairs.set(pair, [...(pairs.get(pair) ?? []), rank]);
      });
      for (const [pair, ranks] of pairs) {
        const [from = 0, to = 0] = pair.split('>').map(Number);
        const poses = [keys[from], ...ranks.map((rank) => inbetweens[rank]?.pose), keys[to]];
        const steps = poses.map((pose) => {
          if (!pose) throw new Error(`${sheet} ${pair}: a pose is missing`);
          return markersOf(pose, body);
        });
        steps[0]?.forEach((_, marker) => {
          let path = 0;
          let biggest = 0;
          for (let i = 1; i < steps.length; i++) {
            const [p, q] = [steps[i - 1]?.[marker], steps[i]?.[marker]];
            const step = p && q ? Math.hypot(p.x - q.x, p.y - q.y) : 0;
            path += step;
            biggest = Math.max(biggest, step);
          }
          if (path <= 2) return;
          const ratio = biggest / (path / (steps.length - 1));
          expect(ratio, `${sheet} ${pair}, marker ${marker}`).toBeLessThanOrEqual(3);
        });
      }
    }
  });

  it.each(sheets)('6. %s: leave the keys as they were drawn, pixel for pixel', (sheet) => {
    const keys = fighter.generator.keys(sheet)?.length ?? 0;
    const before = drawStrip(keysOnly(fighter.generator, sheet), sheet);
    const after = stripOf(fighter, sheet);
    expect(after.width).toBeGreaterThan(before.width);
    for (let frame = 0; frame < keys; frame++) {
      expect(pixelsOf(after, frame), `frame ${frame}`).toEqual(pixelsOf(before, frame));
    }
  });

  it.each(sheets)('7. %s: touch the floor between two keys on the floor', (sheet) => {
    const strip = stripOf(fighter, sheet);
    const keys = fighter.generator.keys(sheet)?.length ?? 0;
    fighter.generator.inbetweens(sheet).forEach(({ from, to }, rank) => {
      if (bottomRow(strip, from) < FLOOR_ROW || bottomRow(strip, to) < FLOOR_ROW) return;
      const frame = keys + rank;
      expect(bottomRow(strip, frame), `${from}>${to}, frame ${frame}`).toBeGreaterThanOrEqual(
        FLOOR_ROW,
      );
    });
  });

  it("8. leave the hold pairs and the Finisher's clips as their keys", () => {
    const keys = keyClipsOf(fighter);
    for (const id of UNSMOOTHED_CLIPS) {
      if (keys[id]) expect(playedOf(fighter)[id], id).toEqual(keys[id]);
    }
  });

  it('9. keep every loop on a steady beat: its holds all cut the same way, or none', () => {
    for (const [id, played, keys] of clipsOf(fighter)) {
      if (keys.loopFrom === undefined) continue;
      const cuts = new Set<number>();
      let index = played.loopFrom ?? 0;
      for (let entry = keys.loopFrom; entry < keys.frames.length; entry++) {
        let pieces = 0;
        for (let ticks = 0; ticks < (keys.ticks[entry] ?? 0); pieces++) {
          ticks += played.ticks[index++] ?? Infinity;
        }
        cuts.add(pieces);
      }
      expect(cuts.size, id).toBe(1);
    }
  });

  it('10. give the dash forward its in-betweens: a movement is not frozen', () => {
    const keys = fighter.generator.keys('dashForward')?.length ?? 0;
    expect(fighter.generator.inbetweens('dashForward').length).toBeGreaterThanOrEqual(4);
    const played = playedOf(fighter).dashForward;
    expect(played.frames.filter((frame) => frame >= keys).length).toBeGreaterThanOrEqual(3);
  });

  it.each(sheets.filter((sheet) => POSTURE_SHEETS.has(sheet)))(
    '11. %s: posture strip, no in-between drawn out of the keys box',
    (sheet) => {
      const strip = stripOf(fighter, sheet);
      const keys = fighter.generator.keys(sheet)?.length ?? 0;
      const box = { top: CELL_SIZE, bottom: -1, left: CELL_SIZE, right: -1 };
      for (let frame = 0; frame < keys; frame++) {
        const drawn = extent(strip, frame);
        box.top = Math.min(box.top, drawn.top);
        box.bottom = Math.max(box.bottom, drawn.bottom);
        box.left = Math.min(box.left, drawn.left);
        box.right = Math.max(box.right, drawn.right);
      }
      const total = fighter.generator.sheets[sheet]?.frames ?? 0;
      for (let frame = keys; frame < total; frame++) {
        const drawn = extent(strip, frame);
        const inside =
          drawn.top >= box.top &&
          drawn.bottom <= box.bottom &&
          drawn.left >= box.left &&
          drawn.right <= box.right;
        expect(inside, `frame ${frame}: ${JSON.stringify(drawn)} in ${JSON.stringify(box)}`).toBe(
          true,
        );
      }
    },
  );
});

describe('the in-betweens engine (tools/sprites/inbetweens.ts)', () => {
  const source = {
    name: 'nayo',
    sheets: NAYO_SHEETS,
    keys: NAYO.keys,
    body: NAYO.body,
    clips: NAYO_CLIPS,
    template: NAYO_TEMPLATE,
  };

  it('8. refuses a table that names a strip only hold pairs or the Finisher play', () => {
    for (const sheet of ['hold', 'held', 'pummel', 'throwBack', 'thrownBack', 'super']) {
      expect(() => smoothFighter({ ...source, table: { [sheet]: { every: 1 } } }), sheet).toThrow(
        /never smoothed/,
      );
    }
    // The throw's fall plays two frames of the flight, smoothed: it keeps them as they are.
    const smoothed = smoothFighter({ ...source, table: { airHit: { every: 1 } } });
    expect(smoothed.played.clips.thrownFall).toBeUndefined();
    expect(smoothed.played.clips.airHit).toBeDefined();
  });

  it('9. cuts a loop all the same way, or not at all', () => {
    const smoothing: Smoothing = { every: 1.5, loop: true };
    const plan = planStrip({ sheet: 'idle', smoothing, ...source, keys: NAYO.keys('idle') ?? [] });
    const frozen = frozenOf(NAYO_CLIPS, NAYO_TEMPLATE);
    const idle = smoothClip('idle', NAYO_CLIPS.idle, plan, frozen, smoothing);
    const lengths = new Set<number>();
    let index = 0;
    for (const hold of NAYO_CLIPS.idle.ticks) {
      let pieces = 0;
      for (let ticks = 0; ticks < hold; pieces++) ticks += idle.ticks[index++] ?? Infinity;
      lengths.add(pieces);
    }
    expect(lengths.size).toBe(1);
    expect(totalOf(idle)).toBe(totalOf(NAYO_CLIPS.idle));
  });

  it('plays the keys where played.ts does not know a clip, or a strip has changed', () => {
    const played: Played = {
      sheets: { ko: { keys: 8, frames: 9 }, trip: { keys: 3, frames: 4 } },
      clips: {
        ko: { frames: [0, 8, 1, 2, 3, 4, 5, 6, 7], ticks: [2, 2, 4, 4, 4, 4, 4, 6, 1] },
        trip: { frames: [0, 3, 1, 2], ticks: [1, 1, 2, 9] },
      },
    };
    const clips = playedClips(NAYO_CLIPS, played, NAYO_SHEETS);
    expect(clips.ko.frames).toEqual([0, 8, 1, 2, 3, 4, 5, 6, 7]);
    expect(clips.ko.sheet).toBe('ko');
    // koLanding is not in played: its keys. The trip strip has 4 keys now, not 3: its keys.
    expect(clips.koLanding).toBe(NAYO_CLIPS.koLanding);
    expect(clips.trip).toBe(NAYO_CLIPS.trip);
  });

  it('gives a script the frames played between two keys (playedRange)', () => {
    const art = DRAWN_FIGHTERS[0]?.art;
    if (!art) throw new Error('No Nayo');
    const range = playedRange(art, 'ko', 1, 3);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(3);
    expect(range.length).toBeGreaterThan(3);
    expect(range.filter((frame) => frame < 8)).toEqual([1, 2, 3]);
    // No clip plays those keys so: the keys alone.
    expect(playedRange(art, 'jump', 2, 4)).toEqual([2, 3, 4]);
  });
});
