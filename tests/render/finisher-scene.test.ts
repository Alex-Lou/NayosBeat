import { describe, expect, it, vi } from 'vitest';
import { NAYO as NAYO_ART } from '../../src/art/nayo';
import { RIFF as RIFF_ART } from '../../src/art/riff';
import { ART_SCALE, cellOf } from '../../src/art/types';
import { toPx } from '../../src/core/constants';
import { Input, type InputBits } from '../../src/core/input';
import { MATCH_END_FRAMES, ROUND_END_FRAMES } from '../../src/core/rules';
import type { GameState } from '../../src/core/state';
import { PlayerInputs } from '../../src/input/player-inputs';
import { FINISHER_CLOSE_UP } from '../../src/render/camera-framing';
import { ANIM_OPTIONS } from '../../src/render/anim-options';
import { FightMemory } from '../../src/render/fight-memory';
import { FinisherProps } from '../../src/render/finisher-props';
import {
  measureFlight,
  playToResults,
  SKIP_FRAMES,
  SKIP_TO_CARD_END,
  VICTORY_FRAMES,
} from '../../src/render/finisher-scene';
import {
  NAYO_SCRIPT,
  RIFF_SCRIPT,
  ticksAfterKo,
  timelineOf,
  versionOf,
} from '../../src/render/finisher-scripts';
import { GROUND_Y } from '../../src/render/greybox-stage';
import { hitShakeOf } from '../../src/render/hit-shake';
import { FLASH_DELTA, luminanceDelta } from '../../src/render/luminance';
import { VIEW_SIZE } from '../../src/render/view';
import {
  armed,
  film,
  LARSEN,
  LE_QUATRE,
  type Film,
  type Route,
  type Shot,
} from './finisher-harness';

/**
 * The Finisher's scene, its contract (docs/finisher.md §1.14, §2.3, §3.3, §5.8 test 14), on the
 * real core through the real director: its durations, each tick held exactly 1, 2 or 3 frames,
 * the landings at t0 + 60 and t0 + 45, the card in 4 / 60 / 8, the victim in the frame at ×2, the
 * skip counted in frames and only after the KO, the fast-forward to the match's end, and
 * `dispose()` handing the fight's bus back whole. t: frames since back + BOOST came out.
 */

const FULL = { comfort: { staging: 'full' } } as const;
const SHORT = { comfort: { staging: 'short' } } as const;

/** The frames (t ≥ 0) the winner's card shows on. */
function cardShots(played: Film): Shot[] {
  return played.shots.filter((shot) => shot.card.visible && shot.t >= 0);
}

/** The frame (t) the scene asks for its landing on: the release, QUATRE or the reprise. */
function releaseOf(played: Film): number | undefined {
  return played.shots.find((shot) => shot.landings.length > 0)?.t;
}

/** The frame (t) player 2, the victim, lands on after the KO. */
function touchdownOf(played: Film): number | undefined {
  const { shots } = played;
  return shots.find((shot, i) => {
    const before = shots[i - 1]?.state.fighters[1].y ?? 0;
    return shot.t > played.ko && before > 0 && shot.state.fighters[1].y === 0;
  })?.t;
}

/** The shots from `from` to `to` (t), included. */
function between(played: Film, from: number, to: number): Shot[] {
  return played.shots.filter((shot) => shot.t >= from && shot.t <= to);
}

