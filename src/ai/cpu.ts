import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { superGauge } from '../core/fighter/move';
import { Input, type InputBits } from '../core/input';
import type { MoveData } from '../core/move-data';
import { BOOST_BAR, BOOST_MAX, THREAT_MARGIN } from '../core/rules';
import type { FighterAction, FighterState, GameState } from '../core/state';
import { moveOf } from '../core/moves';
import { strikeThreatens, threatReach, upcomingMove } from '../core/threat';
import {
  armedSuper,
  finisherMenace,
  guardInput,
  incomingProjectile,
  leavesGround,
} from './defense';
import { holdInput } from './hold-tactics';
import {
  planFor,
  playString,
  savesForSuper,
  startString,
  superOutlook,
  type StringPlay,
  type SuperOutlook,
} from './plans';
import { PROFILES, REACTION_JITTER, type CpuLevel, type Profile } from './profiles';
import { nextRandom } from './rng';

export type { CpuLevel } from './profiles';
/** Training dummies do not play: they stand still or block everything. */
export type CpuBehavior = CpuLevel | 'dummyStand' | 'dummyBlock';

/** States in which the CPU makes decisions: it can act on its next input. */
const DECISION_ACTIONS: ReadonlySet<FighterAction> = new Set([
  'idle',
  'walkForward',
  'walkBack',
  'crouch',
  'guard',
]);

/** Distances in pixels deciding the CPU's game plan. */
const CLOSE_RANGE = 60;
const MID_RANGE = 150;
const ANTI_AIR_RANGE = 80;
const BLOCK_HOLD_FRAMES = 14;
/** How often a hard CPU with the gauge for it reverses a blow (docs/combos-v3.md §6.4). */
const REVERSAL_CHANCE = 0.25;
/**
 * A wary CPU against an armed super that stays on the ground: no closer than its lock reaches
 * (the Mégabasse, 69 px at most: docs/finisher.md §1.5), no special this close (§1.8).
 */
const KEEP_AWAY_RANGE = 75;
const NO_SPECIAL_RANGE = 80;

/** The opponent as the CPU saw it on a tick. */
interface Sight {
  readonly fighter: FighterState;
  /** The ticks the game had played by then, the frozen ones not counted: nothing moved on them. */
  readonly clock: number;
}

export interface CpuState {
  readonly player: 0 | 1;
  readonly behavior: CpuBehavior;
  readonly seed: number;
  /** What it saw, oldest first, one per tick: the CPU acts on what it saw `reaction` ago. */
  readonly seen: readonly Sight[];
  /** The ticks played so far, frozen ones not counted (`Sight.clock` of the next sight). */
  readonly clock: number;
  /** Its reaction time now, in ticks: the profile's, plus a jitter drawn at each opponent move. */
  readonly reaction: number;
  /** The opening it sees now (a move that can no longer hit, still recovering) was considered. */
  readonly punishHandled: boolean;
  /** Inputs planned for the next ticks, consumed one per tick. */
  readonly plan: readonly InputBits[];
  /** The current threat was already considered (one decision per threat, not per tick). */
  readonly threatHandled: boolean;
  /** The current attack's follow-up was already considered. */
  readonly cancelHandled: boolean;
  /** The string or juggle being played (plans.ts), step by step. */
  readonly string: StringPlay | null;
}

export function createCpu(player: 0 | 1, behavior: CpuBehavior, seed: number): CpuState {
  return {
    player,
    behavior,
    seed,
    seen: [],
    clock: 0,
    reaction: behavior in PROFILES ? PROFILES[behavior as CpuLevel].reactionFrames : 0,
    punishHandled: false,
    plan: [],
    threatHandled: false,
    cancelHandled: false,
    string: null,
  };
}

/**
 * One tick of perception: the live opponent joins what the CPU saw, and each move the opponent
 * starts draws a new reaction time. It goes on through hitstop and blockstun: a player sees the
 * frozen frames too, and guards on what they saw, never on what is about to come. `frozen`: the
 * game does not move on this tick (an impact, a super's flash), as everyone sees.
 */
function perceive(cpu: CpuState, profile: Profile, live: FighterState, frozen: boolean): CpuState {
  const last = cpu.seen[cpu.seen.length - 1];
  let { reaction, seed } = cpu;
  if (last && live.move !== null && live.move !== last.fighter.move) {
    const [value, next] = nextRandom(seed);
    reaction = profile.reactionFrames + Math.floor(value * (REACTION_JITTER + 1));
    seed = next;
  }
  const sight = { fighter: live, clock: cpu.clock };
  const seen = [...cpu.seen, sight].slice(-(profile.reactionFrames + REACTION_JITTER + 1));
  return { ...cpu, seen, clock: frozen ? cpu.clock : cpu.clock + 1, reaction, seed };
}

