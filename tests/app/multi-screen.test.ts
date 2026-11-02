import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MultiCatalog } from '../../src/app/multi-catalog';
import { ANSWER_MS, multiFromUrl, MultiScreen, RETRY_MS } from '../../src/app/multi-screen';
import type { OnlineMatch } from '../../src/app/online-match';
import type { NameStore } from '../../src/app/name-store';
import type { FighterId } from '../../src/data/roster';
import type { Matchmaker } from '../../src/net/lobby';
import { encodeMessage } from '../../src/net/protocol';
import { SILENCE_MS } from '../../src/net/session';
import { FakeElement, installFakePage, type FakePage } from '../render/fake-dom';
import { FakeServer } from '../net/fake-net';

function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

/** Two places and two fighters, without art: the host draws `<map>` in the rain. */
const CATALOG: MultiCatalog = {
  places: () => [
    { id: 'rue', name: 'Rue', description: '', thumb: [] },
    { id: 'gym', name: 'Gym', description: '', thumb: [] },
  ],
  fighters: () => [
    { id: 'nayo', name: 'Nayo', description: '' },
    { id: 'riff', name: 'Riff', description: '' },
  ],
  draw: (map) => ({ map: map === 'random' ? 'rue' : map, atmosphere: 'midnight-rain' }),
  isStage: ({ map, atmosphere }) => ['rue', 'gym'].includes(map) && atmosphere === 'midnight-rain',
  isFighter: (id): id is FighterId => id === 'nayo' || id === 'riff',
  title: ({ map }) => (map === 'gym' ? 'Gym' : 'Rue'),
  name: (id) => (id === 'nayo' ? 'Nayo' : 'Riff'),
  variant: () => undefined,
};

function memoryNames(initial = ''): NameStore & { saved: string[] } {
  const saved: string[] = [];
  return { saved, load: () => initial, save: (name) => saved.push(name) };
}

/** A device: its own part of the page, its screen, its matchmaker on `server`. */
function device(
  page: FakePage,
  server: FakeServer,
  name: string,
  connect?: () => Promise<Matchmaker>,
) {
  const root = new FakeElement('div', true);
  page.body.appendChild(root);
  const onBack = vi.fn();
  const matches: OnlineMatch[] = [];
  const names = memoryNames(name);
  const screen = new MultiScreen(root as unknown as HTMLElement, {
    connect: connect ?? (() => Promise.resolve(server.device())),
    now: () => Date.now(),
    catalog: CATALOG,
    names,
    onBack,
    onFight: (match) => matches.push(match),
  });
  const texts = () => byClass(root, 'menu-notice').map((node) => node.textContent);
  const find = (className: string, label: string) =>
    byClass(root, className).find((node) => node.text.includes(label));
  const has = (label: string) => find('menu-item', label) !== undefined;
  const choose = (label: string) => {
    const item = find('menu-item', label) ?? find('select-tile', label);
    if (!item)
      throw new Error(`No « ${label} » on ${name || 'the'} screen: ${texts().join(' / ')}`);
    item.dispatchEvent(new Event('click'));
  };
  return { root, screen, onBack, names, texts, choose, has, matches };
}

/** Lets the fake network and timers move on. */
async function flush(ms = 0): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

function setup() {
  vi.useFakeTimers();
  const page = installFakePage();
  const server = new FakeServer();
  return { page, server };
}

/** Both devices search: Alex hosts room 0, Lou joins it. */
async function paired() {
  const { page, server } = setup();
  const alex = device(page, server, 'Alex');
  const lou = device(page, server, 'Lou');
  alex.choose('Rechercher');
  await flush();
  lou.choose('Rechercher');
  await flush();
  return { page, server, alex, lou };
}

