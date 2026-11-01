import type Phaser from 'phaser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/app';
import { DEFAULT_SETUP, matchConfigOf } from '../../src/app/match-setup';
import { CARD_FADE_MS } from '../../src/ui/fight-card';
import { viewingFromUrl, type Viewing } from '../../src/app/viewing';
import type { Sfx } from '../../src/audio/sfx';
import type { RenderMode } from '../../src/render/render-mode';
import { SIMPLE_MODE_NOTICE } from '../../src/ui/title-screen';
import { installFakePage, type FakeElement } from '../render/fake-dom';

// The help's tables need a real page: here, the screen around them is what is looked at.
vi.mock('../../src/app/controls-content', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/app/controls-content')>()),
  controlsContent: () => document.createElement('div'),
}));

/** The elements under `node` that have the class `name`, in page order. */
function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

/**
 * The app on a fake page, its storage `stored`, the system asking for less motion or not, a
 * fight scene that records what it is given, the game drawn in `mode`.
 */
function launch(
  stored: Record<string, string> = {},
  reducedMotion = false,
  viewing?: Viewing,
  mode: RenderMode = 'full',
) {
  const page = installFakePage();
  if (reducedMotion) {
    Object.assign(page.window, {
      matchMedia: (media: string) => ({
        matches: media.includes('reduced-motion'),
        addEventListener: () => undefined,
      }),
    });
  }
  const kept = new Map(Object.entries(stored));
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => kept.set(key, value),
  });
  const fight = {
    applyComfort: vi.fn(),
    resumeMatch: vi.fn(),
    setViewing: vi.fn(),
    setDummy: vi.fn(),
    setBoxes: vi.fn(),
    setTrainingData: vi.fn(),
  };
  const start = vi.fn();
  const game = {
    loop: { sleep: vi.fn(), wake: vi.fn() },
    scene: { getScene: () => fight, start, stop: vi.fn() },
  } as unknown as Phaser.Game;
  let volumes = { effects: 100, music: 100 };
  const sfx = {
    get volumes() {
      return volumes;
    },
    setVolume: (kind: 'effects' | 'music', percent: number) => {
      volumes = { ...volumes, [kind]: percent };
    },
    unlock: vi.fn(),
    play: vi.fn(),
  } as unknown as Sfx;
  // What the title screen tells a key press by.
  class KeyboardEvent extends Event {}
  vi.stubGlobal('KeyboardEvent', KeyboardEvent);
  const app = new App(page.body as unknown as HTMLElement, game, sfx, mode, viewing);
  app.start();
  const press = (code: string) => {
    page.window.dispatchEvent(Object.assign(new KeyboardEvent('keydown'), { code, repeat: false }));
  };
  const screen = () => {
    const [root] = page.body.children;
    if (!root) throw new Error('Nothing on screen');
    return {
      title: byClass(root, 'menu-title')[0]?.textContent,
      subtitle: byClass(root, 'menu-subtitle')[0]?.textContent,
      items: byClass(root, 'menu-item').map((item) => item.textContent),
      selected: byClass(root, 'menu-item').findIndex((item) => item.classList.contains('selected')),
      notice: byClass(root, 'menu-notice')[0]?.textContent,
    };
  };
  /** Clicks the item whose label starts with `label`. */
  const choose = (label: string) => {
    const [root] = page.body.children;
    const item = byClass(root as FakeElement, 'menu-item').find((button) =>
      button.textContent.startsWith(label),
    );
    if (!item) throw new Error(`No item ${label}`);
    item.dispatchEvent(new Event('click'));
  };
  return { page, app, fight, start, kept, press, screen, choose, root: page.body };
}

