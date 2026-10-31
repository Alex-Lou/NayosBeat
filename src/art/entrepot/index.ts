import { stageArtOf, type StageArt } from '../stage-layers';
import { STAGE_COLORS } from './colors';

/** The layers drawn by hand, as `npm run sprites` copies them here (from art-src/entrepot/). */
const IMAGES = import.meta.glob<string>('./*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** The Warehouse, the stage of every fight once drawn; undefined: the grey box. */
export const STAGE_ART: StageArt | undefined = stageArtOf(IMAGES, STAGE_COLORS);