describe("the scene's timeline on the core (§2.3, §2.9, §3.3, §3.9)", () => {
  it('Le Quatre in full: UN, DEUX on quarter notes, TROIS at 82, QUATRE at t0 + 60, the card 172 to 243, the results at 304', () => {
    const played = film(LE_QUATRE, FULL);
    expect(played.ko).toBe(82);
    expect(releaseOf(played)).toBe(82 + 60);
    expect(touchdownOf(played)).toBe(142);
    const card = cardShots(played);
    expect([card[0]?.t, card.at(-1)?.t, card.length]).toEqual([172, 243, 4 + 60 + 8]);
    expect(played.results).toBe(304);
  });

  it('Larsen in full: the KO at 48, the reprise at t0 + 45, the victim down at 150, the card 123 to 194, the results at 255', () => {
    const played = film(LARSEN, FULL);
    // Against Nayo, her rival's words.
    expect(cardShots(played)[0]?.card.words).toContain("T'ASRATÉUNTEMPS.");
    expect(played.ko).toBe(48);
    expect(releaseOf(played)).toBe(48 + 45);
    expect(touchdownOf(played)).toBe(150);
    const card = cardShots(played);
    expect([card[0]?.t, card.at(-1)?.t, card.length]).toEqual([123, 194, 72]);
    expect(played.results).toBe(255);
  });

  it('plays short: the natural count, the landing at t0 + 48, Riff without L’Ange, a card of 4 + 36 + 8 at R + 12', () => {
    const nayo = film(LE_QUATRE, SHORT);
    expect(nayo.ko).toBe(54);
    expect(releaseOf(nayo)).toBe(54 + 48);
    expect(cardShots(nayo).map((shot) => shot.t)).toEqual(range(102 + 12, 48));
    // 162 frames from the press to the card's end, then the winner's pose.
    expect(nayo.results).toBe(162 + VICTORY_FRAMES);
    const riff = film(LARSEN, SHORT);
    expect(riff.ko).toBe(48);
    expect(releaseOf(riff)).toBe(93);
    expect(touchdownOf(riff)).toBe(93 + 19);
    expect(cardShots(riff).map((shot) => shot.t)).toEqual(range(93 + 12, 48));
    expect(riff.results).toBe(153 + VICTORY_FRAMES);
  });

  it('brings the card in over 4 frames, holds it still, takes it out over 8', () => {
    for (const [played, still] of [
      [film(LE_QUATRE, FULL), 60],
      [film(LARSEN, SHORT), 36],
    ] as const) {
      const card = cardShots(played);
      const rest = card[4]?.card.y;
      // Coming in: moving; then not a pixel, fully there; then fading out.
      expect(card.slice(0, 3).every((shot) => shot.card.y !== rest)).toBe(true);
      expect(card.slice(4, 4 + still).every((shot) => shot.card.y === rest)).toBe(true);
      expect(card.slice(0, 4 + still).every((shot) => shot.card.alpha === 1)).toBe(true);
      const leaving = card.slice(4 + still).map((shot) => shot.card.alpha);
      expect(leaving).toHaveLength(8);
      expect(leaving.every((alpha, i) => alpha < (leaving[i - 1] ?? 1.01))).toBe(true);
    }
  });

  it('speaks alone in the place of « K.O. »: the stamps on screen fade out as it comes (P10)', () => {
    for (const played of [film(LE_QUATRE, FULL), film(LARSEN, SHORT)]) {
      const first = cardShots(played)[0];
      const hushed = played.shots.find((shot) => shot.hushes > 0);
      expect(hushed?.t).toBe(first?.t);
      expect(played.shots.at(-1)?.hushes).toBe(1);
    }
  });
});

