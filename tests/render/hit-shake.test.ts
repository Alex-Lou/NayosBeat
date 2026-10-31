import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { NAYO } from '../../src/art/nayo';
import { toPx } from '../../src/core/constants';
import { Input } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { ANIM_OPTIONS, LEGACY_ANIM } from '../../src/render/anim-options';
import { showFighter, type ShowContext, type Shown } from '../../src/render/animation';
import { detectEvents, type FightEvent } from '../../src/render/fight-events';
import { FightMemory } from '../../src/render/fight-memory';
import { FlashBudget } from '../../src/render/flash-budget';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { HIT_SHAKE, hitShakeOf } from '../../src/render/hit-shake';
import type { ShakeMode } from '../../src/render/shake';
import { SpriteFighterView } from '../../src/render/sprite-fighter-view';
import { facingOff, MIRROR_MATCH, repeat } from '../core/helpers';

/** Where the view put its body and its shadow, frame after frame. */
const placed = vi.hoisted(() => ({ body: [] as number[], shadow: [] as number[] }));

vi.mock('../../src/render/anchored-sprite', () => ({
  AnchoredSprite: class {
    private readonly fx: boolean;
    constructor(_scene: unknown, _art: unknown, layer?: string) {
      this.fx = layer === 'fx';
    }
    setDepth(): this {
      return this;
    }
    dark(): this {
      return this;
    }
    hide(): void {
      // Nothing to hide.
    }
    show(_sheet: string, _frame: number, x: number): void {
      if (!this.fx) placed.body.push(x);
    }
  },
}));
vi.mock('../../src/render/dash-trail', () => ({
  DashTrail: class {
    calm = false;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/boost-echo', () => ({
  BoostEcho: class {
    calm = false;
    update = vi.fn();
  },
}));
vi.mock('../../src/render/fx-dissolve', () => ({
  FxDissolve: class {
    still = false;
    follow = vi.fn();
  },
}));
vi.mock('../../src/render/fx-pixels', () => ({
  FxPixels: class {
    lightsAnew = () => 0;
  },
}));

type Script = readonly (readonly [number, number])[];

interface Played {
  readonly states: readonly GameState[];
  /** `player`'s tremble on each state, the memory noted up to it as the fight scene notes it. */
  readonly shakes: (player: 0 | 1, shake?: ShakeMode, context?: Partial<ShowContext>) => number[];
}

/** Plays scripted ticks of a mirror match as the fight scene does: the events, then the memory. */
function played(start: GameState, script: Script): Played {
  const play = (visit: (state: GameState, memory: FightMemory) => void): void => {
    const memory = new FightMemory();
    const events: FightEvent[] = [];
    let state = start;
    for (const inputs of script) {
      const next = step(state, inputs, MIRROR_MATCH);
      detectEvents(state, next, MIRROR_MATCH, events);
      memory.note(next, events);
      visit(next, memory);
      state = next;
    }
  };
  const states: GameState[] = [];
  play((state) => states.push(state));
  return {
    states,
    shakes: (player, shake = 'normal', context = {}) => {
      const shakes: number[] = [];
      play((state, memory) => {
        const shown: ShowContext = { options: ANIM_OPTIONS, memory, ...context };
        shakes.push(hitShakeOf(state, player, shown, shake));
      });
      return shakes;
    },
  };
}

const idle = (ticks: number) => repeat<[number, number]>([0, 0], ticks);
const frozen = (states: readonly GameState[]) => states.map((state) => state.hitstop > 0);

describe('the victim trembles through the impact freeze (docs/art/animation-plan.md §2, V1)', () => {
  const jab = played(facingOff(30, MIRROR_MATCH), [[Input.Light, 0], ...idle(30)]);

  it('shakes a light blow 1 px, away from the attacker first, turning back every 2 ticks', () => {
    const shakes = jab.shakes(1);
    const freeze = frozen(jab.states);
    const start = freeze.indexOf(true);
    expect(start).toBeGreaterThan(0);
    const during = shakes.filter((_, at) => freeze[at]);
    expect(during.length).toBeGreaterThan(3);
    // Player 1 stands on the right: the jab pushes it right (+), then back.
    expect(during.slice(0, 4)).toEqual([1, 1, -1, -1]);
    // Still out of the freeze, and the attacker never moves.
    expect(shakes.filter((_, at) => !freeze[at]).every((shake) => shake === 0)).toBe(true);
    expect(jab.shakes(0).every((shake) => shake === 0)).toBe(true);
  });

  it('shakes 2 px for a counter-hit and for the final blow, 1 px for a guard', () => {
    const peak = (shakes: readonly number[]) => Math.max(...shakes.map(Math.abs));
    const contre = played(facingOff(40, MIRROR_MATCH), [
      [Input.Light, 0],
      [0, Input.Heavy],
      ...idle(30),
    ]);
    expect(peak(contre.shakes(1))).toBe(HIT_SHAKE.heavy);
    const ko = played(facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]), [
      [Input.Light, 0],
      ...idle(20),
    ]);
    expect(ko.states.some((state) => state.fighters[1].action === 'ko')).toBe(true);
    expect(peak(ko.shakes(1))).toBe(HIT_SHAKE.heavy);
    const guard = played(facingOff(30, MIRROR_MATCH), [
      [Input.Heavy, Input.Right],
      ...repeat<[number, number]>([0, Input.Right], 30),
    ]);
    expect(guard.states.some((state) => state.fighters[1].action === 'blockstun')).toBe(true);
    expect(peak(guard.shakes(1))).toBe(HIT_SHAKE.light);
  });

  it("keeps to « Tremblement de l'écran »: 1 px at most reduced, still when none", () => {
    const ko = played(facingOff(30, MIRROR_MATCH, [{}, { health: 5 }]), [
      [Input.Light, 0],
      ...idle(20),
    ]);
    expect(Math.max(...ko.shakes(1, 'reduced').map(Math.abs))).toBe(1);
    expect(ko.shakes(1, 'off').every((shake) => shake === 0)).toBe(true);
  });

  it('keeps still with the animation of before, or nothing remembered', () => {
    expect(jab.shakes(1, 'normal', { options: LEGACY_ANIM }).every((s) => s === 0)).toBe(true);
    expect(jab.shakes(1, 'normal', { memory: null }).every((s) => s === 0)).toBe(true);
  });

  it("keeps still under a freeze that is not its blow's: a super's flash", () => {
    const memory = new FightMemory();
    const [nayo, struck] = facingOff(30, MIRROR_MATCH).fighters;
    const hit: FightEvent = {
      type: 'hit',
      heavy: true,
      counter: null,
      x: 0,
      y: 0,
      away: 1,
      by: 0,
      low: false,
      damage: 80,
      held: false,
      tier: 1,
      pulse: false,
    };
    const base = facingOff(30, MIRROR_MATCH);
    memory.note({ ...base, frame: 10, hitstop: 6 }, [hit]);
    const reeling = { ...struck, action: 'hitstun' as const };
    const later: GameState = { ...base, frame: 30, hitstop: 8, fighters: [nayo, reeling] };
    expect(hitShakeOf(later, 1, { options: ANIM_OPTIONS, memory }, 'normal')).toBe(0);
    const during: GameState = { ...later, frame: 12, hitstop: 4 };
    expect(hitShakeOf(during, 1, { options: ANIM_OPTIONS, memory }, 'normal')).toBe(-2);
  });

  it('moves the drawing alone: not the place in the game, nor the shadow', () => {
    // The Finisher's halo is an ellipse too: its signal off, it stays hidden and never moves.
    const shadow = {
      visible: false,
      setVisible() {
        return this;
      },
      setPosition(x: number) {
        placed.shadow.push(x);
        return this;
      },
      setScale() {
        return this;
      },
    };
    const scene = { add: { ellipse: () => shadow } } as unknown as Phaser.Scene;
    const view = new SpriteFighterView(scene, NAYO, 1, 230, 0x30e8ff, MIRROR_MATCH, {
      dissolve: 'rise',
      stage: GREYBOX_COLORS,
      budget: new FlashBudget('normal'),
    });
    const memory = new FightMemory();
    const events: FightEvent[] = [];
    const shown: Shown = { clip: 'idle', tick: 0, x: 0 };
    let state = facingOff(30, MIRROR_MATCH);
    const trembles: number[] = [];
    for (const inputs of [[Input.Light, 0], ...idle(20)] as const) {
      const next = step(state, inputs, MIRROR_MATCH);
      detectEvents(state, next, MIRROR_MATCH, events);
      memory.note(next, events);
      state = next;
      placed.body.length = 0;
      placed.shadow.length = 0;
      view.update(state, 1, 'off', { options: ANIM_OPTIONS, memory });
      showFighter(state, 1, MIRROR_MATCH, NAYO, shown);
      const at = toPx(shown.x);
      expect(placed.shadow).toEqual([at]);
      trembles.push((placed.body[0] ?? Number.NaN) - at);
    }
    expect(trembles.some((tremble) => tremble !== 0)).toBe(true);
    expect(new Set(trembles)).toEqual(new Set([0, 1, -1]));
  });
});
