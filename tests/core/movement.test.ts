import { describe, expect, it } from 'vitest';
import { findHit } from '../../src/core/combat';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { moveDuration } from '../../src/core/moves';
import { PUSHBACK_FRICTION } from '../../src/core/rules';
import type { FighterState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { dashCurve } from '../../src/data/fighters/shared';
import { TRAINING_STAGE } from '../../src/data/stages';
import {
  facingOff,
  makeFighter,
  playAlone as play,
  repeat,
  stepsOf as steps,
  sum,
} from './helpers';

const { Up, Down, Left, Right, Light, Special, Grab, Dash } = Input;

describe('dash curves (§3.2, §3.3)', () => {
  it('ease out with the exact speeds of the spec, adding up to the distance', () => {
    expect(dashCurve(56, 14)).toEqual([
      771, 715, 657, 600, 543, 485, 429, 371, 315, 257, 200, 143, 85, 29,
    ]);
    expect(dashCurve(64, 12)).toEqual([1022, 934, 844, 756, 666, 578, 489, 400, 311, 222, 134, 44]);
    expect(dashCurve(44, 16)).toEqual([
      533, 498, 464, 430, 395, 361, 327, 292, 258, 223, 189, 155, 120, 86, 52, 17,
    ]);
    expect(dashCurve(48, 14)).toEqual([
      661, 612, 564, 514, 465, 417, 367, 318, 270, 220, 172, 122, 74, 24,
    ]);
  });

  it("covers Nayo's dash in the spec's cumulative steps", () => {
    let covered = 0;
    const cumulative = dashCurve(56, 14).map((step) => (covered += step) / 100);
    expect(cumulative.map((value) => value.toFixed(1))).toEqual(
      '7.7 14.9 21.4 27.4 32.9 37.7 42.0 45.7 48.9 51.4 53.4 54.9 55.7 56.0'.split(' '),
    );
  });
});

describe('dash and backdash (§3.2, §3.3)', () => {
  const DASHES = [
    { template: NAYO, input: Dash, duration: 18, frames: 14, distance: 56 },
    { template: NAYO, input: Left | Dash, duration: 22, frames: 16, distance: -44 },
    { template: RIFF, input: Dash, duration: 16, frames: 12, distance: 64 },
    { template: RIFF, input: Left | Dash, duration: 20, frames: 14, distance: -48 },
  ];

  it.each(DASHES)(
    '$template.name: $distance px in $duration ticks, moving on frames 1 to $frames',
    ({ template, input, duration, frames, distance }) => {
      const states = play(template, [input, ...repeat(0, 30)]);
      const busy = states.filter((state) => state.action === 'attack');
      expect(busy).toHaveLength(duration);
      expect(states[duration]?.action).toBe('idle');
      const moved = steps(states).slice(0, duration);
      // Frame 0 sets off, then the curve, then the recovery stands still.
      expect(moved[0]).toBe(0);
      expect(moved.slice(1, frames + 1).every((dx) => dx !== 0)).toBe(true);
      expect(moved.slice(frames + 1)).toEqual(repeat(0, duration - frames - 1));
      expect(sum(moved)).toBe(px(distance));
    },
  );

  it('comes out at every press, from every neutral state', () => {
    const neutral: [string, InputBits[]][] = [
      ['standing', []],
      ['walking forward', repeat(Right, 5)],
      ['walking back', repeat(Left, 5)],
      ['crouching', repeat(Down, 5)],
    ];
    for (const [label, before] of neutral) {
      const held = before.at(-1) ?? 0;
      const states = play(NAYO, [...before, held | Dash]);
      expect(states.at(-1)?.move, label).toBe(held === Left ? 'dashBack' : 'dashForward');
    }
    const guarding = makeFighter({ action: 'guard', input: Left });
    expect(play(NAYO, [Left | Dash], guarding)[0]?.move).toBe('dashBack');
    // Pressed again on the very tick the dash ends: out again, every time.
    const again = play(NAYO, [Dash, ...repeat(0, 17), Dash, ...repeat(0, 17), Dash]);
    expect(
      again.filter((state) => state.actionFrame === 0 && state.move === 'dashForward'),
    ).toHaveLength(3);
  });

  it('comes out of the double tap as out of the button', () => {
    const byTap = play(NAYO, [Right, 0, Right, ...repeat(0, 30)]);
    const dashed = byTap.filter((state) => state.move === 'dashForward');
    expect(dashed).toHaveLength(18);
    // The tap walked 1.5 px; the dash adds its 56.
    expect((byTap.at(-1)?.x ?? 0) - makeFighter().x).toBe(px(1.5) + px(56));
  });

  it('dashes toward the opponent and keeps its facing for the whole dash', () => {
    const facingLeft = play(NAYO, [Dash, ...repeat(0, 17)], makeFighter({ facing: -1 }));
    // The opponent is on the right (FAR): the dash turns to it, then never turns again.
    expect(facingLeft.every((state) => state.facing === 1)).toBe(true);
    expect((facingLeft.at(-1)?.x ?? 0) - makeFighter().x).toBe(px(56));
  });

  it('only starts from neutral: a dash pressed during a move comes out after it', () => {
    const jab = moveDuration(NAYO.moves.standLight);
    const states = play(NAYO, [Light, ...repeat(0, jab - 3), Dash, ...repeat(0, 10)]);
    expect(states[jab - 1]?.move).toBe('standLight');
    expect(states[jab]?.move).toBe('dashForward');
    expect(states[jab]?.actionFrame).toBe(0);
  });

  it('never cancels a move that connected', () => {
    const start = makeFighter({ action: 'attack', move: 'standLight', moveConnected: true });
    const states = play(NAYO, [0, Dash, 0, 0]);
    expect(play(NAYO, [Dash, 0], start)[1]?.move).toBe('standLight');
    expect(states[1]?.move).toBe('dashForward');
  });

  it('comes out of the buffer on the first free tick after a landing', () => {
    const states = play(NAYO, [Up, ...repeat(0, 33), Dash, ...repeat(0, 10)]);
    const landing = states.findIndex((state) => state.action === 'landing');
    expect(states[landing + NAYO.landingFrames]?.move).toBe('dashForward');
  });

  it('does nothing in the air', () => {
    const states = play(NAYO, [Up, ...repeat(0, 10), Dash, ...repeat(0, 10)]);
    expect(states.some((state) => state.move === 'dashForward')).toBe(false);
  });

  it('cannot go through the opponent: the pushboxes stay', () => {
    let state = facingOff(40);
    for (let i = 0; i < 20; i++) state = step(state, [i === 0 ? Dash : 0, 0], MATCH_NR);
    const [a, b] = state.fighters;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x - a.x).toBe((NAYO.standingPushbox.width + RIFF.standingPushbox.width) / 2);
  });

  it('is stopped by a wall', () => {
    // In the stage's left corner, the camera against it.
    const wall = NAYO.standingPushbox.width / 2;
    const corner = facingOff(100, MATCH_NR, [{ x: wall + px(10) }, { x: px(140) }]);
    let state = { ...corner, cameraX: px(240) };
    for (let i = 0; i < 25; i++) state = step(state, [i === 0 ? Left | Dash : 0, 0], MATCH_NR);
    expect(state.fighters[0].x).toBe(wall);
  });
});

