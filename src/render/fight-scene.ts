import Phaser from 'phaser';
import { cpuStep, createCpu, type CpuBehavior, type CpuState } from '../ai/cpu';
import { artOf } from '../art';
import type { FighterArt } from '../art/types';
import { assertValidArt } from '../art/validate';
import type { Sfx } from '../audio/sfx';
import { hudComfortOf, isCalm, type Comfort } from '../app/comfort';
import { matchConfigOf, player2Behavior, type MatchSetup } from '../app/match-setup';
import { DEFAULT_VIEWING, type Viewing } from '../app/viewing';
import type { MatchConfig } from '../core/config';
import { TICK_RATE, toPx } from '../core/constants';
import type { FinisherState } from '../core/finisher';
import type { InputBits } from '../core/input';
import { matchWinner } from '../core/round';
import { createInitialState, type GameState } from '../core/state';
import { step } from '../core/step';
import { assertValidMatch } from '../core/validate';
import type { FighterId } from '../data/roster';
import { connectedGamepads } from '../input/gamepad';
import { PauseInput } from '../input/pause-input';
import { rumble, vibrate } from '../input/haptics';
import { PlayerInputs } from '../input/player-inputs';
import { HeldStruggle } from '../input/held-struggle';
import { isTouchDevice, TouchControls } from '../input/touch-controls';
import { clockGrainMs, FrameClock } from '../loop/cadence';
import { TickPacer } from '../loop/tick-pacer';
import type { AnimOptions } from './anim-options';
import { frontFighter, type ShowContext } from './animation';
import { NO_ADVANTAGE, trackAdvantage, type Advantage } from './advantage-meter';
import { TouchCover } from './touch-cover';
import { PadHaptics } from './pad-haptics';
import { NO_COMBO, trackCombo, type ComboMeter } from './training-combo';
import { TrainingView } from './training-view';
import { BoxOverlay } from './box-overlay';
import {
  closestDuring,
  FINISHER_CLOSE_UP,
  frameAround,
  frameFight,
  MAX_CLOSE_UP,
  NO_PUSH,
  pushNow,
  pushOf,
  type CameraPush,
  type Framing,
  type FramingInput,
} from './camera-framing';
import { DebugOverlay, describeGame, isDebugEnabled } from './debug-overlay';
import { dissolveStyleOf } from './dissolve';
import { detectEvents, type FightEvent } from './fight-events';
import { FightFeedback } from './fight-feedback';
import { FightMemory } from './fight-memory';
import { FinisherScene, playToResults, resultsDue, type CameraNow } from './finisher-scene';
import type { StagedLook } from './finisher-scripts';
import { FinisherSignal, sirenPitchOf } from './finisher-signal';
import { FlashBudget } from './flash-budget';
import { FighterView } from './fighter-view';
import { STAGE_ART } from '../art/rue';
import { drawGreyboxStage, GROUND_Y } from './greybox-stage';
import { hitStyleOf, hudColorOf, type HitStyle } from './hit-styles';
import { requestLandscapeFullscreen } from './fullscreen';
import { HoldPrompt } from './hold-prompt';
import { HoldRing } from './hold-ring';
import { Hud } from './hud';
import { MoveCaption } from './move-caption';
import type { ShakeMode } from './shake';
import { ProjectileView } from './projectile-view';
import { isContextLost, type RenderMode } from './render-mode';
import { loadArt } from './art-textures';
import { contourOf, type SilhouetteLook } from './silhouette';
import { SpriteFighterView } from './sprite-fighter-view';
import { drawStage, FIGHT_STAGE_COLORS, loadStage } from './stage-view';
import type { StagePropsView } from './stage-props';
import { VIEW_SIZE } from './view';

/** Caps the catch-up after a long stall (~83 ms of simulation at 60 Hz). */
const MAX_TICKS_PER_FRAME = 5;

/** Grey boxes of the fighters without art. */
const COLORS = { player1: 0xd9574a, player2: 0x4a8fd9 } as const;

