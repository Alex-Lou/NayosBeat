import { describe, expect, it } from 'vitest';
import { NAYO as NAYO_ART } from '../../src/art/nayo';
import { GREYBOX_COLORS } from '../../src/render/greybox-stage';
import { luminanceDelta, over, relativeLuminance } from '../../src/render/luminance';
import { VEIL_DELTA } from '../../src/render/veils';
import { poseClipOf } from '../../src/art/types';
import { CROWD_JUMP, crowdFigures, crowdLift } from '../../src/render/crowd';
import { cardOffset, CUTOUT_ANGLES, cutoutLayout } from '../../src/render/finisher-card';
import {
  busOf,
  flatAlpha,
  NAYO_SCRIPT,
  POWER_CUT,
  powerCutOf,
  RIFF_SCRIPT,
  scriptOf,
  timelineOf,
} from '../../src/render/finisher-scripts';

/**
 * The pieces of the Finisher's scripts (docs/finisher.md §2, §3): its flat's coming and going,
 * Riff's cut-out card on its fixed angles, her crowd that jumps once, the poses' fallbacks.
 */

const MEASURE = { freeze: 22, flight: 23 } as const;

describe("the Finisher's scripts", () => {
  it('names each fighter’s: « Le Quatre » counts UN, DEUX, TROIS, « Larsen » does not', () => {
    expect(scriptOf('nayo')).toBe(NAYO_SCRIPT);
    expect(scriptOf('riff')).toBe(RIFF_SCRIPT);
    expect(NAYO_SCRIPT.count).toEqual(['UN', 'DEUX', 'TROIS']);
    expect([NAYO_SCRIPT.shake, RIFF_SCRIPT.shake]).toEqual(['x', 'y']);
    expect(RIFF_SCRIPT.card.rival?.text).toBe("T'AS RATÉ UN TEMPS.");
  });

  it('raises the flat in 8 frames with the lock (12 kept still), and lets it go in 12', () => {
    const timeline = timelineOf(NAYO_SCRIPT, 'full', MEASURE);
    expect(flatAlpha(NAYO_SCRIPT, null, 0, null, false)).toBeCloseTo(1 / 8, 5);
    expect(flatAlpha(NAYO_SCRIPT, null, 7, null, false)).toBe(1);
    expect(flatAlpha(NAYO_SCRIPT, null, 7, null, true)).toBeCloseTo(8 / 12, 5);
    // Nayo's leaves once the card is over, Riff's on her reprise.
    expect(flatAlpha(NAYO_SCRIPT, timeline, 200, timeline.end - 1, false)).toBe(1);
    expect(flatAlpha(NAYO_SCRIPT, timeline, 200, timeline.end + 12, false)).toBe(0);
    const riff = timelineOf(RIFF_SCRIPT, 'full', MEASURE);
    expect(flatAlpha(RIFF_SCRIPT, riff, 100, riff.release + 6, false)).toBeCloseTo(0.5, 5);
  });
});

describe("Nayo's brake (§2.3, §2.8)", () => {
  it('silences the bus as the victim flies, never before TROIS has sounded (its blow: 9 frames)', () => {
    const silentFrom = (version: 'full' | 'short', flight: number) => {
      const timeline = timelineOf(NAYO_SCRIPT, version, { freeze: 22, flight });
      let k = 0;
      while (busOf(NAYO_SCRIPT, timeline, k).gain > 0) k++;
      // Six frames of brake before it, the bus whole before them.
      expect(busOf(NAYO_SCRIPT, timeline, k - 6).gain).toBe(1);
      expect(busOf(NAYO_SCRIPT, timeline, k - 1).gain).toBeGreaterThan(0);
      return { k, flightFrom: timeline.flightFrom };
    };
    expect(silentFrom('full', 23)).toEqual({ k: 14, flightFrom: 14 });
    expect(silentFrom('short', 23)).toEqual({ k: 25, flightFrom: 25 });
    // Knocked out in the air, a longer flight: QUATRE a beat later, the silence still the flight.
    expect(silentFrom('full', 27)).toEqual({ k: 36, flightFrom: 36 });
    // Held 8 frames only: TROIS first, the victim flying as the brake ends.
    expect(silentFrom('full', 26)).toEqual({ k: 14, flightFrom: 8 });
  });
});

