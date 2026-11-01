import Phaser from 'phaser';

/**
 * How the game is drawn (docs/qualite-adaptative.md §2.3): `full` by WebGL, `simple` by Phaser's
 * Canvas renderer, the fallback of a browser without WebGL. That one has no tint (Phaser 4.2.1,
 * renderer/canvas): a white texture tinted comes out white, a sprite tinted dark in its own
 * colors. Simplified, nothing that a tint colors or darkens is drawn: the tinted veils (the KO's
 * vignette and éclat, the super's halo), the effects the flash budget turned dark (FX_DARK), the
 * flat silhouettes (the Boost's echoes, the dash's afterimages, the Finisher's outline) and the
 * tinted pieces of the hit effects. Each would show white or lit, a flash the budget never
 * granted (docs/flashs.md). The super's dark stays: a rectangle's fill, which Canvas draws.
 * Read once, from the renderer, when the game starts (main.ts).
 */
export type RenderMode = 'full' | 'simple';

/** The mode of the game's renderer, by its type (Phaser.CANVAS or Phaser.WEBGL). */
export function renderModeOf(renderer: { readonly type: number }): RenderMode {
  return renderer.type === Phaser.CANVAS ? 'simple' : 'full';
}

/**
 * The renderer the game asks Phaser for: WebGL where the browser has it, else Canvas; Canvas
 * always with `?rendu=canvas`, to see the simplified mode on any device.
 */
export function rendererTypeFromUrl(search: string): number {
  return new URLSearchParams(search).get('rendu') === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;
}

/**
 * The browser took the GPU away (a lost WebGL context: iOS back from the background, a GPU
 * reset): nothing shows until it gives it back and Phaser has rebuilt its textures. The context
 * knows it at once; Phaser's flag (WebGLRenderer.contextLost) once its listener on the canvas has
 * run, a task later, and until its textures are rebuilt. The Canvas renderer has neither.
 */
export function isContextLost(
  renderer: Phaser.Renderer.Canvas.CanvasRenderer | Phaser.Renderer.WebGL.WebGLRenderer,
): boolean {
  return 'gl' in renderer && (renderer.contextLost || renderer.gl.isContextLost());
}