describe('the options (docs/flashs.md §4)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the notice once, after the title, then the main menu', () => {
    vi.useFakeTimers();
    const first = launch();
    first.press('Enter');
    expect(first.screen().title).toBe('Avant de jouer');
    expect(first.screen().notice).toContain('crises convulsives');
    // What to watch for, and what to do then.
    expect(first.screen().notice).toContain('arrête tout de suite de jouer et consulte un médecin');
    expect(first.screen().items).toEqual(['Jouer', 'Options']);
    vi.advanceTimersByTime(1000);
    first.choose('Jouer');
    expect(first.screen().title).toBe('NAYOSBEAT');
    expect(first.kept.get('nayosbeat.notice')).toBe('seen');
    const again = launch({ 'nayosbeat.notice': 'seen' });
    again.press('Enter');
    expect(again.screen().title).toBe('NAYOSBEAT');
  });

  it('keeps the notice through a title pressed twice, and back to the title unread', () => {
    vi.useFakeTimers();
    const { press, screen, kept } = launch();
    press('Enter');
    // The second press of a title passed in a hurry: the notice stays.
    vi.advanceTimersByTime(150);
    press('Enter');
    expect(screen().title).toBe('Avant de jouer');
    expect(kept.has('nayosbeat.notice')).toBe(false);
    // Back: to the title, the notice still to read, and shown again on the next press.
    vi.advanceTimersByTime(1000);
    press('Escape');
    expect(screen().items).toEqual([]);
    expect(kept.has('nayosbeat.notice')).toBe(false);
    press('Enter');
    expect(screen().title).toBe('Avant de jouer');
  });

  it("says « Commandes » once: the devices' tab named after them, a fighter's page by its name (L23)", () => {
    const { press, screen, choose } = launch({ 'nayosbeat.notice': 'seen' });
    press('Enter');
    choose('Commandes');
    expect(screen().title).toBe('Commandes');
    expect(screen().subtitle).toBeUndefined();
    expect(screen().items.filter((item) => item === 'Commandes')).toHaveLength(0);
    expect(screen().items[0]).toBe('Clavier');
    choose('Nayo');
    expect(screen().subtitle).toBe('Nayo');
  });

  it('moves the sound from the main menu into the options screen', () => {
    const { press, screen, choose } = launch({ 'nayosbeat.notice': 'seen' });
    press('Enter');
    expect(screen().items.some((item) => item.startsWith('Son'))).toBe(false);
    choose('Options');
    expect(screen().title).toBe('Options');
    expect(screen().items).toEqual([
      'Volume des effets : 100 %',
      'Volume de la musique : 100 %',
      'Effets de flash : normaux',
      "Tremblement de l'écran : normal",
      'Mise en scène : complète',
      'Taille du texte : normale',
      'Retour',
    ]);
    // By steps of 25, back to 100 after silence (P16).
    for (const percent of [75, 50, 25, 0, 100]) {
      choose('Volume des effets');
      expect(screen().items[0]).toBe(`Volume des effets : ${String(percent)} %`);
      expect(screen().selected).toBe(0);
    }
    choose('Volume de la musique');
    expect(screen().items[1]).toBe('Volume de la musique : 75 %');
    expect(screen().items[0]).toBe('Volume des effets : 100 %');
  });

  it('cycles « Effets de flash » in place, keeps that choice alone, and marks the menus calm', () => {
    const { press, screen, choose, kept, root } = launch({ 'nayosbeat.notice': 'seen' });
    press('Enter');
    choose('Options');
    choose('Effets de flash');
    expect(screen().items[2]).toBe('Effets de flash : réduits');
    expect(screen().selected).toBe(2);
    expect(kept.get('nayosbeat.flashes')).toBe('reduced');
    expect(kept.has('nayosbeat.shake')).toBe(false);
    expect(root.classList.contains('calm')).toBe(true);
    choose('Effets de flash');
    expect(screen().items[2]).toBe('Effets de flash : aucun');
    choose('Effets de flash');
    expect(screen().items[2]).toBe('Effets de flash : normaux');
    expect(root.classList.contains('calm')).toBe(false);
    choose('Tremblement');
    choose('Tremblement');
    expect(screen().items[3]).toBe("Tremblement de l'écran : aucun");
    expect(root.classList.contains('still')).toBe(true);
    // Back to the main menu, on the options.
    choose('Retour');
    expect(screen().title).toBe('NAYOSBEAT');
    expect(screen().items[screen().selected]).toBe('Options');
  });

  it("cycles « Taille du texte » in place, keeps it, and turns the menus' text up (P22)", () => {
    const { press, screen, choose, kept, root } = launch({ 'nayosbeat.notice': 'seen' });
    press('Enter');
    choose('Options');
    expect(root.classList.contains('large-text')).toBe(false);
    choose('Taille du texte');
    expect(screen().items[screen().selected]).toBe('Taille du texte : grande');
    expect(kept.get('nayosbeat.text')).toBe('large');
    expect(root.classList.contains('large-text')).toBe(true);
    // The next launch reads it back, from the title on.
    const again = launch({ 'nayosbeat.notice': 'seen', 'nayosbeat.text': 'large' });
    expect(again.root.classList.contains('large-text')).toBe(true);
    choose('Taille du texte');
    expect(root.classList.contains('large-text')).toBe(false);
  });

  it('cycles « Mise en scène » in place and keeps it (docs/finisher.md §1.14)', () => {
    const { press, screen, choose, kept } = launch({ 'nayosbeat.notice': 'seen' });
    press('Enter');
    choose('Options');
    choose('Mise en scène');
    expect(screen().items[4]).toBe('Mise en scène : courte');
    expect(screen().selected).toBe(4);
    expect(kept.get('nayosbeat.staging')).toBe('short');
    expect(kept.has('nayosbeat.flashes')).toBe(false);
    choose('Mise en scène');
    expect(screen().items[4]).toBe('Mise en scène : complète');
    const again = launch({ 'nayosbeat.notice': 'seen', 'nayosbeat.staging': 'short' });
    again.press('Enter');
    again.choose('Options');
    expect(again.screen().items[4]).toBe('Mise en scène : courte');
  });

  it('opens from the pause, applies at once to the fight, and goes back to the pause', () => {
    const { app, screen, choose, fight } = launch({ 'nayosbeat.notice': 'seen' });
    (app as unknown as { showPause(): void }).showPause();
    expect(screen().items).toContain('Options');
    choose('Options');
    choose('Tremblement');
    expect(fight.applyComfort).toHaveBeenLastCalledWith({
      flashes: 'normal',
      shake: 'reduced',
      staging: 'full',
    });
    choose('Retour');
    expect(screen().title).toBe('Pause');
    expect(screen().items[screen().selected]).toBe('Options');
  });

  it('starts from what the system asks when nothing was chosen: less motion', () => {
    const { press, screen, choose, root } = launch({ 'nayosbeat.notice': 'seen' }, true);
    expect(root.classList.contains('calm')).toBe(true);
    expect(root.classList.contains('still')).toBe(true);
    press('Enter');
    choose('Options');
    expect(screen().items.slice(2, 4)).toEqual([
      'Effets de flash : réduits',
      "Tremblement de l'écran : aucun",
    ]);
  });
});