export interface FightSceneData {
  readonly setup: MatchSetup;
  readonly sfx: Sfx;
  /** The player's comfort options as the fight starts (then `applyComfort`). */
  readonly comfort: Comfort;
  /** How the fight is watched as it starts (then `setViewing`): slowed down, which animation. */
  readonly viewing: Viewing;
  /** Training: the boxes shown as it starts (then `setBoxes`), as `?debug` shows them. */
  readonly boxes?: boolean;
  /** Training: its input history and frame meter shown as it starts (then `setTrainingData`). */
  readonly trainingData?: boolean;
  /** « Lutte en prise : tenir » as it starts (then `setHeldStruggle`): held-struggle.ts. */
  readonly heldStruggle?: boolean;
  /** How the game is drawn, read once from the renderer when it starts (render-mode.ts). */
  readonly mode: RenderMode;
  /** How the fighters stand out from the sky, read once from the address (silhouette.ts). */
  readonly silhouette: SilhouetteLook;
  /** Also called when the picture is lost with the GPU: the player resumes once it is back. */
  readonly onPause: () => void;
  /** Called once, a moment after the final KO, with the winner's index. */
  readonly onMatchEnd: (winner: 0 | 1 | null) => void;
  /** Called once, as the fight's first frame is drawn: what covered the loading may go. */
  readonly onShown?: () => void;
  /**
   * The fighters whose Finisher the session has played (the app's, across matches): from the
   * second one on, its scene plays short (docs/finisher.md §1.14). The fight notes its own.
   */
  readonly finishersSeen: Set<FighterId>;
}

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

/** A fighter on screen: sprites when it has art, a grey box otherwise. */
interface FighterDisplay {
  /**
   * `frames`: display frames of 1/60 s since the last update; `finisher`: the fighter's Finisher
   * signal (its halo); `context`: the animation's options and what the scene remembers of the
   * fight.
   */
  update(
    state: GameState,
    frames: number,
    finisher: FinisherState,
    context: ShowContext,
    staged: StagedLook,
  ): void;
  setFront(front: boolean): void;
  /** The comfort options: `calm`, the flashes not normal; how far things shake (off: no motion). */
  setComfort(calm: boolean, shake: ShakeMode): void;
}

/** Everything that exists only while the scene runs, created in `create`, freed on shutdown. */
interface Runtime {
  readonly inputs: PlayerInputs;
  /** Player 1's touch controls, on a touch device: the BOOST button wears its gauge. */
  readonly touch: TouchControls | undefined;
  /** With them: they fade while a fighter is under them (touch-cover.ts). */
  readonly touchCover: TouchCover | undefined;
  /** Each player's gamepad rumbles for its own blows (pad-haptics.ts). */
  readonly padHaptics: PadHaptics;
  /** A button held in a grab struggling as mashed, for the humans who chose so (P25). */
  readonly heldStruggle: HeldStruggle;
  readonly pauseInput: PauseInput;
  readonly fighterViews: readonly [FighterDisplay, FighterDisplay];
  readonly projectileView: ProjectileView;
  /** How many flashes the fight may still show (docs/flashs.md §4): the effects ask it. */
  readonly budget: FlashBudget;
  /**
   * Both players' Finisher signals (docs/finisher.md §1.2), read once a frame: the HUD's plate,
   * the BOOST button, the halos and the siren all show the same.
   */
  readonly finisher: FinisherSignal;
  readonly feedback: FightFeedback;
  /** The Finisher's director: once it locks, it paces the game and frames it (finisher-scene.ts). */
  readonly finisherScene: FinisherScene;
  readonly hud: Hud;
  /** The time a hold has left, around the fighter held. */
  readonly holdRing: HoldRing;
  /** Training only: the name of each move as it starts, the buttons of a hold. */
  readonly caption: MoveCaption | undefined;
  readonly holdPrompt: HoldPrompt | undefined;
  /** Debug only: the statistics, and every box. */
  readonly debugOverlay: DebugOverlay | undefined;
  readonly boxOverlay: BoxOverlay | undefined;
  /** Training: player 1's input history and the frame meter (training-view.ts). */
  readonly trainingView: TrainingView | undefined;
  /** The stage's animations, when the stage is drawn (stage-props.ts). */
  readonly stageProps: StagePropsView | undefined;
}

