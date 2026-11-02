import type { StageVariant } from './stage-layers';
import { STAGE_VARIANTS as RUE } from './rue';

/** A place the fights may be held in (docs/art/decor-rue.md §14): its name, its atmospheres. */
export interface StageMap {
  /** Its folder: src/art/<name>/, tools/stage/<name>/. */
  readonly name: string;
  /** What the « Lieu » screen calls it, and says of it. */
  readonly title: string;
  readonly description: string;
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
    variants: RUE,
  },
].filter(({ variants }) => variants.length > 0);
