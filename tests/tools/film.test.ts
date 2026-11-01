import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Atlas } from '../../src/art/types';
import type { Replay } from '../../tools/replays/replay';
import { chaptersOf, comparePage } from '../../tools/anim/compare';
import { cpuTake, replayTake, shoot, type Film } from '../../tools/anim/film';

const REPLAYS = import.meta.glob<Replay>('../core/replays/ko.json', {
  eager: true,
  import: 'default',
});

function koReplay(): Replay {
  const [replay] = Object.values(REPLAYS);
  if (!replay) throw new Error('ko.json is missing');
  return replay;
}

/** The ticks where the two films show something different. */
function differences(before: Film, after: Film): number[] {
  return after.ticks.flatMap((tick, at) =>
    JSON.stringify(tick) === JSON.stringify(before.ticks[at]) ? [] : [at],
  );
}

describe('the films of the animation (docs/art/animation-plan.md §2, V0)', () => {
  it('films ko.json the same twice, before and after', () => {
    const take = replayTake('ko', koReplay());
    for (const legacy of [true, false]) {
      const film = shoot(take, legacy);
      expect(film.ticks).toHaveLength(take.states.length);
      expect(shoot(replayTake('ko', koReplay()), legacy)).toEqual(film);
    }
  });

  it('films the before and the after from the same fight: the same ticks, the same places', () => {
    const take = replayTake('ko', koReplay());
    const before = shoot(take, true);
    const after = shoot(take, false);
    expect(after.ticks.map((tick) => tick.frame)).toEqual(before.ticks.map((tick) => tick.frame));
    expect(after.ticks.map((tick) => tick.cameraX)).toEqual(
      before.ticks.map((tick) => tick.cameraX),
    );
    // The idle from its first frame as the fight starts; the victim trembling under each blow.
    const start = after.ticks.findIndex((tick) => tick.phase === 'fight');
    expect(after.ticks[start]?.fighters[0]).toMatchObject({ clip: 'idle', tick: 0 });
    expect(before.ticks[start]?.fighters[0]).toMatchObject({ clip: 'idle', tick: 90 });
    const trembles = (film: Film) =>
      film.ticks.filter((tick) => tick.fighters.some((fighter) => fighter.shake !== 0)).length;
    expect(trembles(before)).toBe(0);
    expect(trembles(after)).toBeGreaterThan(0);
  });

  it('films a CPU match to the end of its round: the KO lands with a thud, the victory whole', () => {
    // Seed 7: Riff knocks Nayo out in the air, then her victory (seed 15 until the CPU of
    // docs/polish/AUDIT-ET-PLAN.md, lot 5, which plays its seeds differently).
    const take = cpuTake(7);
    expect(take.states.at(-1)?.round.number).toBe(2);
    const before = shoot(take, true);
    const after = shoot(take, false);
    expect(before.ticks.some((tick) => tick.thud && tick.phase === 'roundEnd')).toBe(false);
    expect(after.ticks.some((tick) => tick.thud && tick.phase === 'roundEnd')).toBe(true);
    const victory = (film: Film) =>
      film.ticks.flatMap((tick) => tick.fighters.filter((each) => each.clip === 'victory'));
    expect(victory(after)[0]?.tick).toBe(0);
    expect(victory(before)[0]?.tick).toBeGreaterThan(0);
    expect(differences(before, after).length).toBeGreaterThan(0);
  });

  it("points the page's landing at the KO's, not at a fall both films show", () => {
    const take = cpuTake(7);
    const before = shoot(take, true);
    const after = shoot(take, false);
    const landing = new Map(chaptersOf(before, after)).get('retombée') ?? -1;
    expect(after.ticks[landing]).toMatchObject({ phase: 'roundEnd', thud: true });
    expect(after.ticks[landing]?.fighters[0].clip).toBe('koLanding');
    expect(before.ticks[landing]?.thud).toBe(false);
    // The film's first thud comes earlier: a knockdown in the fight, the same in both films.
    const first = after.ticks.findIndex((tick) => tick.thud);
    expect(first).toBeLessThan(landing);
    expect(before.ticks[first]?.thud).toBe(true);
    // Without a KO landing in the air, no button for it.
    const ko = replayTake('ko', koReplay());
    const labels = chaptersOf(shoot(ko, true), shoot(ko, false)).map(([label]) => label);
    expect(labels).not.toContain('retombée');
  });

  it('keeps the ticks asked, and makes one page of two films of the same ticks', async () => {
    const take = replayTake('ko', koReplay());
    const before = shoot(take, true, 100, 160);
    const after = shoot(take, false, 100, 160);
    expect(before.ticks).toHaveLength(60);
    expect(before.from).toBe(100);
    const page = await comparePage(before, after);
    expect(page).toContain('<canvas id="c0"');
    expect(page).toContain('data:image/png;base64,');
    await expect(comparePage(before, shoot(take, false, 0, 60))).rejects.toThrow();
  });

  it('puts each strip in the page with its atlas, where its frames are cut and packed', async () => {
    const take = replayTake('ko', koReplay());
    const page = await comparePage(shoot(take, true, 100, 130), shoot(take, false, 100, 130));
    const json = /\)\((\{"title".*\})\);<\/script>/s.exec(page)?.[1];
    if (json === undefined) throw new Error('The page holds no data');
    const data = JSON.parse(json) as {
      images: Record<string, string>;
      atlases: Record<string, Atlas>;
    };
    const keys = Object.keys(data.images);
    expect(keys.length).toBeGreaterThan(0);
    expect(Object.keys(data.atlases)).toEqual(keys);
    for (const key of keys) {
      const file = new URL(`../../src/art/${key}.json`, import.meta.url);
      expect(data.atlases[key], key).toEqual(JSON.parse(readFileSync(file, 'utf8')));
    }
  });
});
