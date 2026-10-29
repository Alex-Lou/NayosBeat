import type { FighterTemplate } from '../core/config';
import { toPx } from '../core/constants';
import { DIRECTIONS, Input, type InputBits } from '../core/input';
import type { MoveId } from '../core/move-data';
import { superGauge } from '../core/fighter/move';
import { moveOf } from '../core/moves';
import { BOOST_BAR, BOOST_MAX } from '../core/rules';
import {
  FLAG_MOVE_HIT,
  FLAG_SPENT_CANCEL,
  type FighterAction,
  type FighterState,
} from '../core/state';
import type { CpuLevel } from './profiles';
import { nextRandom } from './rng';

/**
 * The CPU's strings and juggles (docs/combos-v3.md §6.4), as data: after a move of its own that
 * connected, the steps of a route of §3.1 (Nayo) or §4 (Riff), drawn at random by the weight of
 * its level. Easy plays the beginner's routes alone, normal the strings and the Remixes, hard
 * the juggles, the Rewind and the super too: a route that spends the gauge is drawn only when
 * the gauge pays for it, so the CPU never presses BOOST (nor DASH for the Rewind) for nothing.
 * Once the move before has connected, each step is pressed again every other tick, the way a
 * player keeps a combo going, until its move comes out: a cancel at once, a link on the first
 * free tick. A route that drops is given up after the one blow that missed. The CPU reads only
 * its own state and what it sees of the opponent, never the opponent's inputs.
 */

/** When a plan applies, on the tick its move connects. */
export interface PlanCondition {
  /** The move hit (true) or was blocked (false). */
  readonly hit: boolean;
  /** Only on a CONTRE or a PUNITION (the Crochet that folds). */
  readonly counter?: true;
  /** Only on a crouching opponent (a low string). */
  readonly crouching?: true;
  /** Only this close (pixels between the two). */
  readonly maxDistancePx?: number;
  /**
   * Only with this much gauge (`superGauge`: never a second super in one sequence); a route
   * with a DASH step (the Rewind) only while the sequence has not spent it.
   */
  readonly minBoost?: number;
}

export interface Plan {
  /** The move that has just connected. */
  readonly after: MoveId;
  readonly when: PlanCondition;
  /** What to press next, written facing right: Right is forward. */
  readonly steps: readonly InputBits[];
  /** How often each level draws it among the plans that apply (0: never). */
  readonly weight: Readonly<Record<CpuLevel, number>>;
}

const { Light: L, Heavy: H, Special: S, Boost: X, Dash: R, Down: D, Left: B, Right: F } = Input;

const EASY = { easy: 3, normal: 1, hard: 1 } as const;
const STRING = { easy: 0, normal: 2, hard: 2 } as const;
const MIX = { easy: 0, normal: 1, hard: 2 } as const;
const JUGGLE = { easy: 0, normal: 0, hard: 3 } as const;
/** A Remix to end a string: normal and hard. */
const REMIX = { easy: 0, normal: 2, hard: 2 } as const;
/** The Rewind, the super, a Remix that juggles: hard only. */
const SPEND = { easy: 0, normal: 0, hard: 3 } as const;
const HIT = { hit: true } as const;
const BLOCKED = { hit: false } as const;
/**
 * A hit from this close at most: a route that drops farther, where its first blow still lands
 * (a link that no longer reaches, a launcher that whiffs). Each distance is the farthest the
 * route was measured to play out whole on the engine (tests/ai/plan-routes.test.ts).
 */
const within = (maxDistancePx: number) => ({ hit: true, maxDistancePx }) as const;
/** A hit from this close at most, with this much gauge to spend. */
const spending = (maxDistancePx: number, minBoost: number) =>
  ({ hit: true, maxDistancePx, minBoost }) as const;

