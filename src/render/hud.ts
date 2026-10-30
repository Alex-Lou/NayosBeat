import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { TICK_RATE } from '../core/constants';
import { ROUNDS_TO_WIN } from '../core/rules';
import type { FighterState, GameState, RoundState } from '../core/state';
import { BoostGauge } from './boost-gauge';
import { BAR_BOX, EMBER_RISE, HealthBar } from './health-bar';
import { DISC_SIZE, discSpans, MARK_TICKS, markSpan, PIP_SIZE, pipSpans } from './hud-discs';
import { paintSpans, spanTexture, type Span } from './hud-paint';
import { announcementOf, comboText, NO_TIMER } from './hud-text';
import { VIEW_SIZE } from './view';

const MARGIN = 8;
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
 * Fixed on screen, above the stage, on a dark band; everything is made once.
 */
export class Hud {
  private readonly bars: readonly [HealthBar, HealthBar];
  private readonly gauges: readonly [BoostGauge, BoostGauge];
  private readonly pips: readonly [Phaser.GameObjects.Graphics, Phaser.GameObjects.Graphics];
  private readonly timer: Phaser.GameObjects.Text;
  /** The mark turning on the timer's vinyl, and the step it was painted at. */
  private readonly mark: Phaser.GameObjects.Graphics;
  private shownSpin = Number.NaN;
  private readonly reducedMotion: boolean;
  private readonly announcer: Phaser.GameObjects.Text;
  /** Training only: hits and damage of player 1's last combo on the dummy. */
  private readonly trainingInfo: Phaser.GameObjects.Text | undefined;
  private dummyHealthBefore = 0;
  /** Round wins currently painted; -1 forces the first paint. */
  private shownWins: readonly [number, number] = [-1, -1];
  private dummyComboBefore = 0;
  private comboStartHealth = 0;
  private readonly names: readonly [string, string];

  /** `energies`: each fighter's energy color in its colorway, for its gauge. */
  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    energies: readonly [number, number],
  ) {
    const { width } = VIEW_SIZE;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const reducedMotion = this.reducedMotion;
    this.names = [config.fighters[0].name, config.fighters[1].name];
    const leftX = MARGIN;
    const rightX = width - MARGIN - BAR_BOX.width;

    paintSpans(this.fixed(scene.add.graphics()), bandSpans(width));
    const discX = Math.round((width - DISC_SIZE) / 2);
    spanTexture(scene, DISC_TEXTURE, DISC_SIZE, DISC_SIZE, discSpans());
    this.fixed(scene.add.image(discX, DISC_TOP, DISC_TEXTURE).setOrigin(0, 0));

    this.bars = [
      new HealthBar(scene, leftX, BAR_TOP, { side: 0, energy: energies[0], reducedMotion }),
      new HealthBar(scene, rightX, BAR_TOP, { side: 1, energy: energies[1], reducedMotion }),
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
        { side: 0, energy: energies[0], reducedMotion },
        smallText(),
      ),
      new BoostGauge(
        scene,
        width - MARGIN,
        GAUGE_Y,
        { side: 1, energy: energies[1], reducedMotion },
        smallText(),
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
  }

  update(state: GameState): void {
    const { fighters, frame, round } = state;
    fighters.forEach((fighter, player) => {
      const max = this.config.fighters[player]?.maxHealth ?? 1;
      // A KO ends the combo: the trail of the last one drains.
      const comboed = fighter.comboCount > 0 && fighter.health > 0;
      this.bars[player]?.update(fighter.health / max, comboed, frame);
      this.gauges[player]?.update(fighter.boost, fighter.health <= 0, frame);
    });
    this.setPips(round);
    const seconds = Math.ceil(round.timer / TICK_RATE);
    const training = this.config.training;
    setTextIfChanged(this.timer, training ? NO_TIMER : String(seconds));
    const timerColor = !training && seconds <= LOW_TIME ? TIMER_COLORS.low : TIMER_COLORS.normal;
    if (this.timer.style.color !== timerColor) this.timer.setColor(timerColor);
    // The vinyl turns while the timer runs (all along in training, where it does not).
    const clock = training ? frame : -round.timer;
    const spin = this.reducedMotion ? 0 : Math.floor(clock / MARK_TICKS);
    if (spin !== this.shownSpin) {
      this.shownSpin = spin;
      paintSpans(this.mark, [markSpan(spin)]);
    }
    const [, b] = fighters;
    if (this.trainingInfo) this.updateTrainingInfo(this.trainingInfo, b);
    setTextIfChanged(this.announcer, announcementOf(state.round, this.names));
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