/** What the CPU sees now: `reaction` ticks ago, or as far back as it has seen. */
function seenSight(cpu: CpuState): Sight | undefined {
  return cpu.seen[Math.max(0, cpu.seen.length - 1 - cpu.reaction)];
}

/** The ticks the game played since what the CPU sees now: none while it was frozen. */
function playedSince(cpu: CpuState): number {
  const seen = seenSight(cpu);
  const latest = cpu.seen[cpu.seen.length - 1];
  return seen && latest ? latest.clock - seen.clock : 0;
}

/** Decides the CPU's input for this tick. Pure: same state, same decision. */
export function cpuStep(
  cpu: CpuState,
  state: GameState,
  config: MatchConfig,
): { cpu: CpuState; input: InputBits } {
  const me = state.fighters[cpu.player];
  const liveOpponent = state.fighters[cpu.player === 0 ? 1 : 0];
  const opponentTemplate = config.fighters[cpu.player === 0 ? 1 : 0];

  if (cpu.behavior === 'dummyStand') return { cpu, input: 0 };
  if (cpu.behavior === 'dummyBlock') {
    // Perfect guard, with no reaction delay, but only when something is coming.
    const move = upcomingMove(liveOpponent, opponentTemplate);
    const danger = move !== null || liveOpponent.y > 0 || incomingProjectile(state, cpu.player);
    return { cpu, input: danger ? guardInput(me, liveOpponent, move) : 0 };
  }
  if (state.round.phase !== 'fight') {
    return { cpu: { ...cpu, plan: [], seen: [], string: null, punishHandled: false }, input: 0 };
  }
  const profile = PROFILES[cpu.behavior];
  const perceived = perceive(cpu, profile, liveOpponent, state.hitstop > 0);
  // The game is frozen on impact: keep holding the current input, do not use up the plan (a
  // string's step pressed before the freeze stays buffered through it).
  if (state.hitstop > 0) return { cpu: perceived, input: cpu.string ? 0 : (cpu.plan[0] ?? 0) };
  // In a hold, its own state decides (hold-tactics.ts); the plan starts over afterwards.
  if (state.hold) {
    const hold = holdInput(cpu.player, profile, state, state.hold, config, perceived.seed);
    return { cpu: { ...perceived, seed: hold.seed, plan: [], string: null }, input: hold.input };
  }
  const opponent = seenSight(perceived)?.fighter ?? liveOpponent;
  // While blocking, keep blocking: dropping the guard mid-string would be a free hit. A string
  // of its own is over once it blocks: from neutral afterwards, it would hit nothing. Its guard
  // follows what it saw, like a player's: an overhead it has not seen yet meets its low guard.
  if (me.action === 'blockstun') {
    const blocking = perceived.string ? { ...perceived, string: null } : perceived;
    const guard = guardInput(me, opponent, upcomingMove(opponent, opponentTemplate));
    if (me.stunFrames > 0) return { cpu: blocking, input: guard };
    return new Decider(blocking, cpu.behavior, me, opponent, state, config).leaveBlock(guard);
  }

  const decider = new Decider(perceived, cpu.behavior, me, opponent, state, config);
  return decider.decide();
}

/** One tick of decision making. A class only to share context between small rules. */
class Decider {
  private seed: number;
  private readonly toward: number;
  private readonly away: number;
  private readonly distance: number;
  /** The blow the opening it sees allows (`opening`), if any. */
  private readonly opening: InputBits | null;
  /** That opening was considered: kept by every plan it returns this tick. */
  private punishHandled: boolean;
  /** The opponent's Finisher threatens it (defense.ts). */
  private readonly menace: boolean;
  /** How it weighs its own super (plans.ts). */
  private readonly outlook: SuperOutlook;

  private readonly profile: Profile;

  constructor(
    private readonly cpu: CpuState,
    private readonly level: CpuLevel,
    private readonly me: FighterState,
    private readonly opponent: FighterState,
    private readonly state: GameState,
    private readonly config: MatchConfig,
  ) {
    this.seed = cpu.seed;
    this.profile = PROFILES[level];
    this.toward = opponent.x > me.x ? Input.Right : Input.Left;
    this.away = opponent.x > me.x ? Input.Left : Input.Right;
    this.distance = toPx(Math.abs(opponent.x - me.x));
    this.opening = this.openingBlow();
    // A new opening is a new decision; none seen, nothing to remember.
    this.punishHandled = this.opening !== null && cpu.punishHandled;
    this.menace = finisherMenace(state, cpu.player, config, opponent);
    this.outlook = superOutlook(state, cpu.player, config, level);
  }

