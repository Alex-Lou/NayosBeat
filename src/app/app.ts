import type Phaser from 'phaser';
import type { CpuLevel } from '../ai/cpu';
import type { Sfx } from '../audio/sfx';
import type { TrainingGauge, TrainingStart } from '../core/config';
import { ROSTER, templateOf, type FighterId } from '../data/roster';
import { ANIM_OPTIONS, LEGACY_ANIM } from '../render/anim-options';
import {
  atmosphereName,
  type Atmosphere,
  type Moment,
  type StageVariant,
  type Weather,
} from '../art/stage-layers';
import { OFFERED_STAGES } from '../art/stages';
import type { FightScene, FightSceneData } from '../render/fight-scene';
import { requestLandscapeFullscreen } from '../render/fullscreen';
import type { RenderMode } from '../render/render-mode';
import { DEFAULT_SILHOUETTE, type SilhouetteLook } from '../render/silhouette';
import { RANDOM_STAGE, stageVariantFor, type StageChoice } from '../render/stage-view';
import { controlsStore } from '../input/controls-store';
import { isTouchDevice } from '../input/touch-controls';
import { BindingsScreen, type BindingsTab } from '../ui/bindings-screen';
import { TouchLayoutEditor } from '../ui/touch-layout-editor';
import { FightCard } from '../ui/fight-card';
import { FighterSelect } from '../ui/fighter-select';
import { StageSelect } from '../ui/stage-select';
import homeBackground from '../ui/accueil-fond.png';
import selectBackground from '../ui/menu-select.png';
import stageBackground from '../ui/menu-stage.png';
import systemBackground from '../ui/menu-system.png';
import { MenuBackdrop } from '../ui/menu-backdrop';
import {
  element,
  Menu,
  type MenuBackdropName,
  type MenuFeedback,
  type MenuItem,
  type MenuOptions,
} from '../ui/menu';
import { TitleScreen } from '../ui/title-screen';
import { buildDate } from './build';
import {
  FLASH_LABELS,
  isCalm,
  isStill,
  loadComfort,
  loadStruggle,
  loadTextSize,
  markNoticeSeen,
  nextMode,
  nextStaging,
  NOTICE,
  noticeSeen,
  saveComfort,
  saveStruggle,
  saveTextSize,
  SHAKE_LABELS,
  STAGING_LABELS,
  STRUGGLE_LABELS,
  TEXT_LABELS,
  watchReducedMotion,
  type Comfort,
  type StruggleMode,
  type TextSize,
} from './comfort';
import { controlsContent, currentDevices, helpPages } from './controls-content';
import { installMethod, onInstallChange, promptInstall } from './install';
import { multiCatalog } from './multi-catalog';
import { iceServers, TURN_ENDPOINT } from '../net/ice-servers';
import { keepDesync } from './desync-store';
import { MultiScreen } from './multi-screen';
import type { OnlineMatch, OnlineEnd } from './online-match';
import { nameStore } from './name-store';
import {
  DEFAULT_SETUP,
  DUMMY_HEALTHS,
  TRAINING_FINISHERS,
  type DummyBehavior,
  type GameMode,
  type MatchSetup,
} from './match-setup';
import { SELECT_COLUMNS, SELECT_SLOTS, selectFighters } from './select-fighters';
import { selectStages, STAGE_COLUMNS } from './select-stages';
import { animLabel, DEFAULT_VIEWING, nextSlowdown, SLOWDOWN_LABELS, type Viewing } from './viewing';

const FIGHT_SCENE = 'fight';

const MENU_ART: Readonly<Record<MenuBackdropName, string>> = {
  home: homeBackground,
  select: selectBackground,
  stage: stageBackground,
  system: systemBackground,
};

/** How an online match ended, said on the « Multi » menu it goes back to (`{tick}`: the desync's). */
const ONLINE_ENDS: Readonly<Record<OnlineEnd['kind'], string>> = {
  left: 'L’autre joueur a quitté le match.',
  silent: 'Connexion perdue pendant le match : il ne compte pour personne.',
  protocol: 'L’autre appareil a envoyé un message invalide : le match est arrêté.',
  desync: 'Désynchronisé au tic {tick} : le match est arrêté.',
};
/** The notice of the first launch ignores what is pressed this soon: it was meant for the title. */
const NOTICE_GRACE_MS = 1000;

const LEVELS: readonly {
  readonly level: CpuLevel;
  readonly label: string;
  readonly hint: string;
}[] = [
  { level: 'easy', label: 'Facile', hint: 'Pour découvrir' },
  { level: 'normal', label: 'Normal', hint: 'Pare et contre-attaque' },
  { level: 'hard', label: 'Difficile', hint: 'Réagit vite, enchaîne' },
];

const DUMMIES: readonly {
  readonly dummy: DummyBehavior;
  readonly label: string;
  readonly hint: string;
}[] = [
  { dummy: 'dummyStand', label: 'Immobile', hint: 'Idéal pour les enchaînements' },
  { dummy: 'dummyBlock', label: 'Pare tout', hint: 'Pour tester la pression' },
  { dummy: 'normal', label: 'Ordinateur', hint: 'Se défend et attaque' },
];

/** The Boost gauge in training (docs/combos-v3.md §6.5), in the order the option cycles. */
const GAUGES: readonly { readonly gauge: TrainingGauge; readonly label: string }[] = [
  { gauge: 'full', label: 'pleine' },
  { gauge: 'infinite', label: 'infinie' },
  { gauge: 'normal', label: 'normale' },
];

/** Where training starts, and starts over (docs/combat-v2.md D32), in the order the option cycles. */
const POSITIONS: readonly {
  readonly position: TrainingStart;
  readonly label: string;
  readonly hint: string;
}[] = [
  { position: 'center', label: 'centre', hint: 'Au milieu, comme un début de round' },
  { position: 'leftCorner', label: 'coin gauche', hint: 'Joueur 1 dos au mur de gauche' },
  { position: 'rightCorner', label: 'coin droit', hint: 'Mannequin dos au mur de droite' },
];

