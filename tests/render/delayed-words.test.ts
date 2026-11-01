import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import type { Sfx } from '../../src/audio/sfx';
import { px } from '../../src/core/constants';
import { FightFeedback } from '../../src/render/fight-feedback';
import type { FightEvent } from '../../src/render/fight-events';
import { FlashBudget } from '../../src/render/flash-budget';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { hitStyleOf } from '../../src/render/hit-styles';
import { Onomatopoeia } from '../../src/render/onomatopoeia';
import { Stamps } from '../../src/render/stamps';

// The effects that are no text play nothing here: what is read is when each text shows.
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
    veil = vi.fn();
    setShake = vi.fn();
    update = vi.fn();
  },
}));

/** An engine text standing in for the real one: it keeps how it was last shown. */
class FakeText {
  text = '';
  visible = true;
  scale = 1;
  alpha = 1;
  readonly width = 40;
  readonly height = 16;
  readonly context = { createLinearGradient: () => ({ addColorStop: () => undefined }) };
  readonly style = { setStyle: () => undefined };
  setOrigin(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setRotation(): this {
    return this;
  }
  setPosition(): this {
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

function scene(): { scene: Phaser.Scene; texts: FakeText[] } {
  const texts: FakeText[] = [];
  const fake = {
    // Pooled hidden: a text shows when a word or a stamp does.
    scale: { width: 960 },
    add: {
      text: () => {
        const text = new FakeText();
        texts.push(text);
        return text;
      },
    },
  } as unknown as Phaser.Scene;
  return { scene: fake, texts };
}

const STYLES = [hitStyleOf('nayo'), hitStyleOf('riff')] as const;
const HIT = { by: 0, x: px(200), y: px(50), away: 1 } as const;

describe("a muted blow's word and stamp, a moment later (docs/flashs.md §4)", () => {
  it('counts the word at once, shows it 8 frames later, then pops it as usual', () => {
    const { scene: fake, texts } = scene();
    const words = new Onomatopoeia(fake, 400, STYLES);
    words.beginTick();
    words.blow('heavy', HIT, 0, 8);
    const shown = texts.filter((text) => text.text !== '');
    expect(shown.map((text) => text.visible)).toEqual([false]);
    // The display frame of the blow goes on: its wait starts with the next one.
    words.update();
    words.settle();
    expect(shown[0]?.visible).toBe(false);
    for (let frame = 1; frame < 8; frame++) {
      words.update();
      expect(shown[0]?.visible, `frame ${frame}`).toBe(false);
    }
    words.update();
    expect(shown[0]?.visible).toBe(true);
    // Its pop, as if it had just landed.
    words.update();
    words.update();
    expect(shown[0]?.scale).toBeGreaterThan(1.1);
  });

  it('fades the word in calm, without its pop', () => {
    const { scene: fake, texts } = scene();
    const words = new Onomatopoeia(fake, 400, STYLES);
    words.calm = true;
    words.beginTick();
    words.blow('ko', HIT, 0);
    const [word] = texts.filter((text) => text.text !== '');
    expect(word?.scale).toBe(1);
    expect(word?.alpha).toBeLessThan(1);
    for (let frame = 0; frame < 3; frame++) words.update();
    expect(word?.scale).toBe(1);
    expect(word?.alpha).toBe(1);
  });

  it('drops a word still waiting when the next one of its player comes', () => {
    const { scene: fake, texts } = scene();
    const words = new Onomatopoeia(fake, 400, STYLES);
    words.beginTick();
    words.blow('heavy', HIT, 0, 8);
    words.beginTick();
    words.blow('light', HIT, 0);
    for (let frame = 0; frame < 12; frame++) words.update();
    expect(texts.filter((text) => text.visible && text.text.startsWith('BAM'))).toEqual([]);
  });

  it('slams a stamp down 16 frames later; calm, without slamming, fading in', () => {
    const { scene: fake, texts } = scene();
    const stamps = new Stamps(fake, 400, STYLES);
    stamps.show('CONTRE !', HIT, 0, 16);
    stamps.settle();
    const stamp = texts.find((text) => text.text === 'CONTRE !');
    expect(stamp?.visible).toBe(false);
    for (let frame = 0; frame < 15; frame++) stamps.update();
    expect(stamp?.visible).toBe(false);
    stamps.update();
    expect(stamp?.visible).toBe(true);
    expect(stamp?.scale).toBe(1.6);
    stamps.show('CONTRE !', HIT, 0, 0, true);
    const calm = texts.filter((text) => text.text === 'CONTRE !').at(-1);
    expect(calm?.scale).toBe(1);
    expect(calm?.alpha).toBeLessThan(1);
  });

  it('never shows a word or a stamp the budget found no room for, the tally still counted', () => {
    const { scene: fake, texts } = scene();
    const words = new Onomatopoeia(fake, 400, STYLES);
    words.beginTick();
    words.blow('heavy', HIT, 0, null);
    expect(texts.filter((text) => text.text !== '')).toEqual([]);
    words.beginTick();
    expect(words.countOf(0)).toBe(2);
    const stamps = new Stamps(fake, 400, STYLES);
    stamps.show('CONTRE !', HIT, 0, null);
    expect(texts.filter((text) => text.text === 'CONTRE !')).toEqual([]);
  });
});

describe('what waits shows on the frame the flash budget keeps it for (docs/flashs.md §4)', () => {
  const impact = (by: 0 | 1) =>
    ({
      x: px(200),
      y: px(50),
      away: by === 0 ? 1 : -1,
      by,
      low: false,
      damage: 25,
      held: false,
      tier: 1,
      pulse: false,
    }) as const;
  const contre = (by: 0 | 1): FightEvent => ({
    type: 'hit',
    heavy: false,
    counter: 'counter',
    ...impact(by),
  });
  const light = (by: 0 | 1): FightEvent => ({
    type: 'hit',
    heavy: false,
    counter: null,
    ...impact(by),
  });
  /** Ticks (one per 1/60 s) and their blows: a CONTRE, a jab, a trade of CONTRE. */
  const TICKS: Readonly<Record<number, readonly FightEvent[]>> = {
    4: [contre(0)],
    19: [light(0)],
    40: [contre(0), contre(1)],
    61: [light(1)],
  };

  /**
   * The fight as FightScene plays it, `steps` frames of the visual clock each display frame (1:
   * 60 Hz, 2: 30 Hz), the flashes off (every blow muted): the frames the budget keeps each word
   * and stamp for, and the frames a text shows up on.
   */
  function run(steps: number): { kept: number[]; shown: number[] } {
    const { scene: fake, texts } = scene();
    const budget = new FlashBudget('off');
    const kept: number[] = [];
    let now = 0;
    const show = budget.show.bind(budget);
    budget.show = (area: number, delay?: number) => {
      show(area, delay);
      if (delay) kept.push(now + delay);
    };
    const feedback = new FightFeedback(
      fake,
      400,
      { play: () => undefined } as unknown as Sfx,
      STYLES,
      {
        width: 640,
        colors: GREYBOX_COLORS,
        budget,
        comfort: { flashes: 'off', shake: 'normal', staging: 'full' },
      },
    );
    const shown: number[] = [];
    const visible = new Set<FakeText>();
    for (let tick = 0; tick < 120;) {
      now += steps;
      budget.advance(steps);
      for (let i = 0; i < steps; i++, tick++) {
        feedback.beginTick();
        for (const event of TICKS[tick] ?? []) feedback.react(event, 0);
        feedback.endTick();
      }
      feedback.update(steps);
      for (const text of texts) {
        if (text.visible && !visible.has(text)) shown.push(now);
        if (text.visible) visible.add(text);
        else visible.delete(text);
      }
    }
    // A word and its tally show together: one frame.
    const frames = (list: number[]) => [...new Set(list)].sort((a, b) => a - b);
    return { kept: frames(kept), shown: frames(shown) };
  }

  it('at 60 Hz, a frame a display', () => {
    const { kept, shown } = run(1);
    expect(kept.length).toBeGreaterThan(5);
    expect(shown).toEqual(kept);
  });

  it('at 30 Hz, two frames a display', () => {
    const { kept, shown } = run(2);
    expect(kept.length).toBeGreaterThan(5);
    expect(shown).toEqual(kept);
  });
});
