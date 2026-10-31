import { describe, expect, it } from 'vitest';
import { BOOST_BAR, BOOST_MAX } from '../../src/core/rules';
import {
  blastShake,
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
import { BREAK_TICKS, CRACK_TICKS, freshBoost, stepBoost } from '../../src/render/boost-motion';
import { fakeScene, pixelOf } from './hud-fakes';

const ENERGY = 0x00e5ff;
const LEFT: GaugeLook = { side: 0, energy: ENERGY, flashes: true, motion: true };
const CALM: GaugeLook = { ...LEFT, flashes: false, motion: false };
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
    let motion = stepBoost(freshBoost(0, BOOST_BAR - 10), BOOST_BAR + 500, null, 1);
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
      motion = stepBoost(motion, BOOST_BAR + 500, null, motion.frame + 1);
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
    let motion = stepBoost(freshBoost(0, 1500), 1500, 'shatter', 1);
    const shards = (look: GaugeLook) =>
      gaugeSpans(motion, look, motion.frame).filter((span) => (span.alpha ?? 1) < 1);
    expect(shards(LEFT).length).toBeGreaterThan(20);
    expect(shards(CALM)).toEqual([]);
    for (let tick = 0; tick < BREAK_TICKS; tick++) {
      motion = stepBoost(motion, 1500, 'shatter', motion.frame + 1);
    }
    expect(shards(LEFT)).toEqual([]);
    expect(at(gaugeSpans(motion, LEFT, motion.frame), 10)).not.toBe(ENERGY);
    motion = stepBoost(motion, 1500, null, motion.frame + 1);
    expect(at(gaugeSpans(motion, LEFT, motion.frame), 80)).toBe(ENERGY);
  });

  it('cracks at the end of a combo, its Boost still showing; whole again next round', () => {
    let motion = stepBoost(freshBoost(0, 1400), 1400, 'crack', 1);
    for (let tick = 0; tick < CRACK_TICKS; tick++) {
      motion = stepBoost(motion, 1400, 'crack', motion.frame + 1);
    }
    const cracked = gaugeSpans(motion, LEFT, motion.frame);
    // Dark crack pixels inside the tube, the bars under them still in their colors.
    expect(
      cracked.filter((span) => span.color === 0x0c0612 && span.width === 1).length,
    ).toBeGreaterThan(10);
    expect(cracked.some((span) => span.color === ENERGY)).toBe(true);
    // Reduced motion: the same cracks at once, no chips falling.
    const calm = gaugeSpans(stepBoost(freshBoost(0, 1400), 1400, 'crack', 1), CALM, 1);
    expect(calm.filter((span) => span.color === 0x0c0612 && span.width === 1).length).toBe(
      cracked.filter((span) => span.color === 0x0c0612 && span.width === 1).length,
    );
    expect(calm.some((span) => (span.alpha ?? 1) < 1 && span.width === 2)).toBe(false);
    motion = stepBoost(motion, 1400, null, motion.frame + 1);
    expect(gaugeSpans(motion, LEFT, motion.frame)).toEqual(
      gaugeSpans(freshBoost(motion.frame, 1400), LEFT, motion.frame),
    );
  });

  it('blows up hard: hot shards of three sizes, sparks, the gauge shaking 2 px then 1', () => {
    const blast = (ticks: number) => {
      let motion = stepBoost(freshBoost(0, 1500), 1500, 'shatter', 1);
      for (let tick = 0; tick < ticks; tick++) {
        motion = stepBoost(motion, 1500, 'shatter', motion.frame + 1);
      }
      return motion;
    };
    const early = gaugeSpans(blast(1), LEFT, 0).filter((span) => (span.alpha ?? 1) < 1);
    expect(
      new Set(early.map((span) => `${span.width}x${span.height}`)).size,
    ).toBeGreaterThanOrEqual(3);
    // Hot at first: the light rim of their bar (white only at 3 bars, the platine's).
    expect(early.some((span) => span.color === layersOf(ENERGY)[0]?.[0])).toBe(true);
    expect(early.some((span) => span.color === 0xffffff)).toBe(false);
    // They fly well off the tube.
    const later = gaugeSpans(blast(20), LEFT, 0).filter((span) => (span.alpha ?? 1) < 1);
    expect(Math.max(...later.map((span) => Math.abs(span.y)))).toBeGreaterThan(15);
    expect([blastShake(blast(0), LEFT), blastShake(blast(1), LEFT)].sort()).toEqual([-2, 2]);
    expect(Math.abs(blastShake(blast(8), LEFT))).toBe(1);
    expect(blastShake(blast(12), LEFT)).toBe(0);
    expect(blastShake(blast(1), CALM)).toBe(0);
    // A crack does not shake.
    expect(blastShake(stepBoost(freshBoost(0, 900), 900, 'crack', 1), LEFT)).toBe(0);
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
    gauge.update(1500, null, 0);
    expect(count.text).toBe('0');
    for (let frame = 1; frame <= 40; frame++) gauge.update(1500, null, frame);
    expect(count.text).toBe('1');
    const renders = count.renders;
    for (let frame = 41; frame < 70; frame++) gauge.update(1500, null, frame);
    expect(count.renders).toBe(renders);
    for (let frame = 70; frame < 100; frame++) gauge.update(2400, null, frame);
    expect(count.text).toBe('2');
    expect(count.style.color).toBe(`#${(cores[1] ?? 0).toString(16)}`);
  });

  it('full, turns its word to MAX, white, blinking at 2 Hz (D21), steady with reduced motion', () => {
    expect(BLINK_TICKS).toBeGreaterThanOrEqual(10);
    const { gauge, word } = gaugeOn();
    // It fills up in a second, then blinks.
    for (let frame = 0; frame < 60; frame++) gauge.update(BOOST_MAX, null, frame);
    const shown: number[] = [];
    for (let frame = 60; frame < 120; frame++) {
      gauge.update(BOOST_MAX, null, frame);
      shown.push(word.alpha);
    }
    expect(word.text).toBe(MAX_WORD);
    expect(word.style.color).toBe('#ffffff');
    const changes = shown.filter((alpha, frame) => frame > 0 && alpha !== shown[frame - 1]);
    expect(changes).toHaveLength(3);
    expect(blinkOn(BLINK_TICKS)).toBe(false);
    // Spent, it takes its word and color back.
    for (let frame = 120; frame < 150; frame++) gauge.update(BOOST_MAX - BOOST_BAR, null, frame);
    expect(word.text).toBe(BOOST_WORD);
    expect(word.alpha).toBe(1);
    expect(word.style.color).toBe('#00e5ff');
    const calm = gaugeOn(CALM);
    for (let frame = 0; frame < 120; frame++) {
      calm.gauge.update(BOOST_MAX, null, frame);
      expect(calm.word.alpha).toBe(1);
    }
  });

  it('dims its number and word while broken', () => {
    const { gauge, count, word } = gaugeOn();
    gauge.update(1500, null, 0);
    gauge.update(1500, 'shatter', 1);
    expect(count.alpha).toBeLessThan(1);
    expect(word.style.color).not.toBe('#00e5ff');
    gauge.update(1500, null, 2);
    expect(count.alpha).toBe(1);
    expect(word.style.color).toBe('#00e5ff');
  });
});