/** What training's « Ambiance » says of each moment and weather (docs/art/decor-rue.md §13). */
const MOMENT_LABELS: Readonly<Record<Moment, string>> = {
  midnight: 'minuit',
  dusk: 'crépuscule',
  dawn: 'aube',
};
const WEATHER_LABELS: Readonly<Record<Weather, string>> = {
  clear: 'ciel clair',
  rain: 'pluie',
  fog: 'brume',
  snow: 'neige',
};

/** Training's « Lieu » choices, in the order the option cycles: at random, then each place. */
const PLACE_CHOICES: readonly string[] = ['random', ...OFFERED_STAGES.map(({ name }) => name)];

function placeLabel(map: string): string {
  if (map === 'random') return 'aléatoire';
  return OFFERED_STAGES.find(({ name }) => name === map)?.title ?? map;
}

/**
 * Training's « Ambiance » choices for the place `map`, in the order the option cycles: at random,
 * then each atmosphere it offers (at random among the places: any one of them offers).
 */
function atmosphereChoices(map: string): (Atmosphere | 'random')[] {
  const offered = new Map<string, Atmosphere>();
  for (const { name, variants } of OFFERED_STAGES) {
    if (map !== 'random' && name !== map) continue;
    for (const { atmosphere } of variants) offered.set(atmosphereName(atmosphere), atmosphere);
  }
  return ['random', ...offered.values()];
}

function atmosphereKey(choice: Atmosphere | 'random'): string {
  return choice === 'random' ? 'random' : atmosphereName(choice);
}

function atmosphereLabel(choice: Atmosphere | 'random'): string {
  if (choice === 'random') return 'aléatoire';
  return `${MOMENT_LABELS[choice.moment]}, ${WEATHER_LABELS[choice.weather]}`;
}

function sameChoice(a: StageChoice, b: StageChoice): boolean {
  return a.map === b.map && atmosphereKey(a.atmosphere) === atmosphereKey(b.atmosphere);
}

/** `choice` at the place `map`: its atmosphere kept if the place offers it, else at random. */
function placedAt(choice: StageChoice, map: string): StageChoice {
  const offered = atmosphereChoices(map).some(
    (atmosphere) => atmosphereKey(atmosphere) === atmosphereKey(choice.atmosphere),
  );
  return { map, atmosphere: offered ? choice.atmosphere : 'random' };
}

/**
 * Screen flow: title → (the notice, the first time) → main menu → fighter selection → fight →
 * results, with pause; the options from the main menu and the pause. Owns the current screen,
 * the match setup and the player's comfort options; the fight itself runs in the Phaser scene.
 */
export class App {
  private screen: { dispose(): void } | undefined;
  /** The menus' key art (src/ui/menu-backdrop.ts). */
  private backdrop: MenuBackdrop | undefined;
  /** Who fights whom, over the fight until its first frame (src/ui/fight-card.ts). */
  private card: FightCard | undefined;
  private setup: MatchSetup = DEFAULT_SETUP;
  /** « Effets de flash » and « Tremblement de l'écran » (src/app/comfort.ts). */
  private comfort: Comfort = loadComfort();
  /** What the player chose this session: it holds even where the storage refuses it. */
  private chosen: Partial<Comfort> = {};
  /** « Taille du texte »: the menus' only (src/app/comfort.ts). */
  private textSize: TextSize = loadTextSize();
  /** « Lutte en prise »: kept, given to each fight (src/input/held-struggle.ts). */
  private struggle: StruggleMode = loadStruggle();
  /**
   * The fighters whose Finisher this session has played already: from the second one on, its
   * scene plays short (docs/finisher.md §1.14). The fights note it.
   */
  private readonly finishersSeen = new Set<FighterId>();
  /** The main menu is on screen (it is redrawn when installing becomes possible). */
  private onMainMenu = false;
  private onTitle = false;
  /**
   * How training is watched (src/app/viewing.ts): as the address asks (`fromUrl`), then as chosen
   * there, in its menu or its pause. The other modes keep the address's: their pause has no item
   * to change it, a choice of training must not slow them down unseen.
   */
  private viewing: Viewing;
  /** Training shows the boxes (its pause's « Boîtes »), kept from one session to the next. */
  private boxes = false;
  /** Training shows its input history and frame meter (its pause's « Données »). */
  private trainingData = true;
  /** Where the fight on screen started: its pause's « Position » changed, resuming starts over. */
  private startedPosition: TrainingStart = DEFAULT_SETUP.position;
  /**
   * The stage the fights show, in the atmosphere drawn for them (docs/art/decor-rue.md §13, §14):
   * drawn anew for each new match, kept by « Revanche » and « Recommencer ».
   */
  private stage: StageVariant | undefined;
  /**
   * Where the fights are held, as chosen on the « Lieu » screen (versus, training: its place) and
   * in training's pause (« Lieu », « Ambiance »); against the computer, always at random. Changed
   * in the pause, resuming starts over.
   */
  private stageChoice: StageChoice = RANDOM_STAGE;
  private startedChoice: StageChoice = RANDOM_STAGE;
  /** The online match being fought, if any (online-match.ts), and its ping and delay on screen. */
  private online: OnlineMatch | undefined;
  private onlineBadge: HTMLElement | undefined;
  /** What the online salon offers and checks (multi-catalog.ts). */
  private readonly catalog = multiCatalog(OFFERED_STAGES);

