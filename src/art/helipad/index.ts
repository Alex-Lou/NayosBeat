import { stageVariantsOf } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

const IMAGES = import.meta.glob<string>('./**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** H-02 Helipad in its moonlit midnight. */
export const STAGE_VARIANTS = stageVariantsOf('helipad', IMAGES, STAGE_COLORS, STAGE_PROPS);
