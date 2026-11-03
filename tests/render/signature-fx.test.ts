import { describe, expect, it, vi } from 'vitest';
import type { MatchConfig } from '../../src/core/config';
import { Input, type InputBits } from '../../src/core/input';
import type { GameState } from '../../src/core/state';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import { SIGNATURE_AREAS, type SignatureCue } from '../../src/render/flash-areas';
import type { FlashBudget } from '../../src/render/flash-budget';
import { hitStyleOf } from '../../src/render/hit-styles';
import { LightRig } from '../../src/render/light-rig';
import { EQ, SignatureFx, WAVE_EVERY } from '../../src/render/signature-fx';
import { PLATINE, signatureOf } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { playCombo } from '../core/combo-helpers';
import { facingOff } from '../core/helpers';
import { GROUND_Y, recordingScene } from './spark-area';

vi.mock('phaser', () => ({
  default: { BlendModes: { NORMAL: 0, ADD: 1 }, Textures: { FilterMode: { LINEAR: 0 } } },
}));

const { Light: L, Heavy: H, Special: S, Down: D, Right: F, Left: B, Boost: X } = Input;
const NR: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const RN: MatchConfig = { stage: TRAINING_STAGE, fighters: [RIFF, NAYO] };
const CYAN = hitStyleOf('nayo').energy;
const MAGENTA = hitStyleOf('riff').energy;

/** A budget that grants or refuses everything, and keeps what it was asked. */
function budget(grants = true) {
  const asked: number[] = [];
  const stub = {
    mode: 'normal',
    admit: (area: number) => {
      asked.push(area);
      return grants;
    },
  } as unknown as FlashBudget;
  return { stub, asked };
}

/** The signature effects of a match, on a scene that keeps what they draw. */
function signatureFx(config: MatchConfig, grants = true, mode: 'full' | 'simple' = 'full') {
  const recorded = recordingScene();
  const ids = config.fighters.map((fighter) => (fighter === NAYO ? 'nayo' : 'riff')) as [
    'nayo' | 'riff',
    'nayo' | 'riff',
  ];
  const asks = budget(grants);
  const fx = new SignatureFx(recorded.scene, config, {
    groundY: GROUND_Y,
    signatures: [signatureOf(ids[0]), signatureOf(ids[1])],
    energies: [hitStyleOf(ids[0]).energy, hitStyleOf(ids[1]).energy],
    budget: asks.stub,
    mode,
    stage: FIGHT_STAGE_COLORS,
  });
  const cues: { kind: SignatureCue; tick: number; color: number; size: number }[] = [];
  let tick = 0;
  const cue = fx.cue.bind(fx);
  fx.cue = (kind, x, y, toward, color, accent, size) => {
    cues.push({ kind, tick, color, size });
    return cue(kind, x, y, toward, color, accent, size);
  };
  return {
    fx,
    recorded,
    asked: asks.asked,
    cues,
    /** Plays `states` through it, a tick and a display frame each. */
    play(states: readonly GameState[]) {
      for (const state of states) {
        fx.tick(state);
        fx.flush();
        fx.update(1);
        tick++;
      }
    },
  };
}

/** The states of `steps` played by player 1 from `distance` px. */
function route(config: MatchConfig, distance: number, steps: InputBits[], boost = 0) {
  const start = facingOff(distance, config, [{ boost }, {}]);
  return playCombo(start, config, steps).states;
}

const kinds = (cues: readonly { kind: SignatureCue }[]) => cues.map(({ kind }) => kind);

