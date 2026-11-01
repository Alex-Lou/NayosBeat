import type { Comfort } from '../../src/app/comfort';
import { NAYO as NAYO_ART } from '../../src/art/nayo';
import { RIFF as RIFF_ART } from '../../src/art/riff';
import type { FighterTemplate, MatchConfig } from '../../src/core/config';
import { px, toPx } from '../../src/core/constants';
import { FINISHER_DANGER_PERCENT } from '../../src/core/finisher';
import { DIRECTIONS, Input, type InputBits } from '../../src/core/input';
import { createInitialState, type FighterState, type GameState } from '../../src/core/state';
import { step } from '../../src/core/step';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import type { FighterId } from '../../src/data/roster';
import { TRAINING_STAGE } from '../../src/data/stages';
import { frameAround, frameFight, MAX_CLOSE_UP } from '../../src/render/camera-framing';
import { detectEvents, type FightEvent } from '../../src/render/fight-events';
import type { FightFeedback } from '../../src/render/fight-feedback';
import {
  FinisherScene,
  playToResults,
  resultsDue,
  type SceneFraming,
} from '../../src/render/finisher-scene';
import type { StagedLook } from '../../src/render/finisher-scripts';
import { FlashBudget } from '../../src/render/flash-budget';
import { GROUND_Y } from '../../src/render/greybox-stage';
import { hitStyleOf } from '../../src/render/hit-styles';
import { VIEW_SIZE } from '../../src/render/view';
import { fakeFeedback, fakeSfx, fakeStage, type FakeObject } from './finisher-fakes';

/**
 * The Finisher played on the real core through its real director, frame by frame as FightScene
 * plays it (docs/finisher.md §1.14): before its lock, a tick a frame; then the ticks its track
 * gives, its frame updated after them, what it skips and the match's end played unseen. Each
 * frame is kept: what the screen shows of it.
 */

const { Light: L, Heavy: H, Left: B, Boost: X } = Input;

/** A Finisher's route: who lands it, on whom, from how far, with which steps. */
export interface Route {
  readonly name: string;
  readonly fighters: readonly [FighterId, FighterId];
  readonly templates: readonly [FighterTemplate, FighterTemplate];
  readonly distance: number;
  readonly steps: readonly InputBits[];
}

/** Nayo's « Le Quatre » after L, L, H, H; Riff's « Larsen » after H (§4.3). */
export const LE_QUATRE: Route = {
  name: 'Le Quatre',
  fighters: ['nayo', 'riff'],
  templates: [NAYO, RIFF],
  distance: 40,
  steps: [L, L, H, H, B | X],
};
export const LARSEN: Route = {
  name: 'Larsen',
  fighters: ['riff', 'nayo'],
  templates: [RIFF, NAYO],
  distance: 40,
  steps: [H, B | X],
};

/** One frame on the screen. */
export interface Shot {
  /** Frames since back + BOOST came out (the press); negative before. */
  readonly t: number;
  readonly ticks: number;
  readonly state: GameState;
  /** The camera: the scene's framing (null: the fight's), and what it shows. */
  readonly staged: SceneFraming | null;
  readonly closeUp: number;
  readonly left: number;
  readonly top: number;
  readonly looks: readonly [StagedLook, StagedLook];
  /** The winner's card, as drawn. */
  readonly card: {
    readonly visible: boolean;
    readonly alpha: number;
    readonly y: number;
    /** Its words, its pieces' read in turn. */
    readonly words: string;
  };
  /** The scene holds the results back. */
  readonly holds: boolean;
  /** The fight's bus as last set (null: never), the landings asked so far, this frame's sounds. */
  readonly bus: { readonly gain: number; readonly cutoff: number } | null;
  readonly landings: readonly unknown[][];
  readonly sounds: readonly string[];
}

export interface Film {
  readonly shots: readonly Shot[];
  /** Frames from the press (t = 0) to the KO, and to the results. */
  readonly ko: number;
  readonly results: number;
  /** Ticks from the KO to the results, all of them (the track's, skipped, fast-forwarded). */
  readonly ticksAfterKo: number;
  readonly sfx: ReturnType<typeof fakeSfx>['sfx'];
  readonly feedback: ReturnType<typeof fakeFeedback>['feedback'] | null;
  readonly director: FinisherScene;
}

