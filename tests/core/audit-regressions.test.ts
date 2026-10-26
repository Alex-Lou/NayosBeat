import { describe, expect, it } from 'vitest';
import { cpuStep, createCpu } from '../../src/ai/cpu';
import { applyHit } from '../../src/core/combat';
import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { updateFighter } from '../../src/core/fighter';
import { Input } from '../../src/core/input';
import { resolvePositions } from '../../src/core/positions';
import { createInitialState } from '../../src/core/state';
import { POLYVALENT as P } from '../../src/data/fighters';
import { TRAINING_STAGE } from '../../src/data/stages';
import { facingOff, fightState, makeFighter, MATCH, MIRROR_MATCH, run } from './helpers';

/** Regression tests for defects found by the code audit. */
describe('audit regressions', () => {
  it('a training dummy brought to 1 health is hit normally, never stuck KO', () => {
    const training: MatchConfig = { ...MIRROR_MATCH, training: true };
    const start = createInitialState(training);
    const close = {
      ...start,
      fighters: [
        { ...start.fighters[0], x: start.fighters[1].x - px(30) },
        { ...start.fighters[1], health: 5 },
      ],
    } as const;
    const after = run(30, [Input.Heavy, 0], close, training);
    expect(after.fighters[1].action).not.toBe('ko');
    expect(after.fighters[1].health).toBe(1);
  });

  it('attacks no longer change anything once the round is decided', () => {
    const decided = facingOff(30, MIRROR_MATCH);
    const roundEnd = { ...decided, round: { ...decided.round, phase: 'roundEnd' as const } };
    const heavy = {
      ...roundEnd.fighters[0],
      action: 'attack' as const,
      move: 'standHeavy' as const,
    };
    const state = {
      ...roundEnd,
      fighters: [{ ...heavy, actionFrame: P.moves.standHeavy.startup - 1 }, roundEnd.fighters[1]],
    } as const;
    const after = run(5, [0, 0], state, MIRROR_MATCH);
    expect(after.fighters[1].health).toBe(P.maxHealth);
  });

  it('corner pushback does not depend on which player is against the wall', () => {
    const box = P.standingPushbox;
    const half = box.width / 2;
    const camera = TRAINING_STAGE.width / 2;
    const leftWall = camera - px(240) + half;
    const rightWall = camera + px(240) - half;
    const sliding = { action: 'hitstun' as const, stunFrames: 10 };
    // Player 1 is pushed into the left wall while player 2 slides away mid-stage...
    const [cornered1] = resolvePositions(
      { fighter: makeFighter({ ...sliding, x: leftWall - px(2), vx: px(-2) }), box },
      { fighter: makeFighter({ ...sliding, x: camera, vx: px(2) }), box },
      camera,
      TRAINING_STAGE,
    );
    // ...and the mirror image, with the same player order: player 2 is the cornered one.
    const [, cornered2] = resolvePositions(
      { fighter: makeFighter({ ...sliding, x: camera, vx: px(-2) }), box },
      { fighter: makeFighter({ ...sliding, x: rightWall + px(2), vx: px(2) }), box },
      camera,
      TRAINING_STAGE,
    );
    expect(cornered1.x).toBe(leftWall);
    expect(cornered2.x).toBe(rightWall);
  });

  it('a KO by a knockdown move on the ground still launches the fighter', () => {
    const swept = applyHit(makeFighter({ health: 10 }), px(370), P.moves.crouchHeavy);
    expect(swept.action).toBe('ko');
    const later = updateFighter(updateFighter(swept, 0, P, px(370)), 0, P, px(370));
    expect(later.y).toBeGreaterThan(0);
  });

  it('never produces a negative zero velocity', () => {
    const noPush = { ...P.moves.standLight, pushback: 0 };
    const hit = applyHit(makeFighter(), px(500), noPush);
    expect(Object.is(hit.vx, -0)).toBe(false);
  });

  it('reads a buffered special with the side faced when it was pressed', () => {
    // Pressed forward + special while busy, facing right; the opponent then crosses over.
    const busy = makeFighter({ action: 'landing', actionFrame: 0 });
    const pressed = updateFighter(busy, Input.Right | Input.Special, P, px(500));
    let state = pressed;
    for (let i = 0; i < P.landingFrames; i++) state = updateFighter(state, 0, P, px(300));
    expect(state.facing).toBe(-1);
    expect(state.move).toBe('specialForward');
  });

  it('the CPU keeps its plan frozen during hitstop and keeps blocking in blockstun', () => {
    const base = fightState();
    const cpu = { ...createCpu(1, 'hard', 1), plan: [Input.Right | Input.Down, Input.Light] };
    const frozen = cpuStep(cpu, { ...base, hitstop: 5 }, MATCH);
    expect(frozen.input).toBe(Input.Right | Input.Down);
    expect(frozen.cpu.plan).toEqual(cpu.plan);

    const blocking = {
      ...base,
      fighters: [base.fighters[0], { ...base.fighters[1], action: 'blockstun' as const }],
    } as const;
    const guard = cpuStep(createCpu(1, 'easy', 1), blocking, MATCH).input;
    // Player 2 stands on the right: holding back means holding right.
    expect(guard & Input.Right).toBe(Input.Right);
  });
});