  constructor(
    private readonly root: HTMLElement,
    private readonly game: Phaser.Game,
    private readonly sfx: Sfx,
    /** How the game is drawn (render-mode.ts): simplified, the title says why. */
    private readonly mode: RenderMode,
    private readonly fromUrl: Viewing = DEFAULT_VIEWING,
    /** How the fighters stand out from the sky, as the address asks (silhouette.ts). */
    private readonly silhouette: SilhouetteLook = DEFAULT_SILHOUETTE,
    /** The « Multi » screen, shown as the address asks (`?multi`) until gate 2 (multi-screen.ts). */
    private readonly multi = false,
  ) {
    this.viewing = fromUrl;
  }

  start(): void {
    this.game.loop.sleep();
    // The browser tells late (after the page loaded) that the game can be installed.
    onInstallChange(() => {
      if (this.onMainMenu) this.showMainMenu();
    });
    this.applyComfortClasses();
    this.backdrop = this.createBackdrop();
    // What the player did not choose follows the system's setting, even when it changes.
    watchReducedMotion(() => {
      this.comfort = { ...loadComfort(), ...this.chosen };
      this.applyComfort();
    });
    this.showTitle();
  }

  /** Nothing is being played or chosen: an update of the game may reload it now. */
  isIdle(): boolean {
    return this.onTitle || this.onMainMenu;
  }

  private createBackdrop(): MenuBackdrop {
    return new MenuBackdrop(this.root, homeBackground);
  }

  /** `backdrop`: which key art stays behind this screen; none for a fight or its overlays. */
  private show(screen: { dispose(): void }, options: { backdrop?: MenuBackdropName } = {}): void {
    this.onMainMenu = false;
    this.onTitle = false;
    this.screen?.dispose();
    this.screen = screen;
    this.card?.dispose();
    this.card = undefined;
    if (options.backdrop) {
      this.backdrop?.setScene(options.backdrop, MENU_ART[options.backdrop]);
      this.backdrop?.setVisible(true);
    } else {
      this.backdrop?.setVisible(false);
    }
  }

  private showTitle(): void {
    this.show(
      new TitleScreen(
        this.root,
        () => {
          // A user gesture: the only moment browsers allow audio and (on mobile) fullscreen.
          this.sfx.unlock();
          this.sfx.play('menuConfirm');
          if (isTouchDevice()) requestLandscapeFullscreen();
          if (noticeSeen()) this.showMainMenu();
          else this.showNotice();
        },
        this.mode === 'simple',
      ),
      { backdrop: 'home' },
    );
    this.onTitle = true;
  }

  /**
   * The notice of the first launch (docs/flashs.md §4), after the title (a gesture): read once,
   * then to the main menu, or to the options. A press in its first NOTICE_GRACE_MS was meant for
   * the title (pressed twice): it does nothing. Back goes to the title, the notice still unread.
   */
  private showNotice(): void {
    const shownAt = performance.now();
    const then = (next: () => void) => () => {
      if (performance.now() - shownAt < NOTICE_GRACE_MS) return;
      markNoticeSeen();
      next();
    };
    const toMenu = () => {
      this.showMainMenu();
    };
    this.showMenu({
      title: NOTICE.title,
      backdrop: 'home',
      content: element('p', 'menu-notice', NOTICE.text),
      items: [
        { label: 'Jouer', onSelect: then(toMenu) },
        {
          label: 'Options',
          onSelect: then(() => {
            this.showOptions(false, () => {
              this.showMainMenu('options');
            });
          }),
        },
      ],
      onBack: () => {
        if (performance.now() - shownAt >= NOTICE_GRACE_MS) this.showTitle();
      },
    });
  }

  /** `initial`: the item selected, by its index, or the options' (coming back from them). */
  private showMainMenu(initial: number | 'options' = 0): void {
    const choose = (mode: GameMode) => () => {
      this.setup = { ...this.setup, mode };
      this.chooseFighter(0);
    };
    const touch = isTouchDevice();
    const optionsItem: MenuItem = {
      label: 'Options',
      hint: 'Son, effets de flash, tremblement, texte',
      onSelect: () => {
        this.showOptions(false, () => {
          this.showMainMenu('options');
        });
      },
    };
    const items: MenuItem[] = [
      { label: 'Jouer', hint: "Contre l'ordinateur", primary: true, onSelect: choose('cpu') },
      // Two players on one device: a keyboard and pads share it, a touch screen does not (one
      // pair of thumbs on the controls); there, playing two is the online « Multi ».
      ...(touch
        ? []
        : [
            {
              label: '2 joueurs',
              hint: 'Sur le même appareil',
              primary: true,
              onSelect: choose('versus'),
            },
          ]),
      {
        label: 'Entraînement',
        hint: 'Sans chrono, vie infinie',
        primary: true,
        onSelect: choose('training'),
      },
      ...(this.multi
        ? [
            {
              label: 'Multi (test)',
              hint: 'En ligne, à deux appareils',
              onSelect: () => {
                this.showMulti();
              },
            },
          ]
        : []),
      {
        label: 'Commandes',
        hint: 'Clavier, manette, tactile',
        onSelect: () => {
          this.showControls(0, false);
        },
      },
      optionsItem,
    ];
    const install = installMethod();
    if (install === 'prompt') {
      items.push({
        label: 'Installer le jeu',
        hint: 'Plein écran, hors ligne',
        install: true,
        onSelect: () => {
          void promptInstall().then(() => {
            if (this.onMainMenu) this.showMainMenu();
          });
        },
      });
    } else if (install === 'safari') {
      items.push({
        label: 'Installer le jeu',
        hint: 'Partager, puis « Sur l’écran d’accueil »',
        install: true,
        onSelect: () => undefined,
      });
    }
    const columns = touch ? 2 : 3;
    this.showMenu({
      logo: true,
      backdrop: 'home',
      description: true,
      columns,
      help: 'Flèches choisir · Entrée / A valider',
      items,
      initialIndex: initial === 'options' ? items.indexOf(optionsItem) : initial,
    });
    this.onMainMenu = true;
  }

