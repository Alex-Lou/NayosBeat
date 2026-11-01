import { describe, expect, it } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { RIFF } from '../../src/art/riff';
import { clipOf, type ClipId } from '../../src/art/types';
import { ANIM_OPTIONS, LEGACY_ANIM } from '../../src/render/anim-options';
import {
  clipFrameAt,
  SHOW_NOW,
  showFighter,
  type ShowContext,
  type Shown,
} from '../../src/render/animation';
import { FightMemory } from '../../src/render/fight-memory';
import { playReplay, replayConfig, type Replay } from '../../tools/replays/replay';

const REPLAYS = import.meta.glob<Replay>('../core/replays/ko.json', {
  eager: true,
  import: 'default',
});

/** What both fighters show on every tick of ko.json, Nayo against Riff, in `context`. */
function shownIn(context?: ShowContext): Shown[] {
  const [replay] = Object.values(REPLAYS);
  if (!replay) throw new Error('ko.json is missing');
  const config = replayConfig(replay);
  const arts = [NAYO, RIFF] as const;
  const shown: Shown[] = [];
  playReplay(replay, (state) => {
    for (const player of [0, 1] as const) {
      const each: Shown = { clip: 'idle', tick: 0, x: 0 };
      showFighter(state, player, config, arts[player], each, context);
      shown.push(each);
    }
  });
  return shown;
}

describe('the animation options (docs/art/animation-plan.md §2, V0)', () => {
  it('play the animation of now by default, whatever the fight remembers', () => {
    expect(ANIM_OPTIONS.legacy).toBe(false);
    expect(SHOW_NOW.options).toBe(ANIM_OPTIONS);
    const now = shownIn();
    expect(shownIn(SHOW_NOW)).toEqual(now);
    expect(shownIn({ options: ANIM_OPTIONS, memory: new FightMemory() })).toEqual(now);
  });

  it('show, with the animation of before, the same clips: only the poses at rest keep their old clock', () => {
    const now = shownIn();
    const before = shownIn({ options: LEGACY_ANIM, memory: null });
    expect(before.map((each) => each.clip)).toEqual(now.map((each) => each.clip));
    expect(before.map((each) => each.x)).toEqual(now.map((each) => each.x));
    // The clips with in-betweens (F2) show their keys alone: the tick each key came on.
    const arts = [NAYO, RIFF] as const;
    const smoothed = (at: number, id: ClipId): boolean => {
      const art = arts[at % 2 === 0 ? 0 : 1];
      return art.keyClips?.[id] !== art.clips[id];
    };
    const changed = now.filter((each, at) => each.tick !== before[at]?.tick);
    const rest = changed.filter((each) => !smoothed(now.indexOf(each), each.clip));
    expect(changed.length).toBeGreaterThan(rest.length);
    expect(rest.length).toBeGreaterThan(0);
    expect(new Set(rest.map((each) => each.clip))).toEqual(new Set(['idle']));
  });

  it('show, with the animation of before, the keys alone where the clips have in-betweens', () => {
    const now = shownIn();
    const before = shownIn({ options: LEGACY_ANIM, memory: null });
    const arts = [NAYO, RIFF] as const;
    let compared = 0;
    now.forEach((each, at) => {
      const art = arts[at % 2 === 0 ? 0 : 1];
      const keys = art.keyClips?.[each.clip];
      const legacy = before[at];
      if (!keys || !legacy || keys === art.clips[each.clip] || each.clip === 'idle') return;
      const played = clipOf(art, each.clip);
      const shown = played.frames[clipFrameAt(played, legacy.tick)];
      expect(shown, `${each.clip} tick ${each.tick}`).toBe(
        keys.frames[clipFrameAt(keys, each.tick)],
      );
      compared++;
    });
    expect(compared).toBeGreaterThan(0);
  });
});
