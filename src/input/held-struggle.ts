import { heldOf } from '../core/hold-pair';
import { Input, type InputBits } from '../core/input';
import { GRAB_TECH_FRAMES } from '../core/rules';
import type { GameState } from '../core/state';

/**
 * A held button presses again every this many ticks: 5 a second, the pace of the CPU Normal,
 * under the Hard one's 8 (docs/polish/AUDIT-ET-PLAN.md, P25): mashing stays the faster way out.
 */
export const HELD_STRUGGLE_PERIOD = 12;

/** The buttons that struggle out of a hold, as the core counts them (core/hold.ts, §4.2). */
const STRUGGLE_BUTTONS =
  Input.Jump | Input.Light | Input.Heavy | Input.Special | Input.Grab | Input.Dash;

/**
 * « Lutte en prise : tenir » (P25, L25): a player held in a grab may hold a button instead of
 * mashing it. Past the clinch (the tech's window stays as it is), a struggle button held down is
 * let go one tick in HELD_STRUGGLE_PERIOD: the core sees a press each time, as from a hand that
 * mashes. A hand that mashes plays as it always did; the CPU's inputs never come through here.
 * Before the core, so the replays never see it.
 */
export class HeldStruggle {
  /** Ticks each player has held a struggle button down, held past the clinch. */
  private readonly held: [number, number] = [0, 0];

  constructor(private on: boolean) {}

  /** The option, from now on (the pause's « Options »). */
  set(on: boolean): void {
    this.on = on;
  }

  /** What `player` plays on the tick after `state`, from what it holds (`bits`). */
  apply(player: 0 | 1, bits: InputBits, state: GameState): InputBits {
    const { hold } = state;
    const struggling =
      this.on &&
      hold !== null &&
      heldOf(hold) === player &&
      hold.frame >= GRAB_TECH_FRAMES &&
      (bits & STRUGGLE_BUTTONS) !== 0;
    if (!struggling) {
      this.held[player] = 0;
      return bits;
    }
    const tick = this.held[player]++;
    return tick % HELD_STRUGGLE_PERIOD === HELD_STRUGGLE_PERIOD - 1
      ? bits & ~STRUGGLE_BUTTONS
      : bits;
  }
}
