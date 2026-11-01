import { describe, expect, it } from 'vitest';
import { px } from '../../src/core/constants';
import { createInitialState, FLAG_EXTENDED, type GameState } from '../../src/core/state';
import {
  CLOSE_UP_EFFECTS,
  closestDuring,
  FINISHER_CLOSE_UP,
  FOOTSIES_WINDOW,
  frameAround,
  frameFight,
  MAX_CLOSE_UP,
  NO_PUSH,
  PUSH_LEAN,
  PUSH_LEAN_MAX,
  PUSH_ZOOM,
  PUSHED_CLOSE_UP,
  pushOf,
  textResolution,
  type CameraPush,
  type FightFraming,
  type FramingInput,
} from '../../src/render/camera-framing';
import type { FightEvent } from '../../src/render/fight-events';
import { VIEW_SIZE } from '../../src/render/view';
import { MIRROR_MATCH } from '../core/helpers';

const GROUND_Y = 230;

/** What a quiet frame of the fight adds to where the fighters stand: no history, no blow. */
const QUIET = {
  highestFeet: 0,
  viewLeft: 0,
  groundY: GROUND_Y,
  middle: null,
  lean: 0,
  push: NO_PUSH,
  hitstop: 0,
  comfort: { shake: 'normal', flashes: 'normal' },
} as const;

type Scene = Pick<FramingInput, 'xs'> & Partial<Omit<FramingInput, 'closeUp' | 'elapsed'>>;

/** One display frame of 1/60 s after `before` (null: the first one, from `closeUp`). */
function frame(scene: Scene, before: FightFraming | null, closeUp = 1): FightFraming {
  const input: FramingInput = { ...QUIET, ...scene, closeUp, elapsed: 1 };
  if (!before) return frameFight(input);
  return frameFight({
    ...input,
    closeUp: before.closeUp,
    middle: before.middle,
    lean: before.lean,
  });
}

/** Runs the easing until it settles, from `before` (or a first frame at `closeUp`). */
function settle(scene: Scene, closeUp = 1, before: FightFraming | null = null): FightFraming {
  let framing = frame(scene, before, closeUp);
  for (let i = 0; i < 300; i++) framing = frame(scene, framing);
  return framing;
}

