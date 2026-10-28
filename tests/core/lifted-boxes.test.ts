import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import type { MoveId } from '../../src/core/move-data';
import { moveOf } from '../../src/core/moves';
import { RIFF } from '../../src/data/fighters/riff';
import { at, contactsBy, exchange, NAYO_VS_RIFF } from './exchange-helpers';
import { facingOff } from './helpers';
import { play, RIFF_MIRROR } from './hold-helpers';

/**
 * The boxes that lift Riff off the floor where her drawing does (docs/combat-v2.md §9.2,
 * §10.2): they change who wins an exchange, so each is pinned here against the blows that pass
 * under it, and the frames either side where those blows still hit her.
 */

const { Light, Heavy, Special, Down, Left, Right, Dash } = Input;

/** A blow of player 1's, by its move and the input that makes it. */
interface Blow {
  readonly config: MatchConfig;
  readonly id: MoveId;
  readonly input: InputBits;
}
const nayo = (id: MoveId, input: InputBits): Blow => ({ config: NAYO_VS_RIFF, id, input });
const riff = (id: MoveId, input: InputBits): Blow => ({ config: RIFF_MIRROR, id, input });

/**
 * Her moves whose drawing leaves the floor (player 2: her back is Right), the frames her body
 * is lifted on (`to` excluded), and the blows that pass under it there: every low of the
 * cast under the Retourné and the Genou montant, the Direct under the Saut de l'ange balled
 * up at its apex.
 */
const LIFTS = [
  {
    id: 'backHeavy',
    input: Right | Heavy,
    lifted: { from: 6, to: 11 },
    distance: 40,
    blows: [
      nayo('crouchLight', Down | Light),
      nayo('crouchHeavy', Down | Heavy),
      riff('crouchLight', Down | Light),
      riff('crouchHeavy', Down | Heavy),
    ],
  },
  {
    id: 'specialAntiAir',
    input: Down | Special,
    lifted: { from: 4, to: 16 },
    distance: 60,
    blows: [nayo('crouchHeavy', Down | Heavy)],
  },
  {
    id: 'specialForward',
    input: Left | Special,
    lifted: { from: 12, to: 16 },
    distance: 60,
    blows: [nayo('standLight', Light)],
  },
] as const;

/**
 * Player 1's blow timed so its first active tick meets frame `frame` of Riff's move: where
 * on that move (its frame) and how (CONTRE or PUNITION) each of its contacts landed.
 */
function blowOn(blow: Blow, lift: (typeof LIFTS)[number], frame: number) {
  const { startup } = moveOf(blow.config.fighters[0], blow.id);
  const pressed = Math.max(0, frame - startup);
  const leap = pressed + startup - frame;
  const states = play(
    facingOff(lift.distance, blow.config),
    60,
    (t) => [at(pressed, blow.input)(t), at(leap, lift.input)(t)],
    blow.config,
  );
  // Her move is on the frame before, as timed.
  expect(states[leap + frame - 1]?.fighters[1]).toMatchObject({
    move: lift.id,
    actionFrame: frame - 1,
  });
  return states.flatMap((state, tick) =>
    state.contacts
      .filter((contact) => contact.by === 0)
      .map((contact) => ({ frame: tick - leap, counter: contact.counter })),
  );
}

for (const lift of LIFTS) {
  const move = moveOf(RIFF, lift.id);
  const { from, to } = lift.lifted;

  describe(`${move.name}: lifted on frames ${from} to ${to - 1}`, () => {
    it.each(lift.blows)("$config.fighters.0.name's $id passes under, hits either side", (blow) => {
      const { active } = moveOf(blow.config.fighters[0], blow.id);
      for (let frame = from - 1; frame <= to; frame++) {
        // The first of the blow's active frames that meets her body, off the lifted ones.
        const hit = Array.from({ length: active }, (_, i) => frame + i).find(
          (on) => on < from || on >= to,
        );
        const counter = (on: number) => (on < move.startup + move.active ? 'counter' : 'punish');
        const expected = hit === undefined ? [] : [{ frame: hit, counter: counter(hit) }];
        expect(blowOn(blow, lift, frame), `first active on frame ${frame}`).toEqual(expected);
      }
    });
  });
}

describe('either side of the lifted frames', () => {
  it("the Uppercut still reaches the Saut de l'ange balled up at its apex", () => {
    const [apex] = LIFTS.filter((lift) => lift.id === 'specialForward');
    if (!apex) throw new Error("No Saut de l'ange");
    expect(blowOn(nayo('specialAntiAir', Down | Special), apex, 12)).toEqual([
      { frame: 12, counter: 'counter' },
    ]);
  });

  it('a low still touches the Retrait: its flip lifts her feet 12 px, under the lows (14)', () => {
    // Pressed so the Balayage's first active tick (9) meets her backdash's frame 5.
    const states = exchange(29, at(0, Down | Heavy), at(4, Right | Dash));
    expect(states[8]?.fighters[1]).toMatchObject({ move: 'dashBack', actionFrame: 4 });
    expect(contactsBy(states, 0)).toMatchObject([{ move: 'crouchHeavy', kind: 'hit' }]);
    expect(states.findIndex((state) => state.contacts.length > 0)).toBe(9);
  });
});
