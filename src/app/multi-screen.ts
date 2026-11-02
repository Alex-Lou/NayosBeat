/**
 * The « Multi » screen of gate 0 (docs/multijoueur.md §7), shown with `?multi` only: the
 * automatic search, then the ping between both devices. No fight yet. Leaving it, whatever it is
 * doing, closes everything the network opened.
 */

import {
  findOpponent,
  type Matchmaker,
  type NetFailure,
  type Route,
  type SearchResult,
} from '../net/lobby';
import { Session, SILENCE_MS, type PingSummary, type SessionEnd } from '../net/session';
import { element, Menu, type MenuFeedback, type MenuItem } from '../ui/menu';

export interface MultiScreenOptions {
  /** The matchmaker, loaded when the search first starts (PeerJS stays out of the game's code). */
  readonly connect: () => Promise<Matchmaker>;
  /** A monotonic clock in milliseconds. */
  readonly now: () => number;
  readonly feedback?: (action: MenuFeedback) => void;
  readonly onBack: () => void;
}

/** The `?multi` address shows the screen; it stays hidden otherwise until gate 2. */
export function multiFromUrl(search: string): boolean {
  return new URLSearchParams(search).has('multi');
}

const FAILURES: Readonly<Record<NetFailure | 'full' | 'load', string>> = {
  server: 'Le serveur de mise en relation ne répond pas. Vérifie la connexion à Internet.',
  direct:
    "L'autre appareil a été trouvé, mais vos réseaux ne se laissent pas joindre en direct : il faudrait un relais.",
  unsupported: 'Ce navigateur ne permet pas le jeu en ligne (WebRTC).',
  full: 'Toutes les salles sont occupées. Réessaie dans un moment.',
  load: "Le mode en ligne n'a pas pu se charger. Es-tu hors ligne ?",
};

const ENDS: Readonly<Record<SessionEnd, string>> = {
  left: "L'autre appareil a quitté.",
  silent: `Connexion perdue : aucune réponse depuis ${SILENCE_MS / 1000} s.`,
  protocol: "L'autre appareil a envoyé un message invalide : la connexion est coupée.",
};

const ROUTES: Readonly<Record<Route, string>> = {
  local: 'direct, même réseau',
  stun: 'direct, par Internet',
  relay: 'par un relais',
  unknown: 'inconnu',
};

const IDLE_TEXT =
  'Cherche un autre appareil qui cherche en même temps, sur le même Wi-Fi ou ailleurs. Lance la recherche sur les deux.';

export class MultiScreen {
  private menu: Menu | undefined;
  private search: AbortController | undefined;
  private session: Session | undefined;
  /** The lines of the paired screen's text, updated in place as the pings come back. */
  private lines: HTMLParagraphElement[] = [];
  private disposed = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: MultiScreenOptions,
  ) {
    this.showIdle(IDLE_TEXT);
  }

  dispose(): void {
    this.disposed = true;
    this.search?.abort();
    this.search = undefined;
    this.session?.dispose();
    this.session = undefined;
    this.menu?.dispose();
    this.menu = undefined;
  }

  private showIdle(text: string): void {
    this.showMenu(
      [text],
      [
        { label: 'Rechercher', hint: 'Sur les deux appareils', onSelect: () => void this.start() },
        { label: 'Retour', onSelect: this.options.onBack },
      ],
      this.options.onBack,
    );
  }

  private async start(): Promise<void> {
    const search = new AbortController();
    this.search = search;
    const cancel = () => {
      search.abort();
      this.search = undefined;
      this.showIdle(IDLE_TEXT);
    };
    this.showMenu(['Recherche d’un adversaire…'], [{ label: 'Annuler', onSelect: cancel }], cancel);
    let matchmaker: Matchmaker;
    try {
      matchmaker = await this.options.connect();
    } catch {
      if (this.search === search) this.showIdle(FAILURES.load);
      return;
    }
    if (search.signal.aborted) {
      matchmaker.dispose();
      return;
    }
    let result: SearchResult;
    try {
      result = await findOpponent(matchmaker, search.signal);
    } catch {
      result = { kind: 'failed', failure: 'server' };
    }
    if (this.search !== search || this.disposed) {
      if (result.kind === 'paired') result.channel.close();
      return;
    }
    this.search = undefined;
    switch (result.kind) {
      case 'paired': {
        const { channel, role, room } = result;
        const ended = (reason: SessionEnd) => {
          this.session = undefined;
          this.showIdle(ENDS[reason]);
        };
        this.session = new Session(channel, this.options.now, {
          update: (summary) => {
            this.showPing(summary);
          },
          ended,
        });
        const leave = () => {
          this.session?.dispose();
          this.session = undefined;
          this.showIdle(IDLE_TEXT);
        };
        this.showMenu(
          [
            `Connecté : ${role === 'host' ? 'tu accueilles' : 'tu as rejoint'} la salle ${room + 1}.`,
            'Ping : mesure en cours…',
            'Chemin : …',
          ],
          [{ label: 'Quitter', onSelect: leave }],
          leave,
        );
        const lines = this.lines;
        void channel.route().then((route) => {
          const line = lines[2];
          if (line) line.textContent = `Chemin : ${ROUTES[route]}`;
        });
        return;
      }
      case 'cancelled':
        return;
      case 'full':
        this.showIdle(FAILURES.full);
        return;
      case 'failed':
        this.showIdle(FAILURES[result.failure]);
        return;
    }
  }

  private showPing(summary: PingSummary): void {
    const line = this.lines[1];
    if (!line || summary.last === null) return;
    line.textContent =
      `Ping : ${summary.last} ms (min ${summary.min ?? '-'}, médiane ${summary.median ?? '-'}, ` +
      `max ${summary.max ?? '-'}) · ${summary.count} mesures, ${summary.lost} perdues`;
  }

  private showMenu(text: readonly string[], items: MenuItem[], onBack: () => void): void {
    if (this.disposed) return;
    this.menu?.dispose();
    const content = element('div', 'menu-multi');
    this.lines = text.map((line) => element('p', 'menu-notice', line));
    content.append(...this.lines);
    this.menu = new Menu(this.root, {
      title: 'Multi (test)',
      content,
      items,
      onBack,
      ...(this.options.feedback ? { feedback: this.options.feedback } : {}),
    });
  }
}