const MATCH_NR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };

describe('backdash and grabs (§3.3)', () => {
  /** Whether the grab of a fighter right in front reaches a defender on this backdash frame. */
  function grabbed(defenderTemplate: FighterTemplate, frame: number): boolean {
    const grabber = makeFighter({
      action: 'attack',
      move: 'grab',
      actionFrame: NAYO.moves.grab.startup,
    });
    const defender = makeFighter({
      x: px(420),
      facing: -1,
      action: 'attack',
      move: 'dashBack',
      actionFrame: frame,
    });
    return findHit(grabber, NAYO, defender, defenderTemplate) !== null;
  }

  it.each([
    { template: NAYO, last: 11 },
    { template: RIFF, last: 10 },
  ])('$template.name makes grabs whiff on frames 0 to $last', ({ template, last }) => {
    for (let frame = 0; frame <= last; frame++)
      expect(grabbed(template, frame), `f${frame}`).toBe(false);
    expect(grabbed(template, last + 1)).toBe(true);
  });

  it('is hit by strikes all along', () => {
    const jab = makeFighter({ action: 'attack', move: 'standLight', actionFrame: 4 });
    for (let frame = 0; frame < moveDuration(NAYO.moves.dashBack); frame++) {
      const defender = makeFighter({
        x: px(430),
        facing: -1,
        action: 'attack',
        move: 'dashBack',
        actionFrame: frame,
      });
      expect(findHit(jab, NAYO, defender, NAYO), `f${frame}`).not.toBeNull();
    }
  });
});

