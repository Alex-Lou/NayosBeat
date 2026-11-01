import { describe, expect, it, vi } from 'vitest';
import { SPRAY_AIMS } from '../../src/render/fight-events';
import { SPARK_AREAS } from '../../src/render/flash-areas';
import { hitStyleOf } from '../../src/render/hit-styles';
import { SparkMeter } from './spark-area';

vi.mock('phaser', () => ({
  default: { BlendModes: { NORMAL: 0, ADD: 1 }, Textures: { FilterMode: { LINEAR: 0 } } },
}));

const FIGHTERS = ['nayo', 'riff'] as const;
/** The blows whose spray flies: Nayo's star, Riff's claw, a special's pinpoint (P5). */
const KINDS = ['light', 'heavy', 'ko', 'pulse', 'koMuted', 'pinpoint'] as const;

describe('a spray flies where its blow sends it (docs/polish/AUDIT-ET-PLAN.md, P6)', () => {
  /** How far a blow's shapes turn off the level line of its side: up below 0, mirrored. */
  const turnOf = (away: 1 | -1, aim: number) => (away > 0 ? aim : -aim);
  /** The angle from `a` to `b`, between -π and π. */
  const between = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  const AIMS = Object.values(SPRAY_AIMS);

  it("turns Nayo's burst along its blow, flipped to the left", () => {
    const meter = new SparkMeter();
    for (const kind of ['heavy', 'pinpoint'] as const) {
      for (const away of [1, -1] as const) {
        for (const aim of AIMS) {
          const bursts = meter
            .pieces(hitStyleOf('nayo'), kind, away, aim, 1)
            .filter((piece) => piece.frame.startsWith('burst:'));
          const [burst] = bursts;
          expect(bursts).toHaveLength(1);
          expect(burst?.flipX).toBe(away < 0);
          // Its own tilt (± 0.15) around the blow's.
          expect(Math.abs(between(turnOf(away, aim), burst?.rotation ?? NaN))).toBeLessThanOrEqual(
            0.15,
          );
        }
      }
    }
  });

  it("turns Riff's blades along her blow, and throws most of her shards with it", () => {
    const meter = new SparkMeter();
    const riff = hitStyleOf('riff');
    const cuts = (kind: 'light' | 'heavy' | 'pinpoint', away: 1 | -1, aim: number) =>
      meter
        .pieces(riff, kind, away, aim, 1)
        .filter((piece) => piece.frame === 'cut')
        .map((piece) => piece.rotation)
        .sort((a, b) => a - b);
    for (const away of [1, -1] as const) {
      for (const aim of AIMS) {
        const turn = turnOf(away, aim);
        // Her claw marks rake down across the blow; her X (a light blow, a special's) turns.
        const marks = cuts('heavy', away, aim);
        expect(marks.length).toBeGreaterThan(0);
        for (const mark of marks) expect(mark).toBeCloseTo((away > 0 ? 0.9 : -0.9) + turn, 6);
        for (const kind of ['light', 'pinpoint'] as const) {
          const [first, second] = cuts(kind, away, aim);
          expect(first).toBeCloseTo(turn - 0.8, 6);
          expect(second).toBeCloseTo(turn + 0.8, 6);
        }
        // 60 % of her shards within ± 0.9 rad of the blow (and what gravity bends in 4 frames).
        const direction = away > 0 ? aim : Math.PI - aim;
        const shards = meter
          .pieces(riff, 'heavy', away, aim, 4)
          .filter((piece) => piece.frame === 'shard');
        const along = shards.filter(
          (piece) => Math.abs(between(direction, Math.atan2(piece.y, piece.x))) <= 0.9 + 0.25,
        );
        expect(shards.length).toBeGreaterThan(0);
        expect(along.length / shards.length).toBeGreaterThanOrEqual(0.6);
      }
    }
  });

  it('lights no more for it: under its table, up or down', () => {
    const meter = new SparkMeter();
    for (const fighter of FIGHTERS) {
      const style = hitStyleOf(fighter);
      for (const kind of KINDS) {
        for (const [name, aim] of Object.entries(SPRAY_AIMS)) {
          expect(
            meter.peak(style, kind, 14, aim),
            `${fighter} ${kind} ${name}`,
          ).toBeLessThanOrEqual(SPARK_AREAS[style.shape][kind]);
        }
      }
    }
  }, 120_000);
});
