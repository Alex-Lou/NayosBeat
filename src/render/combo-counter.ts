import type Phaser from 'phaser';
import type { FighterState } from '../core/state';
import type { HitStyle } from './hit-styles';

/** Display frames the result stays on screen once the combo is over, the last of them fading. */
const HOLD_FRAMES = 70;
const FADE_FRAMES = 20;
/** Each new hit makes the number pop, then settle back over these display frames. */
const POP_FRAMES = 8;
const POP_SCALE = 0.6;
/** Display frames the number flashes white on a new hit. */
const FLASH_FRAMES = 2;
/** Press Start 2P draws every glyph on a square of the font size. */
const NUMBER_SIZE = 24;
const LABEL_SIZE = 8;
const GAP = 4;

/** What the counter shows of one player's combo; advanced once per display frame. */
export interface ComboTrack {
  /** Hits of the combo shown (the counter appears from the second one). */
  readonly hits: number;
  /** Health taken by the combo so far. */
  readonly damage: number;
  /** Display frames the result stays on screen after the combo ended. */
  readonly holdFrames: number;
  /** Display frames left in the pop of the last hit. */
  readonly popFrames: number;
  /** The defender's health before the combo's first hit. */
  readonly startHealth: number;
  /** The defender, as seen on the previous display frame. */
  readonly lastCount: number;
  readonly lastHealth: number;
}

export function startTrack(defenderHealth: number): ComboTrack {
  return {
    hits: 0,
    damage: 0,
    holdFrames: 0,
    popFrames: 0,
    startHealth: defenderHealth,
    lastCount: 0,
    lastHealth: defenderHealth,
  };
}

/** One display frame of a combo counter, from the player taking the hits. */
export function stepTrack(
  track: ComboTrack,
  defender: Pick<FighterState, 'comboCount' | 'health'>,
): ComboTrack {
  const count = defender.comboCount;
  const base = {
    ...track,
    lastCount: count,
    lastHealth: defender.health,
    popFrames: Math.max(0, track.popFrames - 1),
  };
  if (count === 0) return { ...base, holdFrames: Math.max(0, track.holdFrames - 1) };
  // A new combo: it starts from the health before its first hit (several ticks may run in one
  // display frame, and a defender can be hit again on the tick it recovers).
  const fresh = track.lastCount === 0 || count < track.lastCount;
  const startHealth = fresh ? track.lastHealth : track.startHealth;
  const popped = count >= 2 && (fresh || count > track.lastCount);
  return {
    ...base,
    hits: count,
    damage: startHealth - defender.health,
    startHealth,
    holdFrames: HOLD_FRAMES,
    popFrames: popped ? POP_FRAMES : base.popFrames,
  };
}

/**
 * A player's combo counter, on their side of the screen under the health bar: a big hit count
 * in the fighter's energy color that pops on every hit, "COMBO", and the damage dealt. It stays
 * a moment once the combo is over, then fades.
 */
export class ComboCounter {
  private readonly count: Phaser.GameObjects.Text;
  private readonly label: Phaser.GameObjects.Text;
  private readonly damage: Phaser.GameObjects.Text;
  private track: ComboTrack;

  constructor(
    scene: Phaser.Scene,
    /** The screen edge the counter hangs from (x of its outer side) and its top. */
    private readonly edgeX: number,
    private readonly topY: number,
    /** -1 on the right side: the counter is laid out from the edge toward the center. */
    private readonly side: 1 | -1,
    private readonly style: HitStyle,
    textStyle: Phaser.Types.GameObjects.Text.TextStyle,
    defenderHealth: number,
  ) {
    const anchor = side === 1 ? 0 : 1;
    this.count = scene.add
      .text(0, 0, '', { ...textStyle, fontSize: `${NUMBER_SIZE}px`, strokeThickness: 4 })
      .setOrigin(0.5, 0.5);
    this.label = scene.add
      .text(0, topY + 2, 'COMBO', { ...textStyle, fontSize: `${LABEL_SIZE}px`, strokeThickness: 2 })
      .setOrigin(anchor, 0);
    this.damage = scene.add
      .text(0, topY + 2 + LABEL_SIZE + GAP, '', {
        ...textStyle,
        fontSize: `${LABEL_SIZE}px`,
        strokeThickness: 2,
      })
      .setOrigin(anchor, 0)
      .setTint(style.strike);
    this.track = startTrack(defenderHealth);
    this.show(false);
  }

  /** The texts, for the HUD to fix them on screen. */
  get objects(): readonly Phaser.GameObjects.Text[] {
    return [this.count, this.label, this.damage];
  }

  update(defender: FighterState): void {
    const before = this.track;
    const track = stepTrack(before, defender);
    this.track = track;
    const visible = track.hits >= 2 && (defender.comboCount > 0 || track.holdFrames > 0);
    this.show(visible);
    if (!visible) return;

    if (track.hits !== before.hits || this.count.text === '') this.layout(track.hits);
    if (track.damage !== before.damage || this.damage.text === '') {
      this.damage.setText(`${track.damage} dégâts`);
    }

    const pop = track.popFrames / POP_FRAMES;
    this.count.setScale(1 + POP_SCALE * pop * pop);
    // White for an instant on the hit, then the fighter's color.
    if (track.popFrames > POP_FRAMES - FLASH_FRAMES) this.count.clearTint();
    else this.count.setTint(this.style.energy);

    const fading = defender.comboCount === 0 && track.holdFrames < FADE_FRAMES;
    const alpha = fading ? track.holdFrames / FADE_FRAMES : 1;
    for (const text of this.objects) text.setAlpha(alpha);
  }

  /** Places the number and the labels next to it, from the screen edge. */
  private layout(hits: number): void {
    const text = String(hits);
    this.count.setText(text);
    const width = text.length * NUMBER_SIZE;
    this.count.setPosition(this.edgeX + (this.side * width) / 2, this.topY + NUMBER_SIZE / 2);
    const labelX = this.edgeX + this.side * (width + GAP);
    this.label.setX(labelX);
    this.damage.setX(labelX);
  }

  private show(visible: boolean): void {
    for (const text of this.objects) if (text.visible !== visible) text.setVisible(visible);
  }
}
