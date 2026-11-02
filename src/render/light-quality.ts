import type { LightTier } from './live-lights';
import type { RenderMode } from './render-mode';

/**
 * The adaptive quality's first lever (docs/qualite-adaptative.md, État; docs/art/nayo-vivante.md
 * §5): the live lights and the filters, never the gameplay. `full`: lights, filters (Nayo's aura,
 * his LEDs), sound particles; `lean`: lights and particles, no filter; `off`: none of them, the
 * pools of light on the floor as before. Pure: FightScene feeds it the frames' times.
 *
 * At the start, only ceilings (§2.8, R12): Canvas has no lights at all; a software renderer, a
 * device with 2 GB or less, or textures under 4 096 px start lean. `?lumieres=haut|moyen|non`
 * forces a ceiling. In a fight, it only goes down, fast, and the ceiling stays down for the
 * session: it never comes back up within it (§2.8: down fast in a fight, a drop sets the
 * session's ceiling).
 */

/** What the device says of itself, read once (`deviceHints`). */
export interface DeviceHints {
  /** GB, as `navigator.deviceMemory` rounds it; undefined where the browser hides it (Safari). */
  readonly memory?: number | undefined;
  readonly maxTextureSize?: number | undefined;
  /** The GPU's name, where the browser gives it (WEBGL_debug_renderer_info). */
  readonly gpu?: string | undefined;
}

const FORCED: Readonly<Record<string, LightTier>> = { haut: 'full', moyen: 'lean', non: 'off' };

/** The tier a session starts from, by how the game is drawn, the address and the device. */
export function tierCeiling(mode: RenderMode, search: string, hints: DeviceHints): LightTier {
  if (mode === 'simple') return 'off';
  const forced = FORCED[new URLSearchParams(search).get('lumieres') ?? ''];
  if (forced) return forced;
  const software = /swiftshader|llvmpipe|software/i.test(hints.gpu ?? '');
  const small = (hints.memory ?? Infinity) <= 2 || (hints.maxTextureSize ?? Infinity) < 4096;
  return software || small ? 'lean' : 'full';
}

/** Reads the device's hints from the browser and the WebGL context, if any. */
export function deviceHints(gl: WebGLRenderingContext | undefined): DeviceHints {
  const memory = (navigator as { deviceMemory?: number }).deviceMemory;
  if (!gl) return { memory };
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : undefined;
  return { memory, maxTextureSize: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)), gpu };
}

/** A frame is late past this long: a 60 Hz frame and a half (the game's ticks are 60 Hz). */
export const LATE_MS = 25;
/** Judged over this many frames of a fight… */
export const WINDOW = 120;
/** …after this many from its start (the intro, the shaders made). */
export const WARMUP = 90;
/** From this share of late frames in a window, a step down. */
export const LATE_SHARE = 0.2;

const DOWN: Readonly<Record<LightTier, LightTier>> = { full: 'lean', lean: 'off', off: 'off' };

/**
 * The tier of the session: from its ceiling, one step down whenever a window of a fight holds
 * LATE_SHARE late frames or more. A step down is the new ceiling for the rest of the session.
 */
export class LightGovernor {
  private current: LightTier;
  private seen = 0;
  private late = 0;
  private frames = 0;

  constructor(ceiling: LightTier) {
    this.current = ceiling;
  }

  get tier(): LightTier {
    return this.current;
  }

  /** A fight starts: judged afresh, from the session's ceiling. */
  restart(): void {
    this.seen = 0;
    this.late = 0;
    this.frames = 0;
  }

  /** A frame of the fight drawn `deltaMs` after the last; true if the tier just went down. */
  frame(deltaMs: number): boolean {
    this.seen++;
    if (this.seen <= WARMUP || this.current === 'off') return false;
    this.frames++;
    if (deltaMs > LATE_MS) this.late++;
    if (this.frames < WINDOW) return false;
    const down = this.late >= LATE_SHARE * WINDOW;
    this.frames = 0;
    this.late = 0;
    if (!down) return false;
    this.current = DOWN[this.current];
    return true;
  }
}
