/** How often the overlay text is refreshed. Updating the DOM every frame would be wasteful. */
const REFRESH_INTERVAL_MS = 250;

export interface FrameSample {
  /** Duration of the render frame. */
  readonly frameMs: number;
  /** Simulation ticks run during this frame. */
  readonly ticks: number;
  /** Time spent running those ticks. */
  readonly tickTimeMs: number;
  /** Current simulation frame number. */
  readonly simFrame: number;
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

  constructor(parent: HTMLElement) {
    this.element = document.createElement('pre');
    this.element.className = 'debug-overlay';
    parent.appendChild(this.element);
  }

  record(sample: FrameSample): void {
    this.elapsedMs += sample.frameMs;
    this.frames += 1;
    this.ticks += sample.ticks;
    this.tickTimeMs += sample.tickTimeMs;
    this.maxTickTimeMs = Math.max(this.maxTickTimeMs, sample.tickTimeMs);

    if (this.elapsedMs >= REFRESH_INTERVAL_MS) {
      this.render(sample.simFrame);
      this.reset();
    }
  }

  destroy(): void {
    this.element.remove();
  }

  private render(simFrame: number): void {
    const perSecond = 1000 / this.elapsedMs;
    const avgTickMs = this.ticks > 0 ? this.tickTimeMs / this.ticks : 0;
    this.element.textContent = [
      `fps    ${(this.frames * perSecond).toFixed(0)}`,
      `ticks  ${(this.ticks * perSecond).toFixed(0)}/s`,
      `tick   ${avgTickMs.toFixed(3)} ms (max ${this.maxTickTimeMs.toFixed(3)})`,
      `frame  ${simFrame}`,
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
