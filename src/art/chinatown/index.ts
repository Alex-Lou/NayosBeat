import { stageVariantsOf } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

const IMAGES = import.meta.glob<string>('./**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Chinatown in its one atmosphere, the illustration's dusk. */
export const STAGE_VARIANTS = stageVariantsOf('chinatown', IMAGES, STAGE_COLORS, STAGE_PROPS);