describe("Riff's footwork (§3.4)", () => {
  /** Riff dashes, `button` pressed on tick `at` (0 is the dash press). */
  function footwork(button: InputBits, at: number): FighterState[] {
    const inputs = [Dash, ...repeat(0, 40)];
    inputs[at] = button;
    return play(RIFF, inputs);
  }
  const covered = (frames: number): number => sum(dashCurve(64, 12).slice(0, frames - 1));

  it('cancels into a normal from frame 8 on, never earlier', () => {
    // Pressed on frame 3, kept by the buffer: the cancel waits for frame 8.
    const states = footwork(Light, 3);
    // Frames 0 to 7 of the dash, then the jab replaces frame 8.
    expect(states.slice(0, 8).every((state) => state.move === 'dashForward')).toBe(true);
    expect(states[7]?.actionFrame).toBe(7);
    expect(states[8]).toMatchObject({ move: 'standLight', actionFrame: 0 });
  });

  it('cancels on the tick of the press once past frame 8', () => {
    const states = footwork(Light, 10);
    expect(states[9]?.move).toBe('dashForward');
    expect(states[10]).toMatchObject({ move: 'standLight', actionFrame: 0 });
  });

  it('cancels into the grab, not into a special', () => {
    expect(footwork(Grab, 4)[8]?.move).toBe('grab');
    const special = footwork(Special, 12);
    expect(special.filter((state) => state.move === 'dashForward')).toHaveLength(16);
    expect(special[16]?.move).toBe('special');
  });

  it("glides on with half the dash's speed, slowed down by friction (about 9 px)", () => {
    const states = footwork(Light, 4);
    const start = makeFighter().x;
    // 53 px covered by frames 1 to 7, then the jab glides.
    expect((states[7]?.x ?? 0) - start).toBe(covered(8));
    const glide = steps(states, makeFighter()).slice(8, 18);
    const speed = dashCurve(64, 12)[7] ?? 0;
    expect(glide[0]).toBe(speed / 2);
    expect(glide[1]).toBe(speed / 2 - PUSHBACK_FRICTION);
    expect(sum(glide)).toBe(px(9));
  });

  it('does not exist for Nayo: his dash runs to its end, then the move comes out', () => {
    // Pressed on frame 14, buffered: it comes out on frame 18, without momentum.
    const inputs = [Dash, ...repeat(0, 13), Light, ...repeat(0, 20)];
    const states = play(NAYO, inputs);
    expect(states.filter((state) => state.move === 'dashForward')).toHaveLength(18);
    expect(states[18]?.move).toBe('standLight');
    expect(states[18]?.vx).toBe(0);
  });

  it('keeps the ground move of a cancel read with the side faced at the press', () => {
    const states = footwork(Down | Light, 5);
    expect(states[8]?.move).toBe('crouchLight');
  });
});

describe('buffer (§2.5)', () => {
  /** The jab's last tick is `jab - 1`: tick `jab` is the first free one. */
  const jab = moveDuration(NAYO.moves.standLight);
  /** A jab, then `press` on the tick `early` ticks before the first free one, released at once. */
  function afterJab(press: InputBits, early: number): FighterState[] {
    const inputs = [Light, ...repeat(0, jab + 10)];
    inputs[jab - early] = press;
    return play(NAYO, inputs);
  }

  // The press tick counts: a press on any of the 6 ticks up to the first free one comes out.
  it('keeps a jump pressed during the last 6 ticks', () => {
    expect(afterJab(Input.Jump, 5)[jab]?.action).toBe('preJump');
    expect(afterJab(Up, 5)[jab]?.action).toBe('preJump');
    expect(afterJab(Input.Jump, 6)[jab]?.action).toBe('idle');
  });

  it('keeps a dash pressed during the last 6 ticks', () => {
    expect(afterJab(Dash, 5)[jab]?.move).toBe('dashForward');
    expect(afterJab(Left | Dash, 5)[jab]?.move).toBe('dashBack');
    expect(afterJab(Dash, 6)[jab]?.action).toBe('idle');
  });

  it('keeps a double tap completed during the move', () => {
    const inputs = [Light, ...repeat(0, jab + 10)];
    inputs[jab - 4] = Right;
    inputs[jab - 2] = Right;
    expect(play(NAYO, inputs)[jab]?.move).toBe('dashForward');
  });

  it('still jumps on up held, pressed long before', () => {
    const inputs = [Light, ...repeat(Up, jab + 2)];
    expect(play(NAYO, inputs)[jab]?.action).toBe('preJump');
  });
});