export interface Take {
  readonly comfort?: Partial<Comfort>;
  readonly training?: boolean;
  /** The fighters whose Finisher the session has played. */
  readonly seen?: Set<FighterId>;
  /** What each player holds on frame `t` (from the press), for the skip. */
  readonly held?: (t: number) => readonly [InputBits, InputBits];
  /**
   * What player 1 presses on the ticks of frame `t` once its route is played, as FightScene gives
   * it to the core: nothing while the scene seizes the inputs (training).
   */
  readonly presses?: (t: number) => InputBits;
  /** The real effects and their budget (the flashes' test); stand-ins otherwise. */
  readonly feedback?: FightFeedback;
  readonly budget?: FlashBudget;
  /** Called on every tick's events, and at the start of every frame (the budget's clock). */
  readonly onTick?: (previous: GameState, next: GameState, events: readonly FightEvent[]) => void;
  readonly onFrame?: (closeUp: number) => void;
  readonly onShown?: (state: GameState, director: FinisherScene) => void;
  /** Stops the film after this many frames past the press. */
  readonly until?: number;
}

/** The victim's health, at the danger's threshold exactly (270 for Riff, 300 for Nayo). */
function thresholdOf(template: FighterTemplate): number {
  return Math.trunc((template.maxHealth * FINISHER_DANGER_PERCENT) / 100);
}

/** The pair facing off at match point for player 1, its gauge full, its victim in danger. */
export function armed(route: Route, training = false): { config: MatchConfig; start: GameState } {
  const config: MatchConfig = {
    stage: TRAINING_STAGE,
    fighters: [route.templates[0], route.templates[1]],
    ...(training && { training: true, trainingGauge: 'full', trainingFinisher: 'always' }),
  };
  const base = createInitialState(config);
  const center = config.stage.width / 2;
  const half = px(route.distance) / 2;
  const [a, b] = base.fighters;
  const start: GameState = {
    ...base,
    round: { ...base.round, phase: 'fight', phaseFrame: 0, wins: training ? [0, 0] : [1, 0] },
    fighters: [
      { ...a, x: center - half, boost: 3000 },
      { ...b, x: center + half, health: training ? b.health : thresholdOf(route.templates[1]) },
    ],
  };
  return { config, start };
}

/** Whether `after` starts a new move on this tick. */
function startsMove(before: FighterState, after: FighterState): boolean {
  if (!after.move || after.actionFrame !== 0) return false;
  return before.move !== after.move || before.actionFrame > 0;
}