  /**
   * The « Multi » screen (docs/multijoueur.md §7): its network code, PeerJS with it, is loaded as
   * the search first starts, never with the game. Back to the main menu closes it all.
   */
  private showMulti(notice?: string, replay?: string): void {
    this.show(
      new MultiScreen(this.root, {
        connect: () =>
          // The relays' credentials asked as the search starts (ice-servers.ts), never before.
          import('../net/peer-matchmaker').then(async ({ peerMatchmaker }) =>
            peerMatchmaker(await iceServers(TURN_ENDPOINT, (...args) => fetch(...args))),
          ),
        now: () => performance.now(),
        catalog: this.catalog,
        names: nameStore,
        feedback: this.menuFeedback,
        still: isStill(this.comfort),
        ...(notice ? { notice } : {}),
        ...(replay ? { replay } : {}),
        onBack: () => {
          this.showMainMenu();
        },
        onFight: (match) => {
          this.startOnline(match);
        },
      }),
    );
  }

  /**
   * An online match (docs/multijoueur.md §9.6): the plan both agreed on, fought as « 2 joueurs »
   * is, each device playing its own fighter; the pause, the rematch and the end shared by both.
   */
  private startOnline(match: OnlineMatch): void {
    this.online = match;
    this.setup = { ...this.setup, mode: 'versus', fighters: match.plan.fighters };
    this.stage = this.catalog.variant(match.plan.stage);
    this.onlineBadge?.remove();
    const badge = element('div', 'online-badge', `délai ${match.delay}`);
    this.root.appendChild(badge);
    this.onlineBadge = badge;
    const fight = () => this.game.scene.getScene(FIGHT_SCENE) as FightScene | null;
    match.listen({
      ping: (summary) => {
        badge.textContent = `${summary.median ?? '…'} ms · délai ${match.delay}`;
      },
      paused: (by) => {
        this.showOnlinePause(match, by);
      },
      resumed: () => {
        this.screen?.dispose();
        this.screen = undefined;
        fight()?.resumeMatch();
      },
      rematch: () => {
        this.startFight(true);
      },
      ended: (end) => {
        const replay = end.kind === 'desync' ? keepDesync(end.replay) : undefined;
        this.leaveOnline(
          ONLINE_ENDS[end.kind].replace('{tick}', String(end.kind === 'desync' ? end.tick : '')),
          replay,
        );
      },
    });
    this.startFight(true);
  }

  /** Both devices paused: either one resumes, for both; leaving ends the match for both. */
  private showOnlinePause(match: OnlineMatch, by: 0 | 1, initialIndex = 0): void {
    const items: MenuItem[] = [];
    const optionsItem: MenuItem = {
      label: 'Options',
      onSelect: () => {
        this.showOptions(true, () => {
          this.showOnlinePause(match, by, items.indexOf(optionsItem));
        });
      },
    };
    const resume = () => {
      match.resume();
      this.screen?.dispose();
      this.screen = undefined;
      (this.game.scene.getScene(FIGHT_SCENE) as FightScene | null)?.resumeMatch();
    };
    items.push({ label: 'Reprendre', hint: 'Pour les deux', onSelect: resume }, optionsItem, {
      label: 'Quitter',
      hint: 'Le match s’arrête pour les deux',
      onSelect: () => {
        this.leaveOnline('Tu as quitté le match.');
      },
    });
    this.showMenu({
      title: 'Pause',
      subtitle: `Demandée par ${match.names[by]}`,
      overlay: true,
      items,
      onBack: resume,
      initialIndex,
    });
  }

  /** The match decided on both devices: the rematch once both want it, or back to « Multi ». */
  private showOnlineResults(match: OnlineMatch, winner: 0 | 1 | null): void {
    const name = winner === null ? null : templateOf(match.plan.fighters[winner]).name;
    const leave = () => {
      this.leaveOnline('Fin du match.');
    };
    this.showMenu({
      title: name === null ? 'Egalité' : `${name} gagne !`,
      ...(winner === null ? {} : { subtitle: `Victoire de ${match.names[winner]}` }),
      overlay: true,
      items: [
        {
          label: 'Revanche',
          hint: 'Quand les deux la veulent',
          onSelect: () => {
            match.wantRematch();
            if (this.online !== match || this.screen === undefined) return;
            this.showMenu({
              title: 'Revanche',
              subtitle: `En attente de ${match.names[match.player === 0 ? 1 : 0]}…`,
              overlay: true,
              items: [{ label: 'Quitter', onSelect: leave }],
              onBack: leave,
            });
          },
        },
        { label: 'Quitter', hint: 'Retour au menu « Multi »', onSelect: leave },
      ],
    });
  }

  /** The online match over: its link closed (the other one is told), back to « Multi ». */
  /** `replay`: a desync's, which the « Multi » menu offers to copy. */
  private leaveOnline(notice: string, replay?: string): void {
    this.online?.close();
    this.online = undefined;
    this.onlineBadge?.remove();
    this.onlineBadge = undefined;
    this.stopFight();
    this.showMulti(notice, replay);
  }

