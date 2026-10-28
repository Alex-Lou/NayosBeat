import { describe, expect, it } from 'vitest';
import { ANCHOR, ART_SCALE, CELL_SIZE, clipOf } from '../../src/art/types';
import type { MatchConfig } from '../../src/core/config';
import { toPx } from '../../src/core/constants';
import { contactDistance } from '../../src/core/hold-pair';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { TRAINING_STAGE } from '../../src/data/stages';
import { clipFrameAt, showFighter, type Shown } from '../../src/render/animation';
import type { Point } from '../../tools/sprites/raster';
import { solve, type Side, type Skeleton } from '../../tools/sprites/skeleton';
import { atHoldTick, grabbed, play } from '../core/hold-helpers';
import { DRAWN_FIGHTERS, DRAWN_RIFF, stripOf, type DrawnFighter } from './fighters';

/**
 * The hold reads as one grip (docs/combat-v2.md §4, §11.1), for each fighter holding each one,
 * as the game plays the pair: the clips on both fighters, where the game places them (centres
 * at contact), the sides switching on the throw backward.
 * - Through the hold and the pummels, each of the holder's fists (its wrist plus 2.4 px along
 *   the forearm) lies on the held fighter's drawing, within GRIP px of it, at its collar: from
 *   the lapel, COLLAR.below px under the base of the neck (a knee hauls it that far down), to
 *   under the chin, COLLAR.above px over it. Nayo holding Nayo, the pair drawn first, sets these.
 * - Through the throw backward up to its release, the held fighter's neck rides in the fists,
 *   within PAIR_GAP px of the middle of the two hands.
 */
const GRIP = 1.5;
const COLLAR = { below: 14, above: 8 } as const;
const PAIR_GAP = 4;
const HAND = 2.4;

const hand = (side: Side): Point => ({
  x: side.wrist.x + side.forearm.x * HAND,
  y: side.wrist.y + side.forearm.y * HAND,
});

interface Drawn {
  readonly skeleton: Skeleton;
  readonly sheet: string;
  readonly frame: number;
  readonly shown: Shown;
}

/** What a fighter shows on a state: its strip's frame, its pose solved on its body. */
function drawnOf(state: GameState, player: 0 | 1, fighter: DrawnFighter, config: MatchConfig) {
  const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
  showFighter(state, player, config, fighter.art, shown);
  const clip = clipOf(fighter.art, shown.clip);
  const frame = clip.frames[clipFrameAt(clip, shown.tick)] ?? 0;
  const pose = fighter.generator.poses(clip.sheet)?.[frame];
  if (!pose) throw new Error(`${fighter.name} has no pose ${clip.sheet} ${frame}`);
  const drawn: Drawn = {
    skeleton: solve(pose, fighter.generator.body),
    sheet: clip.sheet,
    frame,
    shown,
  };
  return drawn;
}

/**
 * The pair on a state, in the holder's space (facing right, from its feet): its fists, and the
 * held fighter mirrored and placed where the game draws it.
 */
function pairOf(state: GameState, holder: DrawnFighter, held: DrawnFighter, config: MatchConfig) {
  const fists = drawnOf(state, 0, holder, config);
  const body = drawnOf(state, 1, held, config);
  const [holding, victim] = state.fighters;
  const offset = toPx(body.shown.x - holding.x) * holding.facing;
  const mirror = victim.facing * holding.facing;
  /** A point of the held fighter's own space, in the holder's. */
  const place = (p: Point): Point => ({ x: offset + p.x * mirror, y: p.y });
  /** Whether the held fighter is drawn within `slack` px of a point of the holder's space. */
  const drawnAt = (p: Point, slack: number): boolean => {
    const canvas = stripOf(held, body.sheet);
    const x = (p.x - offset) * mirror;
    for (let dy = -slack; dy <= slack; dy += 1 / ART_SCALE) {
      for (let dx = -slack; dx <= slack; dx += 1 / ART_SCALE) {
        const column = Math.floor(ANCHOR.x + (x + dx) * ART_SCALE);
        const row = Math.floor(ANCHOR.y - (p.y + dy) * ART_SCALE);
        if (column < 0 || column >= CELL_SIZE || row < 0 || row >= CELL_SIZE) continue;
        if (canvas.pixels[row * canvas.width + body.frame * CELL_SIZE + column] !== 0) return true;
      }
    }
    return false;
  };
  return {
    hands: [hand(fists.skeleton.near), hand(fists.skeleton.far)] as const,
    neck: place(body.skeleton.neck),
    drawnAt,
    clips: `${fists.shown.clip} / ${body.shown.clip}`,
  };
}

