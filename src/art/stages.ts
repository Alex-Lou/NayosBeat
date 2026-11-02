import type { StageVariant } from './stage-layers';
import { STAGE_VARIANTS as DOCK } from './dock';
import { STAGE_VARIANTS as GYM } from './gym';
import { STAGE_VARIANTS as ROOFTOP } from './rooftop';
import { STAGE_VARIANTS as RUE } from './rue';

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
  /** In each atmosphere it offers, the base one first. */
  readonly variants: readonly StageVariant[];
}

/**
 * The places the fights may be held in, in the order the « Lieu » screen offers them: those whose
 * images are drawn (`npm run stages`). None: the grey box.
 */
export const STAGE_MAPS: readonly StageMap[] = [
  {
    name: 'rue',
    title: 'Warehouse Street',
    description: 'Devant le club, sous la ligne aérienne',
    sheltered: false,
    variants: RUE,
  },
  {
    name: 'gym',
    title: 'Viaduct Gym',
    description: 'La salle de boxe sous les arches, où Nayo a appris',
    sheltered: true,
    variants: GYM,
  },
  {
    name: 'dock',
    title: 'The Loading Dock',
    description: 'La cour derrière le club, où les vigiles chassaient Riff',
    sheltered: false,
    variants: DOCK,
  },
  {
    name: 'rooftop',
    title: 'Rooftop Rain',
    description: 'Un toit de la mégapole, sous les enseignes géantes',
    sheltered: false,
    variants: ROOFTOP,
  },
].filter(({ variants }) => variants.length > 0);