/**
 * Runs one match: reads the players (or the CPU), advances the simulation at a fixed tick
 * rate and displays it. Game rules live in `core/`, CPU decisions in `ai/`, effects and
 * sounds in `FightFeedback`: this scene only orchestrates them.
 */
export class FightScene extends Phaser.Scene {
  private sceneData!: FightSceneData;
  private config!: MatchConfig;
  private state!: GameState;
  /**
   * Visual effects count steps of 1/60 s (their durations are written in 60 Hz frames), not
   * display frames: a KO lasts as long on a 144 Hz screen as on a 60 Hz one. Unscaled by slow
   * motion, which only slows the simulation. The ticks are counted on these steps too, the frame's
   * delta snapped on the screen's cadence first (loop/cadence.ts): one clock, no stutter. It
   * outlives the fight, to start the next one on its cadence.
   */
  private readonly visualClock = new FrameClock(
    clockGrainMs(() => performance.now()),
    MAX_TICKS_PER_FRAME,
  );
  /**
   * Slowed down to watch the animation (Viewing): exactly one frame of game time every so many
   * frames of the visual clock; the KO's slow motion then paces its ticks within those
   * (FightFeedback.ticksFor), slowing the slowed game as much.
   */
  private pacer: TickPacer | undefined;
  private viewing: Viewing = DEFAULT_VIEWING;
  /** What the views remember of the fight, noted tick by tick; reset with every match. */
  private readonly memory = new FightMemory();
  private readonly showContext: { options: AnimOptions; memory: FightMemory } = {
    options: DEFAULT_VIEWING.anim,
    memory: this.memory,
  };
  /** Player 2's CPU, unless a human plays it. */
  private cpu: CpuState | undefined;
  /** Training: the advantage of the exchanges, measured on every tick (advantage-meter.ts). */
  private advantage: Advantage = NO_ADVANTAGE;
  /** Training: player 1's last combo on the dummy, measured on every tick (training-combo.ts). */
  private combo: ComboMeter = NO_COMBO;
  private arts: readonly [FighterArt | undefined, FighterArt | undefined] = [undefined, undefined];
  private styles!: readonly [HitStyle, HitStyle];
  private paused = false;
  private matchEndReported = false;
  /** The fighter drawn over the other one. */
  private front: 0 | 1 = 0;
  /** Current close-up of the fight camera (see frameFight), and its world top left corner. */
  private closeUp = MAX_CLOSE_UP;
  private cameraLeft = 0;
  private cameraTop = 0;
  /** The last contact's camera push (see pushOf), played while the game is frozen. */
  private push: CameraPush = NO_PUSH;
  private runtime: Runtime | undefined;

  /** Reused every tick to avoid allocating. */
  private readonly tickInputs: [InputBits, InputBits] = [0, 0];
  private readonly tickEvents: FightEvent[] = [];
  /**
   * Reused every display frame by `syncViews`. What the framing keeps in view: both fighters,
   * then the projectiles (at most one per player). A missing projectile repeats the first
   * fighter's position, which moves neither bound.
   */
  private readonly framedXs: [number, number, number, number] = [0, 0, 0, 0];
  private readonly framingInput: Mutable<FramingInput> = {
    xs: this.framedXs,
    highestFeet: 0,
    viewLeft: 0,
    groundY: GROUND_Y,
    closeUp: MAX_CLOSE_UP,
    elapsed: 0,
    middle: null,
    lean: 0,
    push: NO_PUSH,
    hitstop: 0,
    comfort: { shake: 'normal', flashes: 'normal' },
  };

  constructor() {
    super('fight');
  }

