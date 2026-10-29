import type Phaser from 'phaser';
import type { CpuLevel } from '../ai/cpu';
import type { Sfx } from '../audio/sfx';
import type { TrainingGauge } from '../core/config';
import { ROSTER, templateOf, type FighterId } from '../data/roster';
import type { FightScene, FightSceneData } from '../render/fight-scene';
import { requestLandscapeFullscreen } from '../render/fullscreen';
import { isTouchDevice } from '../input/touch-controls';
import { Menu, type MenuFeedback, type MenuItem, type MenuOptions } from '../ui/menu';
import { TitleScreen } from '../ui/title-screen';
import { controlsContent, currentDevices, helpPages } from './controls-content';
import { installMethod, onInstallChange, promptInstall } from './install';
import { DEFAULT_SETUP, type DummyBehavior, type GameMode, type MatchSetup } from './match-setup';

const FIGHT_SCENE = 'fight';

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

/**
 * Screen flow: title → main menu → fighter selection → fight → results, with pause.
 * Owns the current screen and the match setup; the fight itself runs in the Phaser scene.
 */
export class App {
  private screen: { dispose(): void } | undefined;
  private setup: MatchSetup = DEFAULT_SETUP;
  /** The main menu is on screen (it is redrawn when installing becomes possible). */
  private onMainMenu = false;
  private onTitle = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly game: Phaser.Game,
    private readonly sfx: Sfx,
  ) {}

  start(): void {
    this.game.loop.sleep();
    // The browser tells late (after the page loaded) that the game can be installed.
    onInstallChange(() => {
      if (this.onMainMenu) this.showMainMenu();
    });
    this.showTitle();
  }

  /** Nothing is being played or chosen: an update of the game may reload it now. */
  isIdle(): boolean {
    return this.onTitle || this.onMainMenu;
  }

  private show(screen: { dispose(): void }): void {
    this.onMainMenu = false;
    this.onTitle = false;
    this.screen?.dispose();
    this.screen = screen;
  }

  private showTitle(): void {
    this.show(
      new TitleScreen(this.root, () => {
        // A user gesture: the only moment browsers allow audio and (on mobile) fullscreen.
        this.sfx.unlock();
        this.sfx.play('menuConfirm');
        if (isTouchDevice()) requestLandscapeFullscreen();
        this.showMainMenu();
      }),
    );
    this.onTitle = true;
  }

  private showMainMenu(initialIndex = 0): void {
    const choose = (mode: GameMode) => () => {
      this.setup = { ...this.setup, mode };
      this.chooseFighter(0);
    };
    const soundItem: MenuItem = {
      label: `Son : ${this.sfx.isEnabled ? 'oui' : 'non'}`,
      onSelect: () => {
        this.sfx.setEnabled(!this.sfx.isEnabled);
        // Re-shown with the toggle still selected.
        this.showMainMenu(items.indexOf(soundItem));
      },
    };
    const items: MenuItem[] = [
      { label: "Contre l'ordinateur", hint: 'Un joueur', onSelect: choose('cpu') },
      { label: '2 joueurs', hint: 'Sur le même appareil', onSelect: choose('versus') },
      { label: 'Entraînement', hint: 'Sans chrono, vie infinie', onSelect: choose('training') },
      {
        label: 'Commandes',
        onSelect: () => {
          this.showControls(0, false);
        },
      },
      soundItem,
    ];
    const install = installMethod();
    if (install === 'prompt') {
      items.push({
        label: 'Installer le jeu',
        hint: 'Plein écran, hors ligne',
        onSelect: () => {
          void promptInstall().then(() => {
            this.showMainMenu();
          });
        },
      });
    } else if (install === 'safari') {
      items.push({
        label: 'Installer le jeu',
        hint: 'Partager, puis « Sur l’écran d’accueil »',
        onSelect: () => undefined,
      });
    }
    this.showMenu({
      title: 'NAYOSBEAT',
      items,
      onBack: () => {
        this.showTitle();
      },
      initialIndex,
    });
    this.onMainMenu = true;
  }

  /**
   * The "Commandes" screen on page `index` (devices, « Les bases », a page per fighter), its
   * pages as the choices. Over the fight from the pause menu (`paused`), back to it.
   */
  private showControls(index: number, paused: boolean): void {
    const pages = helpPages(currentDevices());
    const page = pages[index] ?? pages[0];
    if (!page) return;
    const back = () => {
      if (paused) this.showPause();
      else this.showMainMenu();
    };
    this.showMenu({
      title: 'Commandes',
      subtitle: page.title,
      overlay: paused,
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

  private chooseFighter(player: 0 | 1): void {
    const { mode } = this.setup;
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

    const pick = (id: FighterId) => () => {
      const fighters: [FighterId, FighterId] = [...this.setup.fighters];
      fighters[player] = id;
      this.setup = { ...this.setup, fighters };
      this.afterFighterChosen(player);
    };
    const items: MenuItem[] = ROSTER.map((entry) => ({
      label: entry.template.name,
      hint: entry.description,
      onSelect: pick(entry.id),
    }));
    if (player === 1 && mode !== 'versus') {
      items.push({
        label: 'Aléatoire',
        onSelect: () => {
          pick(randomFighter())();
        },
      });
    }

    this.showMenu({
      title,
      subtitle: 'Choisis un combattant',
      items,
      onBack: () => {
        if (player === 0) this.showMainMenu();
        else this.chooseFighter(0);
      },
    });
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
    this.startFight();
  }

  private chooseLevel(): void {
    this.showMenu({
      title: 'Difficulté',
      items: LEVELS.map(({ level, label, hint }) => ({
        label,
        hint,
        onSelect: () => {
          this.setup = { ...this.setup, cpuLevel: level };
          this.startFight();
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
    const items: MenuItem[] = [
      ...DUMMIES.map(({ dummy, label, hint }) => ({
        label,
        hint,
        onSelect: () => {
          this.setup = { ...this.setup, dummy };
          this.startFight();
        },
      })),
      gaugeItem,
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

  private startFight(): void {
    this.screen?.dispose();
    this.screen = undefined;
    const data: FightSceneData = {
      setup: this.setup,
      sfx: this.sfx,
      onPause: () => {
        this.showPause();
      },
      onMatchEnd: (winner) => {
        this.showResults(winner);
      },
    };
    // The render loop only runs during fights: menus are plain HTML and need no redraw.
    this.game.loop.wake();
    this.game.scene.start(FIGHT_SCENE, data);
  }

  private stopFight(): void {
    this.game.scene.stop(FIGHT_SCENE);
    this.game.loop.sleep();
  }

  private showPause(): void {
    const fight = this.game.scene.getScene(FIGHT_SCENE) as FightScene;
    const resume = () => {
      this.screen?.dispose();
      this.screen = undefined;
      fight.resumeMatch();
    };
    this.showMenu({
      title: 'Pause',
      overlay: true,
      items: [
        { label: 'Reprendre', onSelect: resume },
        {
          label: 'Recommencer',
          onSelect: () => {
            this.startFight();
          },
        },
        {
          label: 'Commandes',
          // Opens on the page of player 1's fighter: the moves they are playing with.
          onSelect: () => {
            const pages = helpPages(currentDevices());
            const own = pages.findIndex((page) => page.fighter === this.setup.fighters[0]);
            this.showControls(Math.max(0, own), true);
          },
        },
        {
          label: 'Quitter',
          hint: 'Retour au menu principal',
          onSelect: () => {
            this.quitToMenu();
          },
        },
      ],
      onBack: resume,
    });
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
            this.startFight();
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
    this.show(new Menu(this.root, { ...options, feedback: this.menuFeedback }));
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
