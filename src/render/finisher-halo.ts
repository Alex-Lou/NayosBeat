import type Phaser from 'phaser';
import type { FinisherState } from '../core/finisher';
import { SIGNAL_FADE_TICKS } from './finisher-signal';
import { over, relativeLuminance } from './luminance';
import { alphaOver, VEIL_DELTA } from './veils';

/**
 * The halo under the feet of a fighter whose Finisher is ready (docs/finisher.md §1.2): an
 * ellipse on the floor in its energy color, a glow and never a flash (ΔL ≤ VEIL_DELTA over the
 * stage, like the veils). It breathes once a measure, its luminance moving by BREATH_DELTA at
 * most; it holds still for those who keep the screen calm or still. It fades in and out with the
 * signal. No sheet to draw: one shape, made once.
 */

/** Its size, in world pixels. */
export const HALO_SIZE = { width: 44, height: 6 } as const;
/** A measure at 120 BPM: one breath. */
export const BREATH_TICKS = 120;
/** How far a breath moves the halo's luminance, over every color of the stage. */
export const BREATH_DELTA = 0.05;

/** The halo's two opacities: at the top of a breath (and held still), at its bottom. */
export interface HaloLook {
  readonly bright: number;
  readonly faint: number;
}

/**
 * The opacities of a halo in `energy` over the stage's large colors: at its brightest, the most
 * that changes none of them by more than VEIL_DELTA (0.27 in Nayo's cyan); at its faintest, the
 * least whose luminance stays within BREATH_DELTA of the brightest's over each of them.
 */
export function haloLook(energy: number, stage: readonly number[]): HaloLook {
  const bright = alphaOver(energy, stage, VEIL_DELTA);
  const swing = (alpha: number): number =>
    Math.max(
      ...stage.map((backdrop) =>
        Math.abs(
          relativeLuminance(over(energy, backdrop, bright)) -
            relativeLuminance(over(energy, backdrop, alpha)),
        ),
      ),
    );
  // The luminance grows with the opacity: the faintest one within the swing, by halves.
  let low = 0;
  let high = bright;
  if (swing(low) <= BREATH_DELTA) return { bright, faint: low };
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    if (swing(mid) <= BREATH_DELTA) high = mid;
    else low = mid;
  }
  return { bright, faint: high };
}

/**
 * The halo's opacity on tick `clock` of the match, fully shown: one breath a measure, from its
 * brightest down and back (smooth, never a jump), or its brightest held (`breathes` false).
 */
export function haloAlpha(look: HaloLook, clock: number, breathes: boolean): number {
  if (!breathes) return look.bright;
  const phase = (clock % BREATH_TICKS) / BREATH_TICKS;
  const fall = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  return look.bright - (look.bright - look.faint) * fall;
}

/**
 * How much of the halo shows, `ticks` after it showed `presence` (0 to 1): toward all of it while
 * the Finisher is ready (`ready`), toward none otherwise, over SIGNAL_FADE_TICKS.
 */
export function haloPresence(presence: number, ready: boolean, ticks: number): number {
  const step = Math.max(0, ticks) / SIGNAL_FADE_TICKS;
  return ready ? Math.min(1, presence + step) : Math.max(0, presence - step);
}

/** The halo of one fighter: an ellipse on the floor, moved and faded every frame. */
export class FinisherHalo {
  /** Read every frame, so the pause's options apply at once: no breath, its brightest held. */
  calm = false;
  private readonly look: HaloLook;
  private readonly shape: Phaser.GameObjects.Ellipse;
  private presence = 0;
  private clock = 0;

  /** Made before its fighter's shadow, at the same depth: drawn under it, around its feet. */
  constructor(
    scene: Phaser.Scene,
    private readonly groundY: number,
    energy: number,
    stage: readonly number[],
  ) {
    this.look = haloLook(energy, stage);
    this.shape = scene.add
      .ellipse(0, groundY, HALO_SIZE.width, HALO_SIZE.height, energy, 1)
      .setVisible(false);
  }

  /**
   * `x`: the fighter's, in world pixels; `signal`: its Finisher's (only `ready` shows the halo);
   * `clock`: the match clock, in ticks (it stops with the pause).
   */
  update(x: number, signal: FinisherState, clock: number): void {
    // A clock gone back (a fresh match) starts the fade over from where it stands.
    const ticks = clock >= this.clock ? clock - this.clock : 0;
    this.clock = clock;
    this.presence = haloPresence(this.presence, signal === 'ready', ticks);
    if (this.presence <= 0) {
      if (this.shape.visible) this.shape.setVisible(false);
      return;
    }
    const alpha = this.presence * haloAlpha(this.look, clock, !this.calm);
    this.shape.setPosition(x, this.groundY).setAlpha(alpha).setVisible(true);
  }
}
