import type { MatchConfig } from '../../src/core/config';
import { px } from '../../src/core/constants';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';
import { TRAINING_STAGE } from '../../src/data/stages';
import type { SignatureCue } from '../../src/render/flash-areas';
import type { FlashBudget } from '../../src/render/flash-budget';
import { HitFx } from '../../src/render/hit-fx';
import { hitStyleOf } from '../../src/render/hit-styles';
import { brightestBackdrop } from '../../src/render/luminance';
import type { RenderMode } from '../../src/render/render-mode';
import { SignatureFx } from '../../src/render/signature-fx';
import { signatureOf } from '../../src/render/signatures';
import { FIGHT_STAGE_COLORS } from '../../src/render/stage-view';
import { CENTER_X, CENTER_Y, GROUND_Y, litArea, recordingScene } from './spark-area';

/**
 * Measures what a signature effect lights (docs/flashs.md §1.1), as spark-area.ts measures the
 * hit effects: the real SignatureFx plays one cue on a scene that keeps its images and its
 * equalizer's rectangles, composited display frame by display frame over the stage's brightest
 * backdrop (each channel at its highest: what an added light raises the most), and the world px²
 * whose luminance rose by 0.1 or more are counted. Phaser must be mocked by the test (its blend
 * modes: NORMAL 0, ADD 1).
 */

export const NAYO_RIFF: MatchConfig = { stage: TRAINING_STAGE, fighters: [NAYO, RIFF] };
const BACKDROP = brightestBackdrop(FIGHT_STAGE_COLORS);
/** The cues played on the floor, as the game plays them (their feet's height: 0). */
const ON_THE_FLOOR: ReadonlySet<SignatureCue> = new Set(['groundRing', 'drop', 'dash']);

export class SignatureMeter {
  private readonly recorded = recordingScene();
  readonly fx: SignatureFx;
  /** Whether the budget grants what each cue asks. */
  private grants = true;

  constructor(mode: RenderMode = 'full') {
    const { scene } = this.recorded;
    // The hit effects make and paint the atlas both draw from.
    new HitFx(scene, GROUND_Y, mode).play(hitStyleOf('nayo'), 'light', px(10), px(10), 1);
    const budget = {
      mode: 'normal',
      admit: () => this.grants,
    } as unknown as FlashBudget;
    const nayo = hitStyleOf('nayo');
    this.fx = new SignatureFx(scene, NAYO_RIFF, {
      groundY: GROUND_Y,
      signatures: [signatureOf('nayo'), null],
      energies: [nayo.energy, hitStyleOf('riff').energy],
      budget,
      mode,
      stage: FIGHT_STAGE_COLORS,
    });
  }

  /**
   * The most world px² `kind` lights on one display frame over its first `frames`, played lit
   * (the budget granting it) or muted, in `color` and `accent`, `size` times its own.
   */
  peak(
    kind: SignatureCue,
    color: number,
    accent: number,
    size: number,
    lit: boolean,
    frames = 30,
  ): number {
    const { atlas, images, graphics } = this.recorded;
    // What the last cue left is long gone.
    this.fx.update(200);
    this.grants = lit;
    const y = ON_THE_FLOOR.has(kind) ? GROUND_Y : CENTER_Y;
    this.fx.cue(kind, CENTER_X, y, 1, color, accent, size);
    this.fx.flush();
    let peak = 0;
    for (let frame = 0; frame < frames; frame++) {
      this.fx.update(1);
      peak = Math.max(peak, litArea(atlas, images, 'webgl', BACKDROP, graphics));
    }
    return peak;
  }

  /** The images of the atlas showing now, and the equalizer's rectangles. */
  shown(): { images: number; spans: number } {
    const { images, graphics } = this.recorded;
    return {
      images: images.filter((image) => image.visible && image.alpha > 0).length - 0,
      spans: graphics.reduce((sum, drawn) => sum + drawn.spans.length, 0),
    };
  }
}
