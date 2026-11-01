import { toPx } from '../core/constants';
import type { FighterState, GameState } from '../core/state';
import { CadenceBreaks } from '../loop/cadence';

/** How often the overlay text is refreshed. Updating the DOM every frame would be wasteful. */
const REFRESH_INTERVAL_MS = 250;

export interface FrameSample {
  /** Duration of the render frame. */
  readonly frameMs: number;
  /** Steps of 1/60 s the visual clock moved on, and the cadence it snaps on (Hz). */
  readonly steps: number;
  readonly cadenceHz: number;
  /** Simulation ticks run during this frame. */
  readonly ticks: number;
  /** Time spent running those ticks. */
  readonly tickTimeMs: number;
}

export function isDebugEnabled(): boolean {
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug');
}

/** Text panel with loop statistics. Plain DOM so the text stays crisp at any game scale. */
export class DebugOverlay {
  private readonly element: HTMLPreElement;
  private elapsedMs = 0;
  private frames = 0;
  private ticks = 0;
  private tickTimeMs = 0;
  private maxTickTimeMs = 0;
  private cadenceHz = 0;
  /**
   * The frames that broke the cadence (a step moved to another frame), over the whole fight: 0
   * on a regular screen (docs/qualite-adaptative.md §7).
   */
  private readonly breaks = new CadenceBreaks();
  private fightFrames = 0;
  private offCadence = 0;

  constructor(parent: HTMLElement) {
    this.element = document.createElement('pre');
    this.element.className = 'debug-overlay';
    parent.appendChild(this.element);
  }

  /** @param describeState Only called when the text is refreshed, to avoid building strings every frame. */
  record(sample: FrameSample, describeState: () => string): void {
    this.elapsedMs += sample.frameMs;
    this.frames += 1;
    this.ticks += sample.ticks;
    this.tickTimeMs += sample.tickTimeMs;
    this.maxTickTimeMs = Math.max(this.maxTickTimeMs, sample.tickTimeMs);
    this.cadenceHz = sample.cadenceHz;
    this.fightFrames += 1;
    if (this.breaks.frame(sample.steps, sample.frameMs)) this.offCadence += 1;

    if (this.elapsedMs >= REFRESH_INTERVAL_MS) {
      this.render(describeState());
      this.reset();
    }
  }

  destroy(): void {
    this.element.remove();
  }

  private render(stateDescription: string): void {
    const perSecond = 1000 / this.elapsedMs;
    const avgTickMs = this.ticks > 0 ? this.tickTimeMs / this.ticks : 0;
    const offCadence = (100 * this.offCadence) / this.fightFrames;
    this.element.textContent = [
      `fps    ${(this.frames * perSecond).toFixed(0)}  cadence ${this.cadenceHz} Hz`,
      `hors cadence  ${this.offCadence} (${offCadence.toFixed(2)} %)`,
      `ticks  ${(this.ticks * perSecond).toFixed(0)}/s`,
      `tick   ${avgTickMs.toFixed(3)} ms (max ${this.maxTickTimeMs.toFixed(3)})`,
      stateDescription,
    ].join('\n');
  }

  private reset(): void {
    this.elapsedMs = 0;
    this.frames = 0;
    this.ticks = 0;
    this.tickTimeMs = 0;
    this.maxTickTimeMs = 0;
  }
}

/** The state in a few lines, for the overlay (built only when its text is refreshed). */
export function describeGame(state: GameState): string {
  const [a, b] = state.fighters;
  const lines = [
    `frame  ${state.frame}  ${state.round.phase}  hitstop=${state.hitstop}`,
    `P1     ${describeFighter(a)}`,
    `P2     ${describeFighter(b)}`,
  ];
  const { hold } = state;
  if (hold) {
    const tech = hold.techable ? '' : ' PUNITION';
    lines.push(`hold   P${hold.holder + 1} t=${hold.frame}/${hold.limit} x${hold.pummels}${tech}`);
  }
  return lines.join('\n');
}

function describeFighter(fighter: FighterState): string {
  const x = Math.round(toPx(fighter.x));
  const y = Math.round(toPx(fighter.y));
  const move = fighter.move ? ` ${fighter.move}` : '';
  return `${fighter.action}${move}[${fighter.actionFrame}] hp=${fighter.health} x=${x} y=${y}`;
}
