import type { StageArt } from '../art/stage-layers';
import { STAGE_MAPS, type StageMap } from '../art/stages';
import { VIEW_SIZE } from '../render/view';
import type { SelectPlace, ThumbLayer } from '../ui/stage-select';

/** Tiles a row on the « Lieu » screen. */
export const STAGE_COLUMNS = 4;

/** The places of the « Lieu » screen, in their order, each in its base atmosphere. */
export function selectStages(maps: readonly StageMap[] = STAGE_MAPS): SelectPlace<string>[] {
  return maps.flatMap(({ name, title, description, variants }) => {
    const [base] = variants;
    return base ? [{ id: name, name: title, description, thumb: thumbOf(base.art) }] : [];
  });
}

/**
 * The stage as the fight opens on it, the camera in the middle: each layer moved by its share of
 * the camera's move (its parallax), which centers it, as wide as it is the view's width over.
 */
export function thumbOf(art: StageArt): ThumbLayer[] {
  const { width, height } = VIEW_SIZE;
  return art.layers.map((layer) => ({
    url: layer.url,
    x: -(layer.width - width) / 2 / width,
    y: layer.y / height,
    width: layer.width / width,
    height: layer.height / height,
  }));
}
