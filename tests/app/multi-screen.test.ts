import { afterEach, describe, expect, it, vi } from 'vitest';
import { multiFromUrl, MultiScreen } from '../../src/app/multi-screen';
import { findOpponent, type Matchmaker } from '../../src/net/lobby';
import { encodeMessage } from '../../src/net/protocol';
import { SILENCE_MS } from '../../src/net/session';
import { FakeElement, installFakePage } from '../render/fake-dom';
import { FakeServer, type FakeChannel } from '../net/fake-net';

function byClass(node: FakeElement, name: string): FakeElement[] {
  const own = node.className.split(' ').includes(name) ? [node] : [];
  return own.concat(...node.children.map((child) => byClass(child, name)));
}

/** The screen on a fake page, its matchmaker a device of `server` (or what `connect` gives). */
function setup(server = new FakeServer(), connect?: () => Promise<Matchmaker>) {
  vi.useFakeTimers();
  const page = installFakePage();
  const onBack = vi.fn();
  const screen = new MultiScreen(page.body as unknown as HTMLElement, {
    connect: connect ?? (() => Promise.resolve(server.device())),
    now: () => Date.now(),
    onBack,
  });
  const texts = () => byClass(page.body, 'menu-notice').map((node) => node.textContent);
  const choose = (label: string) => {
    const item = byClass(page.body, 'menu-item').find((node) => node.textContent.startsWith(label));
    if (!item) throw new Error(`No « ${label} » on screen`);
    item.dispatchEvent(new Event('click'));
  };
  return { page, server, screen, onBack, texts, choose };
}

/** The other device: it searches too, and keeps its end of the link to act as the opponent. */
async function opponent(server: FakeServer): Promise<FakeChannel> {
  const found = await findOpponent(server.device(), new AbortController().signal);
  if (found.kind !== 'paired') throw new Error('Not paired');
  return found.channel as FakeChannel;
}

describe('the « Multi » screen of gate 0 (docs/multijoueur.md §7)', () => {
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

  it('searches, pairs, then shows the ping as it is measured', async () => {
    const { texts, choose, server } = setup();
    choose('Rechercher');
    expect(texts()).toEqual(['Recherche d’un adversaire…']);
    await vi.advanceTimersByTimeAsync(0);
    const other = opponent(server);
    await vi.advanceTimersByTimeAsync(0);
    const link = await other;
    expect(texts()[0]).toBe('Connecté : tu accueilles la salle 1.');
    link.listen({ message: () => undefined, closed: () => undefined });
    await vi.advanceTimersByTimeAsync(20);
    link.send(encodeMessage({ type: 'pong', seq: 0 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(texts()[1]).toBe('Ping : 20 ms (min 20, médiane 20, max 20) · 1 mesures, 0 perdues');
    expect(texts()[2]).toBe('Chemin : direct, même réseau');
  });

  it('says so when the other device leaves, or goes silent', async () => {
    const { texts, choose, server } = setup();
    choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    const link = await opponent(server);
    link.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(texts()).toEqual(["L'autre appareil a quitté."]);

    choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    await opponent(server);
    await vi.advanceTimersByTimeAsync(SILENCE_MS + 1000);
    expect(texts()[0]).toMatch(/^Connexion perdue/);
  });

  it('tells a failure in plain words', async () => {
    const down = new FakeServer();
    down.down = true;
    const failed = setup(down);
    failed.choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    expect(failed.texts()[0]).toMatch(/^Le serveur de mise en relation ne répond pas/);
    vi.unstubAllGlobals();

    const offline = setup(new FakeServer(), () => Promise.reject(new Error('offline')));
    offline.choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    expect(offline.texts()[0]).toMatch(/^Le mode en ligne n'a pas pu se charger/);
  });

  it('leaves nothing behind, cancelled, quitted or closed in the middle', async () => {
    const searching = setup();
    searching.choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    searching.choose('Annuler');
    await vi.advanceTimersByTimeAsync(0);
    expect(searching.server.rooms.size).toBe(0);
    expect(searching.texts()[0]).toMatch(/^Cherche un autre appareil/);

    searching.choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    await opponent(searching.server);
    searching.choose('Quitter');
    await vi.advanceTimersByTimeAsync(0);
    expect(searching.server.openChannels()).toBe(0);

    searching.choose('Rechercher');
    await vi.advanceTimersByTimeAsync(0);
    await opponent(searching.server);
    searching.screen.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect(searching.server.openChannels()).toBe(0);
    expect(searching.server.rooms.size).toBe(0);
    expect(searching.page.body.children).toHaveLength(0);
    expect(searching.page.listeners()).toBe(0);
    expect(searching.page.pendingFrames()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops the search when closed while searching', async () => {
    const { screen, server, page } = setup();
    const item = byClass(page.body, 'menu-item')[0];
    item?.dispatchEvent(new Event('click'));
    await vi.advanceTimersByTimeAsync(0);
    expect(server.rooms.size).toBe(1);
    screen.dispose();
    await vi.advanceTimersByTimeAsync(0);
    expect(server.rooms.size).toBe(0);
    expect(page.listeners()).toBe(0);
  });

  it('goes back with « Retour »', () => {
    const { choose, onBack } = setup();
    choose('Retour');
    expect(onBack).toHaveBeenCalledOnce();
  });
});
