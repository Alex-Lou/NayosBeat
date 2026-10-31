import { describe, expect, it, vi } from 'vitest';
import {
  FIVE_SECONDS,
  FLASH_MARGIN,
  FLASH_MERGE,
  FLASH_RULES,
  FlashBudget,
  FxGate,
  PLACE_STEP,
  SECOND,
  type FlashMode,
} from '../../src/render/flash-budget';

/** World px² that flash at any zoom of the fight (over every mode's area at ×1). */
const BIG = 3000;
/** World px² under every mode's area at the closest framing (×1.45). */
const SMALL = 400;
/** What a frame of front effects lights anew, whatever came before it. */
const anew = (area: number) => () => area;

/** A budget at the closest framing, `frames` steps of 1/60 s after the fight started. */
function budgetAt(mode: FlashMode, frames = 0): FlashBudget {
  const budget = new FlashBudget(mode);
  budget.setZoom(1.45);
  budget.advance(frames);
  return budget;
}

describe('the flash budget (docs/flashs.md §4)', () => {
  it('lets what stays under the area light up, without counting it', () => {
    const budget = budgetAt('normal');
    for (let i = 0; i < 20; i++) {
      expect(budget.request(SMALL)).toBe('lit');
      budget.advance(FLASH_MERGE + 1);
    }
    // Ordinary flashes still have both their slots.
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(FLASH_RULES.normal.gap);
    expect(budget.request(BIG)).toBe('lit');
  });

  it('keeps two ordinary flashes 21 frames apart at least (BT.1702-3)', () => {
    const budget = budgetAt('normal');
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(20);
    expect(budget.request(BIG)).toBe('muted');
    budget.advance(1);
    expect(budget.request(BIG)).toBe('lit');
  });

  it('keeps the third slot of a second for a climax, and refuses a fourth', () => {
    const budget = budgetAt('normal');
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(21);
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(21);
    expect(budget.request(BIG)).toBe('muted');
    expect(budget.request(BIG, true)).toBe('lit');
    budget.advance(FLASH_MERGE + 1);
    expect(budget.request(BIG, true)).toBe('muted');
    // A second after the first flash, its slot is free again.
    budget.advance(SECOND - 42 - FLASH_MERGE - 1);
    expect(budget.request(BIG, true)).toBe('lit');
  });

  it('lights what comes within 2 frames of a counted flash with it, uncounted', () => {
    const budget = budgetAt('normal');
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(FLASH_MERGE);
    expect(budget.request(BIG)).toBe('lit');
    // At +3, a new flash: a climax takes a slot, an ordinary one is too close.
    budget.advance(1);
    expect(budget.request(BIG)).toBe('muted');
    expect(budget.request(BIG, true)).toBe('lit');
    budget.advance(21);
    // Two counted (the first, the climax): one ordinary slot left this second.
    expect(budget.request(BIG)).toBe('muted');
  });

  it('adds up what lights within 2 frames: a trade asks for a slot', () => {
    const budget = budgetAt('normal');
    const half = Math.ceil(FLASH_RULES.normal.area / 1.45 ** 2 / 2);
    expect(budget.request(half)).toBe('lit');
    budget.advance(FLASH_MERGE);
    expect(budget.fits(half)).toBe(false);
    expect(budget.request(half)).toBe('lit');
    // That was a counted flash: the next ordinary one is 21 frames away.
    budget.advance(FLASH_MERGE + 1);
    expect(budget.request(BIG)).toBe('muted');
    // What lit 3 frames ago no longer adds up.
    expect(budget.fits(half)).toBe(true);
  });

  it('keeps what a muted piece shows, and what will show when it waits', () => {
    const budget = budgetAt('normal');
    const most = Math.floor((FLASH_RULES.normal.area * FLASH_MARGIN) / 1.45 ** 2) - 10;
    budget.show(most, 8);
    expect(budget.fits(20)).toBe(true);
    budget.advance(8);
    expect(budget.fits(20)).toBe(false);
    budget.advance(FLASH_MERGE + 1);
    expect(budget.fits(20)).toBe(true);
  });

  it('sees what waits to light within 2 frames after now: a spark just before a stamp', () => {
    const budget = budgetAt('off');
    budget.show(350, 16);
    budget.advance(16 - FLASH_MERGE - 1);
    expect(budget.fits(400)).toBe(true);
    for (let before = FLASH_MERGE; before >= 0; before--) {
      budget.advance(1);
      expect(budget.fits(400), `${before} frames before`).toBe(false);
      expect(budget.admit(400)).toBe(false);
    }
    // What lights 2 frames before a counted flash does not merge with it.
    const normal = budgetAt('normal');
    normal.show(1000, FLASH_MERGE);
    expect(normal.fits(1000)).toBe(false);
  });

  it('places a piece that waits where it fits, later by steps of 4, nowhere if it never does', () => {
    const budget = budgetAt('off');
    expect(budget.place(350, 8)).toBe(8);
    // A trade: the second word goes past the first, then its stamp past the first's.
    expect(budget.place(350, 8)).toBe(8 + PLACE_STEP);
    expect(budget.place(350, 16)).toBe(16);
    expect(budget.place(350, 16)).toBe(16 + PLACE_STEP);
    // Too big to fit even alone close up: never shown.
    expect(budget.place(600, 8)).toBe(null);
    // Kept where it was placed, for what asks after it.
    budget.advance(8 + PLACE_STEP);
    expect(budget.fits(300)).toBe(false);
  });

  it('lets what merges with a counted flash light, unless it adds up with what waits after', () => {
    const budget = budgetAt('normal');
    expect(budget.request(BIG)).toBe('lit');
    budget.show(1000, FLASH_MERGE + 2);
    budget.advance(FLASH_MERGE);
    // On the flash's last merging frame, this would make a second one with the piece that waits.
    expect(budget.request(1000)).toBe('muted');
    expect(budget.request(50)).toBe('lit');
  });

  it('counts what the screen shows: the same effect flashes close up, not from afar', () => {
    const area = 1500;
    const close = budgetAt('normal');
    expect(close.fits(area)).toBe(false);
    const wide = budgetAt('normal');
    wide.setZoom(1);
    expect(wide.fits(area)).toBe(true);
    // Beyond the closest framing of the game (a Finisher's ×2), smaller still.
    wide.setZoom(2);
    expect(wide.fits(FLASH_RULES.normal.area / 4)).toBe(false);
    expect(wide.toWorld(400)).toBe(100);
  });

  it('leaves the last of the 8 slots of 5 s to a climax', () => {
    const budget = budgetAt('normal');
    let lit = 0;
    for (let frame = 0; frame < FIVE_SECONDS - 30; frame += 30) {
      if (budget.request(BIG) === 'lit') lit++;
      budget.advance(30);
    }
    expect(lit).toBe(FLASH_RULES.normal.perFiveSeconds - 1);
    expect(budget.request(BIG, true)).toBe('lit');
    budget.advance(FLASH_MERGE + 1);
    expect(budget.request(BIG, true)).toBe('muted');
  });

  it('reduced: an ordinary flash and a climax a second, 4 in 5 s', () => {
    const budget = budgetAt('reduced');
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(30);
    expect(budget.request(BIG)).toBe('muted');
    expect(budget.request(BIG, true)).toBe('lit');
    budget.advance(FLASH_MERGE + 1);
    expect(budget.request(BIG, true)).toBe('muted');
    budget.advance(SECOND);
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(SECOND);
    // 3 counted in 5 s: the last for a climax.
    expect(budget.request(BIG)).toBe('muted');
    expect(budget.request(BIG, true)).toBe('lit');
    // Nayo's light spark at the closest framing stays under its area (a 27" screen at 50 cm).
    budget.advance(FLASH_MERGE + 1);
    expect(budget.fits(400)).toBe(true);
  });

  it('off: every flash is muted, and the effects play dark', () => {
    const budget = budgetAt('off');
    expect(budget.request(BIG, true)).toBe('muted');
    expect(budget.request(SMALL)).toBe('lit');
    expect(new FxGate().show(budget, 'super', 0, 0, anew(0))).toBe(true);
  });

  it('follows a new mode at once, the flashes already counted still counting', () => {
    const budget = budgetAt('normal');
    expect(budget.request(BIG)).toBe('lit');
    budget.setMode('reduced');
    budget.advance(30);
    expect(budget.mode).toBe('reduced');
    expect(budget.request(BIG)).toBe('muted');
    expect(budget.request(BIG, true)).toBe('lit');
  });

  it('runs on the visual clock: a catch-up of 5 frames is 5 frames', () => {
    const budget = budgetAt('normal');
    expect(budget.request(BIG)).toBe('lit');
    budget.advance(5);
    budget.advance(5);
    budget.advance(10);
    expect(budget.request(BIG)).toBe('muted');
    budget.advance(1);
    expect(budget.request(BIG)).toBe('lit');
  });

  it('never shows more than its flashes, on 2 000 random streams (what is shown, muted too)', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const limits = { normal: [3, 8], reduced: [2, 4], off: [0, 0] } as const;
    for (const mode of ['normal', 'reduced', 'off'] as const) {
      let worst = [0, 0];
      for (let run = 0; run < 2000 / 3; run++) {
        const budget = budgetAt(mode);
        // What each frame lights, as the screen shows it: what is lit at once, the muted looks,
        // and what waits (a muted blow's word, its stamp) on the frame it shows.
        const shown = new Map<number, number>();
        const light = (frame: number, area: number) => {
          if (area > 0) shown.set(frame, (shown.get(frame) ?? 0) + area);
        };
        let now = 0;
        for (let ask = 0; ask < 400; ask++) {
          const step = Math.floor(random() * 14);
          budget.advance(step);
          now += step;
          const area = random() < 0.6 ? 1300 + random() * 3000 : random() * 600;
          const muted = random() * 600;
          const later = [random() * 500, random() < 0.3 ? random() * 500 : 0] as const;
          if (budget.request(area, random() < 0.1) === 'lit') {
            light(now, area);
            continue;
          }
          if (budget.admit(muted)) light(now, muted);
          const word = budget.place(later[0], 8);
          if (word !== null) light(now + word, later[0]);
          const stamp = budget.place(later[1], (word ?? 8) + 8);
          if (stamp !== null) light(now + stamp, later[1]);
        }
        // The flashes seen: something lit where the last 3 frames add up over the area, not
        // within 2 frames of the last one.
        const flashes: number[] = [];
        for (let frame = 0; frame <= now + 40; frame++) {
          if (!shown.has(frame)) continue;
          let sum = 0;
          for (let back = 0; back <= FLASH_MERGE; back++) sum += shown.get(frame - back) ?? 0;
          const last = flashes[flashes.length - 1];
          const flashing = sum * 1.45 ** 2 >= FLASH_RULES[mode].area;
          if (flashing && (last === undefined || frame - last > FLASH_MERGE)) flashes.push(frame);
        }
        const most = (window: number) =>
          Math.max(
            0,
            ...flashes.map((at) => flashes.filter((t) => t >= at && t < at + window).length),
          );
        worst = [
          Math.max(worst[0] ?? 0, most(SECOND)),
          Math.max(worst[1] ?? 0, most(FIVE_SECONDS)),
        ];
      }
      expect(worst, mode).toEqual(limits[mode]);
    }
  });
});