/** Nayo's plans: the routes of combos-v3 §3.1 that need no gauge, from the move that connected. */
const NAYO_PLANS: readonly Plan[] = [
  // D1, D2: the beginner's two, wherever the Direct lands.
  { after: 'standLight', when: HIT, steps: [L, L], weight: EASY },
  { after: 'standLight', when: HIT, steps: [L, F | S], weight: EASY },
  // I1, I8, D4: the strings. The second Crochet, then the Double direct, fall short past these.
  { after: 'standLight', when: HIT, steps: [L, H, F | S], weight: STRING },
  {
    after: 'standLight',
    when: within(52),
    steps: [L, H, H, F | S],
    weight: { ...STRING, hard: 3 },
  },
  { after: 'standLight', when: within(46), steps: [B | L, B | L, B | L], weight: STRING },
  // Guarded: the high or the low end of the string, a 50/50 without a motion.
  { after: 'standLight', when: BLOCKED, steps: [L, F | H], weight: MIX },
  { after: 'standLight', when: BLOCKED, steps: [L, D | H], weight: MIX },
  // A1, A2 (the Quatre temps): the Cross into the Remontant chassé, then the phrase in the air.
  // From 30 to 46 px (combos-v3 §3.1): farther, the Cross pushes him out of the launcher's reach.
  { after: 'standLight', when: within(46), steps: [L, B | H, L, L, L], weight: JUGGLE },
  {
    after: 'standLight',
    when: within(46),
    steps: [L, B | H, L, L, F | H, L, L, L],
    weight: JUGGLE,
  },
  // D3: from the Jab chassé.
  { after: 'forwardLight', when: HIT, steps: [L, L], weight: EASY },
  // I7, D5: from the Coup bas, whose reach the next blow does not have.
  { after: 'crouchLight', when: within(39), steps: [D | L, H, F | S], weight: STRING },
  {
    after: 'crouchLight',
    when: { ...within(42), crouching: true },
    steps: [D | L, D | H],
    weight: MIX,
  },
  // I4, then the Crochet that folds the opponent on a CONTRE (A5): the Crochet reaches farther
  // than the Pied fendu, and than the Direct the fold starts over with.
  { after: 'standHeavy', when: within(60), steps: [H, F | S], weight: STRING },
  {
    after: 'standHeavy',
    when: { ...within(52), counter: true },
    steps: [L, L, H, H, F | S],
    weight: { easy: 0, normal: 2, hard: 4 },
  },
  { after: 'standHeavy', when: BLOCKED, steps: [S], weight: MIX },
  // A4: the boxer's hook then uppercut, at contact only (the Remontant chassé reaches 34 px).
  {
    after: 'standHeavy',
    when: within(34),
    steps: [B | H, L, L, L],
    weight: JUGGLE,
  },
  // I5, I6, A2 from an anti-air or a punish: the Remontant. The juggles go on wherever it lands;
  // the Uppercut that follows it at once reaches less far.
  { after: 'backHeavy', when: within(39), steps: [D | S], weight: EASY },
  { after: 'backHeavy', when: HIT, steps: [L, L, L], weight: STRING },
  { after: 'backHeavy', when: HIT, steps: [L, L, F | H, L, L, L], weight: JUGGLE },
  // With the gauge (combos-v3 §3.1). I9: the base combo ends on the Vinyle platine; the Pied
  // fendu platine sends up (normal stops there); A8, A9: the Uppercut catches the body coming
  // down; A7: the Rewind starts the phrase over; E3: the Mégabasse to end the base combo.
  { after: 'standLight', when: spending(52, BOOST_BAR), steps: [L, H, H, X], weight: REMIX },
  { after: 'standHeavy', when: spending(60, BOOST_BAR), steps: [H, F | X], weight: REMIX },
  {
    after: 'standHeavy',
    when: spending(55, BOOST_BAR),
    steps: [H, F | X, L, D | S],
    weight: SPEND,
  },
  {
    after: 'standLight',
    when: spending(48, BOOST_BAR),
    steps: [L, H, H, F | X, L, D | S],
    weight: SPEND,
  },
  {
    after: 'standLight',
    when: spending(46, BOOST_BAR),
    steps: [L, H, R, L, L, H, H, F | S],
    weight: SPEND,
  },
  { after: 'standLight', when: spending(52, BOOST_MAX), steps: [L, H, H, B | X], weight: SPEND },
  { after: 'standHeavy', when: spending(60, BOOST_MAX), steps: [H, B | X], weight: SPEND },
];

