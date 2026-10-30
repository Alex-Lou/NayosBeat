import { describe, expect, it } from 'vitest';
import { BOOST_BAR, BOOST_MAX } from '../../src/core/rules';
import {
  BLINK_TICKS,
  blinkOn,
  BOOST_WORD,
  BoostGauge,
  GAUGE_WIDTH,
  gaugePaintKey,
  gaugeSpans,
  layersOf,
  levelColor,
  MAX_WORD,
  type GaugeLook,
} from '../../src/render/boost-gauge';
import { BREAK_TICKS, freshBoost, stepBoost } from '../../src/render/boost-motion';
import { fakeScene, pixelOf } from './hud-fakes';

const ENERGY = 0x00e5ff;
const LEFT: GaugeLook = { side: 0, energy: ENERGY, reducedMotion: false };
const CALM: GaugeLook = { ...LEFT, reducedMotion: true };
/** The tube's third row, for the left player: where it starts, its y. */
const ROW = { start: 19, y: 4 } as const;
const PLATINE = 0xf2f6ff;

/** The color of the tube's third row at `along` pixels from its outer end. */
function at(spans: Parameters<typeof pixelOf>[0], along: number): number | undefined {
  return pixelOf(spans, ROW.start + along, ROW.y);
}
const cores = layersOf(ENERGY).map((layer) => layer[2]);

describe('the Boost gauge (docs/combos-v3.md §1.8.6)', () => {
  it('stacks its bars, each over the last in its own color: the energy, lighter, the platine', () => {
    expect(cores).toEqual([ENERGY, cores[1], PLATINE]);
    expect(new Set(cores).size).toBe(3);
    const one = gaugeSpans(freshBoost(0, 1400), LEFT, 0);
    // 40 % of the second bar over the whole first one.
    expect(at(one, 10)).toBe(cores[1]);
    expect(at(one, 60)).toBe(ENERGY);
    const two = gaugeSpans(freshBoost(0, 2600), LEFT, 0);
    expect(at(two, 10)).toBe(PLATINE);
    expect(at(two, 80)).toBe(cores[1]);
    // Between two shines.
    const full = gaugeSpans(freshBoost(0, BOOST_MAX), LEFT, 50);
    expect(at(full, 0)).toBe(PLATINE);
    expect(at(full, 99)).toBe(PLATINE);
    expect(at(gaugeSpans(freshBoost(0, 0), LEFT, 0), 50)).not.toBe(ENERGY);
  });

  it('frames its count of bars in their color, grey for none', () => {
    expect([0, 1, 2, 3].map((bars) => levelColor(ENERGY, bars))).toEqual([0x6a6080, ...cores]);
    expect(pixelOf(gaugeSpans(freshBoost(0, 2100), LEFT, 0), 0, 0)).toBe(cores[1]);
  });

  it('is mirrored for the right player', () => {
    const motion = freshBoost(0, 1700);
    const left = gaugeSpans(motion, LEFT, 0);
    const right = gaugeSpans(motion, { ...LEFT, side: 1 }, 0);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < GAUGE_WIDTH; x++) {
        expect(pixelOf(right, x, y), `${x}, ${y}`).toBe(pixelOf(left, GAUGE_WIDTH - 1 - x, y));
      }
    }
  });

  it('sweeps a light over the bar it completes, slanted, end to end; none with reduced motion', () => {
    let motion = stepBoost(freshBoost(0, BOOST_BAR - 10), BOOST_BAR + 500, false, 1);
    const light = (look: GaugeLook) =>
      gaugeSpans(motion, look, motion.frame).filter(
        (span) => span.color === 0xffffff && span.alpha === 0.8,
      );
    expect(light(CALM)).toEqual([]);
    const reached: number[] = [];
    while (motion.levelUp > 0) {
      const spans = light(LEFT);
      expect(spans).toHaveLength(6);
      // One pixel further toward the timer per row up, like the tube.
      spans.forEach((span, row) => {
        if (row > 0) expect(span.x).toBe((spans[row - 1]?.x ?? 0) - 1);
      });
      reached.push(...spans.map((span) => span.x - ROW.start + 2 + 3));
      motion = stepBoost(motion, BOOST_BAR + 500, false, motion.frame + 1);
    }
    expect(Math.min(...reached)).toBeLessThanOrEqual(5);
    expect(Math.max(...reached)).toBeGreaterThanOrEqual(100);
  });

  it('marks where the bar filling meets the one under it with a dark pixel', () => {
    const spans = gaugeSpans(freshBoost(0, 1400), LEFT, 0);
    expect(at(spans, 40)).toBe(0x0c0612);
    expect(at(spans, 39)).not.toBe(cores[1]);
    expect(at(gaugeSpans(freshBoost(0, 400), LEFT, 0), 40)).not.toBe(0x0c0612);
  });

  it('shatters at a KO, then stays broken until the next round, its Boost kept', () => {
    let motion = stepBoost(freshBoost(0, 1500), 1500, true, 1);
    const shards = (look: GaugeLook) =>
      gaugeSpans(motion, look, motion.frame).filter((span) => (span.alpha ?? 1) < 1);
    expect(shards(LEFT).length).toBeGreaterThan(20);
    expect(shards(CALM)).toEqual([]);
    for (let tick = 0; tick < BREAK_TICKS; tick++) {
      motion = stepBoost(motion, 1500, true, motion.frame + 1);
    }
    expect(shards(LEFT)).toEqual([]);
    expect(at(gaugeSpans(motion, LEFT, motion.frame), 10)).not.toBe(ENERGY);
    motion = stepBoost(motion, 1500, false, motion.frame + 1);
    expect(at(gaugeSpans(motion, LEFT, motion.frame), 80)).toBe(ENERGY);
  });

  it('repaints only when what it shows changes', () => {
    const motion = freshBoost(0, 1234);
    expect(gaugePaintKey(motion, LEFT, 10)).toBe(gaugePaintKey(motion, LEFT, 500));
    expect(gaugePaintKey(motion, LEFT, 10)).not.toBe(gaugePaintKey(freshBoost(0, 1270), LEFT, 10));
  });
});