  /**
   * The « Options » screen: the sound, « Effets de flash », « Tremblement de l'écran », « Mise en
   * scène », « Taille du texte », each cycled in place (the screen comes back with it still selected), kept at once
   * and applied at once, to a fight under the pause menu too (`paused`). `back`: where « Retour »
   * goes.
   */
  private showOptions(paused: boolean, back: () => void, initialIndex = 0): void {
    const { flashes, shake, staging } = this.comfort;
    const items: MenuItem[] = [];
    const again = (item: MenuItem) => {
      this.showOptions(paused, back, items.indexOf(item));
    };
    const sound: MenuItem = {
      label: `Son : ${this.sfx.isEnabled ? 'oui' : 'non'}`,
      onSelect: () => {
        this.sfx.setEnabled(!this.sfx.isEnabled);
        again(sound);
      },
    };
    const flash: MenuItem = {
      label: `Effets de flash : ${FLASH_LABELS[flashes].label}`,
      hint: FLASH_LABELS[flashes].hint,
      onSelect: () => {
        this.changeComfort({ flashes: nextMode(flashes) });
        again(flash);
      },
    };
    const tremble: MenuItem = {
      label: `Tremblement de l'écran : ${SHAKE_LABELS[shake].label}`,
      hint: SHAKE_LABELS[shake].hint,
      onSelect: () => {
        this.changeComfort({ shake: nextMode(shake) });
        again(tremble);
      },
    };
    const scene: MenuItem = {
      label: `Mise en scène : ${STAGING_LABELS[staging].label}`,
      hint: STAGING_LABELS[staging].hint,
      onSelect: () => {
        this.changeComfort({ staging: nextStaging(staging) });
        again(scene);
      },
    };
    const text: MenuItem = {
      label: `Taille du texte : ${TEXT_LABELS[this.textSize].label}`,
      hint: TEXT_LABELS[this.textSize].hint,
      onSelect: () => {
        this.textSize = this.textSize === 'normal' ? 'large' : 'normal';
        saveTextSize(this.textSize);
        this.applyComfortClasses();
        again(text);
      },
    };
    const struggle: MenuItem = {
      label: `Lutte en prise : ${STRUGGLE_LABELS[this.struggle].label}`,
      hint: STRUGGLE_LABELS[this.struggle].hint,
      onSelect: () => {
        this.struggle = this.struggle === 'mash' ? 'hold' : 'mash';
        saveStruggle(this.struggle);
        (this.game.scene.getScene(FIGHT_SCENE) as FightScene | null)?.setHeldStruggle(
          this.struggle === 'hold',
        );
        again(struggle);
      },
    };
    const keys: MenuItem = {
      label: 'Touches',
      hint: 'Clavier, manette et boutons tactiles',
      onSelect: () => {
        this.showBindings(paused, () => {
          this.showOptions(paused, back, items.indexOf(keys));
        });
      },
    };
    items.push(sound, flash, tremble, scene, text, struggle, keys, {
      label: 'Retour',
      onSelect: back,
    });
    this.showMenu({
      title: 'Options',
      overlay: paused,
      ...(paused ? {} : { backdrop: 'system' as const }),
      note: `Version du ${buildDate()}`,
      items,
      onBack: back,
      initialIndex,
    });
  }

  /**
   * The « Touches » screen (src/ui/bindings-screen.ts): each player's keyboard and gamepad, and on
   * a touch screen player 1's buttons, its first tab there. What is changed is kept at once, and a
   * fight under the pause takes it as it resumes.
   */
  private showBindings(paused: boolean, back: () => void, tab?: BindingsTab): void {
    const touch = isTouchDevice();
    const tabs: BindingsTab[] = touch
      ? ['touch', 'keys1', 'keys2', 'pad1', 'pad2']
      : ['keys1', 'keys2', 'pad1', 'pad2'];
    this.show(
      new BindingsScreen(this.root, {
        tabs,
        ...(tab ? { initialTab: tab } : {}),
        overlay: paused,
        ...(paused ? {} : { backdrop: 'system' as const }),
        onBack: back,
        onTouchLayout: () => {
          this.show(
            new TouchLayoutEditor(this.root, {
              overlay: paused,
              feedback: this.menuFeedback,
              onBack: () => {
                this.showBindings(paused, back, 'touch');
              },
            }),
          );
        },
        feedback: this.menuFeedback,
      }),
      paused ? {} : { backdrop: 'system' },
    );
  }

  /** The player changed an option: kept (that one alone), then applied everywhere. */
  private changeComfort(changed: Partial<Comfort>): void {
    this.chosen = { ...this.chosen, ...changed };
    this.comfort = { ...this.comfort, ...changed };
    saveComfort(changed);
    this.applyComfort();
  }

  /** The comfort options on the menus (their classes) and on the fight, if one is on. */
  private applyComfort(): void {
    this.applyComfortClasses();
    (this.game.scene.getScene(FIGHT_SCENE) as FightScene | null)?.applyComfort(this.comfort);
  }

  /**
   * The menus' own animations (styles.css): `calm`, nothing blinks or glows on and off (the
   * prompt, the frame of the tile chosen); `still`, nothing turns (the title's vinyl). And their
   * text, `large-text` (« Taille du texte »).
   */
  private applyComfortClasses(): void {
    const set = (name: string, on: boolean) => {
      if (on) this.root.classList.add(name);
      else this.root.classList.remove(name);
    };
    set('calm', isCalm(this.comfort));
    set('still', isStill(this.comfort));
    set('large-text', this.textSize === 'large');
  }

  /**
   * The "Commandes" screen on page `index` (devices, « Les bases », a page per fighter), its
   * pages as the choices. Over the fight from the pause menu (`paused`), back to it.
   */
  private showControls(index: number, paused: boolean): void {
    // The player's own keys and buttons, as « Touches » left them.
    const pages = helpPages(currentDevices(), controlsStore.get().bindings);
    const page = pages[index] ?? pages[0];
    if (!page) return;
    const back = () => {
      if (paused) this.showPause();
      else this.showMainMenu();
    };
    this.showMenu({
      title: 'Commandes',
      // Whose moves a fighter's page lists; the other pages' headings say what they are.
      ...(page.fighter ? { subtitle: page.title } : {}),
      overlay: paused,
      ...(paused ? {} : { backdrop: 'system' as const }),
      row: true,
      content: controlsContent(page),
      items: [
        ...pages.map((other, at) => ({
          label: other.title,
          onSelect: () => {
            this.showControls(at, paused);
          },
        })),
        { label: 'Retour', onSelect: back },
      ],
      onBack: back,
      initialIndex: pages.indexOf(page),
    });
  }