describe("the Boost gauge under the player's options (docs/flashs.md §4)", () => {
  const NO_FLASHES: GaugeLook = { ...LEFT, flashes: false };
  const STILL: GaugeLook = { ...LEFT, motion: false };

  it('keeps its shards with the flashes reduced, not hot, nor its sweep', () => {
    const blown = stepBoost(freshBoost(0, 1500), 1500, 'shatter', 1);
    const shards = (look: GaugeLook) =>
      gaugeSpans(blown, look, blown.frame).filter((span) => (span.alpha ?? 1) < 1);
    expect(shards(NO_FLASHES).length).toBeGreaterThan(20);
    expect(shards(STILL)).toEqual([]);
    // Their bar's light rim only with the flashes normal (hot); the sparks keep it.
    const rim = layersOf(ENERGY)[0]?.[0];
    const hot = (look: GaugeLook) =>
      shards(look).some((span) => span.width > 2 && span.color === rim);
    expect(hot(LEFT)).toBe(true);
    expect(hot(NO_FLASHES)).toBe(false);
    expect(blastShake(blown, STILL)).toBe(0);
    const filling = stepBoost(freshBoost(0, BOOST_BAR - 10), BOOST_BAR + 500, null, 1);
    const sweep = (look: GaugeLook) =>
      gaugeSpans(filling, look, 1).filter((span) => span.color === 0xffffff && span.alpha === 0.8);
    expect(sweep(NO_FLASHES)).toEqual([]);
    expect(sweep(STILL)).toHaveLength(6);
  });

  it('breaks still when told so: no shards, no shake', () => {
    const { gauge, view } = gaugeOn();
    gauge.update(1500, null, 0);
    gauge.update(1500, 'shatter', 1, true);
    gauge.update(1500, 'shatter', 2, true);
    expect(view?.spans.every((span) => (span.alpha ?? 1) === 1)).toBe(true);
    expect(view?.x).toBe(8);
  });

  it('stops MAX blinking at once, from the pause', () => {
    const { gauge, word } = gaugeOn();
    gauge.setComfort({ flashes: false, motion: true });
    for (let frame = 0; frame < 60; frame++) {
      gauge.update(BOOST_MAX, null, frame);
      expect(word.alpha).toBe(1);
    }
  });
});