/** Riff's plans: her routes of combos-v3 §4 that need no gauge. */
const RIFF_PLANS: readonly Plan[] = [
  { after: 'standLight', when: HIT, steps: [L, L], weight: EASY },
  // Her Jab reaches 46 px, her strings' last blows less far.
  { after: 'standLight', when: within(44), steps: [L, H, H, S], weight: STRING },
  {
    after: 'standLight',
    when: within(41),
    steps: [L, H, H, D | S],
    weight: { ...STRING, hard: 3 },
  },
  { after: 'standLight', when: BLOCKED, steps: [L, F | H], weight: MIX },
  { after: 'standLight', when: BLOCKED, steps: [L, D | H], weight: MIX },
  // The Retourné sauté, then the phrase in the air, the Vrille picking it up again: the jump
  // must leave from close enough for the phrase to reach the body in the air.
  { after: 'standLight', when: within(42), steps: [L, B | H, L, L, L], weight: JUGGLE },
  {
    after: 'standLight',
    when: within(39),
    steps: [L, B | H, L, L, L, L, L, D | S],
    weight: JUGGLE,
  },
  { after: 'forwardLight', when: HIT, steps: [L, L], weight: EASY },
  { after: 'crouchLight', when: within(38), steps: [D | L, H, S], weight: STRING },
  { after: 'standHeavy', when: within(47), steps: [H, D | S], weight: STRING },
  { after: 'standHeavy', when: BLOCKED, steps: [S], weight: MIX },
  { after: 'backHeavy', when: HIT, steps: [D | S], weight: EASY },
  { after: 'backHeavy', when: HIT, steps: [L, L, L], weight: STRING },
  // The Vrille at the end must still reach the body the phrase carried away.
  { after: 'backHeavy', when: within(32), steps: [L, L, L, L, L, D | S], weight: JUGGLE },
  // With the gauge (combos-v3 §4): the Glissade or the Genou à fond to end the base combo, the
  // Pogo that starts the phrase over, the Slam.
  { after: 'standLight', when: spending(44, BOOST_BAR), steps: [L, H, H, X], weight: REMIX },
  { after: 'standLight', when: spending(41, BOOST_BAR), steps: [L, H, H, D | X], weight: REMIX },
  {
    after: 'standLight',
    when: spending(41, BOOST_BAR),
    steps: [L, H, R, L, L, H, H, D | S],
    weight: SPEND,
  },
  { after: 'standLight', when: spending(41, BOOST_MAX), steps: [L, H, H, B | X], weight: SPEND },
  { after: 'standHeavy', when: spending(47, BOOST_MAX), steps: [H, B | X], weight: SPEND },
];

/** Each fighter's plans, by its name. */
export const PLANS: Readonly<Record<string, readonly Plan[]>> = {
  Nayo: NAYO_PLANS,
  Riff: RIFF_PLANS,
};

/** What the CPU knows of its move, once it has connected and the game moves again. */
interface Connected {
  readonly move: MoveId;
  /** The gauge it can spend (`superGauge`), and whether its sequence still has the Rewind. */
  readonly boost: number;
  readonly rewind: boolean;
  /** It hit (`FLAG_MOVE_HIT`), or was blocked. */
  readonly hit: boolean;
  /** It caught the opponent attacking or recovering: the stun it gave is longer than its own. */
  readonly counter: boolean;
  readonly crouching: boolean;
  readonly distancePx: number;
}

/**
 * The steps of a plan for the move `me` plays, which has just connected on `opponent`, drawn
 * among those that apply by their weight for the level, and the seed after the draw. When none
 * applies, the special alone if the move cancels into one, as the CPU always did; else nothing.
 * A fighter without plans of its own always has that one.
 */
export function planFor(
  me: FighterState,
  opponent: FighterState,
  template: FighterTemplate,
  level: CpuLevel,
  seed: number,
): { steps: readonly InputBits[]; seed: number } {
  const [value, next] = nextRandom(seed);
  // Hard keeps its bars for its super once it has two: it spends no single one then.
  const saving = level === 'hard' && savesForSuper(superGauge(me));
  const applying = plansFor(me, opponent, template).filter(
    (plan) => !(saving && plan.when.minBoost === BOOST_BAR),
  );
  let left = value * applying.reduce((total, plan) => total + plan.weight[level], 0);
  for (const plan of applying) {
    left -= plan.weight[level];
    if (left < 0) return { steps: plan.steps, seed: next };
  }
  const special = me.move && moveOf(template, me.move).cancelInto?.includes('special');
  return { steps: special ? [S] : [], seed: next };
}

/**
 * Whether a hard CPU with `boost` keeps it for its super (docs/combos-v3.md §6.4): from two bars
 * on, it spends no single one, and lets the super go at three.
 */
export function savesForSuper(boost: number): boolean {
  return boost >= 2 * BOOST_BAR && boost < BOOST_MAX;
}