  /**
   * The character select screen for `player`: the tiles of the roster, the cursor on its last
   * pick; while player 2 chooses, player 1's pick is marked.
   */
  private chooseFighter(player: 0 | 1): void {
    const { mode, fighters } = this.setup;
    const title =
      player === 0
        ? mode === 'versus'
          ? 'Joueur 1'
          : 'Ton combattant'
        : mode === 'versus'
          ? 'Joueur 2'
          : mode === 'cpu'
            ? 'Adversaire'
            : 'Mannequin';

    const pick = (id: FighterId): void => {
      const chosen: [FighterId, FighterId] = [...this.setup.fighters];
      chosen[player] = id;
      this.setup = { ...this.setup, fighters: chosen };
      this.afterFighterChosen(player);
    };
    const random = player === 1 && mode !== 'versus';
    this.show(
      new FighterSelect(this.root, {
        title,
        subtitle: 'Choisis un combattant',
        fighters: selectFighters(),
        slots: SELECT_SLOTS,
        columns: SELECT_COLUMNS,
        initial: fighters[player],
        ...(player === 1 && { taken: fighters[0] }),
        onPick: pick,
        ...(random && {
          onRandom: () => {
            pick(randomFighter());
          },
        }),
        onBack: () => {
          if (player === 0) this.showMainMenu();
          else this.chooseFighter(0);
        },
        feedback: this.menuFeedback,
        still: isStill(this.comfort),
        backdrop: 'select',
      }),
      { backdrop: 'select' },
    );
  }

  private afterFighterChosen(player: 0 | 1): void {
    if (player === 0) {
      this.chooseFighter(1);
      return;
    }
    if (this.setup.mode === 'cpu') {
      this.chooseLevel();
      return;
    }
    if (this.setup.mode === 'training') {
      this.chooseDummy();
      return;
    }
    this.chooseStage(() => {
      this.chooseFighter(1);
    });
  }

  /**
   * The « Lieu » screen (docs/art/decor-rue.md §14), in every mode: « Aléatoire » or a place,
   * its atmosphere at random (training's pause chooses it); then the fight. Skipped while the fights
   * have one place or none. `back`: the screen before it.
   */
  private chooseStage(back: () => void): void {
    if (OFFERED_STAGES.length < 2) {
      this.startFight();
      return;
    }
    this.show(
      new StageSelect(this.root, {
        places: selectStages(OFFERED_STAGES),
        columns: STAGE_COLUMNS,
        initial: this.stageChoice.map,
        onPick: (map) => {
          this.stageChoice = placedAt(this.stageChoice, map);
          this.startFight();
        },
        onBack: back,
        feedback: this.menuFeedback,
        backdrop: 'stage',
      }),
      { backdrop: 'stage' },
    );
  }

  private chooseLevel(): void {
    const tones = ['cyan', 'orange', 'red'] as const;
    const badges = ['I', 'II', 'III'] as const;
    const meters = [1, 2, 3] as const;
    this.showMenu({
      title: 'Difficulté',
      subtitle: 'Choisis le rythme du combat',
      backdrop: 'system',
      columns: 3,
      showHints: true,
      help: 'Flèches choisir · Entrée / A valider · Echap / B retour',
      items: LEVELS.map(({ level, label, hint }, index) => ({
        label,
        hint,
        primary: true,
        badge: badges[index] ?? 'I',
        tone: tones[index] ?? 'cyan',
        meter: meters[index] ?? 1,
        onSelect: () => {
          this.setup = { ...this.setup, cpuLevel: level };
          this.chooseStage(() => {
            this.chooseLevel();
          });
        },
      })),
      onBack: () => {
        this.chooseFighter(1);
      },
    });
  }

  private chooseDummy(initialIndex = 0): void {
    const gauge = GAUGES.findIndex(({ gauge }) => gauge === this.setup.gauge);
    // The training gauge, cycled in place: the menu comes back with it still selected.
    const gaugeItem: MenuItem = {
      label: `Jauge : ${GAUGES[gauge]?.label ?? ''}`,
      hint: 'La jauge de Boost : pleine, infinie, ou comme en match',
      onSelect: () => {
        const next = GAUGES[(gauge + 1) % GAUGES.length] ?? GAUGES[0];
        if (next) this.setup = { ...this.setup, gauge: next.gauge };
        this.chooseDummy(items.indexOf(gaugeItem));
      },
    };
    // The Finisher and the dummy's health (docs/finisher.md §1.12), cycled in place the same way.
    const finisher = TRAINING_FINISHERS.findIndex((f) => f.finisher === this.setup.finisher);
    const finisherItem: MenuItem = {
      label: `Finisher : ${TRAINING_FINISHERS[finisher]?.label ?? ''}`,
      hint: 'Comme en match, toujours prêt, ou la super seule',
      onSelect: () => {
        const next = TRAINING_FINISHERS[(finisher + 1) % TRAINING_FINISHERS.length];
        if (next) this.setup = { ...this.setup, finisher: next.finisher };
        this.chooseDummy(items.indexOf(finisherItem));
      },
    };
    const health = DUMMY_HEALTHS.indexOf(this.setup.dummyHealth);
    const healthItem: MenuItem = {
      label: `Vie du mannequin : ${this.setup.dummyHealth} %`,
      hint: 'La vie à laquelle il revient après chaque combo',
      onSelect: () => {
        const next = DUMMY_HEALTHS[(health + 1) % DUMMY_HEALTHS.length];
        if (next) this.setup = { ...this.setup, dummyHealth: next };
        this.chooseDummy(items.indexOf(healthItem));
      },
    };
    const items: MenuItem[] = [
      ...DUMMIES.map(({ dummy, label, hint }, index) => ({
        label,
        hint,
        onSelect: () => {
          this.setup = { ...this.setup, dummy };
          this.chooseStage(() => {
            this.chooseDummy(index);
          });
        },
      })),
      gaugeItem,
      finisherItem,
      healthItem,
      ...this.viewingItems((item) => {
        this.chooseDummy(items.indexOf(item));
      }),
    ];
    this.showMenu({
      title: 'Mannequin',
      items,
      onBack: () => {
        this.chooseFighter(1);
      },
      initialIndex,
    });
  }

