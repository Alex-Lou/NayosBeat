import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import { px } from '../../src/core/constants';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { MAX_CLOSE_UP } from '../../src/render/camera-framing';
import { easeOutCubic } from '../../src/render/easings';
import { FightFeedback } from '../../src/render/fight-feedback';
import type { FightEvent } from '../../src/render/fight-events';
import { FlashBudget, type FlashMode } from '../../src/render/flash-budget';
import { hitStyleOf } from '../../src/render/hit-styles';
import { FLASH_DELTA, luminanceDelta, redRatio, SATURATED_RED } from '../../src/render/luminance';
import { CAPTION_LINE, MoveCaption, UNDER_CAPTIONS } from '../../src/render/move-caption';
import { HUD_BAND, HUSH_FRAMES, Onomatopoeia, POP_PEAK } from '../../src/render/onomatopoeia';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { arrival, COUNTER_STAMP, counterLook, STAMP_TEXTS, Stamps } from '../../src/render/stamps';
import { facingOff } from '../core/helpers';

// The effects that are no text play nothing here: what is read is how each text shows.
vi.mock('../../src/render/hit-fx', () => ({
  HitFx: class {
    play = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/graze', () => ({
  Graze: class {
    play = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/dust', () => ({
  Dust: class {
    kick = vi.fn();
    puff = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/blood', () => ({
  BLEEDS: { heavyHit: {}, ko: {} },
  Blood: class {
    bleed = vi.fn();
    update = vi.fn();
  },
}));
vi.mock('../../src/render/effects', () => ({
  Effects: class {
    kick = vi.fn();
    jolt = vi.fn();
    veil = vi.fn();
    setShake = vi.fn();
    update = vi.fn();
  },
}));

/** An engine text standing in for the real one: it keeps how it was last shown. */
class FakeText {
  text = '';
  visible = true;
  x = 0;
  y = 0;
  scale = 1;
  alpha = 1;
  rotation = 0;
  scrollFactor = 1;
  originY = 0.5;
  readonly height = 16;
  readonly context = { createLinearGradient: () => ({ addColorStop: () => undefined }) };
  readonly style = { setStyle: () => undefined, resolution: 1 };
  /** About the comic font's: 8 px a letter. */
  get width(): number {
    return this.text.length * 8;
  }
  setOrigin(_x = 0.5, y = _x): this {
    this.originY = y;
    return this;
  }
  setScrollFactor(factor: number): this {
    this.scrollFactor = factor;
    return this;
  }
  setDepth(): this {
    return this;
  }
  setRotation(rotation: number): this {
    this.rotation = rotation;
    return this;
  }
  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  setX(x: number): this {
    this.x = x;
    return this;
  }
  setFontSize(): this {
    return this;
  }
  getTextMetrics(): object {
    return {};
  }
  setText(text: string): this {
    this.text = text;
    return this;
  }
  updateText(): this {
    return this;
  }
  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }
  setScale(scale: number): this {
    this.scale = scale;
    return this;
  }
  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }
}

/** An engine Graphics standing in for the real one (a stamp's frame): it keeps what it drew. */
class FakeGraphics {
  visible = true;
  rotation = 0;
  scale = 1;
  alpha = 1;
  /** The colors of its lines and fills, and its shapes, since it was last cleared. */
  colors: number[] = [];
  rects = 0;
  fills = 0;
  setDepth(): this {
    return this;
  }
  setVisible(visible: boolean): this {
    this.visible = visible;
    return this;
  }
  setPosition(): this {
    return this;
  }
  setRotation(rotation: number): this {
    this.rotation = rotation;
    return this;
  }
  setScale(scale: number): this {
    this.scale = scale;
    return this;
  }
  setAlpha(alpha: number): this {
    this.alpha = alpha;
    return this;
  }
  clear(): this {
    this.colors = [];
    this.rects = 0;
    this.fills = 0;
    return this;
  }
  lineStyle(_width: number, color: number): this {
    this.colors.push(color);
    return this;
  }
  strokeRect(): this {
    this.rects++;
    return this;
  }
  fillStyle(color: number): this {
    this.colors.push(color);
    return this;
  }
  fillRect(): this {
    this.fills++;
    return this;
  }
}

function scene(): { scene: Phaser.Scene; texts: FakeText[]; frames: FakeGraphics[] } {
  const texts: FakeText[] = [];
  const frames: FakeGraphics[] = [];
  const fake = {
    scale: { width: 960 },
    add: {
      text: (x: number, y: number) => {
        const text = new FakeText().setPosition(x, y);
        texts.push(text);
        return text;
      },
      graphics: () => {
        const graphics = new FakeGraphics();
        frames.push(graphics);
        return graphics;
      },
    },
  } as unknown as Phaser.Scene;
  return { scene: fake, texts, frames };
}

const STYLES = [hitStyleOf('nayo'), hitStyleOf('riff')] as const;
const GROUND_Y = 230;
const HIT = { by: 0, x: px(200), y: px(50), away: 1 } as const;
const DEGREES = Math.PI / 180;

/** A blow of player 1, at (200, 50) px: CONTRE or not, the final one or not. */
function blow(counter: 'counter' | null, ko: 'plain' | 'finale' | null = null): FightEvent {
  const impact = {
    x: px(200),
    y: px(50),
    away: 1,
    by: 0,
    low: false,
    damage: 40,
    held: false,
    counter,
    tier: 0,
    pulse: false,
    freeze: 11,
  } as const;
  return ko === null
    ? { type: 'hit', heavy: false, ...impact }
    : { type: 'ko', finish: ko, ...impact };
}

/** The fight's effects, their texts real, the flashes `flashes`: each tick's events, then frames. */
function fight(flashes: FlashMode = 'normal') {
  const made = scene();
  const budget = new FlashBudget(flashes);
  const feedback = new FightFeedback(
    made.scene,
    GROUND_Y,
    { play: () => undefined } as unknown as Sfx,
    STYLES,
    {
      width: 640,
      colors: FIGHT_STAGE_COLORS,
      budget,
      comfort: { flashes, shake: 'normal', staging: 'full' },
      mode: 'full',
    },
  );
  let tick = 0;
  return {
    ...made,
    react(...events: FightEvent[]) {
      feedback.beginTick(tick++);
      for (const event of events) feedback.react(event, 0);
      feedback.endTick();
    },
    wait(frames: number) {
      budget.advance(frames);
      feedback.update(frames);
    },
    /** The texts on screen: shown, not faded out. */
    seen() {
      return made.texts.filter((text) => text.visible && text.alpha > 0);
    },
  };
}

describe('one voice at the round end (docs/polish/AUDIT-ET-PLAN.md, P10)', () => {
  it("fades every word and stamp out over 4 frames, on an easeOutCubic, the KO's BOUM too", () => {
    const played = fight();
    played.react(blow('counter'));
    played.wait(6);
    const before = played.seen();
    expect(before.map((text) => text.text)).toEqual(expect.arrayContaining(['CONTRE !']));
    const from = new Map(before.map((text) => [text, text.alpha]));
    played.react(blow(null, 'plain'), { type: 'phase', phase: 'roundEnd' });
    const boum = played.texts.find((text) => text.text === 'BOUM !');
    expect(boum?.visible).toBe(true);
    for (let frame = 1; frame < HUSH_FRAMES; frame++) {
      played.wait(1);
      const left = 1 - easeOutCubic(frame / HUSH_FRAMES);
      for (const [text, alpha] of from) expect(text.alpha).toBeCloseTo(alpha * left, 5);
      expect(boum?.alpha).toBeLessThanOrEqual(left);
    }
    played.wait(1);
    // Nothing left of them: « K.O. » and its count speak alone (hud.test.ts).
    expect(played.seen()).toEqual([]);
  });

  it('never shows a word or a stamp that was still waiting', () => {
    // The flashes off: its word and stamp wait, calm, a moment after the blow.
    const played = fight('off');
    played.react(blow('counter'));
    const waiting = played.texts.filter((text) => !text.visible && text.text !== '');
    expect(waiting.length).toBeGreaterThan(0);
    played.react({ type: 'phase', phase: 'roundEnd' });
    for (let frame = 0; frame < 60; frame++) {
      played.wait(1);
      for (const text of waiting) expect(text.visible, `frame ${frame}`).toBe(false);
    }
  });

  it("leaves the stamps to the Finisher's card, which hushes them as it comes", () => {
    const played = fight();
    played.react(blow('counter'));
    played.react(blow(null, 'finale'), { type: 'phase', phase: 'roundEnd' });
    played.wait(HUSH_FRAMES);
    expect(played.seen().map((text) => text.text)).toContain('CONTRE !');
  });
});

describe('CONTRE and PUNITION told apart by their shape (P11)', () => {
  /** A stamp shown alone, the frames it is then seen on: its scale, tilt and frame. */
  function stamped(counter: 'counter' | 'punish', freeze: number) {
    const made = scene();
    const stamps = new Stamps(made.scene, GROUND_Y, STYLES, FIGHT_STAGE_COLORS);
    stamps.show(STAMP_TEXTS[counter], HIT, 0, 0, false, counterLook(counter, freeze));
    const text = made.texts.find((each) => each.text === STAMP_TEXTS[counter]);
    const frame = made.frames.find((each) => each.visible);
    if (!text || !frame) throw new Error('No stamp, or no frame');
    const shots = [{ scale: text.scale, visible: text.visible }];
    for (let i = 0; i < 80; i++) {
      stamps.update();
      shots.push({ scale: text.scale, visible: text.visible });
    }
    return { text, frame, shots };
  }

  it('leans CONTRE 8° in its frame; stands PUNITION straight in its own, underlined', () => {
    const contre = stamped('counter', 11);
    expect(contre.text.rotation).toBeCloseTo(-8 * DEGREES);
    expect(contre.frame.rotation).toBe(contre.text.rotation);
    expect([contre.frame.rects, contre.frame.fills]).toEqual([2, 0]);
    const punition = stamped('punish', 11);
    expect(punition.text.rotation).toBe(0);
    expect(punition.frame.rotation).toBe(0);
    expect([punition.frame.rects, punition.frame.fills]).toEqual([2, 2]);
  });

  it('arrives on the tick of the blow with a bounce over 6 frames, then stays the freeze and 20 more', () => {
    for (const freeze of [8, 14]) {
      const { shots } = stamped('counter', freeze);
      expect(shots[0]?.visible).toBe(true);
      const arriving = shots.slice(0, COUNTER_STAMP.arrive).map((shot) => shot.scale);
      expect(arriving).toEqual(arriving.map((_, age) => arrival(age)));
      // easeOutBack: past its size (110 %), then back to it.
      expect(Math.max(...arriving)).toBeGreaterThan(1.08);
      expect(Math.max(...arriving)).toBeLessThan(1.11);
      expect(shots[COUNTER_STAMP.arrive]?.scale).toBe(1);
      const seen = shots.filter((shot) => shot.visible).length;
      expect(seen).toBe(freeze + COUNTER_STAMP.after);
    }
  });

  it('keeps the other stamps without a frame, slammed down as ever', () => {
    const made = scene();
    const stamps = new Stamps(made.scene, GROUND_Y, STYLES, FIGHT_STAGE_COLORS);
    stamps.show(STAMP_TEXTS.remix, HIT, 0);
    expect(made.frames.some((frame) => frame.visible)).toBe(false);
    expect(made.texts.find((text) => text.text === STAMP_TEXTS.remix)?.scale).toBe(1.6);
  });

  it('draws its frame in a tone that lights nothing over the stage, never a saturated red', () => {
    for (const fighter of ['nayo', 'riff'] as const) {
      for (const colorway of ['main', 'alt'] as const) {
        const style = hitStyleOf(fighter, colorway);
        const made = scene();
        const stamps = new Stamps(made.scene, GROUND_Y, [style, style], FIGHT_STAGE_COLORS);
        stamps.show(STAMP_TEXTS.punish, HIT, 0, 0, false, counterLook('punish', 10));
        const colors = made.frames.flatMap((frame) => frame.colors);
        expect(colors.length).toBeGreaterThan(0);
        for (const color of colors) {
          for (const stage of FIGHT_STAGE_COLORS) {
            expect(luminanceDelta(color, stage, 1), `${fighter} ${colorway}`).toBeLessThan(
              FLASH_DELTA,
            );
          }
          expect(redRatio(color)).toBeLessThan(SATURATED_RED);
        }
        // Its hue still shows: the energy, darkened, not the ink alone.
        expect(new Set(colors).size).toBeGreaterThan(1);
      }
    }
  });
});

describe("training's move names on a line of their own (P10)", () => {
  /** Where a world row shows on the screen at the closest zoom, the ground at its place. */
  const onScreen = (worldY: number) => GROUND_Y - (GROUND_Y - worldY) * MAX_CLOSE_UP;

  /** The highest a word's top shows over its life, a blow landing high up (view px). */
  function highestTop(top: number): number {
    const made = scene();
    const words = new Onomatopoeia(made.scene, GROUND_Y, STYLES, top);
    words.beginTick();
    words.blow('heavy', { ...HIT, y: px(170) }, 0);
    const word = made.texts.find((text) => text.text.endsWith('!'));
    if (!word) throw new Error('No word');
    let highest = Infinity;
    for (let frame = 0; frame < 40; frame++) {
      highest = Math.min(highest, onScreen(word.y - word.height * Math.max(word.scale, POP_PEAK)));
      words.update();
    }
    return highest;
  }

  it('keeps every sound word under the line, at any zoom', () => {
    expect(highestTop(UNDER_CAPTIONS)).toBeGreaterThanOrEqual(CAPTION_LINE.y + CAPTION_LINE.height);
    // Out of training, under the HUD only: such a word would rise into the line.
    expect(highestTop(HUD_BAND)).toBeLessThan(CAPTION_LINE.y + CAPTION_LINE.height);
  });

  it('writes the names on the line fixed under the HUD, above their fighters, side by side', () => {
    const made = scene();
    const caption = new MoveCaption(made.scene, { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] });
    const state = facingOff(20);
    caption.react({ type: 'attack', by: 0, move: 'standHeavy', heavy: true }, state.frame);
    caption.react({ type: 'attack', by: 1, move: 'standHeavy', heavy: true }, state.frame + 1);
    caption.update({ ...state, frame: state.frame + 2 }, { closeUp: 1.2, left: 200, top: 38 });
    const [first, second] = made.texts;
    if (!first || !second) throw new Error('No names');
    for (const name of [first, second]) {
      expect([name.y, name.originY, name.scrollFactor]).toEqual([CAPTION_LINE.y, 0, 0]);
      expect(name.visible).toBe(true);
    }
    // Over its fighter, as the camera shows it; the later one beside the first.
    const nayoX = (state.fighters[0].x / px(1) - 200) * 1.2;
    expect(first.x).toBe(Math.round(nayoX));
    expect(Math.abs(second.x - first.x)).toBeGreaterThanOrEqual((first.width + second.width) / 2);
  });
});
