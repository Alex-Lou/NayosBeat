import type Phaser from 'phaser';
import { textResolution } from './camera-framing';
import { COMIC_FONT, hex } from './comic-lettering';
import { DEPTH } from './depth';
import type { CardScript } from './finisher-scripts';
import { PIXEL_FONT } from './hud';
import type { RenderMode } from './render-mode';
import { FX_DARK } from './veils';

/**
 * The Finisher's card (docs/finisher.md §2.7, §3.7), in place of the announcer's « K.O. »: Nayo's
 * « QUATRE. » in a neon tube (a cyan line of 2 px, a platine core, a dark rim), Riff's words cut
 * out of paper, a letter on each scrap at an angle from a fixed table, a staple on each word;
 * « FINISHER » small over both, in the pixel font. It comes in once, then holds still: no
 * letter ever trembles. Made once, filled with its words when its scene starts. Drawn without
 * tints (`mode` simple), a dark card does not show: its letters would stay lit.
 */

/** Platine and silver, the Boost's and Riff's studs (never gold); the rim's ink. */
const PLATINE = 0xf2f6ff;
const SILVER = 0xd8e0ec;
const RIM = 0x20243a;
/** The neon's letters, about 40 world px high, its tube and its rim (world px). */
const NEON = { size: 40, tube: 4, rim: 8 } as const;
/** A cut-out letter: its scrap of paper, its size, the pitch from one to the next. */
const SCRAP = { width: 12, height: 22, letter: 18, pitch: 13, space: 7 } as const;
/** The scraps' angles, degrees, in turn: a fixed table, never chance (§3.7). */
export const CUTOUT_ANGLES = [-6, 4, -3, 7, -5, 2, -4, 5] as const;
/** « FINISHER » over the card (world px over its top). */
const LABEL = { text: 'FINISHER', size: 8, gap: 4 } as const;
/** The neon glides 8 px up into place; the paper drops in a block, 1 px past it, then back. */
const GLIDE = 8;
const DROP = [-6, -3, 1, 0] as const;
/** Reduced flashes: the card fades in over this many frames instead (§4.5). */
const FADE_IN = 8;

/** One letter of Riff's card: where it stands (from the card's middle), its tilt, its colors. */
export interface CutoutLetter {
  readonly char: string;
  readonly x: number;
  /** Degrees. */
  readonly angle: number;
  /** Which paper (0: black, 1: the flat's) and which ink (0: platine, 1: silver). */
  readonly paper: 0 | 1;
  readonly ink: 0 | 1;
  /** The first letter of a word wears its staple. */
  readonly staple: boolean;
}

/** Riff's card laid out: its letters in a line around 0, and its width (world px). */
export function cutoutLayout(text: string): { letters: CutoutLetter[]; width: number } {
  const letters: CutoutLetter[] = [];
  let x = 0;
  let index = 0;
  let wordStart = true;
  for (const char of text) {
    if (char === ' ') {
      x += SCRAP.space;
      wordStart = true;
      continue;
    }
    const angle = CUTOUT_ANGLES[index % CUTOUT_ANGLES.length] ?? 0;
    const paper = (index % 2) as 0 | 1;
    const ink = (Math.floor(index / 2) % 2) as 0 | 1;
    letters.push({ char, x, angle, paper, ink, staple: wordStart });
    wordStart = false;
    x += SCRAP.pitch;
    index++;
  }
  const width = Math.max(0, x - SCRAP.pitch + SCRAP.width);
  const half = width / 2 - SCRAP.width / 2;
  return { letters: letters.map((letter) => ({ ...letter, x: letter.x - half })), width };
}

/**
 * How far the card stands from its place (world px, down positive) `entered` of the way in (0 to
 * 1, by frames of CARD_ENTER): the neon glides up, the paper drops and claps; `still`, neither.
 */
export function cardOffset(style: CardScript['style'], entered: number, still: boolean): number {
  if (still || entered >= 1) return 0;
  if (style === 'neon') return Math.round(GLIDE * (1 - entered) ** 2);
  return DROP[Math.min(DROP.length - 1, Math.max(0, Math.ceil(entered * DROP.length) - 1))] ?? 0;
}

/** How the card is drawn: lit, fading in (the flashes reduced), or dark (refused, or none). */
export type CardLook = 'lit' | 'fade' | 'dark';

/** A letter of the cut-out card: its scrap of paper, the letter on it, the staple of its word. */
interface Scrap {
  readonly paper: Phaser.GameObjects.Rectangle;
  readonly letter: Phaser.GameObjects.Text;
  readonly staple: Phaser.GameObjects.Rectangle;
}

export class FinisherCard {
  private readonly container: Phaser.GameObjects.Container;
  /** The neon: its rim behind, its tube and core over it. */
  private readonly neon: readonly [Phaser.GameObjects.Text, Phaser.GameObjects.Text] | undefined;
  /** The paper: a scrap for each character of its longest words. */
  private readonly scraps: readonly Scrap[];
  private readonly label: Phaser.GameObjects.Text;
  private look: CardLook = 'lit';
  /** Dark, drawn without tints: it stays hidden. */
  private unseen = false;
  private height = 0;
  /** World px, once filled with its words. */
  private cardWidth = 0;
  private lit = 0;

