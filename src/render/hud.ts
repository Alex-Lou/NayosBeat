import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { TICK_RATE } from '../core/constants';
import { INTRO_FRAMES, MATCH_END_FRAMES, ROUNDS_TO_WIN } from '../core/rules';
import { matchWinner } from '../core/round';
import type { FighterState, GameState, RoundState } from '../core/state';
import { ComboCounter } from './combo-counter';
import type { HitStyle } from './hit-styles';
import { VIEW_SIZE } from './view';

const MARGIN = 8;
const BAR_TOP = 8;
const BAR_HEIGHT = 8;
const BAR_WIDTH = 180;
const PIP_SIZE = 5;
const PIP_GAP = 3;
const COMBO_Y = 34;

const COLORS = {
  barBackground: 0x2a1a1a,
  barFill: 0xf0c94a,
  barBorder: 0xffffff,
  pipEmpty: 0x444455,
  pipWon: 0xf0c94a,
} as const;

/** Pixel font designed on an 8 px grid: sizes are kept to multiples of 8 to stay crisp. */
export const PIXEL_FONT = '"Press Start 2P", monospace';

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: PIXEL_FONT,
  color: '#ffffff',
  stroke: '#000000',
  strokeThickness: 3,
};

/** Health bars, timer, round wins and announcements. Fixed on screen, above the stage. */
export class Hud {
  private readonly bars: [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle];
  private readonly pips: [Phaser.GameObjects.Rectangle[], Phaser.GameObjects.Rectangle[]];
  private readonly timer: Phaser.GameObjects.Text;
  private readonly announcer: Phaser.GameObjects.Text;
  /** Combo counters, each on the side of the player landing the combo. */
  private readonly combos: [ComboCounter, ComboCounter];
  /** Training only: hits and damage of player 1's last combo on the dummy. */
  private readonly trainingInfo: Phaser.GameObjects.Text | undefined;
  private dummyHealthBefore = 0;
  /** Round wins currently painted; -1 forces the first paint. */
  private shownWins: readonly [number, number] = [-1, -1];
  private dummyComboBefore = 0;
  private comboStartHealth = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
    styles: readonly [HitStyle, HitStyle],
  ) {
    const { width } = VIEW_SIZE;
    const leftX = MARGIN;
    const rightX = width - MARGIN - BAR_WIDTH;

    this.bars = [this.createBar(scene, leftX, 0), this.createBar(scene, rightX, 1)];
    this.pips = [this.createPips(scene, leftX + BAR_WIDTH, -1), this.createPips(scene, rightX, 1)];

    const nameY = BAR_TOP + BAR_HEIGHT + 2;
    this.fixed(scene.add.text(leftX, nameY, config.fighters[0].name, smallText()));
    this.fixed(
      scene.add
        .text(rightX + BAR_WIDTH, nameY, config.fighters[1].name, smallText())
        .setOrigin(1, 0),
    );

    this.timer = this.fixed(
      scene.add.text(width / 2, BAR_TOP - 2, '', { ...TEXT_STYLE, fontSize: '16px' }),
    ).setOrigin(0.5, 0);
    this.announcer = this.fixed(
      scene.add.text(width / 2, VIEW_SIZE.height / 2 - 40, '', { ...TEXT_STYLE, fontSize: '24px' }),
    ).setOrigin(0.5);

    const [first, second] = config.fighters;
    this.combos = [
      new ComboCounter(scene, leftX, COMBO_Y, 1, styles[0], TEXT_STYLE, second.maxHealth),
      new ComboCounter(scene, width - MARGIN, COMBO_Y, -1, styles[1], TEXT_STYLE, first.maxHealth),
    ];
    for (const combo of this.combos) for (const text of combo.objects) this.fixed(text);
    this.trainingInfo = config.training
      ? this.fixed(
          scene.add.text(width / 2, VIEW_SIZE.height - 12, '', smallText()).setOrigin(0.5, 1),
        )
      : undefined;
  }

  update(state: GameState): void {
    const [a, b] = state.fighters;
    this.setBar(0, a.health / this.config.fighters[0].maxHealth);
    this.setBar(1, b.health / this.config.fighters[1].maxHealth);
    this.setPips(state.round);
    // A player's combo is counted on the opponent taking the hits.
    this.combos[0].update(b);
    this.combos[1].update(a);
    const seconds = Math.ceil(state.round.timer / TICK_RATE);
    setTextIfChanged(this.timer, this.config.training ? '--' : String(seconds));
    if (this.trainingInfo) this.updateTrainingInfo(this.trainingInfo, b);
    setTextIfChanged(this.announcer, this.announcement(state.round));
  }

  /** Keeps the last combo's result on screen until the next one starts. */
  private updateTrainingInfo(info: Phaser.GameObjects.Text, dummy: FighterState): void {
    if (dummy.comboCount > 0 && this.dummyComboBefore === 0) {
      this.comboStartHealth = this.dummyHealthBefore;
    }
    if (dummy.comboCount > 0) {
      const damage = this.comboStartHealth - dummy.health;
      const hits = dummy.comboCount > 1 ? `${dummy.comboCount} coups` : '1 coup';
      setTextIfChanged(info, `Combo : ${hits} · ${damage} dégâts`);
    }
    this.dummyHealthBefore = dummy.health;
    this.dummyComboBefore = dummy.comboCount;
  }

  private announcement(round: RoundState): string {
    switch (round.phase) {
      case 'intro':
        return round.phaseFrame < INTRO_FRAMES / 2 ? `ROUND ${round.number}` : 'COMBAT !';
      case 'fight':
        return '';
      case 'roundEnd': {
        const result = round.result;
        if (!result) return '';
        if (result.reason === 'timeout') return result.winner === null ? 'EGALITE' : 'TEMPS !';
        return result.winner === null ? 'DOUBLE K.O.' : 'K.O.';
      }
      case 'matchEnd': {
        // Once the results screen shows, it announces the winner instead.
        const winner = round.phaseFrame < MATCH_END_FRAMES ? matchWinner(round) : null;
        return winner === null ? '' : `${this.config.fighters[winner].name} GAGNE`;
      }
    }
  }

  /** Health drains toward the outer edge of the screen, as in classic fighting games. */
  private setBar(player: 0 | 1, ratio: number): void {
    const bar = this.bars[player];
    const width = Math.round(BAR_WIDTH * Math.max(0, ratio));
    if (bar.width !== width) bar.setSize(width, BAR_HEIGHT);
  }

  /** Repaints round markers only when the score changes. */
  private setPips(round: RoundState): void {
    const [winsA, winsB] = round.wins;
    if (winsA === this.shownWins[0] && winsB === this.shownWins[1]) return;
    this.shownWins = [winsA, winsB];
    this.pips.forEach((pips, player) => {
      const wins = round.wins[player] ?? 0;
      pips.forEach((pip, index) => {
        pip.setFillStyle(index < wins ? COLORS.pipWon : COLORS.pipEmpty);
      });
    });
  }

  private createBar(scene: Phaser.Scene, x: number, player: 0 | 1): Phaser.GameObjects.Rectangle {
    this.fixed(
      scene.add
        .rectangle(x, BAR_TOP, BAR_WIDTH, BAR_HEIGHT, COLORS.barBackground)
        .setStrokeStyle(1, COLORS.barBorder)
        .setOrigin(0, 0),
    );
    const anchorX = player === 0 ? x : x + BAR_WIDTH;
    return this.fixed(
      scene.add
        .rectangle(anchorX, BAR_TOP, BAR_WIDTH, BAR_HEIGHT, COLORS.barFill)
        .setOrigin(player === 0 ? 0 : 1, 0),
    );
  }

  /** Round win markers, laid out from the bar's inner end toward the timer. */
  private createPips(
    scene: Phaser.Scene,
    innerX: number,
    direction: 1 | -1,
  ): Phaser.GameObjects.Rectangle[] {
    const y = BAR_TOP + BAR_HEIGHT + 4;
    return Array.from({ length: ROUNDS_TO_WIN }, (_, index) => {
      const offset = (index + 1) * (PIP_SIZE + PIP_GAP);
      const x = direction === -1 ? innerX - offset : innerX + offset - PIP_SIZE;
      return this.fixed(
        scene.add.rectangle(x, y, PIP_SIZE, PIP_SIZE, COLORS.pipEmpty).setOrigin(0, 0),
      );
    });
  }

  private fixed<T extends Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>(object: T): T {
    object.setScrollFactor(0);
    object.setDepth(10);
    return object;
  }
}

function smallText(): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...TEXT_STYLE, fontSize: '8px', strokeThickness: 2 };
}

/** Re-rendering a text texture is costly: only do it when the content changes. */
function setTextIfChanged(text: Phaser.GameObjects.Text, value: string): void {
  if (text.text !== value) text.setText(value);
}