  decide(): { cpu: CpuState; input: InputBits } {
    const me = this.me;

    // The live opponent: what the blow did to it shows at once.
    const opponent = this.state.fighters[this.cpu.player === 0 ? 1 : 0];
    // A string or a juggle in progress: its next step, until its last move is out or it drops.
    if (this.cpu.string) {
      const { input, next } = playString(this.cpu.string, me, opponent);
      if (next) return this.withString(next, input);
    }
    // A move that connected: maybe one of its plans.
    if (me.action === 'attack' && me.moveConnected && !this.cpu.cancelHandled) {
      if (!this.chance(this.profile.combo)) return this.withPlan([], { cancelHandled: true });
      const template = this.config.fighters[this.cpu.player];
      const { steps, seed } = planFor(me, opponent, template, this.level, this.seed, this.outlook);
      this.seed = seed;
      const { input, next } = playString(startString(steps, me), me, opponent);
      return next ? this.withString(next, input) : this.withPlan([], { cancelHandled: true });
    }
    const cancelHandled = me.action === 'attack' ? this.cpu.cancelHandled : false;
    if (!DECISION_ACTIONS.has(me.action)) return this.withPlan(this.cpu.plan, { cancelHandled });

    const finisherGuard = this.finisherGuard();
    if (finisherGuard !== null) return this.withPlan([finisherGuard], { cancelHandled });

    const punish = this.punish();
    if (punish !== null) return this.withPlan(punish, { cancelHandled });

    // Threats get one decision each: anti-air, block, or take the risk.
    const threat = this.threat();
    if (threat && !this.cpu.threatHandled) {
      return this.withPlan(this.react(threat), { threatHandled: true, cancelHandled });
    }
    const threatHandled = threat !== null && this.cpu.threatHandled;
    if (this.cpu.plan.length > 0)
      return this.withPlan(this.cpu.plan, { threatHandled, cancelHandled });

    return this.withPlan(this.offense(), { threatHandled, cancelHandled });
  }

  private threat(): 'air' | 'strike' | 'projectile' | null {
    const opponent = this.opponent;
    const movingRight = opponent.vx > 0;
    const meOnTheRight = this.me.x > opponent.x;
    const approaching = opponent.vx === 0 || movingRight === meOnTheRight;
    if (opponent.y > 0 && approaching && this.distance < ANTI_AIR_RANGE) return 'air';

    // The same menace as a player's proximity guard.
    if (strikeThreatens(opponent, this.opponentTemplate(), this.me.x)) return 'strike';

    return incomingProjectile(this.state, this.cpu.player) ? 'projectile' : null;
  }

  private react(threat: 'air' | 'strike' | 'projectile'): InputBits[] {
    // Hard only, now and then, on the wake-up (just out of a stun, its throw protection still
    // on): the gauge's reversal through the blow pressed on it (docs/combos-v3.md §6.4).
    const waking = this.me.throwImmuneFrames > 0;
    const reversal =
      threat === 'strike' && waking && this.level === 'hard' ? this.reversal() : null;
    if (reversal !== null && this.chance(REVERSAL_CHANCE)) return [reversal, 0];
    if (threat === 'air' && this.chance(this.profile.antiAir)) {
      // The invincible anti-air, or now and then the launcher, which opens a juggle (plans.ts).
      return this.chance(0.35) ? [this.away | Input.Heavy, 0] : [Input.Down | Input.Special, 0];
    }
    // Over the projectile, toward the thrower: not into a Mégabasse's reach, it blocks then.
    if (threat === 'projectile' && !this.keepsAway() && this.chance(0.25)) {
      return repeat(Input.Up | this.toward, 5);
    }
    if (this.chance(this.menace ? this.profile.finisherBlock : this.profile.block)) {
      const move = upcomingMove(this.opponent, this.opponentTemplate());
      return repeat(guardInput(this.me, this.opponent, move), BLOCK_HOLD_FRAMES);
    }
    return [];
  }

