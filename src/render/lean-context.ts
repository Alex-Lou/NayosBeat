import Phaser from 'phaser';
import { rendererTypeFromUrl } from './render-mode';

/**
 * The attributes of the game's WebGL context (docs/qualite-adaptative.md §2.4): those Phaser 4.2.1
 * asks for itself with this game's config (WebGLRenderer.js, `contextCreationConfig`), less the
 * multisampling, the depth and the stencil. `smoothPixelArt` turns multisampling on in Phaser's
 * own context (Config.js), yet smooths the textures' edges in its shader: multisampling only
 * smooths the shapes drawn without a texture (the hold's ring, lines, circles), and with the depth
 * and stencil it holds most of the drawing buffer (17.8 MB at 960x540, 2.0 without). Nothing is
 * masked (stencil) and nothing is depth-tested: Phaser sorts the objects itself.
 */
export const LEAN_CONTEXT_ATTRIBUTES: Readonly<WebGLContextAttributes> = {
  alpha: false,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  desynchronized: false,
  failIfMajorPerformanceCaveat: false,
  powerPreference: 'default',
};

/** What the game hands Phaser to draw with: the renderer, and the lean context with its canvas. */
export type RendererChoice =
  | { readonly type: number }
  | {
      readonly type: number;
      readonly canvas: HTMLCanvasElement;
      readonly context: WebGLRenderingContext;
    };

/**
 * The renderer the game asks Phaser for (render-mode.ts), on the lean context where the browser
 * makes one. WebGL 1 only: Phaser 4.2.1's smoothPixelArt shader is GLSL ES 1.00, its derivatives
 * from the OES_standard_derivatives extension, which a WebGL 2 context no longer offers such a
 * shader (it fails to compile, no sprite is drawn). Phaser checks the extensions it needs on this
 * context as on its own. No context made: Phaser makes its own, as before (multisampled), on a
 * canvas of its own; the canvas made here is asked once, and handed over only with its context.
 * Canvas asked (`?rendu=canvas`): no WebGL context at all.
 */
export function rendererChoice(
  search: string,
  createCanvas: () => HTMLCanvasElement,
): RendererChoice {
  const type = rendererTypeFromUrl(search);
  if (type === Phaser.CANVAS) return { type };
  const canvas = createCanvas();
  const context = canvas.getContext('webgl', LEAN_CONTEXT_ATTRIBUTES);
  if (!context || context.isContextLost()) return { type };
  return { type: Phaser.WEBGL, canvas, context };
}