/** The plans of `template` that apply to the move `me` plays, which has just connected. */
export function plansFor(
  me: FighterState,
  opponent: FighterState,
  template: FighterTemplate,
): readonly Plan[] {
  if (!me.move) return [];
  const connected: Connected = {
    move: me.move,
    boost: superGauge(me),
    rewind: (me.flags & FLAG_SPENT_CANCEL) === 0,
    hit: (me.flags & FLAG_MOVE_HIT) !== 0,
    counter: opponent.stunTotal > moveOf(template, me.move).hitstun,
    crouching: opponent.crouching,
    distancePx: toPx(Math.abs(opponent.x - me.x)),
  };
  return (PLANS[template.name] ?? []).filter((plan) => applies(plan, connected));
}

function applies({ after, when, steps }: Plan, connected: Connected): boolean {
  return (
    after === connected.move &&
    when.hit === connected.hit &&
    (!when.counter || connected.counter) &&
    (!when.crouching || connected.crouching) &&
    (when.maxDistancePx === undefined || connected.distancePx <= when.maxDistancePx) &&
    connected.boost >= (when.minBoost ?? 0) &&
    (connected.rewind || !steps.some((step) => (step & Input.Dash) !== 0))
  );
}

/** A plan being played: the steps left, and the move playing on the tick before. */
export interface StringPlay {
  readonly steps: readonly InputBits[];
  readonly move: MoveId | null;
  readonly frame: number;
  /** Ticks the current step has been pressed for. */
  readonly pressed: number;
  /** The move of the step before connected (hit or blocked): only then is the next one pressed. */
  readonly connected: boolean;
}

/** Ticks a step is pressed for before the CPU gives the plan up (the combo dropped). */
const STEP_PATIENCE = 50;

/** States in which a plan goes on: attacking, or free between two blows (a link). */
const PLAYING: ReadonlySet<FighterAction> = new Set([
  'attack',
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'guard',
]);

/** States of an opponent a link can still catch: reeling from the blow, or still blocking. */
const CAUGHT: ReadonlySet<FighterAction> = new Set(['hitstun', 'airHit', 'blockstun']);

const DROPPED = { input: 0, next: null } as const;

/** The plan `steps` starts on the tick the move `me` plays connected. */
export function startString(steps: readonly InputBits[], me: FighterState): StringPlay {
  return { steps, move: me.move, frame: me.actionFrame, pressed: 0, connected: true };
}

/**
 * One tick of a plan: what to press (the step, again every other tick, its direction held
 * between; turned to the side faced), and the plan after it, null once its last move came out,
 * or given up. Nothing follows up a move that has not connected (a cancel needs the contact
 * anyway), so the press of a step never lingers in the buffer to come out of a whiff; once that
 * move is over, or once the opponent is free before a link, the combo dropped: the plan is given
 * up there, and the CPU decides again (guard, threats) instead of swinging at nothing.
 */
export function playString(
  play: StringPlay,
  me: FighterState,
  opponent: FighterState,
): { input: InputBits; next: StringPlay | null } {
  if (!PLAYING.has(me.action)) return DROPPED;
  const out = me.move !== null && me.actionFrame === 0;
  const came = out && (me.move !== play.move || play.frame > 0);
  const steps = came ? play.steps.slice(1) : play.steps;
  const pressed = came ? 0 : play.pressed;
  // The Rewind cancels without contact: the next step follows it at once.
  const connected = !came && (play.connected || me.moveConnected || me.move === 'boostCancel');
  const [step] = steps;
  if (step === undefined || pressed >= STEP_PATIENCE) return DROPPED;
  const attacking = me.action === 'attack';
  if (!attacking && (!connected || !CAUGHT.has(opponent.action))) return DROPPED;
  const frame = me.actionFrame;
  if (!connected) return { input: 0, next: { steps, move: me.move, frame, pressed, connected } };
  const written = pressed % 2 === 0 ? step : step & DIRECTIONS;
  const input = me.facing === 1 ? written : mirrored(written);
  const next = { steps, move: me.move, frame, pressed: pressed + 1, connected };
  return { input, next };
}

/** Left and right exchanged: a plan written facing right, played facing left. */
function mirrored(input: InputBits): InputBits {
  const left = input & Input.Left ? Input.Right : 0;
  const right = input & Input.Right ? Input.Left : 0;
  return (input & ~(Input.Left | Input.Right)) | left | right;
}
