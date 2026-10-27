import { describe, expect, it } from 'vitest';
import type { Command } from '../../src/core/commands';
import type { FighterMoves, FighterTemplate } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import { OPTIONAL_MOVE_IDS, type MoveData, type MoveId } from '../../src/core/move-data';
import type { Motion } from '../../src/core/motion';
import { airMove, groundMove, holdMove } from '../../src/core/moves';
import type { Facing } from '../../src/core/state';
import { validateTemplate } from '../../src/core/validate';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { playCombo } from './combo-helpers';
import { facingOff, makeFighter, MIRROR_MATCH, playAlone, repeat } from './helpers';

/**
 * The command → move table of docs/combat-v2.md §2.8, row by row, facing either way (forward
 * and back are relative to the side faced), and the fallback of the optional moves.
 */

const { Up, Down, Left, Right, Light, Heavy, Special, Grab } = Input;

/** Nayo without any optional move: what a future fighter with only the basics plays. */
const BASIC: FighterTemplate = {
  ...NAYO,
  moves: {
    ...(Object.fromEntries(
      Object.entries(NAYO.moves).filter(
        ([id]) => !(OPTIONAL_MOVE_IDS as readonly string[]).includes(id),
      ),
    ) as FighterMoves),
    // Its jab has no chain to give.
    standLight: Object.fromEntries(
      Object.entries(NAYO.moves.standLight).filter(([field]) => field !== 'chain'),
    ) as MoveData,
  },
};

interface Row {
  readonly command: Command;
  /** Directions held, written facing right. */
  readonly held: InputBits;
  readonly motion?: Motion;
  /** The chain of the move being cancelled. */
  readonly chain?: MoveId;
  readonly move: MoveId | null;
  /** Without the optional moves. */
  readonly basic?: MoveId;
}

/** The table, in its order: the first row that applies wins. */
const TABLE: readonly Row[] = [
  // 1. The grab, whatever is held or done.
  { command: 'grab', held: Down, motion: 'dragonPunch', move: 'grab' },
  // 2-3. A fresh motion turns any attack button into its special, before anything else.
  { command: 'light', held: Down | Right, motion: 'dragonPunch', move: 'specialAntiAir' },
  { command: 'heavy', held: Right, motion: 'quarterCircleForward', move: 'special' },
  { command: 'special', held: Right, motion: 'quarterCircleForward', move: 'special' },
  {
    command: 'light',
    held: 0,
    motion: 'quarterCircleForward',
    chain: 'chainLight',
    move: 'special',
  },
  // 4. The special button by direction: down (diagonals too), forward, otherwise.
  { command: 'special', held: Down | Left, move: 'specialAntiAir' },
  { command: 'special', held: Right, move: 'specialForward' },
  { command: 'special', held: Left, move: 'special' },
  { command: 'special', held: 0, chain: 'chainLight', move: 'special' },
  // 5. L in the cancel of a move with a chain, whatever is held.
  { command: 'light', held: Down | Right, chain: 'chainLight', move: 'chainLight' },
  { command: 'light', held: Left, chain: 'lightFinisher', move: 'lightFinisher' },
  { command: 'heavy', held: 0, chain: 'chainLight', move: 'standHeavy' },
  // 6. Down (diagonals too).
  { command: 'light', held: Down | Right, move: 'crouchLight' },
  { command: 'heavy', held: Down | Left, move: 'crouchHeavy' },
  // 7. Forward + L.
  { command: 'light', held: Right, move: 'forwardLight', basic: 'standLight' },
  { command: 'light', held: Up | Right, move: 'forwardLight', basic: 'standLight' },
  // 8. Forward + H, back + H.
  { command: 'heavy', held: Right, move: 'forwardHeavy', basic: 'standHeavy' },
  { command: 'heavy', held: Left, move: 'backHeavy', basic: 'standHeavy' },
  // 9. Otherwise: back + L stays the jab.
  { command: 'light', held: Left, move: 'standLight' },
  { command: 'light', held: 0, move: 'standLight' },
  { command: 'heavy', held: 0, move: 'standHeavy' },
  // 10-11. Dashes; the jump is no move.
  { command: 'dash', held: Right, move: 'dashForward' },
  { command: 'backdash', held: Left, move: 'dashBack' },
  { command: 'jump', held: Up, move: null },
];