const at = (p: Point): string => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`;

describe.each(DRAWN_FIGHTERS)('$name holding', (holder) => {
  for (const held of DRAWN_FIGHTERS) {
    const config: MatchConfig = {
      stage: TRAINING_STAGE,
      fighters: [holder.template, held.template],
    };
    const start = atHoldTick(grabbed(config), 0, config);
    const contact = toPx(contactDistance(holder.template, held.template));

    it(`${held.name}: their centres at contact, ${contact} px apart`, () => {
      const [a, b] = start.fighters;
      expect(Math.abs(toPx(b.x - a.x))).toBe(contact);
      expect(contact).toBeGreaterThanOrEqual(26);
      expect(contact).toBeLessThanOrEqual(28);
    });

    it(`${held.name}: grips the collar through the hold and the pummels`, () => {
      // A pummel as soon as the clinch is over, and again until the hold runs out.
      const states = play(
        start,
        56,
        (tick) => [tick >= 12 && tick % 2 === 0 ? Input.Light : 0, 0],
        config,
      );
      const gripping = states.filter(
        (state) =>
          state.fighters[1].action === 'held' &&
          (state.fighters[0].move === null || state.fighters[0].move === 'pummel'),
      );
      expect(gripping.some((state) => state.fighters[0].move === 'pummel')).toBe(true);
      for (const state of gripping) {
        const { hands, neck, drawnAt, clips } = pairOf(state, holder, held, config);
        for (const fist of hands) {
          const where = `${clips}, hold tick ${state.hold?.frame}: fist at ${at(fist)}, neck at ${at(neck)}`;
          expect(drawnAt(fist, GRIP), `${where}, off the body`).toBe(true);
          expect(fist.y, where).toBeGreaterThanOrEqual(neck.y - COLLAR.below);
          expect(fist.y, where).toBeLessThanOrEqual(neck.y + COLLAR.above);
        }
      }
    });

    /** The ticks of the throw backward up to its release, as the game plays them. */
    function throwBack(): GameState[] {
      const back = start.fighters[0].facing === 1 ? Input.Left : Input.Right;
      const states = play(start, 40, (tick) => [tick === 12 ? back | Input.Heavy : 0, 0], config);
      const { startup } = holder.template.moves.throwBack;
      const throwing = states.filter(
        (state) =>
          state.fighters[0].move === 'throwBack' &&
          state.fighters[1].action === 'held' &&
          state.fighters[0].actionFrame < startup,
      );
      expect(new Set(throwing.map((state) => state.fighters[0].actionFrame)).size).toBe(startup);
      return throwing;
    }

    function expectInFists(state: GameState): void {
      const { hands, neck, clips } = pairOf(state, holder, held, config);
      const [near, far] = hands;
      const middle = { x: (near.x + far.x) / 2, y: (near.y + far.y) / 2 };
      const gap = Math.hypot(neck.x - middle.x, neck.y - middle.y);
      const tick = state.fighters[0].actionFrame;
      expect(
        gap,
        `${clips}, tick ${tick}: neck at ${at(neck)}, fists at ${at(middle)}`,
      ).toBeLessThanOrEqual(PAIR_GAP);
    }

    /**
     * Riff's monkey flip sits down under the thrown fighter and rolls onto her back from the
     * switch of sides (tick 6), while every thrownBack strip is drawn for a standing thrower
     * (Nayo's shoulder throw): its collar rises over his shoulders, about 20 px above her fists.
     * No pose of hers can reach it without standing up out of the flip, nor can the victims'
     * strips follow both throws: the art needs a second victim strip for a low throw (its collar
     * along about (20, 44), (6, 40), (-8, 34), (-28, 20) in her space, the director's arc) and
     * the clip that plays it against her throw. Until then her throw is checked up to the switch,
     * and the rest is known to miss.
     */
    const lowArc = holder === DRAWN_RIFF;
    const switchTick = holder.template.moves.throwBack.sideSwitchFrame ?? Infinity;

    it(`${held.name}: throws backward by the collar${lowArc ? ', up to the switch' : ', up to the release'}`, () => {
      const throwing = throwBack();
      for (const state of throwing) {
        if (!lowArc || state.fighters[0].actionFrame < switchTick) expectInFists(state);
      }
    });

    if (lowArc) {
      it.fails(
        `${held.name}: over the monkey flip, the collar leaves her fists (art to come)`,
        () => {
          for (const state of throwBack()) expectInFists(state);
        },
      );
    }
  }
});