describe('the track: whole ticks, each held 1, 2 or 3 frames (§1.14, D23)', () => {
  for (const [route, version, pace] of [
    [LE_QUATRE, FULL, 2],
    [LE_QUATRE, SHORT, 1],
    [LARSEN, FULL, 3],
    [LARSEN, SHORT, 1],
  ] as const) {
    it(`${route.name}, ${version.comfort.staging}: the victim flies one tick every ${pace} frames`, () => {
      const played = film(route, version);
      const flying = played.shots.filter(
        (shot) => shot.t > played.ko && shot.state.fighters[1].y > 0,
      );
      const ticking = flying.filter((shot) => shot.ticks > 0);
      expect(ticking.every((shot) => shot.ticks === 1)).toBe(true);
      const gaps = ticking.slice(1).map((shot, i) => shot.t - (ticking[i]?.t ?? 0));
      expect(new Set(gaps)).toEqual(new Set([pace]));
    });
  }

  it('plays several ticks a frame only through the core’s freeze, which shows nothing that moves', () => {
    for (const route of [LE_QUATRE, LARSEN]) {
      const played = film(route, FULL);
      const after = played.shots.filter((shot) => shot.t > played.ko);
      for (const [i, shot] of after.entries()) {
        expect(shot.ticks).toBeLessThanOrEqual(5);
        if (shot.ticks <= 1) continue;
        // Frozen before and after: neither place nor frame moved.
        const before = after[i - 1] ?? played.shots.find((each) => each.t === played.ko);
        expect(before?.state.hitstop).toBeGreaterThanOrEqual(shot.ticks);
        expect(shot.state.fighters.map((f) => [f.x, f.y, f.actionFrame])).toEqual(
          before?.state.fighters.map((f) => [f.x, f.y, f.actionFrame]),
        );
      }
      // Before its KO, the lock plays a tick a frame, or holds the image.
      const locked = played.shots.filter((shot) => shot.t >= 0 && shot.t < played.ko);
      expect(locked.every((shot) => shot.ticks <= 1)).toBe(true);
    }
  });

  it('stretches Nayo’s count on quarter notes: 14 frames held after UN and DEUX, none for Riff', () => {
    const nayo = film(LE_QUATRE, FULL);
    expect(between(nayo, 23, 36).every((shot) => shot.ticks === 0)).toBe(true);
    expect(between(nayo, 53, 66).every((shot) => shot.ticks === 0)).toBe(true);
    expect(between(nayo, 37, 52).every((shot) => shot.ticks === 1)).toBe(true);
    const riff = film(LARSEN, FULL);
    expect(between(riff, 0, riff.ko).every((shot) => shot.ticks === 1)).toBe(true);
  });

  it('lands on the beat: QUATRE waits for the next one when the victim flies longer (§2.3)', () => {
    const full = (flight: number) => timelineOf(NAYO_SCRIPT, 'full', { freeze: 22, flight });
    expect(full(23).release).toBe(60);
    // A victim knocked out in the air: 60 − 2 × 27 leaves less than 8 frames held.
    expect(full(27).release).toBe(90);
    const short = (flight: number) => timelineOf(NAYO_SCRIPT, 'short', { freeze: 22, flight });
    expect(short(23).release).toBe(48);
    expect(short(41).release).toBe(64);
    // Riff's reprise stays on her offbeat; the flight follows it.
    expect(timelineOf(RIFF_SCRIPT, 'full', { freeze: 22, flight: 30 }).release).toBe(45);
    // Whatever the flight, the freeze is played before it, five ticks a frame at most.
    for (const flight of [0, 23, 27, 41]) {
      const timeline = full(flight);
      let played = 0;
      for (let k = 1; k <= timeline.flightFrom; k++) played += ticksAfterKo(timeline, k);
      expect(played).toBe(22);
    }
  });

  it('measures the flight ahead on a copy of the core: 23 ticks for Riff, 19 for Nayo (§2.3, §3.3)', () => {
    for (const [route, flight] of [
      [LE_QUATRE, 23],
      [LARSEN, 19],
    ] as const) {
      const { config } = armed(route);
      expect(measureFlight(koStateOf(route), 0, config)).toEqual({ freeze: 22, flight });
    }
  });
});

describe('the close up (§1.14, §2.4, §3.4)', () => {
  it('closes in to ×2 only while locked and after the KO, holds it, then opens to ×1 in 30 frames', () => {
    for (const [route, from] of [
      [LE_QUATRE, 76],
      [LARSEN, 48],
    ] as const) {
      const played = film(route, FULL);
      const release = releaseOf(played) ?? Number.NaN;
      expect(played.shots.find((shot) => shot.staged !== null)?.t).toBe(from);
      expect(played.shots.filter((shot) => shot.t < from).every((s) => s.staged === null)).toBe(
        true,
      );
      const held = between(played, from + 8, release);
      expect(held.every((shot) => Math.abs(shot.closeUp - FINISHER_CLOSE_UP) < 0.01)).toBe(true);
      expect(between(played, release + 30, release + 30)[0]?.closeUp).toBeCloseTo(1, 5);
    }
  });

  it('keeps the victim in the frame at the top of its flight, under the HUD (33 px, 23 px)', () => {
    for (const [route, art] of [
      [LE_QUATRE, RIFF_ART],
      [LARSEN, NAYO_ART],
    ] as const) {
      const played = film(route, FULL);
      // Nayo's victim tops out at ×2, Riff's as the camera opens again after her reprise.
      const flying = played.shots.filter((shot) => shot.t > played.ko && shot.t < played.ko + 120);
      const top = flying.reduce((best, shot) =>
        shot.state.fighters[1].y > best.state.fighters[1].y ? shot : best,
      );
      const victim = top.state.fighters[1];
      // Its drawing at most as high as its knocked-out strip draws, the HUD's 15 px over the view.
      const height = cellOf(art, 'ko').anchor.y / ART_SCALE;
      const head = GROUND_Y - toPx(victim.y) - height;
      expect(toPx(victim.y)).toBeGreaterThan(20);
      if (route === LE_QUATRE) expect(top.closeUp).toBe(FINISHER_CLOSE_UP);
      expect(head).toBeGreaterThan(top.top + 15 / top.closeUp);
      const width = VIEW_SIZE.width / top.closeUp;
      expect(toPx(victim.x)).toBeGreaterThan(top.left + 20);
      expect(toPx(victim.x)).toBeLessThan(top.left + width - 20);
    }
  });

  it('never zooms with the screen kept still (« Tremblement » off, reduced motion)', () => {
    const played = film(LE_QUATRE, { comfort: { staging: 'full', shake: 'off' } });
    expect(played.shots.every((shot) => shot.staged === null)).toBe(true);
    expect(played.shots.every((shot) => shot.closeUp <= 1.45 + 1e-9)).toBe(true);
    // Nor do Riff's studs fly (§4.5: « ni zoom, ni secousse, ni éclats »); they do otherwise.
    const burst = vi.spyOn(FinisherProps.prototype, 'burst');
    film(LARSEN, { comfort: { staging: 'full', shake: 'off' } });
    expect(burst).not.toHaveBeenCalled();
    film(LARSEN, { comfort: { staging: 'full', shake: 'normal' } });
    expect(burst).toHaveBeenCalledTimes(1);
    burst.mockRestore();
  });
});

