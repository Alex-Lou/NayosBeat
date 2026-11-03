import { afterEach, describe, expect, it, vi } from 'vitest';
import { PadButton } from '../../src/input/gamepad';
import { StageSelect, type SelectPlace, type StageSelectOptions } from '../../src/ui/stage-select';
import { installFakePage, type FakeElement, type FakePage } from '../render/fake-dom';

type Id = 'street' | 'gym' | 'dock';

const thumb = (name: string) => [
  { url: `${name}-far.png`, x: -0.125, y: 0, width: 1.25, height: 1 },
  { url: `${name}-floor.png`, x: -0.5, y: 0.85, width: 2, height: 0.15 },
];

const PLACES: readonly SelectPlace<Id>[] = [
  { id: 'street', name: 'Warehouse Street', description: 'La rue', thumb: thumb('street') },
  { id: 'gym', name: 'Viaduct Gym', description: 'La salle', thumb: thumb('gym') },
  { id: 'dock', name: 'Loading Dock', description: 'Le quai', thumb: thumb('dock') },
];

function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

function only(node: FakeElement, name: string): FakeElement {
  const [found, ...others] = byClass(node, name);
  if (!found || others.length > 0) throw new Error(`Not exactly one .${name}`);
  return found;
}

function press(page: FakePage, code: string): void {
  page.window.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code }));
}

/** The « Lieu » screen on a fake page: « Aléatoire » and three places, in rows of two. */
function setup(options: Partial<StageSelectOptions<Id>> = {}) {
  const page = installFakePage();
  const onPick = vi.fn();
  const onBack = vi.fn();
  const screen = new StageSelect<Id>(page.body as unknown as HTMLElement, {
    places: PLACES,
    columns: 2,
    onPick,
    onBack,
    ...options,
  });
  const [root] = page.body.children;
  if (!root) throw new Error('No screen');
  const tiles = byClass(root, 'select-tile');
  return {
    page,
    root,
    screen,
    onPick,
    onBack,
    tiles,
    selected: () =>
      tiles.flatMap((tile, index) => (tile.classList.contains('selected') ? [index] : [])),
    view: only(root, 'stage-view'),
    name: only(root, 'select-name'),
    description: only(root, 'select-description'),
  };
}

const layersOf = (node: FakeElement) =>
  byClass(node, 'stage-layer').map((layer) => ({
    src: (layer as unknown as { src: string }).src,
    ...layer.style,
  }));

describe('StageSelect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('offers « Aléatoire » first, then each place, its thumbnail its layers where they lie', () => {
    const { tiles, view, name, description, selected } = setup();
    expect(tiles.map((tile) => only(tile, 'select-tile-name').textContent)).toEqual([
      'Aléatoire',
      'Warehouse Street',
      'Viaduct Gym',
      'Loading Dock',
    ]);
    const [random, street] = tiles;
    if (!random || !street) throw new Error('tiles');
    expect(byClass(random, 'stage-layer')).toHaveLength(0);
    expect(layersOf(street)).toEqual([
      { src: 'street-far.png', left: '-12.5%', top: '0%', width: '125%', height: '100%' },
      { src: 'street-floor.png', left: '-50%', top: '85%', width: '200%', height: '15%' },
    ]);
    // The cursor starts on « Aléatoire »: no picture, a question mark.
    expect(selected()).toEqual([0]);
    expect([name.textContent, description.textContent]).toEqual(['Aléatoire', 'Un lieu au hasard']);
    expect(view.textContent).toBe('?');
    expect(tiles.every(({ type, tabIndex }) => type === 'button' && tabIndex === -1)).toBe(true);
  });

  it('starts on the place chosen last, and shows it larger beside the tiles', () => {
    const { selected, view, name } = setup({ initial: 'gym' });
    expect(selected()).toEqual([2]);
    expect(name.textContent).toBe('Viaduct Gym');
    expect(view.textContent).toBe('');
    expect(layersOf(view).map(({ src }) => src)).toEqual(['gym-far.png', 'gym-floor.png']);
  });

  it('moves along the grid with the keys and picks with Enter, « Aléatoire » as random', () => {
    const { page, selected, onPick, view } = setup();
    press(page, 'ArrowRight');
    expect(selected()).toEqual([1]);
    press(page, 'ArrowDown');
    expect(selected()).toEqual([3]);
    press(page, 'Enter');
    expect(onPick).toHaveBeenLastCalledWith('dock');
    press(page, 'ArrowUp');
    press(page, 'ArrowLeft');
    expect(selected()).toEqual([0]);
    // Back on « Aléatoire »: the place's picture gives way to the question mark.
    expect(byClass(view, 'stage-layer')).toHaveLength(0);
    press(page, 'Enter');
    expect(onPick).toHaveBeenLastCalledWith('random');
  });

  it('selects with a tap, validates with « Valider », and goes back with « Annuler », Escape or B', () => {
    const pad = { connected: true, axes: [0, 0], buttons: [] as { pressed: boolean }[] };
    vi.stubGlobal('navigator', { getGamepads: () => [pad] });
    const { page, root, tiles, onPick, onBack, screen } = setup();
    expect(only(root, 'menu-help-touch').textContent).toBe('Touche un lieu, puis Valide');
    // A tap only shows the place: the player sees it, then validates.
    tiles[2]?.dispatchEvent(new Event('click'));
    expect(tiles[2]?.classList.contains('selected')).toBe(true);
    expect(onPick).not.toHaveBeenCalled();
    only(root, 'select-confirm').dispatchEvent(new Event('click'));
    expect(onPick).toHaveBeenLastCalledWith('gym');
    // « Annuler » does what Escape and B do.
    only(root, 'select-cancel').dispatchEvent(new Event('click'));
    expect(onBack).toHaveBeenCalledTimes(1);
    press(page, 'Escape');
    expect(onBack).toHaveBeenCalledTimes(2);
    pad.buttons[PadButton.East] = { pressed: true };
    page.runFrames();
    expect(onBack).toHaveBeenCalledTimes(3);
    screen.dispose();
    expect(page.body.children).toHaveLength(0);
    expect(page.listeners()).toBe(0);
    expect(page.pendingFrames()).toBe(0);
  });
});
