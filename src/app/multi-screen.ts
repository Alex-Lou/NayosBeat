/**
 * The « Multi » screens (docs/multijoueur.md §7), shown with `?multi` only until gate 2: the name,
 * the automatic search, then the salon (salon.ts): the other player's name to accept, the host's
 * place, each one's fighter, and what both agreed on. No fight yet. Leaving them, whatever they
 * are doing, closes everything the network opened.
 */

import {
  findOpponent,
  type Matchmaker,
  type NetFailure,
  type Route,
  type SearchResult,
} from '../net/lobby';
import { isPseudo, MAX_DELAY } from '../net/protocol';
import { Session, SILENCE_MS, type PingSummary, type SessionEnd } from '../net/session';
import { FighterSelect } from '../ui/fighter-select';
import { element, Menu, type MenuFeedback, type MenuItem } from '../ui/menu';
import { NameEntry } from '../ui/name-entry';
import { StageSelect } from '../ui/stage-select';
import type { MultiCatalog } from './multi-catalog';
import { delayFor, OnlineMatch } from './online-match';
import type { NameStore } from './name-store';
import { openSalon, salonStep, type Salon, type SalonEvent, type SalonRules } from './salon';
import { SELECT_COLUMNS, SELECT_SLOTS } from './select-fighters';
import { STAGE_COLUMNS } from './select-stages';

export interface MultiScreenOptions {
  /** The matchmaker, loaded when the search first starts (PeerJS stays out of the game's code). */
  readonly connect: () => Promise<Matchmaker>;
  /** A monotonic clock in milliseconds. */
  readonly now: () => number;
  readonly catalog: MultiCatalog;
  readonly names: NameStore;
  readonly feedback?: (action: MenuFeedback) => void;
  /** The screens kept still (the player's « Tremblement »): no idle plays on the fighters. */
  readonly still?: boolean;
  /** What the menu says as it opens (back from an online match: how it ended). */
  readonly notice?: string;
  readonly onBack: () => void;
  /**
   * Both agreed and the host started the fight: the match, its link handed over (this screen
   * closes nothing of it any more).
   */
  readonly onFight: (match: OnlineMatch) => void;
}

/** The `?multi` address shows the screen; it stays hidden otherwise until gate 2. */
export function multiFromUrl(search: string): boolean {
  return new URLSearchParams(search).has('multi');
}

/** How long each player has to accept the other one (docs/multijoueur.md §10). */
export const ANSWER_MS = 30_000;

/**
 * The pause before searching again after a refusal: two devices that keep meeting (one refuses
 * the other's name at once) try again every few seconds, not in a tight loop.
 */
export const RETRY_MS = 5_000;

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

/** The linked opponent: the link, its salon, how it goes. */
interface Link {
  readonly session: Session;
  readonly rules: SalonRules;
  salon: Salon;
  route: Route | null;
  ping: PingSummary | null;
}

