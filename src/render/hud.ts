import type Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { TICK_RATE } from '../core/constants';
import { ROUNDS_TO_WIN } from '../core/rules';
import type { FighterState, GameState, RoundState } from '../core/state';
import { BoostGauge } from './boost-gauge';
import type { Breakage } from './boost-motion';
import { shatters, type KoFinish } from './fight-events';
import { NO_SIGNAL, type FinisherSignals } from './finisher-signal';
import type { FlashBudget } from './flash-budget';
import { BAR_BOX, EMBER_RISE, HealthBar, type HudComfort } from './health-bar';
import { DISC_SIZE, discSpans, MARK_TICKS, markSpan, PIP_SIZE, pipSpans } from './hud-discs';
import { paintSpans, spanTexture, type Span } from './hud-paint';
import { advantageText } from './advantage-meter';
import { announcementOf, comboText, NO_TIMER } from './hud-text';

/** The advantage's colors (docs/polish/AUDIT-ET-PLAN.md, P19); its sign is always written. */
const ADVANTAGE_COLORS = { ahead: '#7bea8a', behind: '#ffa04a', even: '#ffffff' } as const;
import { FX_DARK } from './veils';
import { VIEW_SIZE } from './view';

/** From each edge of the screen to its bar and its gauge. */
export const HUD_MARGIN = 8;
/** Room above the bars for their embers, under the screen's top. */
const BAR_TOP = EMBER_RISE + 1;
const NAME_Y = BAR_TOP + BAR_BOX.height + 3;
const GAUGE_Y = NAME_Y + 10;
const PIP_GAP = 2;
const DISC_TOP = 1;
const DISC_TEXTURE = 'hud/timer-disc';
/** The dark band behind the top of the HUD (Guilty Gear Strive): its rows, then their opacity. */
const BAND = [
  { rows: 34, alpha: 0.55 },
  { rows: 4, alpha: 0.35 },
  { rows: 4, alpha: 0.18 },
] as const;
const BAND_COLOR = 0x0c0614;
/** At or under this many seconds, the timer turns orange (steady: no blink). */
const LOW_TIME = 10;
const TIMER_COLORS = { normal: '#ffffff', low: '#ffa04a' } as const;
/**
 * View px² of white a character of the announcer lights at most, at its 24 px (the widest, « M »:
 * tests/render/glyphs.test.ts); refused by the flash budget, it is drawn in the dark of the
 * effects instead (ΔL ≤ 0.073 over the stage).
 */
export const ANNOUNCE_LETTER_AREA = 305;
const ANNOUNCE_DARK = `#${FX_DARK.toString(16).padStart(6, '0')}`;

/** Pixel font designed on an 8 px grid: sizes are kept to multiples of 8 to stay crisp. */
export const PIXEL_FONT = '"Press Start 2P", monospace';

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: PIXEL_FONT,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 3,
};

/**
 * Health bars, Boost gauges, timer, round wins and announcements (docs/art/direction-hud.md).
 * Fixed on screen, above the stage, on a dark band; everything is made once. What lights up at
 * once (the white of a hit on a bar, a new announcement, the FINISH plate) asks the fight's flash
 * budget first (docs/flashs.md §4), in view px² (the zoom does not enlarge the HUD).
 */