describe('how a fight is watched (docs/art/animation-plan.md §2, V0)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** The app on the training's menu of the dummy, as after both fighters were picked. */
  function training(viewing?: Viewing) {
    const launched = launch({ 'nayosbeat.notice': 'seen' }, false, viewing);
    const app = launched.app as unknown as {
      setup: object;
      chooseDummy(): void;
      showPause(): void;
    };
    app.setup = { ...app.setup, mode: 'training' };
    app.chooseDummy();
    return { ...launched, app };
  }

  it('reads the slowdown and the animation of before in the address, nothing else', () => {
    expect(viewingFromUrl('')).toEqual({ slowdown: 1, anim: { legacy: false } });
    expect(viewingFromUrl('?vitesse=2&anim=avant')).toEqual({
      slowdown: 2,
      anim: { legacy: true },
    });
    expect(viewingFromUrl('?vitesse=4&anim=nouvelle').slowdown).toBe(4);
    expect(viewingFromUrl('?vitesse=3&anim=hier')).toEqual({
      slowdown: 1,
      anim: { legacy: false },
    });
  });

  it('cycles « Vitesse » and « Animation » in place on the training menu, given to the fight', () => {
    const { screen, choose, start } = training();
    expect(screen().items).toContain('Vitesse : normale');
    expect(screen().items).toContain('Animation : nouvelle');
    choose('Vitesse');
    expect(screen().items[screen().selected]).toBe('Vitesse : ½');
    choose('Vitesse');
    expect(screen().items[screen().selected]).toBe('Vitesse : ¼');
    choose('Animation');
    expect(screen().items[screen().selected]).toBe("Animation : d'avant");
    choose('Immobile');
    expect(start).toHaveBeenLastCalledWith(
      'fight',
      expect.objectContaining({ viewing: { slowdown: 4, anim: { legacy: true } } }),
    );
  });

  it('cycles « Finisher » and « Vie du mannequin » in place next to « Jauge », given to the match (docs/finisher.md §5.7)', () => {
    const { screen, choose, start } = training();
    const items = screen().items;
    const gauge = items.findIndex((item) => item.startsWith('Jauge'));
    expect(items.slice(gauge + 1, gauge + 3)).toEqual([
      'Finisher : comme en match',
      'Vie du mannequin : 100 %',
    ]);
    choose('Finisher');
    expect(screen().items[screen().selected]).toBe('Finisher : toujours prêt');
    choose('Finisher');
    expect(screen().items[screen().selected]).toBe('Finisher : désactivé');
    choose('Finisher');
    choose('Finisher');
    for (const health of [50, 30, 10, 100, 50, 30]) {
      choose('Vie du mannequin');
      expect(screen().items[screen().selected]).toBe(`Vie du mannequin : ${health} %`);
    }
    choose('Immobile');
    const setup = expect.objectContaining({ finisher: 'always', dummyHealth: 30 }) as unknown;
    expect(start).toHaveBeenLastCalledWith('fight', expect.objectContaining({ setup }));
  });

  it("starts from the address's choice, and changes it at once from training's pause", () => {
    const { app, screen, choose, fight } = training(viewingFromUrl('?vitesse=2'));
    expect(screen().items).toContain('Vitesse : ½');
    app.showPause();
    choose('Animation');
    expect(fight.setViewing).toHaveBeenLastCalledWith({ slowdown: 2, anim: { legacy: true } });
    expect(screen().title).toBe('Pause');
    expect(screen().items[screen().selected]).toBe("Animation : d'avant");
  });

  it('keeps the pause of a match free of them', () => {
    const { app, screen } = launch({ 'nayosbeat.notice': 'seen' });
    (app as unknown as { showPause(): void }).showPause();
    expect(screen().items.some((item) => item.startsWith('Vitesse'))).toBe(false);
  });

  it("sets the dummy and the boxes from training's pause, at once (docs/polish, P19)", () => {
    const { app, screen, choose, fight, start } = training();
    choose('Immobile');
    app.showPause();
    expect(screen().items).toContain('Mannequin : Immobile');
    expect(screen().items).toContain('Boîtes : non');
    choose('Mannequin');
    expect(fight.setDummy).toHaveBeenLastCalledWith('dummyBlock');
    expect(screen().title).toBe('Pause');
    expect(screen().items[screen().selected]).toBe('Mannequin : Pare tout');
    choose('Boîtes');
    expect(fight.setBoxes).toHaveBeenLastCalledWith(true);
    expect(screen().items[screen().selected]).toBe('Boîtes : oui');
    // Started over, the session keeps both.
    choose('Recommencer');
    expect(start).toHaveBeenLastCalledWith(
      'fight',
      expect.objectContaining({
        boxes: true,
        setup: expect.objectContaining({ dummy: 'dummyBlock' }) as unknown,
      }),
    );
  });

  it("shows training's data by default, and hides it from the pause, at once (lot 13)", () => {
    const { app, screen, choose, fight, start } = training();
    choose('Immobile');
    expect(start).toHaveBeenLastCalledWith(
      'fight',
      expect.objectContaining({ trainingData: true }),
    );
    app.showPause();
    expect(screen().items).toContain('Données : oui');
    choose('Données');
    expect(fight.setTrainingData).toHaveBeenLastCalledWith(false);
    expect(screen().items[screen().selected]).toBe('Données : non');
    choose('Recommencer');
    expect(start).toHaveBeenLastCalledWith(
      'fight',
      expect.objectContaining({ trainingData: false }),
    );
  });

  it('starts training over where « Position » says, as the pause closes (docs/combat-v2.md D32)', () => {
    const { app, screen, choose, fight, start } = training();
    const startedAt = (position: string) => {
      expect(start).toHaveBeenLastCalledWith(
        'fight',
        expect.objectContaining({ setup: expect.objectContaining({ position }) as unknown }),
      );
    };
    choose('Immobile');
    startedAt('center');
    app.showPause();
    expect(screen().items).toContain('Position : centre');
    choose('Position');
    expect(screen().title).toBe('Pause');
    expect(screen().items[screen().selected]).toBe('Position : coin gauche');
    expect(start).toHaveBeenCalledTimes(1);
    // Resumed, the fight starts over there.
    choose('Reprendre');
    expect(fight.resumeMatch).not.toHaveBeenCalled();
    expect(start).toHaveBeenCalledTimes(2);
    startedAt('leftCorner');
    // Unchanged, the pause resumes the fight as it was.
    app.showPause();
    choose('Reprendre');
    expect(fight.resumeMatch).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledTimes(2);
    // « Recommencer » puts them back there, every time.
    app.showPause();
    choose('Position');
    choose('Recommencer');
    startedAt('rightCorner');
    app.showPause();
    choose('Recommencer');
    startedAt('rightCorner');
  });

  it('gives the core the start of training only (docs/combat-v2.md D32)', () => {
    const setup = { ...DEFAULT_SETUP, position: 'leftCorner' } as const;
    expect(matchConfigOf({ ...setup, mode: 'training' }).trainingStart).toBe('leftCorner');
    expect(matchConfigOf(setup)).not.toHaveProperty('trainingStart');
  });

  it('covers the fight with who fights whom until its first frame, never a black screen (L16)', () => {
    vi.useFakeTimers();
    const { app, screen, choose, start, root } = training();
    const cards = () => root.children.filter((child) => child.className.includes('fight-card'));
    choose('Immobile');
    // The menu gone, the card up while the fight loads and builds.
    expect(root.children.map((child) => child.className)).toEqual(['menu fight-card']);
    expect(root.children[0]?.children[0]?.children[0]?.textContent).toBe('Nayo contre Riff');
    const shown = () => {
      (start.mock.lastCall?.[1] as { onShown?: () => void } | undefined)?.onShown?.();
    };
    // Its first frame drawn: the card fades, then goes.
    shown();
    expect(cards()[0]?.classList.contains('leaving')).toBe(true);
    vi.advanceTimersByTime(CARD_FADE_MS);
    expect(cards()).toHaveLength(0);
    // Started over, another screen first: the card goes at once.
    app.showPause();
    choose('Recommencer');
    expect(cards()).toHaveLength(1);
    app.showPause();
    expect(cards()).toHaveLength(0);
    expect(screen().title).toBe('Pause');
    // Closed before its first frame: the card goes with the fight.
    choose('Recommencer');
    expect(cards()).toHaveLength(1);
    (app as unknown as { stopFight(): void }).stopFight();
    expect(cards()).toHaveLength(0);
    vi.useRealTimers();
  });

  it('keeps the dummy and the boxes out of the pause of a match', () => {
    const { app, screen } = launch({ 'nayosbeat.notice': 'seen' });
    (app as unknown as { showPause(): void }).showPause();
    expect(screen().items.some((item) => item.startsWith('Mannequin'))).toBe(false);
    expect(screen().items.some((item) => item.startsWith('Boîtes'))).toBe(false);
    expect(screen().items.some((item) => item.startsWith('Position'))).toBe(false);
  });

  it('leaves the matches as the address asks, whatever training chose, and training its own', () => {
    const { app, screen, choose, start } = training(viewingFromUrl('?vitesse=2'));
    const flow = app as unknown as { afterFighterChosen(player: 0 | 1): void };
    choose('Vitesse');
    choose('Animation');
    choose('Immobile');
    expect(start).toHaveBeenLastCalledWith(
      'fight',
      expect.objectContaining({ viewing: { slowdown: 4, anim: { legacy: true } } }),
    );
    // Out of training, to a match against the computer: its pause could not change them back.
    app.showPause();
    choose('Quitter');
    choose("Contre l'ordinateur");
    flow.afterFighterChosen(1);
    choose('Normal');
    expect(start).toHaveBeenLastCalledWith(
      'fight',
      expect.objectContaining({ viewing: { slowdown: 2, anim: { legacy: false } } }),
    );
    // Back in training, its choice is still there for this session.
    app.showPause();
    choose('Quitter');
    choose('Entraînement');
    flow.afterFighterChosen(1);
    expect(screen().items).toContain('Vitesse : ¼');
    expect(screen().items).toContain("Animation : d'avant");
  });
});

