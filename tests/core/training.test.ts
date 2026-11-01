import { describe, expect, it } from 'vitest';
import type { MatchConfig, TrainingFinisher, TrainingStart } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { finisherState } from '../../src/core/finisher';
import { Input } from '../../src/core/input';
import { wallsAt } from '../../src/core/positions';
import { BOOST_MAX, ROUND_TIME, TRAINING_REFILL_FRAMES } from '../../src/core/rules';
import { createInitialState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { MATCH, run } from './helpers';

const TRAINING: MatchConfig = { ...MATCH, training: true };

describe('training mode', () => {
  it('starts without an intro and keeps the timer frozen', () => {
    const start = createInitialState(TRAINING);
    expect(start.round.phase).toBe('fight');
    expect(run(600, [0, 0], start, TRAINING).round.timer).toBe(ROUND_TIME);
  });

  it('never KOs the dummy', () => {
    const start = createInitialState(TRAINING);
    const lowHealth = {
      ...start,
      fighters: [
        start.fighters[0],
        { ...start.fighters[1], health: 5, x: start.fighters[0].x + 3000 },
      ],
    } as const;
    const after = run(30, [Input.Heavy, 0], lowHealth, TRAINING);
    expect(after.fighters[1].health).toBeGreaterThanOrEqual(1);
    expect(after.round.phase).toBe('fight');
  });

  it('refills health once the dummy is left alone', () => {
    const start = createInitialState(TRAINING);
    const hurt = {
      ...start,
      fighters: [start.fighters[0], { ...start.fighters[1], health: 100 }],
    } as const;
    expect(run(TRAINING_REFILL_FRAMES - 5, [0, 0], hurt, TRAINING).fighters[1].health).toBe(100);
    expect(run(TRAINING_REFILL_FRAMES + 5, [0, 0], hurt, TRAINING).fighters[1].health).toBe(
      TRAINING.fighters[1].maxHealth,
    );
  });

  it('plays the gauge as told (combos-v3 §6.5): as in a match, full when left alone, or infinite', () => {
    const spent = (config: MatchConfig) => {
      const start = createInitialState(config);
      return {
        ...start,
        fighters: [{ ...start.fighters[0], boost: 500 }, start.fighters[1]],
      } as const;
    };
    const gauge = (config: MatchConfig, ticks: number) =>
      run(ticks, [0, 0], spent(config), config).fighters[0].boost;
    // As in a match: it starts empty and never refills.
    expect(createInitialState(TRAINING).fighters[0].boost).toBe(0);
    expect(gauge(TRAINING, TRAINING_REFILL_FRAMES + 5)).toBe(500);
    // Full: three bars at the start, and back to them with the health.
    const full: MatchConfig = { ...TRAINING, trainingGauge: 'full' };
    expect(createInitialState(full).fighters.map((fighter) => fighter.boost)).toEqual([
      BOOST_MAX,
      BOOST_MAX,
    ]);
    expect(gauge(full, TRAINING_REFILL_FRAMES - 5)).toBe(500);
    expect(gauge(full, TRAINING_REFILL_FRAMES + 5)).toBe(BOOST_MAX);
    // Infinite: refilled on every tick.
    const infinite: MatchConfig = { ...TRAINING, trainingGauge: 'infinite' };
    expect(gauge(infinite, 1)).toBe(BOOST_MAX);
  });

  it('never fills the gauge in a match, whatever the option says', () => {
    const match: MatchConfig = { ...MATCH, trainingGauge: 'infinite' };
    expect(createInitialState(match).fighters[0].boost).toBe(0);
    expect(run(5, [0, 0], createInitialState(match), match).fighters[0].boost).toBe(0);
  });

  it("refills the dummy to the share its option says (docs/finisher.md §1.12), the player's whole", () => {
    for (const [percent, health] of [
      [100, 900],
      [50, 450],
      [30, 270],
      [10, 90],
    ] as const) {
      const config: MatchConfig = { ...TRAINING, trainingDummyHealth: percent };
      const rested = run(TRAINING_REFILL_FRAMES + 5, [0, 0], createInitialState(config), config);
      expect(
        rested.fighters.map((fighter) => fighter.health),
        `${percent} %`,
      ).toEqual([NAYO.maxHealth, health]);
    }
  });

  it('plays the Finisher as its option says: as in a match, always ready, or never (§1.12)', () => {
    const lights = (finisher: TrainingFinisher | undefined, dummyHealth: number) => {
      const config: MatchConfig = {
        ...TRAINING,
        trainingGauge: 'full',
        ...(finisher && { trainingFinisher: finisher }),
      };
      const start = createInitialState(config);
      const [player, dummy] = start.fighters;
      const state = { ...start, fighters: [player, { ...dummy, health: dummyHealth }] } as const;
      return finisherState(state, 0, config);
    };
    // As in a match (the default): the match point played as reached, the dummy at 30 % or less.
    expect(lights(undefined, 270)).toBe('ready');
    expect(lights('match', 271)).toBe('off');
    expect(lights('always', RIFF.maxHealth)).toBe('ready');
    expect(lights('off', 1)).toBe('off');
  });

  it("stops the Finisher's last blow at the dummy's 1 HP floor", () => {
    const config: MatchConfig = { ...TRAINING, trainingGauge: 'full', trainingFinisher: 'always' };
    const start = createInitialState(config);
    const [player, dummy] = start.fighters;
    let state = { ...start, fighters: [player, { ...dummy, x: player.x + px(40) }] } as const;
    let lowest = dummy.health;
    for (let tick = 0; tick < 150; tick++) {
      state = step(state, [tick === 0 ? Input.Left | Input.Boost : 0, 0], config);
      lowest = Math.min(lowest, state.fighters[1].health);
    }
    expect(lowest).toBe(1);
    expect(state.round.phase).toBe('fight');
  });
});

describe('training start (docs/combat-v2.md D32)', () => {
  const at = (trainingStart: TrainingStart): MatchConfig => ({ ...TRAINING, trainingStart });

  it('starts at the center as a round does, left out or asked, and a match ignores it', () => {
    expect(createInitialState(at('center'))).toEqual(createInitialState(TRAINING));
    expect(createInitialState({ ...MATCH, trainingStart: 'leftCorner' })).toEqual(
      createInitialState(MATCH),
    );
  });

  it.each([
    ['leftCorner', 0, Input.Left],
    ['rightCorner', 1, Input.Right],
  ] as const)(
    'starts %s with player %i against the wall, as far apart as a round starts',
    (start, cornered, back) => {
      const config = at(start);
      const state = createInitialState(config);
      const [a, b] = state.fighters;
      expect(b.x - a.x).toBe(config.stage.startDistance);
      const walls = wallsAt(state.cameraX, config.stage);
      expect(cornered === 0 ? walls.min : walls.max).toBe(cornered === 0 ? 0 : config.stage.width);
      // Walking back a second, the cornered fighter does not move: it started touching the wall.
      const inputs: [number, number] = cornered === 0 ? [back, 0] : [0, back];
      const after = run(60, inputs, state, config);
      expect(after.fighters[cornered].x).toBe(state.fighters[cornered].x);
      expect(after.fighters[1 - cornered]?.x).toBe(state.fighters[1 - cornered]?.x);
      expect(after.cameraX).toBe(state.cameraX);
    },
  );
});
