import { describe, expect, it, vi } from 'vitest';
import { rendererChoice } from '../../src/render/lean-context';

vi.mock('phaser', () => ({ default: { AUTO: 0, CANVAS: 1, WEBGL: 2 } }));

/** A canvas standing in for the browser's: the contexts asked of it, and what it answers. */
function fakeCanvas(answer: 'context' | 'none' | 'lost') {
  const asked: { type: string; attributes: unknown }[] = [];
  const context = { isContextLost: () => answer === 'lost' };
  const canvas = {
    getContext(type: string, attributes: unknown) {
      asked.push({ type, attributes });
      return answer === 'none' ? null : context;
    },
  };
  return { canvas: canvas as unknown as HTMLCanvasElement, context, asked };
}

/**
 * The lean context (docs/qualite-adaptative.md §2.4): what the game asks the browser for, and what
 * it hands Phaser.
 */
describe('the WebGL context the game draws on', () => {
  it('is WebGL 1, without multisampling, depth nor stencil, the rest as Phaser asks', () => {
    const fake = fakeCanvas('context');
    expect(rendererChoice('', () => fake.canvas)).toEqual({
      type: 2,
      canvas: fake.canvas,
      context: fake.context,
    });
    // Phaser 4.2.1's own attributes for this game (WebGLRenderer.js, contextCreationConfig),
    // multisampling, depth and stencil off. WebGL 2 would not compile Phaser's smoothPixelArt
    // shader (GLSL ES 1.00 derivatives).
    expect(fake.asked).toEqual([
      {
        type: 'webgl',
        attributes: {
          alpha: false,
          antialias: false,
          depth: false,
          stencil: false,
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          desynchronized: false,
          failIfMajorPerformanceCaveat: false,
          powerPreference: 'default',
        },
      },
    ]);
  });

  it('is the same with other parameters in the address', () => {
    const fake = fakeCanvas('context');
    expect(rendererChoice('?debug', () => fake.canvas)).toMatchObject({ type: 2 });
    expect(fake.asked).toHaveLength(1);
  });

  it('is never made when Canvas is asked (?rendu=canvas)', () => {
    const createCanvas = vi.fn(() => fakeCanvas('context').canvas);
    expect(rendererChoice('?rendu=canvas', createCanvas)).toEqual({ type: 1 });
    expect(createCanvas).not.toHaveBeenCalled();
  });

  it('leaves Phaser to make its own, as before, when the browser makes none', () => {
    for (const answer of ['none', 'lost'] as const) {
      const fake = fakeCanvas(answer);
      // No canvas nor context handed over: Phaser picks WebGL or Canvas on a canvas of its own.
      expect(rendererChoice('', () => fake.canvas)).toEqual({ type: 0 });
      // The canvas was asked once: never a second context on it, nor a second try.
      expect(fake.asked).toHaveLength(1);
    }
  });
});
