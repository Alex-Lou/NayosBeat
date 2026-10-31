import type { FlashMode } from '../render/flash-budget';
import type { HudComfort } from '../render/health-bar';
import type { ShakeMode } from '../render/shake';

/**
 * The player's comfort options (the « Options » screen, docs/flashs.md §4): « Effets de flash »
 * and « Tremblement de l'écran ». Kept like the sound (`nayosbeat.*` in the page's storage, which
 * may be unavailable: then they hold for the session). What the player chose wins; what they did
 * not follows the system's « reduce motion », the only signal a page gets (none exists for
 * flashes): then the flashes reduced and the screen still.
 */
export interface Comfort {
  readonly flashes: FlashMode;
  readonly shake: ShakeMode;
}

/** Both options take these values, in the order they cycle. */
const MODES = ['normal', 'reduced', 'off'] as const;
type Mode = (typeof MODES)[number];
const KEYS = { flashes: 'nayosbeat.flashes', shake: 'nayosbeat.shake' } as const;
const NOTICE_KEY = 'nayosbeat.notice';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** What the options screen says of each value, and under it (no capital accented letter). */
export const FLASH_LABELS: Readonly<Record<FlashMode, { label: string; hint: string }>> = {
  normal: { label: 'normaux', hint: 'Au plus 3 flashs par seconde' },
  reduced: { label: 'réduits', hint: 'Plus rares et plus doux, rien ne clignote' },
  off: {
    label: 'aucun',
    hint: 'Rien ne flashe ni ne clignote : le gel et le son portent les coups',
  },
};
export const SHAKE_LABELS: Readonly<Record<ShakeMode, { label: string; hint: string }>> = {
  normal: { label: 'normal', hint: "L'écran tremble sous les gros coups" },
  reduced: { label: 'réduit', hint: "L'écran tremble deux fois moins fort" },
  off: { label: 'aucun', hint: "L'écran et le HUD restent immobiles" },
};

/** The notice of the first launch (docs/flashs.md §4): it completes the work on the effects. */
export const NOTICE = {
  title: 'Avant de jouer',
  text:
    'Chez certaines personnes, des lumières qui clignotent ou des motifs peuvent déclencher ' +
    'des crises convulsives, même sans antécédent. Si tu ressens un vertige, un trouble de la ' +
    'vue, des contractions des yeux ou du visage, des mouvements involontaires, une ' +
    'désorientation ou une perte de conscience, arrête tout de suite de jouer et consulte un ' +
    "médecin. Joue dans une pièce éclairée, à bonne distance de l'écran, et fais une pause " +
    "chaque heure. Dans Options, « Effets de flash » et « Tremblement de l'écran » adoucissent " +
    'les combats.',
} as const;

/** The flashes reduced or off: nothing blinks, the words do not pop, the echoes are fainter. */
export function isCalm(comfort: Comfort): boolean {
  return comfort.flashes !== 'normal';
}

/** The screen kept still: nothing shakes, turns or drifts, on the HUD and the menus too. */
export function isStill(comfort: Comfort): boolean {
  return comfort.shake === 'off';
}

/** What the options leave the HUD (docs/flashs.md §4). */
export function hudComfortOf(comfort: Comfort): HudComfort {
  return { flashes: !isCalm(comfort), motion: !isStill(comfort) };
}

/** The value after `mode`, as an option cycles. */
export function nextMode(mode: Mode): Mode {
  return MODES[(MODES.indexOf(mode) + 1) % MODES.length] ?? 'normal';
}

/** What was stored wins; what was not (or is unreadable) follows the system. Pure. */
export function comfortOf(
  stored: { readonly flashes: string | null; readonly shake: string | null },
  reducedMotion: boolean,
): Comfort {
  const known = (value: string | null): Mode | undefined => MODES.find((mode) => mode === value);
  return {
    flashes: known(stored.flashes) ?? (reducedMotion ? 'reduced' : 'normal'),
    shake: known(stored.shake) ?? (reducedMotion ? 'off' : 'normal'),
  };
}

/** The system's « reduce motion ». */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia(REDUCED_MOTION).matches;
  } catch {
    return false;
  }
}

export function loadComfort(): Comfort {
  return comfortOf(
    { flashes: read(KEYS.flashes), shake: read(KEYS.shake) },
    prefersReducedMotion(),
  );
}

/**
 * Keeps what the player just chose, and only that: an option they never touched goes on
 * following the system.
 */
export function saveComfort(changed: Partial<Comfort>): void {
  if (changed.flashes) write(KEYS.flashes, changed.flashes);
  if (changed.shake) write(KEYS.shake, changed.shake);
}

/** Whether the notice of the first launch was read already. */
export function noticeSeen(): boolean {
  return read(NOTICE_KEY) === 'seen';
}

export function markNoticeSeen(): void {
  write(NOTICE_KEY, 'seen');
}

/** Calls `onChange` when the system's setting changes; returns the unsubscribe. */
export function watchReducedMotion(onChange: () => void): () => void {
  try {
    const query = window.matchMedia(REDUCED_MOTION);
    query.addEventListener('change', onChange);
    return () => {
      query.removeEventListener('change', onChange);
    };
  } catch {
    return () => undefined;
  }
}

/** The options are a convenience: storage may be unavailable (private mode), that is fine. */
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Not persisted: the choice still holds for this session.
  }
}
