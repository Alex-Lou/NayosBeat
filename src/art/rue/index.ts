import { stageVariantsOf, type StageArt, type StageVariant } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

/** The layers and the props' sheets, as `npm run sprites` writes them here, an atmosphere a folder. */
const IMAGES = import.meta.glob<string>('./**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * The street in front of L'Entrepôt (docs/art/decor-rue.md), the stage of every fight, in each
 * of its atmospheres (§13), the base one first; none while its layers are missing: the grey box.
 */
export const STAGE_VARIANTS: readonly StageVariant[] = stageVariantsOf(
  IMAGES,
  STAGE_COLORS,
  STAGE_PROPS,
);

/** The street in its base atmosphere (midnight, a clear night); undefined: the grey box. */
export const STAGE_ART: StageArt | undefined = STAGE_VARIANTS[0]?.art;
