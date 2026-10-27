import type { MatchConfig } from '../core/config';
import { toPx } from '../core/constants';
import { Input, type InputBits } from '../core/input';
import type { FighterAction, FighterState, GameState } from '../core/state';
import { strikeThreatens, upcomingMove } from '../core/threat';
import { guardInput, incomingProjectile } from './defense';
import { nextRandom } from './rng';

export type CpuLevel = 'easy' | 'normal' | 'hard';
/** Training dummies do not play: they stand still or block everything. */
export type CpuBehavior = CpuLevel | 'dummyStand' | 'dummyBlock';

interface Profile {
  /** Ticks between something happening and the CPU reacting to it. */
  readonly reactionFrames: number;
  /** Chance to block an attack it sees coming. */
  readonly block: number;
  readonly antiAir: number;
  /** Chance to cancel a move that connected into a follow-up. */
  readonly combo: number;
  readonly throw: number;
  /** How often it closes the distance rather than waiting. */
  readonly aggression: number;
  /** Chance to dash in rather than walk, from mid range. */
  readonly dash: number;
  /** Chance to backdash out of close pressure once a block ends. */
  readonly backdash: number;
}

const PROFILES: Readonly<Record<CpuLevel, Profile>> = {
  easy: {
    reactionFrames: 24,
    block: 0.25,
    antiAir: 0.1,
    combo: 0.15,
    throw: 0.05,
    aggression: 0.35,
    dash: 0.1,
    backdash: 0.05,
  },
  normal: {
    reactionFrames: 14,
    block: 0.55,
    antiAir: 0.4,
    combo: 0.5,
    throw: 0.12,
    aggression: 0.5,
    dash: 0.25,
    backdash: 0.15,
  },
  hard: {
    reactionFrames: 8,
    block: 0.85,
    antiAir: 0.75,
    combo: 0.85,
    throw: 0.2,
    aggression: 0.65,
    dash: 0.4,
    backdash: 0.25,
  },
};

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

export interface CpuState {
  readonly player: 0 | 1;
  readonly behavior: CpuBehavior;
  readonly seed: number;
  /** Opponent snapshots, oldest first: the CPU acts on what it saw `reactionFrames` ago. */
  readonly seen: readonly FighterState[];
  /** Inputs planned for the next ticks, consumed one per tick. */
  readonly plan: readonly InputBits[];
  /** The current threat was already considered (one decision per threat, not per tick). */
  readonly threatHandled: boolean;
  /** The current attack's follow-up was already considered. */
  readonly cancelHandled: boolean;
}

export function createCpu(player: 0 | 1, behavior: CpuBehavior, seed: number): CpuState {
  return { player, behavior, seed, seen: [], plan: [], threatHandled: false, cancelHandled: false };
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
  if (state.round.phase !== 'fight') return { cpu: { ...cpu, plan: [], seen: [] }, input: 0 };
  // The game is frozen on impact: keep holding the current input, do not use up the plan.
  if (state.hitstop > 0) return { cpu, input: cpu.plan[0] ?? 0 };
  const profile = PROFILES[cpu.behavior];
  // While blocking, keep blocking: dropping the guard mid-string would be a free hit.
  if (me.action === 'blockstun') {
    const guard = guardInput(me, liveOpponent, upcomingMove(liveOpponent, opponentTemplate));
    return me.stunFrames > 0
      ? { cpu, input: guard }
      : leaveBlock(cpu, profile, me, liveOpponent, guard);
  }

  const seen = [...cpu.seen, liveOpponent].slice(-(profile.reactionFrames + 1));
  const opponent = seen[0] ?? liveOpponent;
  const decider = new Decider({ ...cpu, seen }, profile, me, opponent, state, config);
  return decider.decide();
}

/** One tick of decision making. A class only to share context between small rules. */
class Decider {
  private seed: number;
  private readonly toward: number;
  private readonly away: number;
  private readonly distance: number;

