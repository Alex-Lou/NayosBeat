import { stageVariantsOf } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

const IMAGES = import.meta.glob<string>('./**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Sunset Beam in its dusk atmosphere. */
export const STAGE_VARIANTS = stageVariantsOf('sunset', IMAGES, STAGE_COLORS, STAGE_PROPS);
