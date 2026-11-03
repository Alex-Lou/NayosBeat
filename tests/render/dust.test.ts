import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import type { StageVariant } from '../../src/art/stage-layers';
import { Dust, DUST_LOOKS, groundOf } from '../../src/render/dust';
import { FxRandom } from '../../src/render/fx-random';

const GROUND_Y = 230;

/** A speck as the engine would hold it: where it is, whether it shows. */
interface FakeSpeck {
  x: number;
  y: number;
  visible: boolean;
  color: number;
}

/** A scene whose rectangles only remember where they are. */
function fakeScene(): { scene: Phaser.Scene; specks: FakeSpeck[] } {
  const specks: FakeSpeck[] = [];
  const add = {
    rectangle: (_x: number, _y: number, _w: number, _h: number, color: number) => {
      const speck: FakeSpeck = { x: 0, y: 0, visible: false, color };
      specks.push(speck);
      const shape = {
        get x() {
          return speck.x;
        },
        get y() {
          return speck.y;
        },
        setDepth: () => shape,
        setSize: () => shape,
        setAlpha: () => shape,
        setVisible: (visible: boolean) => {
          speck.visible = visible;
          return shape;
        },
        setPosition: (x: number, y: number) => {
          speck.x = x;
          speck.y = y;
          return shape;
        },
      };
      return shape;
    },
  };
  return { scene: { add } as unknown as Phaser.Scene, specks };
}

const shown = (specks: FakeSpeck[]) => specks.filter(({ visible }) => visible);

describe('the dust kicked up from the floor (docs/art/decor-plage.md §6)', () => {
  it('stays on the hard floors as it was: a few grey specks that drift up and fade', () => {
    const { scene, specks } = fakeScene();
    const dust = new Dust(scene, GROUND_Y, new FxRandom());
    expect(specks).toHaveLength(16);
    expect(specks.every(({ color }) => color === DUST_LOOKS.hard.color)).toBe(true);
    expect(dust.feet).toBe(false);
    dust.kick(0, 1);
    expect(shown(specks)).toHaveLength(5);
    for (let frame = 0; frame < 8; frame++) dust.update();
    // Rising all along: never back down to the floor.
    expect(shown(specks).every(({ y }) => y < GROUND_Y - 1)).toBe(true);
  });

  it('flies three times as much on sand, higher, and falls back to lie on the floor', () => {
    const { scene, specks } = fakeScene();
    const dust = new Dust(scene, GROUND_Y, new FxRandom(), 'sand');
    expect(dust.feet).toBe(true);
    dust.kick(0, 1);
    expect(shown(specks)).toHaveLength(15);
    let highest = GROUND_Y;
    for (let frame = 0; frame < DUST_LOOKS.sand.life - 1; frame++) {
      dust.update();
      for (const { y } of shown(specks)) {
        highest = Math.min(highest, y);
        expect(y).toBeLessThanOrEqual(GROUND_Y - 1);
      }
    }
    expect(highest).toBeLessThan(GROUND_Y - 6);
    expect(shown(specks).every(({ y }) => y === GROUND_Y - 1)).toBe(true);
    dust.update();
    expect(shown(specks)).toHaveLength(0);
  });

  it('is kicked up by the feet on sand: a step, a landing', () => {
    const { scene, specks } = fakeScene();
    const dust = new Dust(scene, GROUND_Y, new FxRandom(), 'sand');
    dust.step(0, 1);
    expect(shown(specks)).toHaveLength(2);
    dust.land(0);
    expect(shown(specks)).toHaveLength(11);
  });

  it("is the beach's sand there only, hard elsewhere and in the grey box", () => {
    const at = (stage: string) => ({ stage }) as StageVariant;
    const maps = [
      { name: 'rue', ground: 'hard' },
      { name: 'plage', ground: 'sand' },
    ] as const;
    expect(groundOf(at('plage'), maps)).toBe('sand');
    expect(groundOf(at('rue'), maps)).toBe('hard');
    expect(groundOf(undefined, maps)).toBe('hard');
    expect(groundOf(at('plage'))).toBe('sand');
  });
});