describe('fight camera framing', () => {
  it('closes in on fighters standing close', () => {
    const framing = settle({ xs: [220, 270], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
    expect(framing.closeUp).toBeCloseTo(MAX_CLOSE_UP, 2);
  });

  it('shows the whole view when the fighters are far apart', () => {
    const framing = settle({ xs: [40, 440], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
    expect(framing.closeUp).toBeCloseTo(1, 2);
    expect(framing.left).toBeCloseTo(0, 2);
  });

  it('opens up for a high jump so the jumper stays in view', () => {
    const framing = settle({ xs: [220, 270], highestFeet: 90, viewLeft: 0, groundY: GROUND_Y });
    const visibleAboveGround = GROUND_Y / framing.closeUp;
    expect(visibleAboveGround).toBeGreaterThanOrEqual(90 + 90);
    expect(framing.closeUp).toBeLessThan(MAX_CLOSE_UP);
  });

  it('keeps the ground at the same place on screen', () => {
    const framing = settle({ xs: [220, 270], highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
    expect((GROUND_Y - framing.top) * framing.closeUp).toBeCloseTo(GROUND_Y, 5);
  });

  it('never shows anything outside the simulation camera', () => {
    for (const xs of [
      [5, 30],
      [450, 478],
      [100, 300],
    ]) {
      const framing = settle({ xs, highestFeet: 0, viewLeft: 0, groundY: GROUND_Y });
      expect(framing.left).toBeGreaterThanOrEqual(-1e-9);
      expect(framing.left + VIEW_SIZE.width / framing.closeUp).toBeLessThanOrEqual(
        VIEW_SIZE.width + 1e-9,
      );
    }
  });

  it('eases toward its framing instead of jumping', () => {
    const first = frameFight({ ...QUIET, xs: [220, 270], closeUp: 1, elapsed: 1 });
    expect(first.closeUp).toBeGreaterThan(1);
    expect(first.closeUp).toBeLessThan(1.1);
  });

  it('eases as fast at 144 Hz as at 60 Hz', () => {
    const input = { ...QUIET, xs: [220, 270] };
    let at60 = frameFight({ ...input, closeUp: 1, elapsed: 1 });
    for (let i = 1; i < 30; i++) at60 = frameFight({ ...input, closeUp: at60.closeUp, elapsed: 1 });
    let at144 = frameFight({ ...input, closeUp: 1, elapsed: 60 / 144 });
    for (let i = 1; i < 72; i++) {
      at144 = frameFight({ ...input, closeUp: at144.closeUp, elapsed: 60 / 144 });
    }
    expect(at144.closeUp).toBeCloseTo(at60.closeUp, 6);
  });
});

describe("the Finisher's close up (docs/finisher.md §1.14)", () => {
  it('frames ×2 around its impact, the ground kept at the bottom, inside the simulation’s camera', () => {
    const close = frameAround(300, FINISHER_CLOSE_UP, 0, GROUND_Y);
    expect(close.left).toBeCloseTo(300 - VIEW_SIZE.width / 4, 5);
    // 115 px of the world over the ground (and the HUD covers the 15 at the top).
    expect(GROUND_Y - close.top).toBeCloseTo(115, 5);
    // Never past the simulation camera's walls.
    expect(frameAround(20, FINISHER_CLOSE_UP, 0, GROUND_Y).left).toBe(0);
    expect(CLOSE_UP_EFFECTS).toBeCloseTo(0.725, 5);
  });

  it('draws the texts of the world as sharp as the close up they show at', () => {
    expect(textResolution(1920)).toBe(Math.ceil(4 * MAX_CLOSE_UP));
    expect(textResolution(1920, FINISHER_CLOSE_UP)).toBe(8);
  });
});

type Hit = Extract<FightEvent, { type: 'hit' }>;

/** A blow of player 1 at world x `x`, as fight-events.ts reports it. */
function hit(x: number, overrides: Partial<Hit> = {}): Hit {
  return {
    type: 'hit',
    heavy: false,
    x: px(x),
    y: 0,
    away: 1,
    by: 0,
    low: false,
    damage: 40,
    held: false,
    counter: null,
    tier: 0,
    pulse: false,
    ...overrides,
  };
}

/** The final blow of player 1 (or `by`) at world x `x`. */
function ko(x: number, finish: 'plain' | 'finale' = 'plain', by: 0 | 1 = 0): FightEvent {
  const { x: at, y, away, low, damage, held, counter, tier, pulse } = hit(x);
  return { type: 'ko', finish, x: at, y, away, by, low, damage, held, counter, tier, pulse };
}

const BEFORE = createInitialState(MIRROR_MATCH);

/** `state` with player 2 (the defender of `hit`) extended on this tick (Rebond, Vrille). */
function extended(state: GameState): GameState {
  const [a, b] = state.fighters;
  return { ...state, fighters: [a, { ...b, flags: b.flags | FLAG_EXTENDED }] };
}

/** The push of one tick's events, from none. */
function pushed(events: readonly FightEvent[], next: GameState = BEFORE): CameraPush {
  return pushOf(events, BEFORE, next, NO_PUSH);
}

/** Fighters standing close around x 245: the closest framing. */
const CLOSE = { xs: [220, 270] } as const;
/** A push toward the contact at world x `x`, the game frozen. */
function frozen(push: CameraPush, hitstop = 12): Scene {
  return { ...CLOSE, push, hitstop };
}

describe('the camera push on a strong blow (P12)', () => {
  it('pushes in by the blow: heavy or counter-hit, extender or a super’s last, KO; never a light one', () => {
    expect(pushed([hit(250)])).toBe(NO_PUSH);
    expect(pushed([hit(250, { heavy: true })])).toEqual({ zoom: PUSH_ZOOM.heavy, x: 250 });
    expect(pushed([hit(250, { counter: 'counter' })]).zoom).toBe(PUSH_ZOOM.heavy);
    expect(pushed([hit(250, { counter: 'punish' })]).zoom).toBe(PUSH_ZOOM.heavy);
    expect(pushed([hit(250)], extended(BEFORE)).zoom).toBe(PUSH_ZOOM.extender);
    expect(pushed([hit(250, { tier: 3 })]).zoom).toBe(PUSH_ZOOM.extender);
    // A super's blow before its last pulses: only its weight pushes.
    expect(pushed([hit(250, { tier: 3, pulse: true })])).toBe(NO_PUSH);
    expect(pushed([ko(250)]).zoom).toBe(PUSH_ZOOM.ko);
    // The Finisher's blows are its scene's to frame.
    const finale = { type: 'finisherBlow', by: 0, x: px(250), y: 0, away: 1 } as const;
    expect(pushed([ko(250, 'finale'), finale])).toBe(NO_PUSH);
  });

  it('follows the last contact: a block or a light blow lets go, a quiet tick keeps it', () => {
    const heavy = pushed([hit(250, { heavy: true })]);
    const frozenState = { ...BEFORE, hitstop: 5 };
    expect(pushOf([{ type: 'jump' }], frozenState, frozenState, heavy)).toBe(heavy);
    // Spent once the game moves: a freeze no blow made (a super's flash) does not bring it back.
    expect(pushOf([], frozenState, BEFORE, heavy)).toBe(NO_PUSH);
    expect(pushOf([], BEFORE, { ...BEFORE, hitstop: 20 }, NO_PUSH)).toBe(NO_PUSH);
    expect(pushOf([hit(250)], BEFORE, BEFORE, heavy)).toBe(NO_PUSH);
    const block = { type: 'block', x: px(250), y: 0, away: 1, by: 0, low: false } as const;
    expect(pushOf([block], BEFORE, BEFORE, heavy)).toBe(NO_PUSH);
    // A trade: the stronger blow.
    expect(pushed([hit(250, { heavy: true }), ko(240, 'plain', 1)])).toEqual({
      zoom: PUSH_ZOOM.ko,
      x: 240,
    });
  });

  it('closes in by its zoom at the closest framing, 75 % of the way in 2 frames', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    for (const zoom of Object.values(PUSH_ZOOM)) {
      const push = { zoom, x: 245 };
      const target = MAX_CLOSE_UP * zoom;
      const second = frame(frozen(push), frame(frozen(push), rest));
      expect(second.closeUp).toBeCloseTo(MAX_CLOSE_UP + (target - MAX_CLOSE_UP) * 0.75, 6);
      expect(settle(frozen(push), 1, rest).closeUp).toBeCloseTo(target, 6);
    }
    expect(PUSHED_CLOSE_UP).toBeCloseTo(1.566, 3);
  });

  it('plays only while the game is frozen, and lets go at the usual pace once it moves', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    const push = { zoom: PUSH_ZOOM.ko, x: 300 };
    expect(frame({ ...CLOSE, push, hitstop: 0 }, rest)).toEqual(frame(CLOSE, rest));
    const held = settle(frozen(push), 1, rest);
    const released = frame({ ...CLOSE, push, hitstop: 0 }, held);
    expect(released.closeUp).toBeCloseTo(MAX_CLOSE_UP + (held.closeUp - MAX_CLOSE_UP) * 0.9, 6);
    expect(released.lean).toBeCloseTo(held.lean * 0.9, 6);
  });

  it('never pushes with the screen kept still (« Tremblement : aucun », XAG 117)', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    const push = { zoom: PUSH_ZOOM.ko, x: 300 };
    let still = rest;
    let quiet = rest;
    for (let i = 0; i < 30; i++) {
      still = frame({ ...frozen(push), comfort: { shake: 'off', flashes: 'normal' } }, still);
      quiet = frame(CLOSE, quiet);
    }
    expect(still).toEqual(quiet);
    // Reduced, it still pushes: only the shake is halved.
    const reduced = { shake: 'reduced', flashes: 'normal' } as const;
    expect(frame({ ...frozen(push), comfort: reduced }, rest).closeUp).toBeGreaterThan(
      MAX_CLOSE_UP,
    );
  });

  it('never pushes with the flashes calm: what their muted looks light stays under the area', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    const push = { zoom: PUSH_ZOOM.ko, x: 300 };
    for (const flashes of ['reduced', 'off'] as const) {
      const calm = { ...frozen(push), comfort: { shake: 'normal', flashes } } as const;
      expect(frame(calm, rest)).toEqual(frame(CLOSE, rest));
    }
  });

  it('leans a quarter of the way to the contact, never more than 12 px on screen', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    // 20 px from the middle: 5 px of the world.
    const near = settle(frozen({ zoom: PUSH_ZOOM.heavy, x: 265 }), 1, rest);
    expect(near.lean).toBeCloseTo(PUSH_LEAN * 20, 6);
    // Far: capped, on every frame, at 12 px of the view whatever the close-up (§6 Q2).
    for (const x of [400, 90]) {
      let framing = rest;
      for (let i = 0; i < 60; i++) {
        framing = frame(frozen({ zoom: PUSH_ZOOM.ko, x }), framing);
        expect(Math.abs(framing.lean * framing.closeUp)).toBeLessThanOrEqual(PUSH_LEAN_MAX + 1e-9);
      }
      expect(Math.abs(framing.lean * framing.closeUp)).toBeCloseTo(PUSH_LEAN_MAX, 6);
      // The picture itself moves by the lean: the middle shown leans toward the contact.
      const shown = framing.left + VIEW_SIZE.width / framing.closeUp / 2;
      expect(shown - framing.middle).toBeCloseTo(framing.lean, 6);
      expect(Math.sign(framing.lean)).toBe(Math.sign(x - 245));
    }
  });

  it('counts the flashes of a blow at the close-up its push takes them to', () => {
    expect(closestDuring(MAX_CLOSE_UP, NO_PUSH)).toBe(MAX_CLOSE_UP);
    expect(closestDuring(MAX_CLOSE_UP, { zoom: PUSH_ZOOM.ko, x: 0 })).toBeCloseTo(PUSHED_CLOSE_UP);
    // Already pushed: never past the closest the fight frames.
    expect(closestDuring(PUSHED_CLOSE_UP, { zoom: PUSH_ZOOM.ko, x: 0 })).toBe(PUSHED_CLOSE_UP);
    expect(closestDuring(1.2, { zoom: PUSH_ZOOM.heavy, x: 0 })).toBeCloseTo(1.248);
  });
});

describe('the footsies window (P12, L13)', () => {
  it('keeps the framed middle still while the fighters step within the window', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    expect(rest.middle).toBe(245);
    for (const step of [-FOOTSIES_WINDOW, -3, 2, FOOTSIES_WINDOW]) {
      const stepped = frame({ xs: [220 + step, 270 + step] }, rest);
      expect(stepped.middle).toBe(245);
      expect(stepped.left).toBeCloseTo(rest.left, 9);
    }
  });

  it('follows once they leave it, at its edge, and starts centered', () => {
    const rest = settle(CLOSE, MAX_CLOSE_UP);
    const right = frame({ xs: [235, 285] }, rest);
    expect(right.middle).toBe(260 - FOOTSIES_WINDOW);
    const left = frame({ xs: [200, 250] }, rest);
    expect(left.middle).toBe(225 + FOOTSIES_WINDOW);
    expect(frame(CLOSE, null, MAX_CLOSE_UP).middle).toBe(245);
  });
});
