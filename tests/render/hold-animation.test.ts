import { describe, expect, it } from 'vitest';
import { NAYO as NAYO_ART } from '../../src/art/nayo';
import type { ClipId } from '../../src/art/types';
import { flightTicks } from '../../src/core/fighter/air';
import { contactDistance } from '../../src/core/hold-pair';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { clipIdOf, frontFighter, showFighter, type Shown } from '../../src/render/animation';
import { atHoldTick, grabbed, NAYO_MIRROR, play } from '../core/hold-helpers';
import { makeFighter } from '../core/helpers';

const FIGHTING = {
  number: 1,
  wins: [0, 0],
  timer: 5000,
  phase: 'fight',
  phaseFrame: 30,
  result: null,
} as const;

/** What player 2, thrown, shows on a state. */
function shownOf(state: GameState): Shown {
  const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  showFighter(state, 1, NAYO_MIRROR, NAYO_ART, shown);
  return shown;
}

describe('the clips of the hold (docs/combat-v2.md §11.1)', () => {
  it('shows the holder between its moves, its moves, the held fighter and the tech', () => {
    const clip = (overrides: Parameters<typeof makeFighter>[0]): ClipId =>
      clipIdOf(makeFighter(overrides), 0, FIGHTING);
    expect(clip({ action: 'holding' })).toBe('hold');
    expect(clip({ action: 'holding', move: 'pummel' })).toBe('pummel');
    expect(clip({ action: 'held' })).toBe('held');
    expect(clip({ action: 'tech' })).toBe('tech');
  });

  it('draws the holder over the fighter it holds', () => {
    const holder = makeFighter({ action: 'holding' });
    const held = makeFighter({ action: 'held' });
    expect(frontFighter(1, holder, held)).toBe(0);
    expect(frontFighter(0, held, holder)).toBe(1);
  });
});

/**
 * The throw backward reads as one motion (§4.3, the art handoff): the thrown fighter plays
 * thrownBack frame for frame with the throw, then holds its last frame where it was let go
 * while its body flies, then falls at its real place on the last ticks before the knockdown.
 */
describe('the throw backward on screen', () => {
  const start = atHoldTick(grabbed(), 12);
  const states = play(start, 60, (tick) => [tick === 0 ? Input.Left | Input.Heavy : 0, 0]);
  const { startup, knockdown } = NAYO.moves.throwBack;
  const landing = flightTicks(knockdown?.vy ?? 0);

  it('plays in step with the thrower, up to the release', () => {
    const held = states.filter((s) => s.fighters[1].action === 'held');
    expect(held).toHaveLength(startup);
    for (const state of held) {
      expect(shownOf(state)).toMatchObject({
        clip: 'thrownBack',
        tick: state.fighters[0].actionFrame,
        x: state.fighters[1].x,
      });
    }
  });

  it('flies from where it was let go, then falls where its body is', () => {
    const flying = states.filter((s) => s.fighters[1].action === 'airHit');
    // Its frames 0 to the landing's, the first one held through the release's freeze.
    expect(new Set(flying.map((s) => s.fighters[1].actionFrame)).size).toBe(landing);
    const [thrower] = flying[0]?.fighters ?? [];
    const releaseX = (thrower?.x ?? 0) - contactDistance(NAYO, NAYO);
    const fall = NAYO_ART.clips.thrownFall.frames.length;
    for (const state of flying) {
      const victim = state.fighters[1];
      const shown = shownOf(state);
      if (victim.actionFrame < landing - fall) {
        expect(shown).toMatchObject({ clip: 'thrownBack', x: releaseX });
      } else {
        expect(shown).toMatchObject({ clip: 'thrownFall', x: victim.x });
      }
    }
    const down = states.find((s) => s.fighters[1].action === 'knockdown');
    if (!down) throw new Error('The throw did not land');
    expect(shownOf(down)).toMatchObject({ clip: 'knockdown', x: down.fighters[1].x });
  });
});
