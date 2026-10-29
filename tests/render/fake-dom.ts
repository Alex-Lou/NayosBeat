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

export class FakeElement extends CountingTarget {
  className = '';
  textContent = '';
  type = '';
  tabIndex = 0;
  readonly style: Record<string, string> = {};
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

  append(...nodes: FakeElement[]): void {
    for (const node of nodes) this.appendChild(node);
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

  setAttribute(): void {
    // Attributes (labels) play no part in what is counted.
  }

  setPointerCapture(): void {
    // Pointer capture plays no part in what is counted.
  }

  /** Where the element is on the page: placed by hand in tests that touch it. */
  rect = { left: 0, top: 0, right: 0, bottom: 0 };
  getBoundingClientRect(): { left: number; top: number; right: number; bottom: number } {
    return this.rect;
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
}

/** Installs a fake window and document as globals (undone by `vi.unstubAllGlobals()`). */
export function installFakePage(): FakePage {
  const window = new CountingTarget();
  const document = new CountingTarget();
  const body = new FakeElement('body', true);
  const queries: FakeMediaQueryList[] = [];
  const frames = new Set<number>();
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
    createElement: (tag: string) => new FakeElement(tag),
  });
  vi.stubGlobal('window', window);
  vi.stubGlobal('document', document);
  vi.stubGlobal('requestAnimationFrame', () => {
    frames.add(nextFrame);
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
  };
}
