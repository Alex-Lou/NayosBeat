import type { FighterTemplate } from './config';
import { MOVE_IDS, REMIX_OF, type MoveData, type MoveId } from './move-data';
import { moveDuration } from './moves';
import {
  BOOST_BAR,
  BOOST_GAIN_HIT_DEN,
  BOOST_GAIN_HIT_NUM,
  BOOST_GAIN_HITS,
  BOOST_GAIN_SPECIAL,
  BOOST_MAX,
  COMBO_LIMIT,
  COMBO_SCALING_FLOOR,
  COMBO_SCALING_STEP,
  COUNTER_DAMAGE_PERCENT,
  DECAY_FROM,
  DECAY_STEP,
  HOLD_LIMIT_FRAMES,
} from './rules';

/**
 * The checks of the Boost layer (docs/combos-v3.md §1.12, rules 3, 4, 9, 10, 11 and 13): the
 * Remixes keep their special's timing, each spend costs what it says, the Rewind and the super
 * are what the cancel ladder expects, and no combo gives back a whole bar (the anti-infinite
 * proof, §1.13 (2)). Called by `validateTemplate`, each problem prefixed with the fighter's
 * name.
 */

/**
 * The DROP's damage bonus (docs/combat-v2.md §8, the Crossfader of phase 5), counted in the
 * bound already: it must still hold once the DROP comes.
 */
const DROP_BONUS_PERCENT = 10;

export function boostProblems(template: FighterTemplate): string[] {
  const problems: string[] = [];
  const expect = (condition: boolean, message: string): void => {
    if (!condition) problems.push(message);
  };
  for (const id of MOVE_IDS) {
    const move = template.moves[id];
    if (!move) continue;
    problems.push(...tierProblems(template, id, move));
    // Rule 4: a bar for a Remix or the Rewind, three for the super, nothing else costs.
    const cost = move.boostCost ?? 0;
    const due =
      id === 'boostCancel' || move.tier === 2 ? BOOST_BAR : move.tier === 3 ? BOOST_MAX : 0;
    expect(cost === due, `${id} must cost ${due} of the gauge, not ${cost}`);
    if (move.kind === 'special' || move.projectile) {
      expect(!move.cancelInto, `${id}: a special or a projectile has no cancelInto (the ladder)`);
    }
    if (move.flash) {
      // Rule 11.
      const { frame, ticks } = move.flash;
      expect(
        id === 'boostCancel' || move.tier === 3,
        `${id}: only the super and the Rewind freeze the game`,
      );
      expect(
        isInteger(frame, 0) && frame < move.startup && isInteger(ticks, 1),
        `${id}.flash must freeze at least a tick on a frame before its startup`,
      );
    }
    if (move.pulses) problems.push(...pulseProblems(id, move));
  }
  const rewind = template.moves.boostCancel;
  if (rewind) {
    // Rule 9.
    expect(
      rewind.kind === 'movement' &&
        rewind.freeCancelFrom !== undefined &&
        (rewind.cancelInto ?? []).every((kind) => kind === 'normal' || kind === 'special'),
      'boostCancel: the Rewind is a movement cancelled freely into normals and specials',
    );
  }
  problems.push(...gainProblems(template));
  return problems;
}

/**
 * Rule 3: a Remix keeps its special's timing, the super flashes and hits soon after, its blows
 * before the last hold the body until the next, and its last floors.
 */
function tierProblems(template: FighterTemplate, id: MoveId, move: MoveData): string[] {
  const problems: string[] = [];
  const plainId = remixed(id);
  if ((move.tier === 2) !== (plainId !== undefined)) {
    problems.push(`${id}: only the Remixes (and all of them) are of tier 2`);
  }
  if ((move.tier === 3) !== (id === 'super')) {
    problems.push(`${id}: only the super (and it) is of tier 3`);
  }
  if (move.tier !== undefined && move.kind !== 'special') {
    problems.push(`${id}: a tier belongs to a special`);
  }
  const plain = plainId && template.moves[plainId];
  if (
    plain &&
    (plain.startup !== move.startup ||
      plain.active !== move.active ||
      plain.recovery !== move.recovery)
  ) {
    problems.push(`${id}: a Remix keeps the timing of its special (D18)`);
  }
  if (move.tier === 3) {
    const flash = move.flash;
    if (!flash || move.startup - flash.frame > 2) {
      problems.push(`${id}: the super flashes, then hits 2 ticks after the freeze at most`);
    }
    if (move.juggleCost !== 0 || (move.pulses ?? []).some((pulse) => pulse.hit.juggleCost !== 0)) {
      problems.push(`${id}: the super's blows spend no juggle point`);
    }
    // The Finisher's KO falls on a big blow (docs/finisher.md §1.6): the one that floors.
    const last = move.pulses?.[move.pulses.length - 1]?.hit ?? move;
    if (!last.knockdown) problems.push(`${id}: the super's last blow sends to the floor`);
    // Its lock follows the body from blow to blow (`everyBlowLands`, finisher.ts).
    if (!holdsToTheNext(move)) {
      problems.push(`${id}: the super's blows before its last hold the body until the next`);
    }
  }
  return problems;
}

