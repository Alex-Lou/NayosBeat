import { vi } from 'vitest';

/**
 * Just enough of a browser for the classes that listen to the page (devices, menus) to run in
 * Node, counting the listeners they leave behind. A listener counts while its target can still
 * call it: the window, the document, a media query, or an element attached to the page (one
 * that was removed goes away with its listeners).
 */

type Listener = EventListenerOrEventListenerObject;

/** An event target that remembers which listeners it holds. */
export class CountingTarget extends EventTarget {
  private readonly held = new Map<string, Set<Listener>>();

  override addEventListener(
    type: string,
    listener: Listener | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    super.addEventListener(type, listener, options);
    if (!listener) return;
    const listeners = this.held.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.held.set(type, listeners);
  }

  override removeEventListener(
    type: string,
    listener: Listener | null,
    options?: EventListenerOptions | boolean,
  ): void {
    super.removeEventListener(type, listener, options);
    if (listener) this.held.get(type)?.delete(listener);
  }

  get listenerCount(): number {
    let count = 0;
    for (const listeners of this.held.values()) count += listeners.size;
    return count;
  }
}

class FakeClassList {
  private readonly names = new Set<string>();
  add(name: string): void {
    this.names.add(name);
  }
  remove(name: string): void {
    this.names.delete(name);
  }
  contains(name: string): boolean {
    return this.names.has(name);
  }
}

/** An animation started on an element: what it plays, and whether it was stopped. */
export class FakeAnimation {
  cancelled = false;
  constructor(
    readonly keyframes: Keyframe[],
    readonly options: KeyframeAnimationOptions,
  ) {}
  cancel(): void {
    this.cancelled = true;
  }
}

export class FakeElement extends CountingTarget {
  className = '';
  textContent = '';
  type = '';
  tabIndex = 0;
  readonly style: Record<string, string> = {};
  readonly dataset: Record<string, string> = {};
  readonly classList = new FakeClassList();
  readonly children: FakeElement[] = [];
  parent: FakeElement | null = null;

  constructor(
    readonly tagName: string,
    private readonly root = false,
  ) {
    super();
    // Custom properties (`--boost-bars`) are set through `setProperty`: kept with the others.
    Object.defineProperty(this.style, 'setProperty', {
      value: (name: string, value: string) => {
        this.style[name] = value;
      },
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }

  get isConnected(): boolean {
    return this.root || (this.parent?.isConnected ?? false);
  }

  /** Text appended is kept with the element's own (`text` reads it all, in order). */
  append(...nodes: (FakeElement | string)[]): void {
    for (const node of nodes) {
      if (typeof node === 'string') this.textContent += node;
      else this.appendChild(node);
    }
  }

  replaceChildren(...nodes: (FakeElement | string)[]): void {
    for (const child of [...this.children]) child.remove();
    this.textContent = '';
    this.append(...nodes);
  }

  /** Its text and its children's, in order (their own text after the element's). */
  get text(): string {
    return this.textContent + this.children.map((child) => child.text).join('');
  }

  appendChild(node: FakeElement): FakeElement {
    node.remove();
    node.parent = this;
    this.children.push(node);
    return node;
  }

  remove(): void {
    const siblings = this.parent?.children;
    if (siblings) siblings.splice(siblings.indexOf(this), 1);
    this.parent = null;
  }

  /** Attributes (labels, roles), kept to be read by the tests that look at them. */
  readonly attributes: Record<string, string> = {};
  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  setPointerCapture(): void {
    // Pointer capture plays no part in what is counted.
  }

  /** Times the element was scrolled into view (`scrollIntoView`). */
  scrolledIntoView = 0;
  scrollIntoView(): void {
    this.scrolledIntoView++;
  }

  /** Where the element is on the page: placed by hand in tests that touch it. */
  rect = { left: 0, top: 0, right: 0, bottom: 0 };
  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number } {
    return this.rect;
  }

  /** Animations started on the element (`animate`), stopped or not. */
  readonly animations: FakeAnimation[] = [];
  animate(keyframes: Keyframe[], options: KeyframeAnimationOptions): FakeAnimation {
    const animation = new FakeAnimation(keyframes, options);
    this.animations.push(animation);
    return animation;
  }

  /** Listeners of this element and of everything inside it. */
  get treeListenerCount(): number {
    let count = this.listenerCount;
    for (const child of this.children) count += child.treeListenerCount;
    return count;
  }
}

class FakeMediaQueryList extends CountingTarget {
  readonly matches = false;
  constructor(readonly media: string) {
    super();
  }
}

export interface FakePage {
  readonly window: CountingTarget;
  readonly body: FakeElement;
  /** Listeners still reachable from the page: what `dispose()` must bring back to zero. */
  listeners(): number;
  /** Animation frames requested and not yet run or cancelled. */
  pendingFrames(): number;
  /** Runs the animation frames requested so far (those they request wait for the next call). */
  runFrames(): void;
  /** Animations started on the page's elements and not stopped. */
  runningAnimations(): number;
}

/** Installs a fake window and document as globals (undone by `vi.unstubAllGlobals()`). */
export function installFakePage(): FakePage {
  const window = new CountingTarget();
  const document = new CountingTarget();
  const body = new FakeElement('body', true);
  const queries: FakeMediaQueryList[] = [];
  const elements: FakeElement[] = [];
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 1;

  Object.assign(window, {
    matchMedia: (media: string) => {
      const query = new FakeMediaQueryList(media);
      queries.push(query);
      return query;
    },
  });
  Object.assign(document, {
    body,
    hidden: false,
    createElement: (tag: string) => {
      const node = new FakeElement(tag);
      elements.push(node);
      return node;
    },
    createElementNS: (_: string, tag: string) => {
      const node = new FakeElement(tag);
      elements.push(node);
      return node;
    },
  });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', document);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(nextFrame, callback);
    return nextFrame++;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));

  return {
    window,
    body,
    listeners: () =>
      window.listenerCount +
      document.listenerCount +
      queries.reduce((sum, query) => sum + query.listenerCount, 0) +
      body.treeListenerCount,
    pendingFrames: () => frames.size,
    runFrames: () => {
      const due = [...frames];
      frames.clear();
      for (const [, callback] of due) callback(0);
    },
    runningAnimations: () =>
      elements.reduce(
        (sum, node) => sum + node.animations.filter(({ cancelled }) => !cancelled).length,
        0,
      ),
  };
}