  /** Called on every (re)start: resets everything that belongs to one match. */
  init(data: FightSceneData): void {
    this.sceneData = data;
    this.config = matchConfigOf(data.setup);
    assertValidMatch(this.config);
    this.state = createInitialState(this.config);
    // In a mirror match, player 2 wears the second colorway.
    const [first, second] = data.setup.fighters;
    const colorway = first === second ? 'alt' : 'main';
    this.arts = [artOf(first), artOf(second, colorway)];
    this.styles = [hitStyleOf(first), hitStyleOf(second, colorway)];
    for (const player of [0, 1] as const) {
      const art = this.arts[player];
      if (art) assertValidArt(art, this.config.fighters[player]);
    }
    this.visualClock.restart();
    // A rematch starts over in its intro, with no event to tell the views: they forget it all.
    this.memory.reset();
    this.advantage = NO_ADVANTAGE;
    this.combo = NO_COMBO;
    this.watch(data.viewing);
    const behavior = player2Behavior(data.setup);
    this.cpu = behavior === 'human' ? undefined : createCpu(1, behavior, Date.now() | 0);
    this.paused = false;
    this.matchEndReported = false;
    this.front = 0;
    this.closeUp = MAX_CLOSE_UP;
    this.cameraLeft = 0;
    this.cameraTop = 0;
    this.push = NO_PUSH;
    this.framingInput.middle = null;
    this.framingInput.lean = 0;
  }

  preload(): void {
    for (const art of this.arts) if (art) loadArt(this, art);
    if (STAGE_ART) loadStage(this, STAGE_ART);
  }

