import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { px } from '../../src/core/constants';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { MoveCaption } from '../../src/render/move-caption';

/** A text standing in for the engine's: what it was last told to write. */
class FakeText {
  text = '';
  readonly style = { resolution: 1 };
  setOrigin(): this {
    return this;
  }
  setScrollFactor(): this {
    return this;
  }
  setDepth(): this {
    return this;
  }
  setVisible(): this {
    return this;
  }
  setText(text: string): this {
    this.text = text;
    return this;
  }
}

describe("training's move names (docs/finisher.md §1.12)", () => {
  it('names the super, then the Finisher once its lock takes: « Le Quatre », « Larsen »', () => {
    const texts: FakeText[] = [];
    const scene = {
      scale: { width: 960 },
      add: {
        text: () => {
          const text = new FakeText();
          texts.push(text);
          return text;
        },
      },
    } as unknown as Phaser.Scene;
    const caption = new MoveCaption(scene, { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] });
    const [nayo, riff] = texts;
    caption.react({ type: 'attack', by: 0, move: 'super', heavy: true }, 10);
    caption.react({ type: 'attack', by: 1, move: 'super', heavy: true }, 10);
    expect([nayo?.text, riff?.text]).toEqual(['Mégabasse', 'Slam']);
    caption.react({ type: 'finisherLock', by: 0, name: 'Le Quatre', x: px(200), y: 0 }, 22);
    caption.react({ type: 'finisherLock', by: 1, name: 'Larsen', x: px(200), y: 0 }, 22);
    expect([nayo?.text, riff?.text]).toEqual(['Le Quatre', 'Larsen']);
  });
});
