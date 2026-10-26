import { CAMERA_WIDTH_PX } from '../core/constants';
import type { Size } from './pixel-scaling';

/** Internal render resolution. Scaled x4 to 1080p, x8 to 4K. */
export const VIEW_SIZE: Size = { width: CAMERA_WIDTH_PX, height: 270 };