describe('the « Multi » screens (docs/multijoueur.md §7)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows only with ?multi', () => {
    expect(multiFromUrl('?multi')).toBe(true);
    expect(multiFromUrl('?debug&multi=1')).toBe(true);
    expect(multiFromUrl('')).toBe(false);
    expect(multiFromUrl('?debug')).toBe(false);
  });

  it('asks the name once, before the first search, and keeps it', async () => {
    const { page, server } = setup();
    const me = device(page, server, '');
    me.choose('Rechercher');
    const field = byClass(me.root, 'menu-input')[0];
    if (!field) throw new Error('No name field');
    expect(field.focused).toBe(1);
    field.value = ' A ';
    me.choose('Valider');
    expect(byClass(me.root, 'menu-input-error')[0]?.textContent).toMatch(/^2 à 12 lettres/);
    field.value = ' Alex ';
    me.choose('Valider');
    expect(me.names.saved).toEqual(['Alex']);
    expect(me.texts()).toEqual(['Recherche d’un adversaire…']);
    await flush();
    expect(server.rooms.size).toBe(1);
  });

  it('pairs, shows each name to accept, then the host chooses the place and both a fighter', async () => {
    const { alex, lou, server } = await paired();
    expect(alex.texts()[0]).toBe('Adversaire trouvé : Lou');
    expect(lou.texts()[0]).toBe('Adversaire trouvé : Alex');
    alex.choose('Accepter');
    expect(alex.texts()[0]).toBe('En attente de la réponse de Lou…');
    lou.choose('Accepter');
    await flush();
    // The host's « Lieu » screen; the guest waits. No time to answer runs on: the pings' only.
    expect(lou.texts()[0]).toBe('Alex choisit le lieu…');
    expect(vi.getTimerCount()).toBe(2);
    alex.choose('Gym');
    await flush();
    alex.choose('Nayo');
    expect(alex.texts()[0]).toBe('En attente du choix de Lou…');
    await flush();
    lou.choose('Nayo');
    await flush();
    // Both chose: the host starts the fight at once, and each one gets its match.
    const [hostMatch] = alex.matches;
    const [guestMatch] = lou.matches;
    expect(hostMatch?.player).toBe(0);
    expect(guestMatch?.player).toBe(1);
    const plan = { stage: { map: 'gym', atmosphere: 'midnight-rain' }, fighters: ['nayo', 'nayo'] };
    expect(hostMatch?.plan).toEqual(plan);
    expect(guestMatch?.plan).toEqual(plan);
    expect(hostMatch?.names).toEqual(['Alex', 'Lou']);
    expect(guestMatch?.names).toEqual(['Alex', 'Lou']);
    // The host's delay, from its pings, the same on both devices.
    expect(guestMatch?.delay).toBe(hostMatch?.delay);
    // Handed over: closing the screens keeps the link; the match closes it.
    alex.screen.dispose();
    lou.screen.dispose();
    await flush();
    expect(server.openChannels()).toBe(2);
    hostMatch?.close();
    await flush();
    expect(server.openChannels()).toBe(0);
  });

  it('searches again after a refusal, the refused name refused at once from then on', async () => {
    const { alex, lou, server } = await paired();
    alex.choose('Refuser');
    await flush();
    expect(alex.texts()).toEqual(['Lou refusé.', `Nouvelle recherche dans ${RETRY_MS / 1000} s…`]);
    expect(lou.texts()[0]).toBe('Alex a refusé.');
    expect(server.rooms.size).toBe(0);
    // Both search again and meet again: Alex refuses Lou without asking.
    await flush(RETRY_MS);
    expect(alex.has('Accepter')).toBe(false);
    expect(alex.texts()[0]).toBe('Lou refusé.');
    expect(lou.texts()[0]).toBe('Alex a refusé.');
    expect(lou.has('Annuler')).toBe(true);
    alex.choose('Annuler');
    lou.choose('Annuler');
    await flush(RETRY_MS);
    expect(server.openChannels()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives each one 30 s to answer, then goes back without remembering the name', async () => {
    const { alex, lou } = await paired();
    alex.choose('Accepter');
    await flush(ANSWER_MS - 1);
    expect(lou.has('Accepter')).toBe(true);
    await flush(1);
    expect(lou.texts()[0]).toBe('Temps écoulé : personne n’a été accepté.');
    expect(alex.texts()[0]).toBe('Lou a refusé.');
  });

  it('goes back with a clear word when the other one leaves, goes silent or speaks nonsense', async () => {
    const left = await paired();
    left.alex.choose('Accepter');
    left.lou.choose('Accepter');
    await flush();
    left.lou.choose('Quitter');
    await flush();
    expect(left.alex.texts()[0]).toBe("L'autre appareil a quitté.");
    vi.unstubAllGlobals();

    const silent = await paired();
    const channel = [...silent.server.channels].find((c) => !c.isClosed);
    if (!channel) throw new Error('No link');
    // Lou's device freezes: nothing more comes from its end.
    channel.listen({ message: () => undefined, closed: () => undefined });
    channel.send = () => undefined;
    await flush(SILENCE_MS + 1000);
    expect([silent.alex.texts()[0], silent.lou.texts()[0]]).toContain(
      `Connexion perdue : aucune réponse depuis ${SILENCE_MS / 1000} s.`,
    );
    vi.unstubAllGlobals();

    const nonsense = await paired();
    const hostEnd = [...nonsense.server.channels].find((c) => !c.isClosed);
    hostEnd?.send(encodeMessage({ type: 'fighter', fighter: 'nayo' }));
    await flush();
    expect([nonsense.alex.texts()[0], nonsense.lou.texts()[0]]).toContain(
      "L'autre appareil a envoyé un message invalide : la connexion est coupée.",
    );
  });

  it('tells a failure in plain words', async () => {
    const { page, server } = setup();
    server.down = true;
    const me = device(page, server, 'Alex');
    me.choose('Rechercher');
    await flush();
    expect(me.texts()[0]).toMatch(/^Le serveur de mise en relation ne répond pas/);
    const offline = device(page, server, 'Lou', () => Promise.reject(new Error('offline')));
    offline.choose('Rechercher');
    await flush();
    expect(offline.texts()[0]).toMatch(/^Le mode en ligne n'a pas pu se charger/);
  });

  it('leaves nothing behind, closed while searching, in the salon or on a select screen', async () => {
    const { page, server } = setup();
    const searching = device(page, server, 'Alex');
    searching.choose('Rechercher');
    await flush();
    searching.screen.dispose();
    await flush();
    expect(server.rooms.size).toBe(0);

    const { alex, lou } = await paired();
    alex.choose('Accepter');
    lou.choose('Accepter');
    await flush();
    // Alex on the « Lieu » screen, Lou waiting with a timer-free salon.
    alex.screen.dispose();
    lou.screen.dispose();
    await flush(ANSWER_MS);
    expect(server.openChannels()).toBe(0);
    expect(page.listeners()).toBe(0);
    expect(page.pendingFrames()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('goes back with « Retour »', () => {
    const { page, server } = setup();
    const me = device(page, server, 'Alex');
    me.choose('Retour');
    expect(me.onBack).toHaveBeenCalledOnce();
  });
});