export class Hud {
  private readonly bars: readonly [HealthBar, HealthBar];
  private readonly gauges: readonly [BoostGauge, BoostGauge];
  private readonly pips: readonly [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
  private readonly timer: Phaser.GameObjects.Text;
  /** The mark turning on the timer's vinyl, and the step it was painted at. */
  private readonly mark: Phaser.GameObjects.Graphics;
  private shownSpin = Number.NaN;
  /** The vinyl turns (the screen not kept still). */
  private motion: boolean;
  private readonly announcer: Phaser.GameObjects.Text;
  /** Training only: hits and damage of player 1's last combo on the dummy. */
  private readonly trainingInfo: Phaser.GameObjects.Text | undefined;
  private readonly advantageInfo: Phaser.GameObjects.Text | undefined;
  private dummyHealthBefore = 0;
  /** Round wins currently painted; -1 forces the first paint. */
  private shownWins: readonly [number, number] = [-1, -1];
  private dummyComboBefore = 0;
  private comboStartHealth = 0;
  private readonly names: readonly [string, string];
  /** How each fighter was knocked out this round (its Boost gauge shows it), null while up. */
  private readonly finishes: [KoFinish | null, KoFinish | null] = [null, null];
  /** Whether each fighter's gauges break still (no room left in the flash budget for shards). */
  private readonly stills: [boolean, boolean] = [false, false];
  /** Whether `view` px² of the HUD may light up now (the fight's flash budget). */
  private readonly lights: (view: number) => boolean;

  /**
   * `energies`: each fighter's color on the HUD in its colorway (hudColorOf), for its side;
   * `comfort`: what the player's options leave it (HudComfort); `budget`: the fight's flashes.
   */
  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    energies: readonly [number, number],
    comfort: HudComfort,
    budget: FlashBudget,
  ) {
    const { width } = VIEW_SIZE;
    this.motion = comfort.motion;
    this.lights = (view) => budget.request(budget.toWorld(view)) === 'lit';
    // What may light only if it makes no flash: it waits otherwise (the FINISH plate).
    const admits = (view: number): boolean => budget.admit(budget.toWorld(view));
    this.names = [config.fighters[0].name, config.fighters[1].name];
    const leftX = HUD_MARGIN;
    const rightX = width - HUD_MARGIN - BAR_BOX.width;

    paintSpans(this.fixed(scene.add.graphics()), bandSpans(width));
    const discX = Math.round((width - DISC_SIZE) / 2);
    spanTexture(scene, DISC_TEXTURE, DISC_SIZE, DISC_SIZE, discSpans());
    this.fixed(scene.add.image(discX, DISC_TOP, DISC_TEXTURE).setOrigin(0, 0));

    this.bars = [
      new HealthBar(
        scene,
        leftX,
        BAR_TOP,
        { side: 0, energy: energies[0], ...comfort },
        this.lights,
      ),
      new HealthBar(
        scene,
        rightX,
        BAR_TOP,
        { side: 1, energy: energies[1], ...comfort },
        this.lights,
      ),
    ];
    // At each bar's inner end, toward the timer: the first win nearest to it.
    this.pips = [
      this.fixed(scene.add.graphics({ x: leftX + BAR_BOX.width - PIP_SIZE, y: NAME_Y })),
      this.fixed(scene.add.graphics({ x: rightX, y: NAME_Y })),
    ];

    // Under each name, on the outer side.
    this.gauges = [
      new BoostGauge(
        scene,
        leftX,
        GAUGE_Y,
        { side: 0, energy: energies[0], ...comfort },
        smallText(),
        admits,
      ),
      new BoostGauge(
        scene,
        width - HUD_MARGIN,
        GAUGE_Y,
        { side: 1, energy: energies[1], ...comfort },
        smallText(),
        admits,
      ),
    ];

    this.fixed(scene.add.text(leftX, NAME_Y, config.fighters[0].name, smallText()));
    this.fixed(
      scene.add
        .text(rightX + BAR_BOX.width, NAME_Y, config.fighters[1].name, smallText())
        .setOrigin(1, 0),
    );

    this.timer = this.fixed(
      scene.add.text(width / 2, DISC_TOP + DISC_SIZE / 2 + 1, '', {
        ...TEXT_STYLE,
        fontSize: '16px',
      }),
    ).setOrigin(0.5);
    // Over the timer: its digits never hide it.
    this.mark = this.fixed(scene.add.graphics({ x: discX, y: DISC_TOP }));
    this.announcer = this.fixed(
      scene.add.text(width / 2, VIEW_SIZE.height / 2 - 40, '', { ...TEXT_STYLE, fontSize: '24px' }),
    ).setOrigin(0.5);

    this.trainingInfo = config.training
      ? this.fixed(
          scene.add.text(width / 2, VIEW_SIZE.height - 12, '', smallText()).setOrigin(0.5, 1),
        )
      : undefined;
    this.advantageInfo = config.training
      ? this.fixed(
          scene.add
            .text(width / 2, VIEW_SIZE.height - 24, '', smallText())
            .setOrigin(0.5, 1)
            .setColor(ADVANTAGE_COLORS.even),
        )
      : undefined;
  }

  /**
   * Training: the advantage of the last exchange for player 1 (advantage-meter.ts), kept until
   * the next one, green ahead, orange behind. Nothing before the first, nothing out of training.
   */
  showAdvantage(ticks: number | null): void {
    const info = this.advantageInfo;
    if (!info || ticks === null) return;
    setTextIfChanged(info, advantageText(ticks));
    const color =
      ticks > 0
        ? ADVANTAGE_COLORS.ahead
        : ticks < 0
          ? ADVANTAGE_COLORS.behind
          : ADVANTAGE_COLORS.even;
    if (info.style.color !== color) info.setColor(color);
  }

  /** `finisher`: each fighter's Finisher signal on this state (finisher-signal.ts). */
  update(state: GameState, finisher: FinisherSignals = NO_SIGNAL): void {
    const { fighters, frame, round } = state;
    fighters.forEach((fighter, player) => {
      const max = this.config.fighters[player]?.maxHealth ?? 1;
      // A KO ends the combo: the trail of the last one drains.
      const comboed = fighter.comboCount > 0 && fighter.health > 0;
      if (fighter.health > 0) this.finishes[player] = null;
      const breakage = breakageOf(this.finishes[player] ?? null);
      const still = breakage !== null && this.stills[player];
      this.bars[player]?.update(fighter.health / max, comboed, frame, breakage, still);
      this.gauges[player]?.update(fighter.boost, breakage, frame, still, finisher[player]);
    });
    this.setPips(round);
    const seconds = Math.ceil(round.timer / TICK_RATE);
    const training = this.config.training;
    setTextIfChanged(this.timer, training ? NO_TIMER : String(seconds));
    const timerColor = !training && seconds <= LOW_TIME ? TIMER_COLORS.low : TIMER_COLORS.normal;
    if (this.timer.style.color !== timerColor) this.timer.setColor(timerColor);
    // The vinyl turns while the timer runs (all along in training, where it does not).
    const clock = training ? frame : -round.timer;
    const spin = this.motion ? Math.floor(clock / MARK_TICKS) : 0;
    if (spin !== this.shownSpin) {
      this.shownSpin = spin;
      paintSpans(this.mark, [markSpan(spin)]);
    }
    const [, b] = fighters;
    if (this.trainingInfo) this.updateTrainingInfo(this.trainingInfo, b);
    this.announce(announcementOf(state.round, this.names));
  }