  /**
   * The blow an opening allows, if any. The opponent's move, as seen, can no longer hit by now
   * (its active ticks are over, counting the ticks played since it was seen) and keeps enough
   * recovery for the blow to land, in its reach. The ticks frozen since (an impact, a super's
   * flash) are not counted: nothing moved on them. Counted, a super seen at its flash looked
   * over, and the CPU walked into it (docs/finisher.md §1.8). Easy jabs; the others take the
   * heavy blow when it fits (docs/polish/AUDIT-ET-PLAN.md, P18).
   */
  private openingBlow(): InputBits | null {
    const opponent = this.opponent;
    if (opponent.action !== 'attack' || opponent.move === null) return null;
    const move = moveOf(this.opponentTemplate(), opponent.move);
    if (move.kind === 'movement') return null;
    const now = opponent.actionFrame + playedSince(this.cpu);
    if (now < move.startup + move.active) return null;
    const left = move.startup + move.active + move.recovery - now;
    const template = this.config.fighters[this.cpu.player];
    const reach = Math.abs(opponent.x - this.me.x);
    const fits = (blow: MoveData) =>
      blow.startup < left && reach <= threatReach(blow) + THREAT_MARGIN;
    if (this.level !== 'easy' && fits(moveOf(template, 'standHeavy'))) return Input.Heavy;
    return fits(moveOf(template, 'standLight')) ? Input.Light : null;
  }

  /**
   * A wary CPU against an armed super that leaves the ground, seen in the air (Riff's Slam, an
   * overhead): its guard, standing, at once, whatever its block's chance (docs/finisher.md
   * §1.11). Null otherwise.
   */
  private finisherGuard(): InputBits | null {
    const opponent = this.opponent;
    if (!this.profile.wary || !armedSuper(opponent) || opponent.y === 0) return null;
    return guardInput(this.me, opponent, this.opponentTemplate().moves.super ?? null);
  }

  /**
   * A wary CPU against an opponent whose Finisher threatens it and stays on the ground (Nayo's
   * Mégabasse, docs/finisher.md §1.11): it keeps out of its reach.
   */
  private keepsAway(): boolean {
    return this.profile.wary && this.menace && !leavesGround(this.opponentTemplate().moves.super);
  }

  /**
   * A special from neutral is fine, unless it keeps away from a Mégabasse (`wary`): then none
   * within 80 px (docs/finisher.md §1.8), nor one whose motion would carry it within 75 px (the
   * Saut de l'ange goes 35 px forward).
   */
  private mayThrow(move: MoveData | undefined, wary: boolean): boolean {
    if (!wary) return true;
    return this.distance > NO_SPECIAL_RANGE && this.distance - advancePx(move) > KEEP_AWAY_RANGE;
  }

  /** An opening gets one decision: punish it, by the level's chance, before anything planned. */
  private punish(): InputBits[] | null {
    if (this.opening === null || this.punishHandled) return null;
    this.punishHandled = true;
    return this.chance(this.profile.punish) ? [this.opening, 0] : null;
  }

  /**
   * The last tick of a block: punish what it blocked, if it sees an opening (the blow, buffered,
   * comes out on its first free tick). Else the guard goes on, or, close up and by chance, a
   * backdash out of the pressure (back + the dash button, out on the first free tick).
   */
  leaveBlock(guard: InputBits): { cpu: CpuState; input: InputBits } {
    const punish = this.punish();
    if (punish !== null) return this.withPlan(punish, {});
    const backdash = this.distance < CLOSE_RANGE && this.chance(this.profile.backdash);
    const { seed, punishHandled } = this;
    return {
      cpu: { ...this.cpu, seed, punishHandled },
      input: backdash ? this.away | Input.Dash : guard,
    };
  }