  /**
   * « Vitesse » and « Animation » (docs/art/animation-plan.md §2, V0), each cycled in place: the
   * game slowed down to half or a quarter, the animation of now or of before, to compare them on
   * the same blow. `again`: shows the menu again, the item still selected.
   */
  private viewingItems(again: (item: MenuItem) => void): MenuItem[] {
    const { slowdown, anim } = this.viewing;
    const speed: MenuItem = {
      label: `Vitesse : ${SLOWDOWN_LABELS[slowdown]}`,
      hint: 'Le jeu au ralenti, pour regarder les animations',
      onSelect: () => {
        this.viewing = { ...this.viewing, slowdown: nextSlowdown(slowdown) };
        again(speed);
      },
    };
    const animation: MenuItem = {
      label: `Animation : ${animLabel(anim)}`,
      hint: "La nouvelle, ou celle d'avant pour comparer",
      onSelect: () => {
        this.viewing = { ...this.viewing, anim: anim.legacy ? ANIM_OPTIONS : LEGACY_ANIM };
        again(animation);
      },
    };
    return [speed, animation];
  }

  /**
   * The training pause's « Mannequin », « Position », « Boîtes » and « Données »
   * (docs/polish/AUDIT-ET-PLAN.md, P19 and lot 13), each cycled in place: what player 2 does, where
   * both fighters start over (as the pause closes, and on every « Recommencer »), the boxes
   * `?debug` shows (hit, hurt and push), the input history and the frame meter, to learn the reach
   * and the openings without leaving the session. The others apply to the fight at once. `again`:
   * shows the pause again, the item still selected.
   */
  private trainingItems(fight: FightScene, again: (item: MenuItem) => void): MenuItem[] {
    const index = DUMMIES.findIndex(({ dummy }) => dummy === this.setup.dummy);
    const dummy: MenuItem = {
      label: `Mannequin : ${DUMMIES[index]?.label ?? ''}`,
      hint: DUMMIES[index]?.hint ?? '',
      onSelect: () => {
        const next = DUMMIES[(index + 1) % DUMMIES.length] ?? DUMMIES[0];
        if (next) {
          this.setup = { ...this.setup, dummy: next.dummy };
          fight.setDummy(next.dummy);
        }
        again(dummy);
      },
    };
    const at = POSITIONS.findIndex(({ position }) => position === this.setup.position);
    const position: MenuItem = {
      label: `Position : ${POSITIONS[at]?.label ?? ''}`,
      hint: `${POSITIONS[at]?.hint ?? ''}, dès la reprise`,
      onSelect: () => {
        const next = POSITIONS[(at + 1) % POSITIONS.length] ?? POSITIONS[0];
        if (next) this.setup = { ...this.setup, position: next.position };
        again(position);
      },
    };
    const boxes: MenuItem = {
      label: `Boîtes : ${this.boxes ? 'oui' : 'non'}`,
      hint: 'Les zones qui frappent, qui encaissent et qui poussent',
      onSelect: () => {
        this.boxes = !this.boxes;
        fight.setBoxes(this.boxes);
        again(boxes);
      },
    };
    const data: MenuItem = {
      label: `Données : ${this.trainingData ? 'oui' : 'non'}`,
      hint: 'Les entrées du joueur 1 et la frise des frames',
      onSelect: () => {
        this.trainingData = !this.trainingData;
        fight.setTrainingData(this.trainingData);
        again(data);
      },
    };
    const { map, atmosphere } = this.stageChoice;
    const placeAt = PLACE_CHOICES.indexOf(map);
    const place: MenuItem = {
      label: `Lieu : ${placeLabel(map)}`,
      hint: 'Où se battre, dès la reprise',
      onSelect: () => {
        const next = PLACE_CHOICES[(placeAt + 1) % PLACE_CHOICES.length] ?? 'random';
        this.stageChoice = placedAt(this.stageChoice, next);
        again(place);
      },
    };
    const atmospheres = atmosphereChoices(map);
    const atmosphereAt = atmospheres.findIndex(
      (choice) => atmosphereKey(choice) === atmosphereKey(atmosphere),
    );
    const ambiance: MenuItem = {
      label: `Ambiance : ${atmosphereLabel(atmosphere)}`,
      hint: "L'heure et la météo, dès la reprise",
      onSelect: () => {
        const next = atmospheres[(atmosphereAt + 1) % atmospheres.length] ?? 'random';
        this.stageChoice = { map, atmosphere: next };
        again(ambiance);
      },
    };
    return [
      dummy,
      position,
      ...(PLACE_CHOICES.length > 2 ? [place] : []),
      ...(atmospheres.length > 2 ? [ambiance] : []),
      boxes,
      data,
    ];
  }