  /** A new announcement lights its letters at once: white if the budget lets it, dark if not. */
  private announce(text: string): void {
    if (this.announcer.text === text) return;
    const letters = text.replace(/ /g, '').length;
    const lit = letters === 0 || this.lights(ANNOUNCE_LETTER_AREA * letters);
    const color = lit ? TIMER_COLORS.normal : ANNOUNCE_DARK;
    if (this.announcer.style.color !== color) this.announcer.setColor(color);
    this.announcer.setText(text);
  }

  /** The player's comfort options, from the next frame on (the pause's options). */
  setComfort(comfort: HudComfort): void {
    this.motion = comfort.motion;
    for (const bar of this.bars) bar.setComfort(comfort);
    for (const gauge of this.gauges) gauge.setComfort(comfort);
  }

  /**
   * `player` was knocked out on this tick: `finish` says how (fight-events.ts); `still`, its
   * gauges break without their shards (FightFeedback found no room for them in the budget).
   */
  knockOut(player: 0 | 1, finish: KoFinish, still = false): void {
    this.finishes[player] = finish;
    this.stills[player] = still;
  }

  /** Keeps the last combo's result on screen until the next one starts. */
  private updateTrainingInfo(info: Phaser.GameObjects.Text, dummy: FighterState): void {
    // A new combo; a dummy hit again on the tick it recovers goes from N straight to 1.
    const fresh = this.dummyComboBefore === 0 || dummy.comboCount < this.dummyComboBefore;
    if (dummy.comboCount > 0 && fresh) {
      this.comboStartHealth = this.dummyHealthBefore;
    }
    if (dummy.comboCount > 0) {
      setTextIfChanged(info, comboText(dummy.comboCount, this.comboStartHealth - dummy.health));
    }
    this.dummyHealthBefore = dummy.health;
    this.dummyComboBefore = dummy.comboCount;
  }

  /** Repaints round markers only when the score changes. */
  private setPips(round: RoundState): void {
    const [winsA, winsB] = round.wins;
    if (winsA === this.shownWins[0] && winsB === this.shownWins[1]) return;
    this.shownWins = [winsA, winsB];
    this.pips.forEach((pips, player) => {
      paintSpans(pips, pipRowSpans(round.wins[player] ?? 0, player === 0 ? 0 : 1));
    });
  }

  private fixed<
    T extends Phaser.GameObjects.Components.ScrollFactor & Phaser.GameObjects.Components.Depth,
  >(object: T): T {
    object.setScrollFactor(0);
    object.setDepth(10);
    return object;
  }
}

/**
 * What a KO does to the gauge: a plain one leaves it whole, a combo's cracks it, a super's
 * shatters it (an Ultime's, the Finisher's: on its contact until its scene plays).
 */
function breakageOf(finish: KoFinish | null): Breakage | null {
  if (finish === 'combo') return 'crack';
  if (finish !== null && shatters(finish)) return 'shatter';
  return null;
}

/** The dark band across the top of the screen, fading out at its foot. */
function bandSpans(width: number): Span[] {
  let y = 0;
  return BAND.map(({ rows, alpha }) => {
    const span = { x: 0, y, width, height: rows, color: BAND_COLOR, alpha };
    y += rows;
    return span;
  });
}

/**
 * A player's round markers, `wins` of them won, from the bar's inner end: the left player's run
 * leftward from x = 0 (their right edge on the bar's), the right player's rightward.
 */
function pipRowSpans(wins: number, side: 0 | 1): Span[] {
  return Array.from({ length: ROUNDS_TO_WIN }, (_, index) => {
    const offset = index * (PIP_SIZE + PIP_GAP) * (side === 0 ? -1 : 1);
    return pipSpans(index < wins).map((span) => ({ ...span, x: span.x + offset }));
  }).flat();
}

function smallText(): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...TEXT_STYLE, fontSize: '8px', strokeThickness: 2 };
}

/** Re-rendering a text texture is costly: only do it when the content changes. */
function setTextIfChanged(text: Phaser.GameObjects.Text, value: string): void {
  if (text.text !== value) text.setText(value);
}
