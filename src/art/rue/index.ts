import { stageArtOf, type StageArt } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

/** The layers and the props' sheet, as `npm run sprites` writes them here. */
const IMAGES = import.meta.glob<string>('./*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/**
 * The street in front of L'Entrepôt (docs/art/decor-rue.md), the stage of every fight;
 * undefined while its layers are missing: the grey box.
 */
export const STAGE_ART: StageArt | undefined = stageArtOf(IMAGES, STAGE_COLORS, STAGE_PROPS);