describe('the skip (§1.14): a button held 15 frames, after the KO only', () => {
  const holding = (from: number, frames: number) => (t: number) =>
    (t >= from && t < from + frames ? [Input.Light, 0] : [0, 0]) as readonly [InputBits, InputBits];

  it('does nothing before the KO: the count lasts as long', () => {
    const played = film(LE_QUATRE, { ...FULL, held: holding(0, 82) });
    expect(played.ko).toBe(82);
    expect(played.results).toBe(304);
  });

  it('counts no button held since before the KO until it is let go (a thumb left on BOOST)', () => {
    expect(film(LE_QUATRE, { ...FULL, held: holding(0, 82 + SKIP_FRAMES + 5) }).results).toBe(304);
    expect(film(LARSEN, { ...FULL, held: holding(0, 48 + SKIP_FRAMES + 5) }).results).toBe(255);
    // Let go after the KO, then held anew: it skips, as a hold from the KO would.
    const again = (t: number) =>
      (t < 82 + 3 || (t >= 82 + 5 && t < 82 + 5 + SKIP_FRAMES)
        ? [Input.Boost, 0]
        : [0, 0]) as readonly [InputBits, InputBits];
    const fresh = film(LE_QUATRE, { ...FULL, held: holding(82 + 5, SKIP_FRAMES) }).results;
    expect(film(LE_QUATRE, { ...FULL, held: again }).results).toBe(fresh);
    expect(fresh).toBe(82 + 5 + SKIP_FRAMES + SKIP_TO_CARD_END + VICTORY_FRAMES);
    // A new button over the one held since before: it counts.
    const over = (t: number): InputBits =>
      (t < 200 ? Input.Boost : 0) | (t >= 90 && t < 90 + SKIP_FRAMES ? Input.Light : 0);
    expect(film(LE_QUATRE, { ...FULL, held: (t) => [over(t), 0] }).results).toBe(
      film(LE_QUATRE, { ...FULL, held: holding(90, SKIP_FRAMES) }).results,
    );
  });

  it('takes no tap for a hold: J tapped once through Riff’s held image skips nothing', () => {
    // On the real devices, read as FightScene reads them: on the frames that play a tick, while
    // what is held is read on every frame. From KO + 6 to the reprise, no tick reads them.
    const keyed = (route: Route, down: number, up: number): Film => {
      const target = new EventTarget();
      const inputs = new PlayerInputs(target as unknown as Window, undefined, []);
      const key = (type: string) =>
        target.dispatchEvent(
          Object.assign(new Event(type, { cancelable: true }), { code: 'KeyJ' }),
        );
      let read = false;
      const played = film(route, {
        ...FULL,
        onFrame: () => {
          read = false;
        },
        onTick: () => {
          if (!read) inputs.read([]);
          read = true;
        },
        held: (t) => {
          // Between the frame before and this one.
          if (t === down) key('keydown');
          if (t === up) key('keyup');
          return inputs.held([]);
        },
      });
      inputs.dispose();
      return played;
    };
    // Pressed and released between two frames, at KO + 8.
    expect(keyed(LARSEN, 48 + 8, 48 + 8).results).toBe(255);
    // Held 14 frames: nothing; 15: the skip, as the hold of any frame.
    expect(keyed(LARSEN, 48 + 8, 48 + 8 + SKIP_FRAMES - 1).results).toBe(255);
    expect(keyed(LARSEN, 48 + 8, 48 + 8 + SKIP_FRAMES).results).toBe(
      film(LARSEN, { ...FULL, held: holding(48 + 8, SKIP_FRAMES) }).results,
    );
    expect(keyed(LE_QUATRE, 82 + 8, 82 + 8).results).toBe(304);
  });

  it('counts frames: 14 do nothing, the 15th goes to the card’s last 20 frames, then on', () => {
    const almost = film(LE_QUATRE, { ...FULL, held: holding(90, SKIP_FRAMES - 1) });
    expect(almost.results).toBe(304);
    const skipped = film(LE_QUATRE, { ...FULL, held: holding(90, SKIP_FRAMES) });
    const at = 90 + SKIP_FRAMES - 1;
    // From the frame after the skip, the card's last 20 frames, the fast-forward, then the pose.
    expect(skipped.results).toBe(at + 1 + SKIP_TO_CARD_END + VICTORY_FRAMES);
    // The card it jumped into shows its words.
    const card = skipped.shots.filter((shot) => shot.card.visible && shot.t > at);
    expect(card).toHaveLength(SKIP_TO_CARD_END);
    expect(card.every((shot) => shot.card.words.includes('QUATRE.'))).toBe(true);
    // The landing it jumped over still breaks the HUD, without its burst.
    const landing = skipped.shots.find((shot) => shot.landings.length > 0);
    expect(landing?.t).toBe(at);
    expect(landing?.landings[0]?.[4]).toEqual({ quiet: true, dust: true });
    // The match still ends where it should: every tick played, seen or not.
    expect(skipped.ticksAfterKo).toBe(22 + ROUND_END_FRAMES + MATCH_END_FRAMES + VICTORY_FRAMES);
  });
});

