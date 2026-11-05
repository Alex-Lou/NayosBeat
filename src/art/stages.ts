import type { StageVariant } from './stage-layers';
import { STAGE_VARIANTS as BAL } from './bal';
import { STAGE_VARIANTS as CLUB } from './club';
import { STAGE_VARIANTS as DOCK } from './dock';
import { STAGE_VARIANTS as DOJO } from './dojo';
import { STAGE_VARIANTS as DUNES } from './dunes';
import { STAGE_VARIANTS as FORET } from './foret';
import { STAGE_VARIANTS as GYM } from './gym';
import { STAGE_VARIANTS as JUNGLE } from './jungle';
import { STAGE_VARIANTS as LUCIOLES } from './lucioles';
import { STAGE_VARIANTS as MARCHE } from './marche';
import { STAGE_VARIANTS as NEON } from './neon';
import { STAGE_VARIANTS as PLAGE } from './plage';
import { STAGE_VARIANTS as ROOFTOP } from './rooftop';
import { STAGE_VARIANTS as RUE } from './rue';
import { STAGE_VARIANTS as SAKURA } from './sakura';
import { STAGE_VARIANTS as CHINATOWN } from './chinatown';
import { STAGE_VARIANTS as SUNSET } from './sunset';
import { STAGE_VARIANTS as CARNIVAL } from './carnival';
import { STAGE_VARIANTS as SAHEL } from './sahel';
import { STAGE_VARIANTS as TEMPLE } from './temple';

/** A floor: hard (asphalt, concrete, wood, stone) or sand (docs/art/decor-plage.md §6). */
export type Ground = 'hard' | 'sand';

/** A place the fights may be held in (docs/art/decor-rue.md §14): its name, its atmospheres. */
export interface StageMap {
  /** Its folder: src/art/<name>/, tools/stage/<name>/. */
  readonly name: string;
  /** What the « Lieu » screen calls it, and says of it. */
  readonly title: string;
  readonly description: string;
  /**
   * Under a roof: its rain falls outside only, drawn in its own images (a window), never by the
   * render's curtain over the fight (docs/art/pluie.md).
   */
  readonly sheltered: boolean;
  /** Its floor, which the dust kicked up from it shows (src/render/dust.ts). */
  readonly ground: Ground;
  /** In each atmosphere it offers, the base one first. */
  readonly variants: readonly StageVariant[];
}

/**
 * The places the fights may be held in, in the order the « Lieu » screen offers them: those whose
 * images are drawn (`npm run stages`). None: the grey box.
 */
export const STAGE_MAPS: readonly StageMap[] = (
  [
    {
      name: 'rue',
      title: 'Warehouse Street',
      description: 'Devant le club, sous la ligne aérienne',
      sheltered: false,
      ground: 'hard',
      variants: RUE,
    },
    {
      name: 'gym',
      title: 'Viaduct Gym',
      description: 'La salle de boxe sous les arches, où Nayo a appris',
      sheltered: true,
      ground: 'hard',
      variants: GYM,
    },
    {
      name: 'dock',
      title: 'The Loading Dock',
      description: 'La cour derrière le club, où les vigiles chassaient Riff',
      sheltered: false,
      ground: 'hard',
      variants: DOCK,
    },
    {
      name: 'rooftop',
      title: 'Rooftop Rain',
      description: 'Un toit de la mégapole, sous les enseignes géantes',
      sheltered: false,
      ground: 'hard',
      variants: ROOFTOP,
    },
    {
      name: 'temple',
      title: 'Temple Courtyard',
      description: "La cour d'un temple sur une île, la mer derrière le mur",
      sheltered: false,
      ground: 'hard',
      variants: TEMPLE,
    },
    {
      name: 'club',
      title: "L'Entrepôt",
      description: 'Dans le club, sur la piste, devant le DJ',
      sheltered: true,
      ground: 'hard',
      variants: CLUB,
    },
    {
      name: 'bal',
      title: 'Le Bal du Samedi',
      description: "Dans la salle de bal, sous les lustres, devant l'orchestre",
      sheltered: true,
      ground: 'hard',
      variants: BAL,
    },
    {
      name: 'plage',
      title: 'Sunset Beach',
      description: 'Sur la plage au soleil couchant, entre la mer et le bar',
      sheltered: false,
      ground: 'sand',
      variants: PLAGE,
    },
    {
      name: 'marche',
      title: 'Night Market',
      description: 'Dans la ruelle du marché de nuit, sous les lampions',
      sheltered: false,
      ground: 'hard',
      variants: MARCHE,
    },
    {
      name: 'neon',
      title: 'Neon Dusk',
      description: 'La rue cyberpunk sous la pluie, entre les néons',
      sheltered: false,
      ground: 'hard',
      variants: NEON,
    },
    {
      name: 'foret',
      title: 'Dancing Forest',
      description: 'Le sanctuaire dans la forêt, entre les feuilles qui dansent',
      sheltered: false,
      ground: 'hard',
      variants: FORET,
    },
    {
      name: 'jungle',
      title: 'Jungle',
      description: 'Les ruines de la jungle, entre les cascades et les lianes',
      sheltered: false,
      ground: 'hard',
      variants: JUNGLE,
    },
    {
      name: 'dunes',
      title: 'Dune Dusk',
      description: 'Le désert au crépuscule, entre les dunes et le vent',
      sheltered: false,
      ground: 'sand',
      variants: DUNES,
    },
    {
      name: 'lucioles',
      title: 'Firefly Forest',
      description: 'La forêt enchantée, entre les lucioles et la mare',
      sheltered: false,
      ground: 'hard',
      variants: LUCIOLES,
    },
    {
      name: 'dojo',
      title: 'The Dojo',
      description: "La salle d'entraînement, sous les lanternes",
      sheltered: true,
      ground: 'hard',
      variants: DOJO,
    },
    {
      name: 'sakura',
      title: 'Sakura Arena',
      description: 'Le sanctuaire aux cerisiers, sous les lanternes',
      sheltered: false,
      ground: 'hard',
      variants: SAKURA,
    },
    {
      name: 'chinatown',
      title: 'Chinatown',
      description: "Le temple au bord de l'eau, sous les lanternes",
      sheltered: false,
      ground: 'hard',
      variants: CHINATOWN,
    },
    {
      name: 'sunset',
      title: 'Sunset Beam',
      description: 'Le bar de plage au coucher du soleil',
      sheltered: false,
      ground: 'hard',
      variants: SUNSET,
    },
    {
      name: 'carnival',
      title: 'Lomé Carnival',
      description: "Le carnaval abandonné de Lomé, sous l'orage",
      sheltered: false,
      ground: 'hard',
      variants: CARNIVAL,
    },
    {
      name: 'sahel',
      title: 'Sahel Sunset',
      description: 'La rue du marché, au coucher du soleil',
      sheltered: false,
      ground: 'hard',
      variants: SAHEL,
    },
  ] satisfies StageMap[]
).filter(({ variants }) => variants.length > 0);