  constructor(
    private readonly cpu: CpuState,
    private readonly profile: Profile,
    private readonly me: FighterState,
    private readonly opponent: FighterState,
    private readonly state: GameState,
    private readonly config: MatchConfig,
  ) {
    this.seed = cpu.seed;
    this.toward = opponent.x > me.x ? Input.Right : Input.Left;
    this.away = opponent.x > me.x ? Input.Left : Input.Right;
    this.distance = toPx(Math.abs(opponent.x - me.x));
  }

  decide(): { cpu: CpuState; input: InputBits } {
    const me = this.me;

    // A move that connected: maybe cancel it into a follow-up.
    if (me.action === 'attack' && me.moveConnected && !this.cpu.cancelHandled) {
      const followUp = this.chance(this.profile.combo) ? [Input.Special, 0] : [];
      return this.withPlan(followUp, { cancelHandled: true });
    }
    const cancelHandled = me.action === 'attack' ? this.cpu.cancelHandled : false;
    if (!DECISION_ACTIONS.has(me.action)) return this.withPlan(this.cpu.plan, { cancelHandled });

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
    if (threat === 'air' && this.chance(this.profile.antiAir)) {
      return [Input.Down | Input.Special, 0];
    }
    if (threat === 'projectile' && this.chance(0.25)) {
      return repeat(Input.Up | this.toward, 5);
    }
    if (this.chance(this.profile.block)) {
      const move = upcomingMove(this.opponent, this.opponentTemplate());
      return repeat(guardInput(this.me, this.opponent, move), BLOCK_HOLD_FRAMES);
    }
    return [];
  }

  /** The game plan by distance: zone from afar, approach, then pressure up close. */
  private offense(): InputBits[] {
    const { toward, away } = this;
    const aggression = this.profile.aggression;
    // The CPU zones with Special alone, which performs the `special` move.
    const hasProjectile =
      this.config.fighters[this.cpu.player].moves.special.projectile !== undefined;

    if (this.distance > MID_RANGE) {
      if (hasProjectile && this.chance(0.35)) return [Input.Special, ...repeat(0, 20)];
      if (this.chance(0.12)) return this.jumpIn();
      return repeat(toward, this.between(12, 30));
    }
    if (this.distance > CLOSE_RANGE) {
      if (this.chance(aggression * 0.6)) {
        // The dash button: no double tap to simulate.
        if (this.chance(this.profile.dash)) return [Input.Dash, 0];
        return repeat(toward, this.between(8, 18));
      }
      if (this.chance(0.18)) return this.jumpIn();
      if (this.chance(0.15)) return [toward | Input.Special, ...repeat(0, 10)];
      if (hasProjectile && this.chance(0.2)) return [Input.Special, ...repeat(0, 15)];
      return repeat(this.chance(0.5) ? away : 0, this.between(6, 14));
    }
    if (this.chance(this.profile.throw)) return [Input.Grab, 0];
    if (this.chance(0.35)) return [Input.Light, 0, 0, 0];
    if (this.chance(0.25)) return [Input.Down | Input.Light, Input.Down, 0];
    if (this.chance(0.2)) return [Input.Heavy, 0];
    if (this.chance(0.15)) return [Input.Down | Input.Heavy, Input.Down, 0];
    if (this.chance(0.3)) return repeat(away | Input.Down, this.between(8, 16));
    return repeat(away, this.between(6, 12));
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
      },
      input,
    };
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

/**
 * The last tick of a block: the guard goes on, or, close up and by chance, a backdash out of
 * the pressure (back + the dash button, which comes out on the first free tick).
 */
function leaveBlock(
  cpu: CpuState,
  profile: Profile,
  me: FighterState,
  opponent: FighterState,
  guard: InputBits,
): { cpu: CpuState; input: InputBits } {
  const [value, seed] = nextRandom(cpu.seed);
  const close = toPx(Math.abs(opponent.x - me.x)) < CLOSE_RANGE;
  const back = opponent.x > me.x ? Input.Left : Input.Right;
  const input = close && value < profile.backdash ? back | Input.Dash : guard;
  return { cpu: { ...cpu, seed }, input };
}

function repeat(input: InputBits, count: number): InputBits[] {
  return Array.from({ length: count }, () => input);
}