/**
 * The super's blows before its last leave the body as any blow does, neither floored nor
 * extended, without a CONTRE of their own, and stun it until the next one lands, even decayed
 * as late in a combo as the super's room allows (COMBO_LIMIT).
 */
function holdsToTheNext(move: MoveData): boolean {
  const decay = DECAY_STEP * Math.max(0, COMBO_LIMIT - 1 - DECAY_FROM);
  let blow = move;
  let from = move.startup;
  for (const pulse of move.pulses ?? []) {
    const plain = !blow.knockdown && !blow.extender && !blow.counter;
    if (!plain || blow.hitstun - decay < pulse.frame - from) return false;
    blow = pulse.hit;
    from = pulse.frame;
  }
  return true;
}

/** Rule 10: the pulses follow each other within the active frames, on the super only. */
function pulseProblems(id: MoveId, move: MoveData): string[] {
  const problems: string[] = [];
  if (move.tier !== 3) problems.push(`${id}: only the super has pulses`);
  let previous = move.startup;
  for (const { frame, hit } of move.pulses ?? []) {
    if (!(isInteger(frame, previous + 1) && frame < move.startup + move.active)) {
      problems.push(`${id}: its pulses must follow each other within its active frames`);
    }
    if (!(hit.damage >= 1 && hit.pushback > 0)) {
      problems.push(`${id}: each of its pulses deals damage and pushes back`);
    }
    previous = frame;
  }
  return problems;
}

/** Rule 13: no combo nor hold gives back a whole bar. */
function gainProblems(template: FighterTemplate): string[] {
  const problems: string[] = [];
  const combo = maxComboGain(template);
  const hold = maxHoldGain(template);
  if (combo >= BOOST_BAR) problems.push(`a combo can give ${combo} of the gauge (a bar at most)`);
  if (hold >= BOOST_BAR) problems.push(`a hold can give ${hold} of the gauge (a bar at most)`);
  return problems;
}

/**
 * The most a combo can give its attacker (docs/combos-v3.md §1.8.2): its first BOOST_GAIN_HITS
 * hits (the only ones that give), each the fighter's heaviest blow that is not a Boost move,
 * scaled as the combo goes, the first a CONTRE, all of them in a DROP, plus the gain of the
 * special that may open it. 864 for Nayo, whose Uppercut deals 110.
 */
export function maxComboGain(template: FighterTemplate): number {
  const heaviest = Math.max(
    ...MOVE_IDS.flatMap((id) => {
      const move = template.moves[id];
      return move && move.kind !== 'throw' && !move.boostCost ? [move.damage] : [];
    }),
  );
  let gain = BOOST_GAIN_SPECIAL;
  for (let hit = 1; hit <= BOOST_GAIN_HITS; hit++) {
    const scaling = Math.max(COMBO_SCALING_FLOOR, 100 - COMBO_SCALING_STEP * (hit - 1));
    const bonus = 100 + (hit === 1 ? COUNTER_DAMAGE_PERCENT : 0) + DROP_BONUS_PERCENT;
    gain += gainOf(Math.trunc((heaviest * scaling * bonus) / 10000));
  }
  return gain;
}

/**
 * The most a hold can give its holder: its pummels for as long as it can last, then its
 * heaviest throw, at fixed damage.
 */
export function maxHoldGain(template: FighterTemplate): number {
  const { pummel, throwForward, throwBack } = template.moves;
  const pummels = Math.ceil(HOLD_LIMIT_FRAMES / moveDuration(pummel));
  return gainOf(pummels * pummel.damage + Math.max(throwForward.damage, throwBack.damage));
}

/** What a hit of `damage` gives its attacker. */
function gainOf(damage: number): number {
  return Math.trunc((damage * BOOST_GAIN_HIT_NUM) / BOOST_GAIN_HIT_DEN);
}

/** The special a Remix keeps the strip and timing of. */
function remixed(id: MoveId): MoveId | undefined {
  return (REMIX_OF as Partial<Record<MoveId, MoveId>>)[id];
}

function isInteger(value: number, min: number): boolean {
  return Number.isInteger(value) && value >= min;
}
