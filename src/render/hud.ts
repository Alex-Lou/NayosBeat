import Phaser from 'phaser';
import type { MatchConfig } from '../core/config';
import { TICK_RATE } from '../core/constants';
import { INTRO_FRAMES, MATCH_END_FRAMES, ROUNDS_TO_WIN } from '../core/rules';
import { matchWinner } from '../core/round';
import type { FighterState, GameState, RoundState } from '../core/state';
import { VIEW_SIZE } from './view';

const MARGIN = 8;
const BAR_TOP = 8;
const BAR_HEIGHT = 8;
const BAR_WIDTH = 180;
const PIP_SIZE = 5;
const PIP_GAP = 3;
const COMBO_Y = 44;

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
  private readonly combos: [Phaser.GameObjects.Text, Phaser.GameObjects.Text];
  /** Training only: hits and damage of player 1's last combo on the dummy. */
  private readonly trainingInfo: Phaser.GameObjects.Text | undefined;
  private dummyHealthBefore = 0;
  private dummyComboBefore = 0;
  private comboStartHealth = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly config: MatchConfig,
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

    const comboStyle = { ...TEXT_STYLE, fontSize: '8px', color: '#f0c94a', strokeThickness: 2 };
    this.combos = [
      this.fixed(scene.add.text(leftX, COMBO_Y, '', comboStyle)),
      this.fixed(scene.add.text(rightX + BAR_WIDTH, COMBO_Y, '', comboStyle).setOrigin(1, 0)),
    ];
    this.trainingInfo = config.training
      ? this.fixed(
          scene.add
            .text(width / 2, VIEW_SIZE.height - 12, '', { ...comboStyle, color: '#ffffff' })
            .setOrigin(0.5, 1),
        )
      : undefined;
  }

  update(state: GameState): void {
    const [a, b] = state.fighters;
    this.setBar(0, a.health / this.config.fighters[0].maxHealth);
    this.setBar(1, b.health / this.config.fighters[1].maxHealth);
    this.setPips(state.round);
    // A player's combo is counted on the opponent taking the hits.
    setTextIfChanged(this.combos[0], comboText(b.comboCount));
    setTextIfChanged(this.combos[1], comboText(a.comboCount));
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
        if (result.reason === 'timeout') return result.winner === null ? 'ÉGALITÉ' : 'TEMPS !';
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

  private setPips(round: RoundState): void {
    for (const player of [0, 1] as const) {
      this.pips[player].forEach((pip, index) => {
        pip.setFillStyle(index < round.wins[player] ? COLORS.pipWon : COLORS.pipEmpty);
      });
    }
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

function comboText(hits: number): string {
  return hits >= 2 ? `${hits} COUPS` : '';
}

function smallText(): Phaser.Types.GameObjects.Text.TextStyle {
  return { ...TEXT_STYLE, fontSize: '8px', strokeThickness: 2 };
}

/** Re-rendering a text texture is costly: only do it when the content changes. */
function setTextIfChanged(text: Phaser.GameObjects.Text, value: string): void {
  if (text.text !== value) text.setText(value);
}