describe("Nayo's signature effects (docs/art/nayo-vfx.md §3)", () => {
  it('rings the floor as the Uppercut pushes off, then climbs it in streaks', () => {
    const played = signatureFx(NR);
    played.play(route(NR, 30, [D | S]));
    expect(kinds(played.cues)).toEqual(['groundRing', 'rise']);
    expect(played.cues.map(({ color }) => color)).toEqual([CYAN, CYAN]);
  });

  it('plays its Remix in platine, bigger, with the burst of the Boost spent', () => {
    const played = signatureFx(NR);
    played.play(route(NR, 30, [D | X], 3000));
    expect(kinds(played.cues)).toEqual(['burst', 'groundRing', 'rise', 'groundRing']);
    const ring = played.cues.find(({ kind }) => kind === 'groundRing');
    expect(ring).toMatchObject({ color: PLATINE });
    expect(ring?.size).toBeGreaterThan(1);
  });

  it('lets the Vinyle go in a speaker ring, then leaves sound waves behind it in flight', () => {
    const played = signatureFx(NR);
    played.play(route(NR, 200, [S]));
    const [ring, ...waves] = played.cues;
    expect(ring?.kind).toBe('throwRing');
    expect(waves.length).toBeGreaterThan(3);
    expect(new Set(kinds(waves))).toEqual(new Set(['wave']));
    // Every WAVE_EVERY ticks, never two on one tick.
    for (let i = 1; i < waves.length; i++) {
      expect((waves[i]?.tick ?? 0) - (waves[i - 1]?.tick ?? 0)).toBe(WAVE_EVERY);
    }
  });

  it('runs the Mégabasse up, then drops the bass three times, the last in platine', () => {
    const played = signatureFx(NR);
    played.play(route(NR, 50, [B | X], 3000));
    expect(kinds(played.cues)).toEqual(['charge', 'drop', 'drop', 'drop']);
    expect(played.cues.at(-1)?.color).toBe(PLATINE);
  });

  it('swings an arc on a heavy normal, once, and nothing on a light one', () => {
    const heavy = signatureFx(NR);
    heavy.play(route(NR, 40, [H]));
    expect(kinds(heavy.cues)).toEqual(['swing']);
    const light = signatureFx(NR);
    light.play(route(NR, 40, [L]));
    expect(light.cues).toEqual([]);
  });

  it("plays Riff's own effects, none of Nayo's (direction-combat §4, passation §2.3 rule 4)", () => {
    const nayos = new Set(['throwRing', 'kick', 'groundRing', 'rise', 'charge', 'drop', 'dash']);
    for (const steps of [[D | S], [S], [F | S]]) {
      const played = signatureFx(RN);
      played.play(route(RN, 40, steps));
      expect(played.cues.length, String(steps)).toBeGreaterThan(0);
      expect(played.cues.filter(({ kind }) => nayos.has(kind))).toEqual([]);
    }
    // Her heavy normals swing no speed arc: Nayo's.
    const heavy = signatureFx(RN);
    heavy.play(route(RN, 40, [H]));
    expect(heavy.cues).toEqual([]);
  });

  it('asks the budget for what each cue lights at its size, once, lit only if granted', () => {
    const granted = signatureFx(NR);
    granted.play(route(NR, 30, [D | X], 3000));
    expect(granted.asked).toEqual(
      granted.cues.map(({ kind, size }) => SIGNATURE_AREAS[kind] * size ** 2),
    );
    // Calm, nothing is asked: every cue plays quiet.
    const calm = signatureFx(NR);
    calm.fx.calm = true;
    calm.play(route(NR, 30, [D | X], 3000));
    expect(calm.cues).toHaveLength(granted.cues.length);
    expect(calm.asked).toEqual([]);
  });

  it('shows the cues of the same tick on the next display frame, from a fixed pool', () => {
    const played = signatureFx(NR);
    const made = played.recorded.images.length;
    // Its run-up, its freeze, then its first drop.
    played.play(route(NR, 50, [B | X], 3000).slice(0, 26));
    expect(played.recorded.images.some((image) => image.visible)).toBe(true);
    expect(played.recorded.graphics[0]?.spans.length).toBeGreaterThan(0);
    // Nothing made while it plays.
    expect(played.recorded.images).toHaveLength(made);
    played.fx.update(200);
    expect(played.recorded.images.some((image) => image.visible)).toBe(false);
    expect(played.recorded.graphics[0]?.spans).toEqual([]);
  });
});

describe('the equalizer of the Mégabasse', () => {
  /** Each frame, the segments each bar shows (its cap left out). */
  function bars(still: boolean): number[][] {
    const played = signatureFx(NR);
    played.fx.still = still;
    played.fx.cue('drop', 160, GROUND_Y, 1, CYAN, CYAN, 1);
    played.fx.flush();
    const frames: number[][] = [];
    for (let frame = 0; frame < EQ.life; frame++) {
      played.fx.update(1);
      const spans = played.recorded.graphics[0]?.spans ?? [];
      const counts = new Map<number, number>();
      for (const span of spans) {
        if (span.color !== CYAN) continue;
        counts.set(span.x, (counts.get(span.x) ?? 0) + 1);
      }
      frames.push([...counts.values()]);
    }
    return frames;
  }

  it('jumps with the bass and settles; it bounces, but not with the screen kept still', () => {
    const settles = (frames: number[][]) =>
      frames.slice(5).every((counts, i) => {
        const before = frames[i + 4] ?? [];
        return counts.every((count, bar) => count <= (before[bar] ?? 0));
      });
    expect(Math.max(...bars(true).flat())).toBeGreaterThan(EQ.segments / 2);
    expect(settles(bars(true))).toBe(true);
    expect(settles(bars(false))).toBe(false);
  });

  it('stays drawn without tints, its plain fills; the atlas pieces do not', () => {
    const played = signatureFx(NR, true, 'simple');
    // Its run-up, its freeze, its first drop: nothing of the atlas shows on any frame.
    for (const state of route(NR, 50, [B | X], 3000).slice(0, 26)) {
      played.play([state]);
      expect(played.recorded.images.some((image) => image.visible)).toBe(false);
    }
    played.fx.cue('drop', 160, GROUND_Y, 1, CYAN, CYAN, 1);
    played.fx.flush();
    played.fx.update(3);
    expect(played.recorded.graphics[0]?.spans.length).toBeGreaterThan(0);
  });
});

describe('what the signature effects leave behind', () => {
  it("make no texture of their own: they draw from the game's atlas and glow", () => {
    const made: string[] = [];
    const scene = recordingScene().scene;
    const textures = { exists: () => true, createCanvas: (key: string) => made.push(key) };
    Object.assign(scene, { textures });
    new SignatureFx(scene, NR, {
      groundY: GROUND_Y,
      signatures: [signatureOf('nayo'), null],
      energies: [CYAN, MAGENTA],
      budget: budget().stub,
      mode: 'full',
      stage: FIGHT_STAGE_COLORS,
    });
    new LightRig(scene, NR, {
      groundY: GROUND_Y,
      signatures: [signatureOf('nayo'), null],
      energies: [CYAN, MAGENTA],
      stage: FIGHT_STAGE_COLORS,
      mode: 'full',
    });
    expect(made).toEqual([]);
  });
});