  /**
   * `again`: the same match once more (« Revanche », « Recommencer »), on the same stage; else a
   * new one, its stage drawn anew: against the computer and in versus, at the place chosen; in
   * training, as its « Lieu » and « Ambiance » say.
   */
  private startFight(again = false): void {
    if (!again || !this.stage) {
      const { mode } = this.setup;
      const chosen: StageChoice =
        mode === 'training'
          ? this.stageChoice
          : { map: this.stageChoice.map, atmosphere: 'random' };
      this.stage = stageVariantFor(chosen, OFFERED_STAGES);
      this.startedChoice = this.stageChoice;
    }
    this.screen?.dispose();
    this.screen = undefined;
    this.backdrop?.setVisible(false);
    // No black screen while the fight loads and builds (L16): the card, then the fight.
    this.card?.dispose();
    const [first, second] = this.setup.fighters;
    const card = new FightCard(
      this.root,
      `${templateOf(first).name} contre ${templateOf(second).name}`,
    );
    this.card = card;
    this.startedPosition = this.setup.position;
    const { online } = this;
    const data: FightSceneData = {
      setup: this.setup,
      sfx: this.sfx,
      comfort: this.comfort,
      finishersSeen: this.finishersSeen,
      viewing: this.setup.mode === 'training' ? this.viewing : this.fromUrl,
      boxes: this.setup.mode === 'training' && this.boxes,
      trainingData: this.trainingData,
      heldStruggle: this.struggle === 'hold',
      mode: this.mode,
      silhouette: this.silhouette,
      stage: this.stage,
      onPause: () => {
        // Online, the pause is both devices': asked here, taken a few ticks later by both.
        if (online) {
          online.requestPause();
          (this.game.scene.getScene(FIGHT_SCENE) as FightScene | null)?.resumeMatch();
        } else this.showPause();
      },
      onMatchEnd: (winner) => {
        if (online) this.showOnlineResults(online, winner);
        else this.showResults(winner);
      },
      ...(online && {
        online: {
          player: online.player,
          source: (struggle) => online.source(struggle),
          held: () => online.held(),
        },
      }),
      onShown: () => {
        card.leave();
        if (this.card === card) this.card = undefined;
      },
    };
    // The render loop only runs during fights: menus are plain HTML and need no redraw.
    this.game.loop.wake();
    this.game.scene.start(FIGHT_SCENE, data);
  }

  private stopFight(): void {
    this.game.scene.stop(FIGHT_SCENE);
    this.game.loop.sleep();
    // Closed before its first frame: its card goes with it.
    this.card?.dispose();
    this.card = undefined;
  }

  /** `initialIndex`: the item selected (the options', coming back from them). */
  private showPause(initialIndex = 0): void {
    const fight = this.game.scene.getScene(FIGHT_SCENE) as FightScene;
    // Training: its « Lieu » or « Ambiance » changed, the stage is drawn anew as they now say.
    const sameStage = () => sameChoice(this.stageChoice, this.startedChoice);
    const resume = () => {
      // Training: both fighters go where « Position » now says, as « Recommencer » puts them.
      if (this.setup.position !== this.startedPosition || !sameStage()) {
        this.startFight(sameStage());
        return;
      }
      this.screen?.dispose();
      this.screen = undefined;
      fight.resumeMatch();
    };
    // Over the fight: what is chosen there applies to it at once, before it resumes.
    const optionsItem: MenuItem = {
      label: 'Options',
      onSelect: () => {
        this.showOptions(true, () => {
          this.showPause(items.indexOf(optionsItem));
        });
      },
    };
    const items: MenuItem[] = [
      { label: 'Reprendre', onSelect: resume },
      {
        label: 'Recommencer',
        onSelect: () => {
          this.startFight(sameStage());
        },
      },
      {
        label: 'Commandes',
        // Opens on the page of player 1's fighter: the moves they are playing with.
        onSelect: () => {
          const pages = helpPages(currentDevices(), controlsStore.get().bindings);
          const own = pages.findIndex((page) => page.fighter === this.setup.fighters[0]);
          this.showControls(Math.max(0, own), true);
        },
      },
      // Training: the dummy and the boxes, then how it is watched, at once, over the fight.
      ...(this.setup.mode === 'training'
        ? [
            ...this.trainingItems(fight, (item) => {
              this.showPause(items.indexOf(item));
            }),
            ...this.viewingItems((item) => {
              fight.setViewing(this.viewing);
              this.showPause(items.indexOf(item));
            }),
          ]
        : []),
      optionsItem,
      {
        label: 'Quitter',
        hint: 'Retour au menu principal',
        onSelect: () => {
          this.quitToMenu();
        },
      },
    ];
    this.showMenu({ title: 'Pause', overlay: true, items, onBack: resume, initialIndex });
  }

  private showResults(winner: 0 | 1 | null): void {
    const name = winner === null ? null : templateOf(this.setup.fighters[winner]).name;
    const title = name === null ? 'Egalité' : `${name} gagne !`;
    const subtitle =
      this.setup.mode === 'cpu'
        ? winner === 0
          ? "Victoire contre l'ordinateur"
          : "L'ordinateur l'emporte"
        : winner === null
          ? undefined
          : `Victoire du joueur ${winner + 1}`;

    this.showMenu({
      title,
      ...(subtitle ? { subtitle } : {}),
      overlay: true,
      items: [
        {
          label: 'Revanche',
          onSelect: () => {
            this.startFight(true);
          },
        },
        {
          label: 'Changer de combattants',
          onSelect: () => {
            this.backToSelection();
          },
        },
        {
          label: 'Menu principal',
          onSelect: () => {
            this.quitToMenu();
          },
        },
      ],
    });
  }

  private backToSelection(): void {
    this.stopFight();
    this.chooseFighter(0);
  }

  private quitToMenu(): void {
    this.stopFight();
    this.showMainMenu();
  }

  private showMenu(options: MenuOptions): void {
    this.show(
      new Menu(this.root, { ...options, feedback: this.menuFeedback }),
      options.backdrop ? { backdrop: options.backdrop } : {},
    );
  }

  private readonly menuFeedback = (action: MenuFeedback): void => {
    // Every menu action is a user gesture: a good moment to (re)enable audio.
    this.sfx.unlock();
    this.sfx.play(
      action === 'move' ? 'menuMove' : action === 'confirm' ? 'menuConfirm' : 'menuBack',
    );
  };
}

function randomFighter(): FighterId {
  const entry = ROSTER[Math.floor(Math.random() * ROSTER.length)] ?? ROSTER[0];
  if (!entry) throw new Error('The roster is empty');
  return entry.id;
}
