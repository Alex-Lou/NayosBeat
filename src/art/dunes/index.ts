import { stageVariantsOf, type StageVariant } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

/** The layers and the props' sheets, as `npm run stages` writes them here, an atmosphere a folder. */
const IMAGES = import.meta.glob<string>('./**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * Dune Dusk (docs/art/decor-dune-dusk.md), in each of its atmospheres, the base one first; none
 * while its layers are missing.
 */
export const STAGE_VARIANTS: readonly StageVariant[] = stageVariantsOf(
  'dunes',
  IMAGES,
  STAGE_COLORS,
  STAGE_PROPS,
);