  create(): void {
    const debug = isDebugEnabled();
    // Everything is placed in world pixels; the canvas is finer (see renderScaleFor). With the
    // origin at the top left, the scroll stays the world x of the screen's left edge.
    this.cameras.main.setZoom(this.scale.width / VIEW_SIZE.width).setOrigin(0, 0);
    const stageWidth = toPx(this.config.stage.width);
    // The street in front of the Warehouse (docs/art/decor-rue.md), the grey box without it.
    const stageProps = STAGE_ART ? drawStage(this, STAGE_ART) : undefined;
    if (!STAGE_ART) {
      drawGreyboxStage(this, stageWidth, { silhouette: this.sceneData.silhouette, debug });
    }
    const { comfort, mode } = this.sceneData;
    const budget = new FlashBudget(comfort.flashes);
    const touch = isTouchDevice()
      ? new TouchControls(document.body, requestLandscapeFullscreen, this.styles[0].energy)
      : undefined;
    const hud = new Hud(
      this,
      this.config,
      [hudColorOf(this.styles[0]), hudColorOf(this.styles[1])],
      hudComfortOf(comfort),
      budget,
    );

    const runtime: Omit<Runtime, 'finisherScene'> = {
      inputs: new PlayerInputs(window, touch, connectedGamepads()),
      padHaptics: new PadHaptics((player) =>
        this.runtime?.inputs.padOf(player, connectedGamepads()),
      ),
      heldStruggle: new HeldStruggle(this.sceneData.heldStruggle === true),
      touch,
      touchCover: touch
        ? new TouchCover(this.game.canvas, touch, this.config, GROUND_Y)
        : undefined,
      pauseInput: new PauseInput(document.body),
      fighterViews: [
        this.fighterDisplay(0, COLORS.player1, budget),
        this.fighterDisplay(1, COLORS.player2, budget),
      ],
      projectileView: new ProjectileView(this, this.config, GROUND_Y, this.arts, mode),
      budget,
      // Both players hear the siren, each fighter's in its own key.
      finisher: new FinisherSignal(this.config, (player) => {
        this.sceneData.sfx.play(
          'finisherReady',
          sirenPitchOf(this.sceneData.setup.fighters[player]),
        );
      }),
      // Touch is player 1's: its phone vibrates when player 1 is grabbed or hit hard. The
      // gamepads rumble when a KO blows a Boost gauge up. The screen keeps still for those who
      // chose so (Options, or their system's « reduce motion »).
      feedback: new FightFeedback(
        this,
        GROUND_Y,
        this.sceneData.sfx,
        this.styles,
        {
          width: stageWidth,
          colors: FIGHT_STAGE_COLORS,
          budget,
          comfort,
          mode,
          knockOut: (player, finish, still) => {
            hud.knockOut(player, finish, still);
          },
        },
        touch ? vibrate : undefined,
        (ms, strength) => {
          rumble(connectedGamepads(), ms, strength);
        },
      ),
      hud,
      holdRing: new HoldRing(this, GROUND_Y, [this.styles[0].energy, this.styles[1].energy], mode),
      caption: this.config.training ? new MoveCaption(this, this.config, GROUND_Y) : undefined,
      holdPrompt: this.config.training ? new HoldPrompt(this, this.config, GROUND_Y) : undefined,
      debugOverlay: debug ? new DebugOverlay(document.body) : undefined,
      boxOverlay:
        debug || this.config.training ? new BoxOverlay(this, this.config, GROUND_Y) : undefined,
      trainingView: this.config.training ? new TrainingView(this, this.config) : undefined,
      stageProps,
    };
    // The Finisher's director: what it draws is made now, with the rest (addScreenCamera).
    const [first, second] = this.sceneData.setup.fighters;
    const finisherScene = new FinisherScene(this, {
      config: this.config,
      fighters: this.sceneData.setup.fighters,
      colorways: first === second ? ['main', 'alt'] : ['main', 'main'],
      energies: [this.styles[0].energy, this.styles[1].energy],
      strikes: [this.styles[0].strike, this.styles[1].strike],
      arts: this.arts,
      groundY: GROUND_Y,
      stageWidth,
      sfx: this.sceneData.sfx,
      feedback: runtime.feedback,
      budget,
      comfort,
      mode,
      humans: this.cpu ? [0] : [0, 1],
      seen: this.sceneData.finishersSeen,
    });
    this.runtime = { ...runtime, finisherScene };
    this.runtime.boxOverlay?.show(debug || this.sceneData.boxes === true);
    this.runtime.trainingView?.show(this.sceneData.trainingData !== false);

    this.applyComfort(comfort);
    this.runtime.feedback.setAnimOptions(this.viewing.anim);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.dispose();
    });
    this.addScreenCamera();
    this.syncViews(this.runtime, 0);
    this.events.once(Phaser.Scenes.Events.RENDER, () => {
      this.sceneData.onShown?.();
    });
  }

  /**
   * The player's comfort options, at once (changed in the pause's options): the flash budget's
   * mode, the shake, the HUD, the hold's ring, the fighters' echoes, the words and stamps, all
   * read again every frame.
   */
  applyComfort(comfort: Comfort): void {
    const runtime = this.runtime;
    if (!runtime) return;
    runtime.budget.setMode(comfort.flashes);
    runtime.feedback.setComfort(comfort);
    runtime.hud.setComfort(hudComfortOf(comfort));
    runtime.holdRing.calm = isCalm(comfort);
    runtime.finisherScene.setComfort(comfort);
    this.framingInput.comfort = comfort;
    for (const view of runtime.fighterViews) view.setComfort(isCalm(comfort), comfort.shake);
  }

  /**
   * How the fight is watched, at once (changed in training's pause): its pace, and the animation
   * of now or of before (docs/art/animation-plan.md §2, V0). The simulation is the same at any
   * pace: only the ticks played per display frame change.
   */
  setViewing(viewing: Viewing): void {
    this.watch(viewing);
    this.runtime?.feedback.setAnimOptions(viewing.anim);
  }

  /** Training: the boxes shown or not, at once (the pause's « Boîtes »); `?debug` keeps them. */
  setBoxes(on: boolean): void {
    this.runtime?.boxOverlay?.show(on || isDebugEnabled());
  }

  /** Training: the input history and the frame meter shown or not (the pause's « Données »). */
  setTrainingData(on: boolean): void {
    this.runtime?.trainingView?.show(on);
  }

  /** « Lutte en prise : tenir » or not, at once (the pause's « Options »). */
  setHeldStruggle(on: boolean): void {
    this.runtime?.heldStruggle.set(on);
  }

  /** Training: player 2 plays as `dummy` from now on (the pause's « Mannequin »). */
  setDummy(dummy: CpuBehavior): void {
    this.cpu = createCpu(1, dummy, Date.now() | 0);
  }

  private watch(viewing: Viewing): void {
    this.pacer = viewing.slowdown > 1 ? new TickPacer(1, viewing.slowdown) : undefined;
    this.viewing = viewing;
    this.showContext.options = viewing.anim;
  }

  /**
   * The main camera frames the fight and zooms (see frameFight); what is fixed on screen (HUD,
   * border, flash: scroll factor 0) is drawn by a second camera that never zooms. Every object
   * exists from here on (pools), so each is given to its camera once.
   */
  private addScreenCamera(): void {
    const main = this.cameras.main;
    const screen = this.cameras
      .add(0, 0, this.scale.width, this.scale.height)
      .setZoom(this.scale.width / VIEW_SIZE.width)
      .setOrigin(0, 0);
    for (const object of this.children.list) {
      const fixed = (object as { scrollFactorX?: number }).scrollFactorX === 0;
      (fixed ? main : screen).ignore(object);
    }
  }

  private fighterDisplay(player: 0 | 1, color: number, budget: FlashBudget): FighterDisplay {
    const art = this.arts[player];
    const style = this.styles[player];
    return art
      ? new SpriteFighterView(this, art, player, GROUND_Y, style.energy, this.config, {
          dissolve: dissolveStyleOf(style.shape),
          stage: FIGHT_STAGE_COLORS,
          budget,
          mode: this.sceneData.mode,
          contour: this.sceneData.silhouette === 'outline' ? contourOf(style.energy) : null,
        })
      : new FighterView(
          this,
          color,
          GROUND_Y,
          player,
          this.config.fighters[player],
          style.energy,
          FIGHT_STAGE_COLORS,
        );
  }

  /** Resumes after the pause menu. The paused time is not simulated. */
  resumeMatch(): void {
    if (!this.runtime) return;
    // Keys and buttons used in the menu must not reach the fighters, nor pause again.
    this.runtime.inputs.reset(connectedGamepads());
    this.runtime.pauseInput.reset();
    this.paused = false;
  }

  override update(time: number, deltaMs: number): void {
    const runtime = this.runtime;
    if (!runtime || this.paused) return;

    const pads = connectedGamepads();
    // Once the results screen is up, there is nothing left to pause. The picture lost with the
    // GPU, Phaser's loop runs on (docs/qualite-adaptative.md §2.3): the fight pauses before any
    // tick, on every frame until the picture is back, so that none is played unseen.
    const blind = isContextLost(this.renderer);
    if (!this.matchEndReported && runtime.pauseInput.consume(pads, blind)) {
      this.paused = true;
      this.sceneData.onPause();
      return;
    }

    const visualFrames = this.visualClock.advance(time, deltaMs);
    // Everything that lights up during this display frame asks the budget at the same moment,
    // at the zoom it shows at (the last frame's: it eases slowly).
    runtime.budget.advance(visualFrames);
    runtime.budget.setZoom(this.closeUp);
    runtime.stageProps?.update(visualFrames);
    // Slowed down, the game lives fewer frames than the screen shows.
    const gameFrames = this.pacer ? this.pacer.advance(visualFrames) : visualFrames;
    const startMs = runtime.debugOverlay ? performance.now() : 0;

    // Devices are sampled once per display frame and held for every tick of that frame. Above
    // 60 Hz, or slowed down, some frames run no tick: reading then would drop a quick tap no tick
    // ever sees. Gamepads keep no press of their own: they are polled on every frame, read or not.
    runtime.inputs.poll(pads);
    let ticks = 0;
    const scene = runtime.finisherScene;
    if (scene.isActive()) {
      // The Finisher's scene paces the game itself, frame by frame (docs/finisher.md §1.14).
      for (let frame = 0; frame < gameFrames && scene.isActive(); frame++) {
        ticks += this.playTicks(runtime, scene.nextFrame(), pads);
        this.stage(runtime, pads);
      }
    } else {
      // A tick a frame of game time, 7 for 20 in the KO's slow motion: whole ticks on the steps.
      ticks = this.playTicks(runtime, runtime.feedback.ticksFor(gameFrames), pads);
      // Locked on one of them: its scene takes the pace over from the next frame.
      if (scene.isActive()) this.stage(runtime, pads);
    }
    runtime.feedback.update(visualFrames, gameFrames);

    runtime.debugOverlay?.record(
      {
        frameMs: deltaMs,
        steps: visualFrames,
        cadenceHz: this.visualClock.hz,
        ticks,
        tickTimeMs: performance.now() - startMs,
      },
      this.describeState,
    );
    this.syncViews(runtime, deltaMs / (1000 / TICK_RATE));
    this.reportMatchEnd();
  }

  /**
   * Plays `count` ticks, the devices read once for all of them, every event to the effects, the
   * training's captions and the Finisher's scene. A tick that locks a Finisher is the last: its
   * scene paces the next ones, nobody pressing anything in training (`seizesInputs`). Returns the
   * ticks played.
   */
  private playTicks(runtime: Runtime, count: number, pads: readonly Gamepad[]): number {
    if (count <= 0) return 0;
    const scene = runtime.finisherScene;
    const staged = scene.isActive();
    // Read even when the scene seizes them (training): a tap made through it is lost, not played
    // after it.
    const seized = scene.seizesInputs();
    const [player1, player2] = runtime.inputs.read(pads);
    for (let i = 0; i < count; i++) {
      const { heldStruggle } = runtime;
      this.tickInputs[0] = seized ? 0 : heldStruggle.apply(0, player1, this.state);
      this.tickInputs[1] = seized
        ? 0
        : this.cpu
          ? this.cpuInput(this.cpu)
          : heldStruggle.apply(1, player2, this.state);
      const previous = this.state;
      this.state = step(previous, this.tickInputs, this.config);
      detectEvents(previous, this.state, this.config, this.tickEvents);
      this.push = pushOf(this.tickEvents, previous, this.state, this.push);
      // A blow's flashes are counted at the close-up its push takes them to.
      runtime.budget.setZoom(closestDuring(this.closeUp, this.pushShown(scene)));
      this.memory.note(this.state, this.tickEvents);
      if (this.config.training) {
        this.advantage = trackAdvantage(this.advantage, this.state);
        this.combo = trackCombo(this.combo, previous, this.state, this.config);
      }
      runtime.trainingView?.record(this.state);
      const viewLeft = toPx(this.state.cameraX) - VIEW_SIZE.width / 2;
      runtime.feedback.beginTick(this.state.frame);
      for (const event of this.tickEvents) {
        runtime.feedback.react(event, viewLeft);
        runtime.caption?.react(event, this.state.frame);
        runtime.padHaptics.react(event);
      }
      runtime.feedback.endTick();
      runtime.feedback.trail(this.state);
      // After the blows' own effects: they ask the flash budget first.
      for (const event of this.tickEvents) scene.react(event, this.state, viewLeft);
      if (!staged && scene.isActive()) return i + 1;
    }
    return count;
  }

  /** The camera's push shown now: none while the Finisher's scene plays, which frames its own. */
  private pushShown(scene: FinisherScene): CameraPush {
    if (scene.isActive()) return NO_PUSH;
    return pushNow(this.push, this.state.hitstop, this.framingInput.comfort);
  }

  /**
   * A frame of the Finisher's scene, once its ticks are played: it reads what each player holds
   * (its skip), on every frame; what it skips over, then the match once its card is over, plays
   * on unseen (docs/finisher.md §1.10).
   */
  private stage(runtime: Runtime, pads: readonly Gamepad[]): void {
    const scene = runtime.finisherScene;
    const camera: CameraNow = {
      closeUp: this.closeUp,
      left: this.cameraLeft,
      top: this.cameraTop,
      viewLeft: toPx(this.state.cameraX) - VIEW_SIZE.width / 2,
    };
    scene.update(this.state, runtime.inputs.held(pads), camera);
    this.playUnseen(scene.takeSkipped());
    if (scene.wantsFastForward()) {
      this.state = playToResults(this.state, this.config);
      scene.fastForwarded();
    }
  }

  /**
   * Ticks played without being shown: nobody pressing anything, no CPU, no event, no effect (a
   * Finisher's scene skipped past them).
   */
  private playUnseen(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.state = step(this.state, [0, 0], this.config);
  }

  private cpuInput(cpu: CpuState): InputBits {
    const decision = cpuStep(cpu, this.state, this.config);
    this.cpu = decision.cpu;
    return decision.input;
  }

  private reportMatchEnd(): void {
    if (this.matchEndReported || !resultsDue(this.state)) return;
    // A Finisher's scene, then its winner's pose, come first.
    if (this.runtime?.finisherScene.holdsResults()) return;
    this.matchEndReported = true;
    this.sceneData.onMatchEnd(matchWinner(this.state.round));
  }

  /** `elapsed`: time since the previous frame, in 1/60 s (for the camera's easing). */
  private syncViews(runtime: Runtime, elapsed: number): void {
    const [viewA, viewB] = runtime.fighterViews;
    const [a, b] = this.state.fighters;
    runtime.finisher.update(this.state);
    const finisher = runtime.finisher.states;
    this.front = frontFighter(this.front, a, b);
    viewA.setFront(this.front === 0);
    viewB.setFront(this.front === 1);
    const scene = runtime.finisherScene;
    viewA.update(this.state, elapsed, finisher[0], this.showContext, scene.lookOf(0));
    viewB.update(this.state, elapsed, finisher[1], this.showContext, scene.lookOf(1));
    runtime.projectileView.update(this.state.projectiles, this.state.frame);
    runtime.hud.update(this.state, finisher);
    runtime.hud.showAdvantage(this.advantage.last);
    runtime.hud.showCombo(this.combo.line);
    runtime.touch?.showBoost(a.boost);
    runtime.touch?.showFinisher(finisher[0], a.facing, a.action);
    runtime.holdRing.update(this.state);
    runtime.caption?.update(this.state);
    runtime.holdPrompt?.update(this.state);
    runtime.boxOverlay?.update(this.state);
    runtime.trainingView?.update();

    const xs = this.framedXs;
    const projectiles = this.state.projectiles;
    xs[0] = toPx(a.x);
    xs[1] = toPx(b.x);
    xs[2] = projectiles[0] ? toPx(projectiles[0].x) : xs[0];
    xs[3] = projectiles[1] ? toPx(projectiles[1].x) : xs[0];
    const input = this.framingInput;
    input.highestFeet = toPx(Math.max(a.y, b.y));
    input.viewLeft = toPx(this.state.cameraX) - VIEW_SIZE.width / 2;
    input.closeUp = this.closeUp;
    input.elapsed = elapsed;
    input.push = this.pushShown(scene);
    input.hitstop = this.state.hitstop;
    // The Finisher's scene frames its close up itself, the texts of the world sharp for it; the
    // fight's framing starts afresh after it.
    const staged = scene.camera;
    let framing: Framing;
    if (staged) {
      framing = frameAround(staged.middle, staged.closeUp, input.viewLeft, GROUND_Y);
      input.middle = null;
      input.lean = 0;
    } else {
      const fight = frameFight(input);
      input.middle = fight.middle;
      input.lean = fight.lean;
      framing = fight;
    }
    runtime.caption?.setCloseUp(staged ? FINISHER_CLOSE_UP : MAX_CLOSE_UP);
    this.closeUp = framing.closeUp;
    this.cameraLeft = framing.left;
    this.cameraTop = framing.top;
    this.cameras.main
      .setZoom((this.scale.width / VIEW_SIZE.width) * framing.closeUp)
      .setScroll(framing.left + runtime.feedback.shakeX, framing.top + runtime.feedback.shakeY);
    runtime.touchCover?.update(this.state, framing, performance.now());
  }

  /**
   * DOM elements and listeners live outside Phaser, and textures in the game's manager: they
   * must be released explicitly.
   */
  private dispose(): void {
    if (!this.runtime) return;
    // The fight's bus whole and open again, for the menus and the next fight.
    this.runtime.finisherScene.dispose();
    this.runtime.holdRing.dispose();
    this.runtime.inputs.dispose();
    this.runtime.touchCover?.dispose();
    this.runtime.pauseInput.dispose();
    this.runtime.debugOverlay?.destroy();
    this.runtime.stageProps?.dispose();
    this.runtime = undefined;
  }

  private readonly describeState = (): string => describeGame(this.state);
}