describe("Riff's power cut (§3.3)", () => {
  it('drops the stage to 40 % in 4 frames, one frame before her card ends: a fall only, never a flash', () => {
    const timeline = timelineOf(RIFF_SCRIPT, 'full', MEASURE);
    expect(powerCutOf(RIFF_SCRIPT, timeline, timeline.end - 2)).toBe(0);
    expect(powerCutOf(RIFF_SCRIPT, timeline, timeline.end - 1)).toBeCloseTo(POWER_CUT.dark / 4, 5);
    expect(powerCutOf(RIFF_SCRIPT, timeline, timeline.end + 2)).toBe(POWER_CUT.dark);
    expect(powerCutOf(NAYO_SCRIPT, timelineOf(NAYO_SCRIPT, 'full', MEASURE), 500)).toBe(0);
    // Black over the stage: down, and under ΔL 0.08 (−0.03 on the ground).
    for (const backdrop of GREYBOX_COLORS) {
      const dimmed = over(0x000000, backdrop, POWER_CUT.dark);
      expect(relativeLuminance(dimmed)).toBeLessThan(relativeLuminance(backdrop));
      expect(luminanceDelta(0x000000, backdrop, POWER_CUT.dark)).toBeLessThan(VEIL_DELTA);
    }
  });
});

describe("Riff's card and crowd (§3.5, §3.7)", () => {
  it('cuts each letter out on its own scrap, at the table’s angles in turn, a staple a word', () => {
    const { letters, width } = cutoutLayout('SUR MON TEMPS.');
    expect(letters.map((letter) => letter.char).join('')).toBe('SURMONTEMPS.');
    expect(letters.map((letter) => letter.angle)).toEqual(
      letters.map((_, i) => CUTOUT_ANGLES[i % CUTOUT_ANGLES.length]),
    );
    expect(letters.filter((letter) => letter.staple).map((letter) => letter.char)).toEqual([
      'S',
      'M',
      'T',
    ]);
    // Centered on its place, about 220 px of the world wide for the rival's words (§4.3).
    expect(letters[0]?.x).toBeCloseTo(-(letters.at(-1)?.x ?? 0), 5);
    expect(cutoutLayout("T'AS RATÉ UN TEMPS.").width).toBeLessThanOrEqual(240);
    expect(width).toBeGreaterThan(100);
  });

  it('comes in once and holds still: the neon glides 8 px, the paper claps, nothing kept still', () => {
    expect(cardOffset('neon', 0.25, false)).toBeGreaterThan(0);
    expect(cardOffset('neon', 1, false)).toBe(0);
    expect([0.25, 0.5, 0.75, 1].map((entered) => cardOffset('cutout', entered, false))).toEqual([
      -6, -3, 1, 0,
    ]);
    expect(cardOffset('cutout', 0.25, true)).toBe(0);
  });

  it('jumps the crowd once, all together: 6 px up in 4 frames, back down in 8', () => {
    const lifts = Array.from({ length: 14 }, (_, since) => crowdLift(since));
    expect(Math.max(...lifts)).toBe(CROWD_JUMP.height);
    expect(lifts.indexOf(CROWD_JUMP.height)).toBe(CROWD_JUMP.up - 1);
    expect(lifts.slice(CROWD_JUMP.up + CROWD_JUMP.down - 1)).toEqual([0, 0, 0]);
    expect(crowdLift(-1)).toBe(0);
    // The same crowd every time, two rows across the stage.
    expect(crowdFigures(640)).toEqual(crowdFigures(640));
    expect(new Set(crowdFigures(640).map((figure) => figure.head)).size).toBe(2);
  });
});

describe('the poses of the scene, until the planche `finale` (PR 4)', () => {
  it('falls back on the victory for a fighter without its own', () => {
    expect(NAYO_ART.clips.finale).toBeUndefined();
    expect(poseClipOf(NAYO_ART, 'finale')).toBe('victory');
    const drawn = { ...NAYO_ART, clips: { ...NAYO_ART.clips, finale: NAYO_ART.clips.intro } };
    expect(poseClipOf(drawn, 'finale')).toBe('finale');
  });
});