  /** The game plan by distance: zone from afar, approach, then pressure up close. */
  private offense(): InputBits[] {
    const { toward, away } = this;
    const aggression = this.profile.aggression;
    const { moves } = this.config.fighters[this.cpu.player];
    // The CPU zones with Special alone, which performs the `special` move.
    const hasProjectile = moves.special.projectile !== undefined;
    // Wary of a Mégabasse: it never comes into its reach, by walking, dashing, jumping (Riff's
    // jump goes 73 px forward) or a special that carries it there, and never presses in it.
    const wary = this.keepsAway();

    // Now and then the Remix of the special it would throw, when the gauge pays for it (hard
    // keeps two bars for its super, docs/combos-v3.md §6.4, and three for its Finisher).
    const boost = superGauge(this.me);
    const saving = this.level === 'hard' && savesForSuper(boost, this.outlook !== 'free');
    const remix = boost >= BOOST_BAR && !saving && this.chance(this.profile.remix);
    if (this.distance > MID_RANGE) {
      if (hasProjectile && this.chance(0.35)) {
        return [remix ? Input.Boost : Input.Special, ...repeat(0, 20)];
      }
      if (!wary && this.chance(0.12)) return this.jumpIn();
      return repeat(toward, this.between(12, 30));
    }
    if (this.distance > CLOSE_RANGE) {
      if (!wary && this.chance(aggression * 0.6)) {
        // The dash button: no double tap to simulate.
        if (this.chance(this.profile.dash)) return [Input.Dash, 0];
        return repeat(toward, this.between(8, 18));
      }
      if (!wary && this.chance(0.18)) return this.jumpIn();
      if (wary && this.distance <= KEEP_AWAY_RANGE) return repeat(away, this.between(6, 14));
      const forward = moves[remix ? 'specialForwardBoost' : 'specialForward'];
      if (this.mayThrow(forward, wary) && this.chance(0.15)) {
        return [toward | (remix ? Input.Boost : Input.Special), ...repeat(0, 10)];
      }
      if (hasProjectile && this.mayThrow(moves.special, wary) && this.chance(0.2)) {
        return [Input.Special, ...repeat(0, 15)];
      }
      return repeat(this.chance(0.5) ? away : 0, this.between(6, 14));
    }
    // Up close to a Mégabasse: out of its reach, no pressure.
    if (wary) return repeat(away, this.between(6, 14));
    if (this.chance(this.profile.throw)) return [Input.Grab, 0];
    if (this.chance(0.1)) return [away | Input.Heavy, 0];
    if (this.chance(0.35)) return [Input.Light, 0, 0, 0];
    if (this.chance(0.25)) return [Input.Down | Input.Light, Input.Down, 0];
    if (this.chance(0.2)) return [Input.Heavy, 0];
    if (this.chance(0.15)) return [Input.Down | Input.Heavy, Input.Down, 0];
    if (this.chance(0.3)) return repeat(away | Input.Down, this.between(8, 16));
    return repeat(away, this.between(6, 12));
  }

  /**
   * The reversal the gauge pays for, if any: the super when it is invincible from its first
   * frame (Nayo's Mégabasse, not Riff's Slam), else the Remix of the anti-air when it is (the
   * Montée platine, the Genou à fond). Never BOOST that would give nothing.
   */
  private reversal(): InputBits | null {
    const { moves } = this.config.fighters[this.cpu.player];
    const boost = superGauge(this.me);
    if (boost >= BOOST_MAX && isReversal(moves.super)) return this.away | Input.Boost;
    if (boost >= BOOST_BAR && !savesForSuper(boost) && isReversal(moves.specialAntiAirBoost)) {
      return Input.Down | Input.Boost;
    }
    return null;
  }

  private jumpIn(): InputBits[] {
    return [...repeat(Input.Up | this.toward, 5), ...repeat(0, 9), Input.Heavy, ...repeat(0, 20)];
  }

  private opponentTemplate() {
    return this.config.fighters[this.cpu.player === 0 ? 1 : 0];
  }

  private withPlan(
    plan: readonly InputBits[],
    flags: Partial<Pick<CpuState, 'threatHandled' | 'cancelHandled'>>,
  ): { cpu: CpuState; input: InputBits } {
    const [input = 0, ...rest] = plan;
    return {
      cpu: {
        ...this.cpu,
        seed: this.seed,
        plan: rest,
        threatHandled: flags.threatHandled ?? false,
        cancelHandled: flags.cancelHandled ?? false,
        punishHandled: this.punishHandled,
        string: null,
      },
      input,
    };
  }

  /** A string goes on: nothing else is planned meanwhile, its moves follow nothing else up. */
  private withString(string: StringPlay, input: InputBits): { cpu: CpuState; input: InputBits } {
    const { seed, punishHandled } = this;
    const cpu = { ...this.cpu, seed, plan: [], cancelHandled: true, punishHandled, string };
    return { cpu, input };
  }

  private chance(probability: number): boolean {
    const [value, seed] = nextRandom(this.seed);
    this.seed = seed;
    return value < probability;
  }

  private between(min: number, max: number): number {
    const [value, seed] = nextRandom(this.seed);
    this.seed = seed;
    return min + Math.floor(value * (max - min + 1));
  }
}

/** Invincible to every blow from its first frame: it goes through a meaty attack. */
function isReversal(move: MoveData | undefined): boolean {
  const range = move?.invincible;
  return range !== undefined && range.from === 0 && range.against !== 'air';
}

/** How far forward a move carries its fighter, in pixels (its root motion). */
function advancePx(move: MoveData | undefined): number {
  return toPx(move?.motion?.dx.reduce((total, dx) => total + dx, 0) ?? 0);
}

function repeat(input: InputBits, count: number): InputBits[] {
  return Array.from({ length: count }, () => input);
}