describe('the simplified mode, without WebGL (docs/qualite-adaptative.md §2.3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const titleNotice = (root: FakeElement) => byClass(root, 'title-notice')[0]?.textContent;

  it('says so on the title, and tells every fight', () => {
    const { app, root, choose, start } = launch(
      { 'nayosbeat.notice': 'seen' },
      false,
      undefined,
      'simple',
    );
    expect(titleNotice(root)).toBe(SIMPLE_MODE_NOTICE);
    const flow = app as unknown as { setup: object; chooseDummy(): void };
    flow.setup = { ...flow.setup, mode: 'training' };
    flow.chooseDummy();
    choose('Immobile');
    expect(start).toHaveBeenLastCalledWith('fight', expect.objectContaining({ mode: 'simple' }));
  });

  it('says nothing with WebGL, its fights drawn whole', () => {
    const { app, root, choose, start } = launch({ 'nayosbeat.notice': 'seen' });
    expect(titleNotice(root)).toBeUndefined();
    const flow = app as unknown as { setup: object; chooseDummy(): void };
    flow.setup = { ...flow.setup, mode: 'training' };
    flow.chooseDummy();
    choose('Immobile');
    expect(start).toHaveBeenLastCalledWith('fight', expect.objectContaining({ mode: 'full' }));
  });
});