describe('the match’s end (§1.10)', () => {
  it('fast-forwards from the card to the results: 292 ticks after the KO, then the pose', () => {
    for (const route of [LE_QUATRE, LARSEN]) {
      const played = film(route, FULL);
      expect(played.ticksAfterKo).toBe(22 + ROUND_END_FRAMES + MATCH_END_FRAMES + VICTORY_FRAMES);
      // The results wait for the scene, then for the winner's pose.
      const last = played.shots.at(-1);
      expect(last?.holds).toBe(false);
      expect(played.shots.at(-2)?.holds).toBe(true);
    }
  });

  it('plays the match on unseen with nothing pressed: no event, the same end as the core’s', () => {
    const { config } = armed(LARSEN);
    const ko = koStateOf(LARSEN);
    const end = playToResults(ko, config);
    expect([end.round.phase, end.round.phaseFrame]).toEqual(['matchEnd', MATCH_END_FRAMES]);
    expect(end.frame - ko.frame).toBe(22 + ROUND_END_FRAMES + MATCH_END_FRAMES);
    expect(playToResults(end, config)).toBe(end);
  });
});

describe('the fight’s bus (§1.14, §2.8, §3.8)', () => {
  it('Nayo: the brake silences it after TROIS, QUATRE brings it back, the headphones close over the card', () => {
    const played = film(LE_QUATRE, FULL);
    const at = (t: number) => between(played, t, t)[0]?.bus;
    // TROIS sounds whole (its blow: 140 ms), then the brake: silent as the victim flies (§2.3).
    expect(at(82)?.gain).toBe(1);
    expect(at(82 + 8)?.gain).toBe(1);
    expect(at(82 + 13)?.gain).toBeGreaterThan(0);
    expect(at(82 + 14)?.gain).toBe(0);
    expect(at(141)?.gain).toBe(0);
    expect(at(142)?.gain).toBe(1);
    expect(at(172)?.cutoff).toBeCloseTo(8000, 0);
    expect(at(192)?.cutoff).toBeCloseTo(400, 0);
    // Short, its impact held longer: the silence is still the flight (t0 + 25 to t0 + 48).
    const short = film(LE_QUATRE, SHORT);
    const shortAt = (t: number) => between(short, t, t)[0]?.bus;
    expect(shortAt(54 + 19)?.gain).toBe(1);
    expect(shortAt(54 + 24)?.gain).toBeGreaterThan(0);
    expect(shortAt(54 + 25)?.gain).toBe(0);
    expect(shortAt(54 + 47)?.gain).toBe(0);
    expect(shortAt(54 + 48)?.gain).toBe(1);
  });

  it('Riff: the needle cuts it on the frame after it skips, the reprise brings it back', () => {
    const played = film(LARSEN, FULL);
    const at = (t: number) => between(played, t, t)[0]?.bus;
    expect(at(48 + 18)?.gain).toBe(1);
    expect(at(48 + 19)?.gain).toBe(0);
    // The needle plays on the master, past the cut: heard whole, as its second skip.
    expect(between(played, 48 + 18, 48 + 18)[0]?.sounds).toContain('rewind');
    const needles = played.sfx.play.mock.calls.filter(([name]) => name === 'rewind');
    expect(needles).toEqual([
      ['rewind', 1, 'master'],
      ['rewind', 1, 'master'],
    ]);
    expect(at(92)?.gain).toBe(0);
    expect(at(93)?.gain).toBe(1);
    expect(at(150)?.cutoff).toBe(20000);
  });

  it('hands the bus back whole and lets go of everything on dispose, mid-scene too', () => {
    const played = film(LE_QUATRE, { ...FULL, until: 100 });
    const { director, sfx, textures } = played;
    expect(director.isActive()).toBe(true);
    expect(played.shots.at(-1)?.bus?.gain).toBe(0);
    // The needle's texture (WebGL), made with the props.
    expect(textures.keys()).toEqual(['finisher:needle']);
    director.dispose();
    expect(sfx.resetFightBus).toHaveBeenCalled();
    expect(director.isActive()).toBe(false);
    expect(director.camera).toBeNull();
    expect([director.lookOf(0).silhouette, director.lookOf(1).silhouette]).toEqual([0, 0]);
    expect(textures.keys()).toEqual([]);
  });
});