  /** `energy`: the neon's tube; `flat`: the second paper of the cut-out, the scene's flat. */
  constructor(
    scene: Phaser.Scene,
    private readonly card: CardScript,
    private readonly energy: number,
    private readonly flat: number,
    private readonly mode: RenderMode,
  ) {
    const resolution = textResolution(scene.scale.width);
    this.container = scene.add.container(0, 0).setDepth(DEPTH.words).setVisible(false);
    const text = (size: number, font: string): Phaser.GameObjects.Text =>
      scene.add.text(0, 0, '', { fontFamily: font, fontSize: size, resolution }).setOrigin(0.5, 1);
    this.label = text(LABEL.size, PIXEL_FONT).setColor(hex(PLATINE)).setStroke(hex(RIM), 2);
    const longest = Math.max(card.text.length, card.rival?.text.length ?? 0);
    if (card.style === 'neon') {
      const rim = text(NEON.size, COMIC_FONT).setColor(hex(RIM)).setStroke(hex(RIM), NEON.rim);
      const tube = text(NEON.size, COMIC_FONT)
        .setColor(hex(PLATINE))
        .setStroke(hex(energy), NEON.tube);
      this.neon = [rim, tube];
      this.container.add([rim, tube]);
      this.scraps = [];
    } else {
      this.neon = undefined;
      this.scraps = Array.from({ length: longest }, () => ({
        paper: scene.add.rectangle(0, 0, SCRAP.width, SCRAP.height),
        letter: text(SCRAP.letter, COMIC_FONT).setOrigin(0.5),
        staple: scene.add.rectangle(0, 0, 2, 2, SILVER),
      }));
      for (const { paper, letter, staple } of this.scraps) {
        this.container.add([paper, letter, staple]);
      }
    }
    this.container.add(this.label);
  }

  /** Its words against `victim`: the rival's own against the rival (Riff on Nayo). */
  prepare(victim: string, look: CardLook): void {
    const words = this.card.rival?.fighter === victim ? this.card.rival.text : this.card.text;
    this.look = look;
    const dark = look === 'dark';
    this.unseen = dark && this.mode === 'simple';
    const tint = (object: Phaser.GameObjects.Text) => {
      if (dark) object.setTint(FX_DARK);
      else object.clearTint();
    };
    tint(this.label);
    if (this.neon) {
      for (const text of this.neon) {
        text.setText(words);
        tint(text);
      }
      this.height = this.neon[1].height;
      this.cardWidth = this.neon[1].width;
    } else {
      const { letters, width } = cutoutLayout(words);
      this.scraps.forEach((scrap, i) => {
        this.cut(scrap, letters[i], dark);
      });
      this.height = SCRAP.height;
      this.cardWidth = width;
    }
    this.label.setText(LABEL.text).setPosition(0, -this.height - LABEL.gap);
    this.lit = this.cardWidth * this.height + this.label.width * this.label.height;
  }

  /** A scrap of the cut-out card with its letter on it, or hidden (`letter` undefined). */
  private cut(scrap: Scrap, letter: CutoutLetter | undefined, dark: boolean): void {
    const { paper, letter: text, staple } = scrap;
    if (!letter) {
      paper.setVisible(false);
      text.setVisible(false);
      staple.setVisible(false);
      return;
    }
    const color = letter.paper === 0 ? 0x000000 : this.flat;
    const angle = (letter.angle * Math.PI) / 180;
    const y = -SCRAP.height / 2;
    paper
      .setFillStyle(dark ? multiply(color, FX_DARK) : color)
      .setPosition(letter.x, y)
      .setRotation(angle)
      .setVisible(true);
    text
      .setText(letter.char)
      .setColor(hex(letter.ink === 0 ? PLATINE : SILVER))
      .setPosition(letter.x, y)
      .setRotation(angle)
      .setVisible(true);
    if (dark) text.setTint(FX_DARK);
    else text.clearTint();
    staple
      .setFillStyle(dark ? multiply(SILVER, FX_DARK) : SILVER)
      .setPosition(letter.x, y - SCRAP.height / 2 + 2)
      .setVisible(letter.staple);
  }

  /**
   * World px² the card lights at most, its whole box and its label's (what it asks the flash
   * budget for, docs/finisher.md §4.3: counted « par prudence »).
   */
  area(): number {
    return this.lit;
  }

  /**
   * The card this frame: `shown` or not, `entered` of the way in, `alpha`, its feet over world
   * (x, y); `still`, it does not move in (the screen kept still); `fading`: frames since it
   * came, for its fade in with the flashes reduced.
   */
  update(
    card: { readonly shown: boolean; readonly entered: number; readonly alpha: number },
    x: number,
    y: number,
    still: boolean,
    since: number,
  ): void {
    if (!card.shown || this.unseen) {
      this.container.setVisible(false);
      return;
    }
    const fade = this.look === 'fade' ? Math.min(1, (since + 1) / FADE_IN) : 1;
    const offset = this.look === 'fade' ? 0 : cardOffset(this.card.style, card.entered, still);
    this.container
      .setPosition(Math.round(x), Math.round(y + offset))
      .setAlpha(card.alpha * fade)
      .setVisible(true);
  }

  /** Its width, world px: the scene keeps it inside the screen. */
  get width(): number {
    return this.cardWidth;
  }
}

/** `color` multiplied by `by`, channel by channel (the dark look of the effects). */
function multiply(color: number, by: number): number {
  const channel = (shift: number) =>
    Math.round((((color >> shift) & 0xff) * ((by >> shift) & 0xff)) / 255) << shift;
  return channel(16) | channel(8) | channel(0);
}