describe('the look of a clip of front effects (docs/flashs.md §4)', () => {
  it('stays lit under the area, darkens from the frame that would flash to the clip end', () => {
    const budget = budgetAt('normal');
    const gate = new FxGate();
    expect(gate.show(budget, 'super', 0, 0, anew(SMALL))).toBe(false);
    budget.request(BIG);
    budget.advance(5);
    expect(gate.show(budget, 'super', 1, 1, anew(BIG))).toBe(true);
    budget.advance(30);
    // The slot free again, it stays dark: never lit again within the clip.
    expect(gate.show(budget, 'super', 2, 2, anew(SMALL))).toBe(true);
    // A new clip (another strip, or the same one from its start) starts lit.
    expect(gate.show(budget, 'super', 0, 0, anew(SMALL))).toBe(false);
    expect(gate.show(budget, null, 0, 0, anew(0))).toBe(false);
  });

  it('asks once per frame shown, and takes a slot for a bright one', () => {
    const budget = budgetAt('normal');
    const gate = new FxGate();
    expect(gate.show(budget, 'super', 0, 3, anew(BIG))).toBe(false);
    // The same frame held: no new ask, and the flash it counted stays one.
    budget.advance(FLASH_MERGE + 1);
    expect(gate.show(budget, 'super', 1, 3, anew(BIG))).toBe(false);
    expect(budget.request(BIG)).toBe('muted');
  });

  it('asks a new frame for what it lights over the one before: a bright frame held stays lit', () => {
    const budget = budgetAt('normal');
    const gate = new FxGate();
    // A bright frame takes a slot; the next, as bright, lights little that was not lit already.
    const lights = (from: number) => (from < 0 ? BIG : SMALL);
    expect(gate.show(budget, 'uppercut', 0, 1, lights)).toBe(false);
    budget.advance(19);
    const asked = vi.fn(lights);
    expect(gate.show(budget, 'uppercut', 1, 2, asked)).toBe(false);
    expect(asked).toHaveBeenCalledWith(1);
    // All of it, as a new clip would, would not fit 19 frames after the flash: dark.
    expect(new FxGate().show(budget, 'other', 0, 2, lights)).toBe(true);
  });
});