/** A gauge on a fake scene: its Graphics, its number and its word. */
function gaugeOn(look: GaugeLook = LEFT) {
  const { scene, graphics, texts } = fakeScene();
  const gauge = new BoostGauge(scene, 8, 30, look, {});
  const [count, word] = texts;
  if (!count || !word) throw new Error('the gauge writes a number and a word');
  return { gauge, view: graphics[0], count, word };
}

describe('the Boost gauge on the HUD', () => {
  it('fills up, and writes its count of bars, redrawn only when it changes', () => {
    const { gauge, count } = gaugeOn();
    gauge.update(1500, false, 0);
    expect(count.text).toBe('0');
    for (let frame = 1; frame <= 40; frame++) gauge.update(1500, false, frame);
    expect(count.text).toBe('1');
    const renders = count.renders;
    for (let frame = 41; frame < 70; frame++) gauge.update(1500, false, frame);
    expect(count.renders).toBe(renders);
    for (let frame = 70; frame < 100; frame++) gauge.update(2400, false, frame);
    expect(count.text).toBe('2');
    expect(count.style.color).toBe(`#${(cores[1] ?? 0).toString(16)}`);
  });

  it('full, turns its word to MAX, white, blinking at 2 Hz (D21), steady with reduced motion', () => {
    expect(BLINK_TICKS).toBeGreaterThanOrEqual(10);
    const { gauge, word } = gaugeOn();
    // It fills up in a second, then blinks.
    for (let frame = 0; frame < 60; frame++) gauge.update(BOOST_MAX, false, frame);
    const shown: number[] = [];
    for (let frame = 60; frame < 120; frame++) {
      gauge.update(BOOST_MAX, false, frame);
      shown.push(word.alpha);
    }
    expect(word.text).toBe(MAX_WORD);
    expect(word.style.color).toBe('#ffffff');
    const changes = shown.filter((alpha, frame) => frame > 0 && alpha !== shown[frame - 1]);
    expect(changes).toHaveLength(3);
    expect(blinkOn(BLINK_TICKS)).toBe(false);
    // Spent, it takes its word and color back.
    for (let frame = 120; frame < 150; frame++) gauge.update(BOOST_MAX - BOOST_BAR, false, frame);
    expect(word.text).toBe(BOOST_WORD);
    expect(word.alpha).toBe(1);
    expect(word.style.color).toBe('#00e5ff');
    const calm = gaugeOn(CALM);
    for (let frame = 0; frame < 120; frame++) {
      calm.gauge.update(BOOST_MAX, false, frame);
      expect(calm.word.alpha).toBe(1);
    }
  });

  it('dims its number and word while broken', () => {
    const { gauge, count, word } = gaugeOn();
    gauge.update(1500, false, 0);
    gauge.update(1500, true, 1);
    expect(count.alpha).toBeLessThan(1);
    expect(word.style.color).not.toBe('#00e5ff');
    gauge.update(1500, false, 2);
    expect(count.alpha).toBe(1);
    expect(word.style.color).toBe('#00e5ff');
  });
});