describe('the fighters through the scene', () => {
  it('turns both into silhouettes on the KO, outlines the winner alone, gives them back after the release', () => {
    const played = film(LE_QUATRE, FULL);
    const at = (t: number) => between(played, t, t)[0];
    expect(at(81)?.looks.map((look) => look.silhouette)).toEqual([0, 0]);
    expect(at(82 + 5)?.looks.map((look) => look.silhouette)).toEqual([1, 1]);
    expect(at(90)?.looks[0].outline).toBe(0x30e8ff);
    expect(at(90)?.looks[1].outline).toBeNull();
    expect(at(142 + 12)?.looks.map((look) => look.silhouette)).toEqual([0, 0]);
    // From QUATRE, its pose moving, the outline leaves in a tone that never flashes over the flat.
    const flat = NAYO_SCRIPT.flats.main;
    const calm = at(142)?.looks[0].outline ?? 0x30e8ff;
    expect(luminanceDelta(calm, flat, 1)).toBeLessThan(FLASH_DELTA);
    expect(at(141)?.looks[0].outline).toBe(0x30e8ff);
    // With the flashes off, none: its return to color would flash.
    const off = film(LE_QUATRE, { comfort: { staging: 'full', flashes: 'off' } });
    expect(off.shots.every((shot) => shot.looks[0].silhouette === 0)).toBe(true);
  });

  it('holds Nayo on his third blow through the silence, then rises on QUATRE, then his pose', () => {
    const played = film(LE_QUATRE, FULL);
    const pose = (t: number) => between(played, t, t)[0]?.looks[0].pose;
    expect(pose(100)).toEqual({ clip: 'super', tick: 14, lift: 0 });
    expect(pose(141)).toEqual({ clip: 'super', tick: 14, lift: 0 });
    expect(pose(142)).toEqual({ clip: 'super', tick: 17, lift: 0 });
    // Without its planche `finale` yet (PR 4), its victory.
    expect(pose(172)).toEqual({ clip: 'victory', tick: 0, lift: 0 });
    expect(played.shots.every((shot) => shot.looks[1].pose === null)).toBe(true);
  });

  it('bounces Riff up 28 px off the chest on the reprise, then down with the victim', () => {
    const played = film(LARSEN, FULL);
    const pose = (t: number) => between(played, t, t)[0]?.looks[0].pose;
    expect(pose(92)?.clip).toBe('super');
    expect(pose(93)?.clip).toBe('jump');
    expect(pose(93 + 11)?.lift).toBeCloseTo(28, 5);
    expect(pose(93 + 15)?.lift).toBe(28);
    expect(pose(149)?.clip).toBe('landing');
    expect(pose(150)).toEqual({ clip: 'victory', tick: 0, lift: 0 });
  });

  it('never makes the victim tremble while locked, nor through its KO’s freeze (§1.14)', () => {
    const memory = new FightMemory();
    const context = { options: ANIM_OPTIONS, memory };
    let trembled = 0;
    film(LE_QUATRE, {
      ...FULL,
      onTick: (_previous: GameState, next: GameState, events) => {
        memory.note(next, events);
        if (hitShakeOf(next, 1, context, 'normal') !== 0) trembled++;
      },
      until: 100,
    });
    // Its L, L, H, H before the lock still tremble; nothing after.
    let after = 0;
    film(LE_QUATRE, {
      ...FULL,
      onTick: (previous, next, events) => {
        memory.note(next, events);
        const locked = previous.fighters[0].move === 'super';
        if (locked && hitShakeOf(next, 1, context, 'normal') !== 0) after++;
      },
      until: 100,
    });
    expect(trembled).toBeGreaterThan(0);
    expect(after).toBe(0);
  });
});