/** Plays `route` from its armed start through its scene, until the results (or `take.until`). */
export function film(route: Route, take: Take = {}): Film {
  const training = take.training ?? false;
  const { config, start } = armed(route, training);
  const budget = take.budget ?? new FlashBudget(take.comfort?.flashes ?? 'normal');
  const comfort: Comfort = { flashes: 'normal', shake: 'normal', staging: 'full', ...take.comfort };
  const { sfx, asSfx } = fakeSfx();
  const stand = take.feedback ? null : fakeFeedback();
  const feedback = take.feedback ?? (stand as ReturnType<typeof fakeFeedback>).asFeedback;
  const { scene, made } = fakeStage();
  const styles = [hitStyleOf(route.fighters[0]), hitStyleOf(route.fighters[1])] as const;
  const arts = route.fighters.map((id) => (id === 'nayo' ? NAYO_ART : RIFF_ART));
  const director = new FinisherScene(scene, {
    config,
    fighters: route.fighters,
    colorways: ['main', 'main'],
    energies: [styles[0].energy, styles[1].energy],
    strikes: [styles[0].strike, styles[1].strike],
    arts: [arts[0], arts[1]],
    groundY: GROUND_Y,
    stageWidth: toPx(config.stage.width),
    sfx: asSfx,
    feedback,
    budget,
    comfort,
    mode: 'full',
    humans: [0],
    seen: take.seen ?? new Set(),
  });
  const card = made.containers[0] as FakeObject;
  let state = start;
  let stepIndex = 0;
  let pressed = 0;
  // Set from the ticks' events (closures): typed wide, or the checker would narrow them to null.
  let press = null as number | null;
  let ko = null as number | null;
  let ticksAfterKo = 0;
  let closeUp = MAX_CLOSE_UP;
  let left = 0;
  let top = 0;
  const shots: Shot[] = [];
  const events: FightEvent[] = [];
  let heard = 0;
  /** The steps of the route, pressed the way playCombo presses them, then nothing. */
  const input = (): InputBits => {
    const next = route.steps[stepIndex];
    if (next === undefined) return 0;
    return pressed++ % 2 === 0 ? next : next & DIRECTIONS;
  };
  /** What player 1 presses: its route, then the take's; nothing while the scene seizes it. */
  const player1 = (frame: number): InputBits => {
    if (director.seizesInputs()) return 0;
    if (stepIndex < route.steps.length) return input();
    return press === null ? 0 : (take.presses?.(frame - press) ?? 0);
  };
  const tick = (frame: number) => {
    const previous = state;
    state = step(previous, [player1(frame), 0], config);
    if (startsMove(previous.fighters[0], state.fighters[0])) {
      stepIndex++;
      pressed = 0;
    }
    detectEvents(previous, state, config, events);
    take.onTick?.(previous, state, events);
    const viewLeft = toPx(state.cameraX) - VIEW_SIZE.width / 2;
    for (const event of events) {
      if (event.type === 'super' && press === null) press = frame;
      if (event.type === 'finisherBlow' && ko === null) ko = frame;
      director.react(event, state, viewLeft);
    }
    if (ko !== null && ko !== frame) ticksAfterKo++;
  };
  const limit = 2000;
  let results = null as number | null;
  for (let frame = 0; frame < limit && results === null; frame++) {
    take.onFrame?.(closeUp);
    const t = press === null ? frame - limit : frame - press;
    if (take.until !== undefined && press !== null && t > take.until) break;
    const active = director.isActive();
    const ticks = active ? director.nextFrame() : 1;
    let played = 0;
    for (let i = 0; i < ticks; i++) {
      tick(frame);
      played++;
      if (!active && director.isActive()) break;
    }
    if (director.isActive()) {
      const viewLeft = toPx(state.cameraX) - VIEW_SIZE.width / 2;
      director.update(state, take.held?.(t) ?? [0, 0], { closeUp, left, top, viewLeft });
      const skipped = director.takeSkipped();
      for (let i = 0; i < skipped; i++) state = step(state, [0, 0], config);
      if (ko !== null) ticksAfterKo += skipped;
      if (director.wantsFastForward()) {
        const before = state.frame;
        state = playToResults(state, config);
        ticksAfterKo += state.frame - before;
        director.fastForwarded();
      }
    }
    // The camera, as FightScene frames it.
    const viewLeft = toPx(state.cameraX) - VIEW_SIZE.width / 2;
    const staged = director.camera;
    const [a, b] = state.fighters;
    const xs = [toPx(a.x), toPx(b.x), toPx(a.x), toPx(a.x)];
    const framing = staged
      ? frameAround(staged.middle, staged.closeUp, viewLeft, GROUND_Y)
      : frameFight({
          xs,
          highestFeet: toPx(Math.max(a.y, b.y)),
          viewLeft,
          groundY: GROUND_Y,
          closeUp,
          elapsed: 1,
        });
    ({ closeUp, left, top } = framing);
    take.onShown?.(state, director);
    const lastBus = sfx.setFightBus.mock.lastCall as [number, number] | undefined;
    const sounds = sfx.play.mock.calls.slice(heard).map(([name]) => String(name));
    heard = sfx.play.mock.calls.length;
    shots.push({
      t: press === null ? Number.NEGATIVE_INFINITY : frame - press,
      ticks: played,
      state,
      staged,
      closeUp,
      left,
      top,
      looks: [director.lookOf(0), director.lookOf(1)],
      card: {
        visible: card.visible,
        alpha: card.alpha,
        y: card.y,
        words: card.children.map((child) => child.text).join(''),
      },
      holds: director.holdsResults(),
      bus: lastBus ? { gain: lastBus[0], cutoff: lastBus[1] } : null,
      landings: stand ? [...stand.feedback.finisherLanding.mock.calls] : [],
      sounds,
    });
    if (resultsDue(state) && !director.holdsResults()) results = frame;
    if (training && ko !== null && !director.isActive() && results === null) results = frame;
  }
  if (press === null || ko === null) throw new Error(`${route.name}: no Finisher`);
  return {
    shots,
    ko: ko - press,
    results: (results ?? Number.NaN) - press,
    ticksAfterKo,
    sfx,
    feedback: stand?.feedback ?? null,
    director,
  };
}
