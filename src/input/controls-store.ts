import { DEFAULT_BINDINGS, isRecord, parseKeyboards, parsePads, type Bindings } from './bindings';

/**
 * The player's controls, kept in the page's storage under one versioned key
 * (docs/polish/AUDIT-ET-PLAN.md, P24). Its format is a contract (Hyrum): a new format takes a new
 * key (`.v2`) and reads this one, never changes it in silence.
 *
 *   { "version": 1,
 *     "keyboard": [{ "up": ["KeyW"], ... }, { ... }],   // player 1, player 2: codes per action
 *     "pad": [{ "jump": 0, ... }, { ... }] }            // standard-mapping button per action
 */
export const CONTROLS_KEY = 'nayosbeat.keys.v1';
export const CONTROLS_VERSION = 1;

export interface Controls {
  readonly bindings: Bindings;
}

export const DEFAULT_CONTROLS: Controls = { bindings: DEFAULT_BINDINGS };

/**
 * What was stored, checked once as it is read: each player's keyboard and gamepad on its own,
 * what is missing, corrupt, of another version, or in conflict going back to its default. Never
 * throws: a broken storage plays with the default controls. Pure.
 */
export function parseControls(raw: string | null): Controls {
  if (raw === null) return DEFAULT_CONTROLS;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_CONTROLS;
  }
  if (!isRecord(value) || value['version'] !== CONTROLS_VERSION) return DEFAULT_CONTROLS;
  return {
    bindings: { keyboard: parseKeyboards(value['keyboard']), pad: parsePads(value['pad']) },
  };
}

export function serializeControls(controls: Controls): string {
  const { keyboard, pad } = controls.bindings;
  return JSON.stringify({ version: CONTROLS_VERSION, keyboard, pad });
}

/**
 * The controls of this page: read from the storage, kept there on every change, and told to
 * whoever listens (a fight under the pause menu takes its new keys at once). The storage may be
 * unavailable (private mode) or full: then what was chosen holds for the session.
 */
export class ControlsStore {
  /** What was chosen and could not be kept: it wins over the storage until the page closes. */
  private unsaved: string | undefined;
  private readonly listeners = new Set<(controls: Controls) => void>();

  get(): Controls {
    return parseControls(this.unsaved ?? read());
  }

  set(controls: Controls): void {
    const raw = serializeControls(controls);
    this.unsaved = write(raw) ? undefined : raw;
    for (const listener of this.listeners) listener(controls);
  }

  /** Calls `listener` on every change; returns the unsubscribe. */
  subscribe(listener: (controls: Controls) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** How many listen: each one gone with what made it (tests/render/disposal.test.ts). */
  get listenerCount(): number {
    return this.listeners.size;
  }
}

/** The page's controls, shared by the screens and the fight. */
export const controlsStore = new ControlsStore();

function read(): string | null {
  try {
    return localStorage.getItem(CONTROLS_KEY);
  } catch {
    return null;
  }
}

function write(raw: string): boolean {
  try {
    localStorage.setItem(CONTROLS_KEY, raw);
    return true;
  } catch {
    return false;
  }
}