describe('which version plays (§1.14)', () => {
  it('plays in full the first time, short the second time in the session, with the option, and in training', () => {
    expect(versionOf('full', false, false)).toBe('full');
    expect(versionOf('full', false, true)).toBe('short');
    expect(versionOf('short', false, false)).toBe('short');
    expect(versionOf('full', true, false)).toBe('short');
    const seen = new Set<'nayo' | 'riff'>();
    expect(film(LE_QUATRE, { ...FULL, seen }).ko).toBe(82);
    expect(seen.has('nayo')).toBe(true);
    expect(film(LE_QUATRE, { ...FULL, seen }).ko).toBe(54);
    // Riff's first is still whole.
    expect(film(LARSEN, { ...FULL, seen }).results).toBe(255);
  });

  it('plays short in training, on the dummy kept at 1 HP, and lets the fight go on after it', () => {
    const played = film(LE_QUATRE, { ...FULL, training: true });
    expect(played.ko).toBe(54);
    expect(releaseOf(played)).toBe(102);
    const last = played.shots.at(-1);
    expect(last?.state.fighters[1].health).toBeGreaterThan(0);
    expect(last?.holds).toBe(false);
    expect(played.sfx.resetFightBus).toHaveBeenCalled();
    expect(played.director.seizesInputs()).toBe(false);
  });

  it('in training, nobody plays while the scene is on: the same fight, whatever player 1 holds (§1.12, §4.4)', () => {
    // Its super over long before the card (KO + 58 for Nayo, + 75 for Riff), player 1 would walk,
    // jump or strike under the scene's pose, its close up and its shake.
    const bodies = (played: Film) =>
      played.shots
        .filter((shot) => shot.holds)
        .map((shot) => shot.state.fighters.map((f) => [f.x, f.y, f.action, f.move, f.actionFrame]));
    for (const route of [LE_QUATRE, LARSEN]) {
      const alone = bodies(film(route, { ...FULL, training: true }));
      expect(alone.length).toBeGreaterThan(100);
      for (const presses of [Input.Left, Input.Up, Input.Light]) {
        expect(bodies(film(route, { ...FULL, training: true, presses: () => presses }))).toEqual(
          alone,
        );
      }
    }
  });

  it('lets the dummy’s own landing sound its fall in training: the scene’s does not double it', () => {
    const sounds = (played: Film, t: number) => between(played, t, t)[0]?.sounds;
    expect(sounds(film(LE_QUATRE, SHORT), 102)).toContain('fall');
    const training = film(LE_QUATRE, { ...FULL, training: true });
    expect(touchdownOf(training)).toBe(102);
    expect(sounds(training, 102)).not.toContain('fall');
    expect(sounds(training, 102)).toContain('round');
    // Riff's reprise comes before the dummy lands: its own stays.
    expect(sounds(film(LARSEN, { ...FULL, training: true }), 93)).toContain('fall');
  });
});

/** The state on the tick `route`'s Finisher lands its KO (from its armed start). */
function koStateOf(route: Route): GameState {
  let ko = null as GameState | null;
  film(route, {
    ...FULL,
    onTick: (_previous, next, events) => {
      if (ko === null && events.some((event) => event.type === 'finisherBlow')) ko = next;
    },
    until: 90,
  });
  if (!ko) throw new Error('No KO');
  return ko;
}

/** `count` frames from `from`. */
function range(from: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => from + i);
}
