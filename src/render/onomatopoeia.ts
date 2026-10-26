import type Phaser from 'phaser';
import { toPx } from '../core/constants';
import { DEPTH } from './depth';
import type { HitStyle } from './hit-styles';
import { MAX_CLOSE_UP } from './camera-framing';
import { VIEW_SIZE } from './view';

export type BlowKind = 'light' | 'heavy' | 'ko';

/** Comic lettering, self-hosted (see main.ts). */
export const COMIC_FONT = 'Bangers, Impact, sans-serif';

/** Words are picked in turn, so a string of blows never repeats the same one. */
const WORDS: Readonly<Record<BlowKind, readonly string[]>> = {
  light: ['PAF', 'BIM', 'POK', 'TCHAC'],
  heavy: ['BAM', 'VLAN', 'CRAC', 'SBAM'],
  ko: ['BOUM'],
};

const SIZES: Readonly<Record<BlowKind, number>> = { light: 13, heavy: 17, ko: 26 };
/** Display frames a word stays on screen (it pops, holds, then rises and fades). */
const LIFE: Readonly<Record<BlowKind, number>> = { light: 30, heavy: 38, ko: 80 };
const POP_FRAMES = 6;
const FADE_FRAMES = 12;
/** A word pushed aside by the next one of the same player fades out this fast. */
const OUTRUN_FRAMES = 6;
/** Above the impact, a little toward the side the blow pushes to. */
const OFFSET_Y = 22;
const OFFSET_X = 8;
const RISE = 0.3;
/** Successive words lean one way, then the other. */
const TILTS = [-0.13, 0.09, -0.05, 0.15] as const;
const POOL_SIZE = 6;
const INK = '#150b24';

/** Hits each player has landed in a row: it grows with every hit, and drops to 0 on taking one. */
export type Tally = readonly [number, number];

export function landHit(tally: Tally, by: 0 | 1): Tally {
  return by === 0 ? [tally[0] + 1, 0] : [0, tally[1] + 1];
}

/** The word for the `count`-th blow of a tally: the KO always booms. */
export function wordFor(kind: BlowKind, count: number): string {
  const words = WORDS[kind];
  return words[(count - 1) % words.length] ?? words[0] ?? '';
}

interface Word {
  readonly text: Phaser.GameObjects.Text;
  readonly tally: Phaser.GameObjects.Text;
  by: 0 | 1;
  life: number;
  total: number;
  tilt: number;
  /** Where the word settles, in world pixels. */
  x: number;
  y: number;
}

/**
 * Comic-book sound words where blows land ("PAF !", "VLAN !"), in the attacker's colors, with
 * their running tally ("x3", the comic font has no "×") from the second hit on: a player's hits add up until they take
 * one. Light and quick, they never cover the fight for long. Fixed pool, nothing allocated
 * per blow but the text itself.
 */
export class Onomatopoeia {
  private readonly words: Word[];
  private tally: Tally = [0, 0];
  private next = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    private readonly styles: readonly [HitStyle, HitStyle],
  ) {
    // Rendered at the finest zoom of the fight camera, so the lettering stays sharp.
    const resolution = Math.ceil((scene.scale.width / VIEW_SIZE.width) * MAX_CLOSE_UP);
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: COMIC_FONT,
      color: '#ffffff',
      stroke: INK,
      resolution,
    };
    this.words = Array.from({ length: POOL_SIZE }, () => ({
      text: hidden(scene.add.text(0, 0, '', { ...style, strokeThickness: 4 }).setOrigin(0.5, 1)),
      tally: hidden(scene.add.text(0, 0, '', { ...style, strokeThickness: 3 }).setOrigin(0, 1)),
      by: 0 as const,
      life: 0,
      total: 0,
      tilt: 0,
      x: 0,
      y: 0,
    }));
  }

  /** A blow landed by `by` at (x, y) (simulation units), pushing toward `away`. */
  blow(kind: BlowKind, by: 0 | 1, x: number, y: number, away: 1 | -1): void {
    this.tally = landHit(this.tally, by);
    const count = this.tally[by];
    for (const word of this.words) {
      if (word.life > 0 && word.by === by) word.life = Math.min(word.life, OUTRUN_FRAMES);
    }

    const word = this.words[this.next];
    if (!word) return;
    this.next = (this.next + 1) % this.words.length;

    const style = this.styles[by];
    const size = SIZES[kind];
    word.by = by;
    word.life = word.total = LIFE[kind];
    word.tilt = TILTS[(count - 1) % TILTS.length] ?? 0;
    word.x = toPx(x) + away * OFFSET_X;
    word.y = this.groundY - toPx(y) - OFFSET_Y;

    const { text, tally } = word;
    // Light on top, the attacker's strike color below, its energy color as the comic drop.
    // Every style change redraws the text: it is set in one go.
    const fill = text.context.createLinearGradient(0, 0, 0, size);
    fill.addColorStop(0, '#fffbe8');
    fill.addColorStop(1, hex(style.strike));
    const drop = { offsetX: 2, offsetY: 2, color: hex(style.energy), stroke: true, fill: true };
    text.setStyle({ fontSize: size, fill, shadow: drop });
    text.setText(`${wordFor(kind, count)} !`).setVisible(true);

    tally.setVisible(count >= 2);
    if (count >= 2) {
      tally.setStyle({
        fontSize: Math.round(size * 0.7),
        shadow: { ...drop, offsetX: 1, offsetY: 1 },
      });
      tally.setText(`x${count}`);
    }
    this.place(word);
  }

  /** The tallies start over with every round. */
  reset(): void {
    this.tally = [0, 0];
  }

  /** Advances the words by one display frame. */
  update(): void {
    for (const word of this.words) {
      if (word.life === 0) continue;
      word.life--;
      if (word.life === 0) {
        word.text.setVisible(false);
        word.tally.setVisible(false);
        continue;
      }
      this.place(word);
    }
  }

  private place(word: Word): void {
    const age = word.total - word.life;
    // Pops in big, settles, then drifts up while fading.
    const pop = age < POP_FRAMES ? 1.35 - 0.35 * (age / POP_FRAMES) : 1;
    const grow = age < 2 ? 0.6 + 0.4 * (age / 2) : 1;
    const scale = pop * grow;
    const alpha = Math.min(1, word.life / FADE_FRAMES);
    const y = word.y - Math.max(0, age - POP_FRAMES) * RISE;

    word.text.setPosition(word.x, y).setScale(scale).setRotation(word.tilt).setAlpha(alpha);
    if (word.tally.visible) {
      // At the end of the word, along its tilt.
      const half = (word.text.width / 2) * scale + 2;
      word.tally
        .setPosition(word.x + Math.cos(word.tilt) * half, y + Math.sin(word.tilt) * half)
        .setScale(scale)
        .setRotation(word.tilt)
        .setAlpha(alpha);
    }
  }
}

function hidden(text: Phaser.GameObjects.Text): Phaser.GameObjects.Text {
  return text.setDepth(DEPTH.words).setVisible(false);
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