export class MultiScreen {
  /** The screen on show: a menu, the name's field, the « Lieu » or the fighter select screen. */
  private screen: { dispose(): void } | undefined;
  /** What the screen on show shows of the salon: it is drawn again only when that changes. */
  private shownKey = '';
  /** The lines of the menu on show; the last one of a salon's tells the ping and the route. */
  private lines: HTMLParagraphElement[] = [];
  private linkLine: HTMLParagraphElement | undefined;
  private search: AbortController | undefined;
  private link: Link | undefined;
  /** The time to accept the other one, while it runs; and whether it ran out (no name kept). */
  private answerTimer: ReturnType<typeof setTimeout> | undefined;
  private timedOut = false;
  /** The pause before searching again, while it runs. */
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  /** The names this player refused this session: met again, they are refused at once. */
  private readonly refused = new Set<string>();
  /** The name, as kept on the device or typed this session (the storage may refuse it). */
  private name: string;
  private disposed = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly options: MultiScreenOptions,
  ) {
    this.name = options.names.load();
    this.showIdle(options.notice ?? IDLE_TEXT);
  }

  dispose(): void {
    this.disposed = true;
    this.search?.abort();
    this.search = undefined;
    this.closeLink();
    this.screen?.dispose();
    this.screen = undefined;
  }

  private showIdle(text: string): void {
    this.closeLink();
    const items: MenuItem[] = [
      {
        label: 'Rechercher',
        hint: 'Sur les deux appareils',
        onSelect: () => {
          if (this.name) void this.start();
          else this.askName(() => void this.start());
        },
      },
      {
        label: `Pseudo : ${this.name || 'aucun'}`,
        hint: 'Le nom que voit ton adversaire',
        onSelect: () => {
          this.askName(() => {
            this.showIdle(IDLE_TEXT);
          });
        },
      },
      { label: 'Retour', onSelect: this.options.onBack },
    ];
    this.showMenu([text], items, this.options.onBack);
  }

  private askName(then: () => void): void {
    this.show(
      new NameEntry(this.root, {
        title: 'Ton pseudo',
        text: 'Le nom que ton adversaire verra avant d’accepter le combat.',
        initial: this.name,
        maxLength: 12,
        isValid: isPseudo,
        error: '2 à 12 lettres sans accent, chiffres, espaces ou tirets.',
        onDone: (name) => {
          this.name = name;
          this.options.names.save(name);
          then();
        },
        onBack: () => {
          this.showIdle(IDLE_TEXT);
        },
        ...(this.options.feedback ? { feedback: this.options.feedback } : {}),
      }),
    );
  }

  private async start(notice?: string): Promise<void> {
    this.closeLink();
    const search = new AbortController();
    this.search = search;
    const cancel = () => {
      search.abort();
      this.search = undefined;
      this.showIdle(IDLE_TEXT);
    };
    const searching = 'Recherche d’un adversaire…';
    this.showMenu(
      notice ? [notice, searching] : [searching],
      [{ label: 'Annuler', onSelect: cancel }],
      cancel,
    );
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
    const result = await findOpponent(matchmaker, search.signal).catch(
      () => ({ kind: 'failed', failure: 'server' }) as const,
    );
    if (this.search !== search || this.disposed) {
      if (result.kind === 'paired') result.channel.close();
      return;
    }
    this.search = undefined;
    switch (result.kind) {
      case 'paired':
        this.openLink(result);
        return;
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

  private openLink({ channel, role }: Extract<SearchResult, { kind: 'paired' }>): void {
    const { catalog } = this.options;
    const opened = openSalon(this.name);
    const session = new Session(channel, this.options.now, {
      update: (summary) => {
        if (this.link?.session !== session) return;
        this.link.ping = summary;
        this.showLink();
      },
      received: (message) => {
        this.dispatch({ type: 'received', message });
      },
      ended: (reason) => {
        if (this.link?.session !== session) return;
        const { salon } = this.link;
        // Closing the link loses what was sent just before (PeerJS closes the whole connection):
        // left while names are shown, the other one refused.
        if (reason === 'left' && salon.phase === 'meeting') {
          this.end({ phase: 'over', them: salon.them, end: 'refusedByThem' });
          return;
        }
        this.link = undefined;
        this.showIdle(ENDS[reason]);
      },
    });
    const rules: SalonRules = { role, isFighter: catalog.isFighter, isStage: catalog.isStage };
    this.link = { session, rules, salon: opened.salon, route: null, ping: null };
    for (const message of opened.send) session.send(message);
    void channel.route().then((route) => {
      if (this.link?.session !== session) return;
      this.link.route = route;
      this.showLink();
    });
    this.render();
  }

  /** Plays `event` on the salon: its messages sent, the screen drawn again if it changed. */
  private dispatch(event: SalonEvent): void {
    const link = this.link;
    if (!link) return;
    const step = salonStep(link.salon, event, link.rules);
    link.salon = step.salon;
    for (const message of step.send) link.session.send(message);
    this.render();
  }

  private render(): void {
    const link = this.link;
    if (!link || this.disposed) return;
    const { salon } = link;
    if (salon.phase !== 'meeting' || salon.them === null || salon.accepted) this.stopAnswerTimer();
    switch (salon.phase) {
      case 'meeting':
        this.renderMeeting(salon);
        return;
      case 'stage':
        this.renderStage(salon.them);
        return;
      case 'fighters':
        this.renderFighters(salon);
        return;
      case 'ready': {
        // The host starts at once, with the delay its pings measured; the guest waits for it.
        if (link.rules.role === 'host') {
          this.dispatch({ type: 'start', delay: delayFor(link.ping?.median ?? null, MAX_DELAY) });
          return;
        }
        const { catalog } = this.options;
        const [first, second] = salon.plan.fighters;
        this.showSalon('ready', [
          `${salon.them} (${catalog.name(first)}) contre ${this.name} (${catalog.name(second)}).`,
          `Lieu : ${catalog.title(salon.plan.stage)}.`,
          'Le combat va commencer…',
        ]);
        return;
      }
      case 'fight': {
        const { session, rules } = link;
        // Handed over: the match owns the link from now on.
        this.link = undefined;
        const names =
          rules.role === 'host'
            ? ([this.name, salon.them] as const)
            : ([salon.them, this.name] as const);
        this.options.onFight(
          new OnlineMatch(session, salon.plan, names, rules.role, salon.delay, this.options.now),
        );
        return;
      }
      case 'over':
        this.end(salon);
        return;
    }
  }

  private renderMeeting(salon: Extract<Salon, { phase: 'meeting' }>): void {
    const { them } = salon;
    if (them === null) {
      this.showSalon('meeting', ['Adversaire trouvé, présentation en cours…']);
      return;
    }
    if (this.refused.has(them)) {
      this.dispatch({ type: 'refuse' });
      return;
    }
    if (salon.accepted) {
      this.showSalon(`meeting:${them}:accepted`, [`En attente de la réponse de ${them}…`]);
      return;
    }
    if (this.answerTimer === undefined) {
      this.answerTimer = setTimeout(() => {
        this.answerTimer = undefined;
        this.timedOut = true;
        this.dispatch({ type: 'refuse' });
      }, ANSWER_MS);
    }
    this.showSalon(
      `meeting:${them}`,
      [`Adversaire trouvé : ${them}`, `Tu as ${ANSWER_MS / 1000} s pour répondre.`],
      [
        {
          label: 'Accepter',
          onSelect: () => {
            this.dispatch({ type: 'accept' });
          },
        },
        {
          label: 'Refuser',
          hint: 'La recherche reprend',
          onSelect: () => {
            this.dispatch({ type: 'refuse' });
          },
        },
      ],
    );
  }

  private renderStage(them: string): void {
    const link = this.link;
    if (!link) return;
    if (link.rules.role === 'guest') {
      this.showSalon('stage', [`${them} choisit le lieu…`]);
      return;
    }
    if (this.shownKey === 'stage') return;
    const { catalog } = this.options;
    const places = catalog.places();
    const pick = (map: string) => {
      this.dispatch({ type: 'stage', stage: catalog.draw(map) });
    };
    if (places.length < 2) {
      pick(places[0]?.id ?? 'random');
      return;
    }
    this.show(
      new StageSelect(this.root, {
        places,
        columns: STAGE_COLUMNS,
        onPick: pick,
        onBack: this.leave,
        ...(this.options.feedback ? { feedback: this.options.feedback } : {}),
      }),
    );
    this.shownKey = 'stage';
  }

  private renderFighters(salon: Extract<Salon, { phase: 'fighters' }>): void {
    if (salon.mine !== null) {
      this.showSalon('fighters:chosen', [`En attente du choix de ${salon.them}…`]);
      return;
    }
    if (this.shownKey === 'fighters') return;
    this.show(
      new FighterSelect(this.root, {
        title: 'Ton combattant',
        subtitle: `Contre ${salon.them}, à ${this.options.catalog.title(salon.stage)}`,
        fighters: this.options.catalog.fighters(),
        slots: SELECT_SLOTS,
        columns: SELECT_COLUMNS,
        onPick: (fighter) => {
          this.dispatch({ type: 'fighter', fighter });
        },
        onBack: this.leave,
        ...(this.options.feedback ? { feedback: this.options.feedback } : {}),
        still: this.options.still ?? false,
      }),
    );
    this.shownKey = 'fighters';
  }

  /** The salon ended without a fight: a refusal searches again, anything else goes back. */
  private end(salon: Extract<Salon, { phase: 'over' }>): void {
    const { them, end } = salon;
    const timedOut = this.timedOut;
    this.timedOut = false;
    if (end === 'protocol') {
      this.link?.session.reject();
      return;
    }
    this.closeLink();
    if (end === 'refusedByThem') {
      this.searchAgain(`${them ?? "L'autre joueur"} a refusé.`);
      return;
    }
    if (timedOut) {
      this.showIdle('Temps écoulé : personne n’a été accepté.');
      return;
    }
    if (them !== null && !this.refused.has(them)) {
      this.refused.add(them);
      this.searchAgain(`${them} refusé.`);
      return;
    }
    this.searchAgain(`${them ?? "L'autre joueur"} refusé.`);
  }

  /** Searches again after RETRY_MS, saying why; « Annuler » goes back instead. */
  private searchAgain(notice: string): void {
    this.showMenu(
      [notice, `Nouvelle recherche dans ${RETRY_MS / 1000} s…`],
      [{ label: 'Annuler', onSelect: this.leave }],
      this.leave,
    );
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.start(notice);
    }, RETRY_MS);
  }

  private readonly leave = (): void => {
    this.showIdle(IDLE_TEXT);
  };

  private closeLink(): void {
    this.stopAnswerTimer();
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.link?.session.dispose();
    this.link = undefined;
  }

  private stopAnswerTimer(): void {
    if (this.answerTimer === undefined) return;
    clearTimeout(this.answerTimer);
    this.answerTimer = undefined;
  }

  /** A menu of the salon, with its line on the link, and « Quitter » under its own items. */
  private showSalon(key: string, text: readonly string[], items: MenuItem[] = []): void {
    if (this.shownKey === key) return;
    this.showMenu(
      [...text, ''],
      [...items, { label: 'Quitter', onSelect: this.leave }],
      this.leave,
    );
    this.shownKey = key;
    this.linkLine = this.lines.at(-1);
    this.showLink();
  }

  private showLink(): void {
    const line = this.linkLine;
    const link = this.link;
    if (!line || !link) return;
    const ping = link.ping?.median;
    const route = link.route ? ROUTES[link.route] : '…';
    line.textContent = `Ping : ${ping === null || ping === undefined ? '…' : `${ping} ms`} · chemin : ${route}`;
  }

  private showMenu(text: readonly string[], items: MenuItem[], onBack: () => void): void {
    const content = element('div', 'menu-multi');
    this.lines = text.map((line) => element('p', 'menu-notice', line));
    content.append(...this.lines);
    this.show(
      new Menu(this.root, {
        title: 'Multi (test)',
        content,
        items,
        onBack,
        ...(this.options.feedback ? { feedback: this.options.feedback } : {}),
      }),
    );
  }

  private show(screen: { dispose(): void }): void {
    if (this.disposed) {
      screen.dispose();
      return;
    }
    this.screen?.dispose();
    this.screen = screen;
    this.shownKey = '';
    this.linkLine = undefined;
  }
}
