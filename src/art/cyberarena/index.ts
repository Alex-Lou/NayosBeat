import { stageVariantsOf } from '../stage-layers';
import { STAGE_COLORS } from './colors';
import { STAGE_PROPS } from './props';

const IMAGES = import.meta.glob<string>('./**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Cyber Arena under the moon. */
export const STAGE_VARIANTS = stageVariantsOf('cyberarena', IMAGES, STAGE_COLORS, STAGE_PROPS);