/** `bits` as seen by a fighter facing `facing` (written facing right). */
function facing(bits: InputBits, side: Facing): InputBits {
  if (side === 1) return bits;
  const left = bits & Left ? Right : 0;
  const right = bits & Right ? Left : 0;
  return (bits & ~(Left | Right)) | left | right;
}

describe('command → move (§2.8)', () => {
  for (const row of TABLE) {
    const { command, held, motion = null, chain, move, basic = move } = row;
    const label = `${command}, held ${held}${motion ? `, ${motion}` : ''}${chain ? `, chain ${chain}` : ''}`;
    it(`${label}: ${String(move)}`, () => {
      for (const side of [1, -1] as const) {
        const input = facing(held, side);
        expect(groundMove(command, input, motion, side, NAYO.moves, chain)).toBe(move);
        expect(groundMove(command, input, motion, side, RIFF.moves, chain)).toBe(move);
        expect(groundMove(command, input, motion, side, BASIC.moves, chain)).toBe(basic);
      }
    });
  }

  it('in the air: L and H only, no special, grab nor dash', () => {
    expect(airMove('light')).toBe('jumpLight');
    expect(airMove('heavy')).toBe('jumpHeavy');
    for (const command of ['special', 'grab', 'dash', 'backdash', 'jump'] as const) {
      expect(airMove(command)).toBeNull();
    }
  });

  it('holding: L pummels; H, S or the grab throw, backward with back held', () => {
    expect(holdMove('light', Left, 1)).toBe('pummel');
    for (const command of ['heavy', 'special', 'grab'] as const) {
      expect(holdMove(command, 0, 1)).toBe('throwForward');
      expect(holdMove(command, Left, 1)).toBe('throwBack');
      expect(holdMove(command, Right, -1)).toBe('throwBack');
    }
  });
});

describe('optional moves', () => {
  it('may be left out: a fighter with the core moves alone is valid', () => {
    expect(validateTemplate(BASIC)).toEqual([]);
  });

  it('fall back on the standing normal in a fight, forward or back held', () => {
    const forward = playAlone(BASIC, [Right | Light]);
    expect(forward[0]?.move).toBe('standLight');
    const back = playAlone(BASIC, [Left | Heavy]);
    expect(back[0]?.move).toBe('standHeavy');
  });

  it('cannot chain into a move the fighter does not have', () => {
    const broken = { ...BASIC, moves: { ...BASIC.moves, standLight: NAYO.moves.standLight } };
    expect(validateTemplate(broken).join()).toMatch(/standLight\.chain/);
  });

  it('are played by every command that asks for them, in a fight', () => {
    const asks: readonly [InputBits, MoveId][] = [
      [Right | Light, 'forwardLight'],
      [Right | Heavy, 'forwardHeavy'],
      [Left | Heavy, 'backHeavy'],
    ];
    for (const [input, move] of asks) {
      expect(playAlone(NAYO, [input])[0]?.move).toBe(move);
      expect(playAlone(RIFF, [input], makeFighter({ health: 900 }))[0]?.move).toBe(move);
    }
  });

  it('chain on L only once the move has touched: a jab in the air does not chain', () => {
    const whiffed = playAlone(NAYO, [Light, 0, Light, ...repeat(0, 20)]);
    expect(whiffed.some((state) => state.move === 'chainLight')).toBe(false);
    const landed = playCombo(facingOff(40, MIRROR_MATCH), MIRROR_MATCH, [Light, Light]);
    expect(landed.hits.map((hit) => hit.move)).toEqual(['standLight', 'chainLight']);
  });

  it('give the grab before anything else', () => {
    expect(groundMove('grab', Right, null, 1, NAYO.moves, 'chainLight')).toBe('grab');
    expect(playAlone(NAYO, [Grab | Right])[0]?.move).toBe('grab');
  });

  it('read the special button before the chain', () => {
    expect(playAlone(NAYO, [Special])[0]?.move).toBe('special');
  });
});
