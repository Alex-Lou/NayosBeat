/**
 * What the online salon offers and checks (docs/multijoueur.md §7): the places and the fighters
 * of this game, the host's draw of a place, and what a place received from the other device must
 * be to be shown.
 */

import { atmosphereName } from '../art/stage-layers';
import { STAGE_MAPS, type StageMap } from '../art/stages';
import { ROSTER, type FighterId } from '../data/roster';
import { stageVariantFor } from '../render/stage-view';
import type { FighterSelectOptions } from '../ui/fighter-select';
import type { SelectPlace } from '../ui/stage-select';
import type { StagePick } from './salon';
import { selectFighters } from './select-fighters';
import { selectStages } from './select-stages';

export interface MultiCatalog {
  /** The « Lieu » screen's tiles; fewer than two, the host draws at once. */
  readonly places: () => readonly SelectPlace<string>[];
  readonly fighters: () => FighterSelectOptions<FighterId>['fighters'];
  /** The host's place: `map` in an atmosphere at random, or anywhere at random. */
  readonly draw: (map: string) => StagePick;
  readonly isStage: (pick: StagePick) => boolean;
  readonly isFighter: (id: string) => id is FighterId;
  /** What the place is called, to tell it. */
  readonly title: (pick: StagePick) => string;
  /** A fighter's name. */
  readonly name: (id: FighterId) => string;
}

/** No place drawn: the fight in the grey box. */
const GREY_BOX: StagePick = { map: 'none', atmosphere: 'none' };

export function multiCatalog(maps: readonly StageMap[] = STAGE_MAPS): MultiCatalog {
  return {
    places: () => selectStages(maps),
    fighters: selectFighters,
    draw: (map) => {
      const variant = stageVariantFor({ map, atmosphere: 'random' }, maps);
      if (!variant) return GREY_BOX;
      return { map: variant.stage, atmosphere: atmosphereName(variant.atmosphere) };
    },
    isStage: ({ map, atmosphere }) =>
      maps.length === 0
        ? map === GREY_BOX.map && atmosphere === GREY_BOX.atmosphere
        : maps.some(
            ({ name, variants }) =>
              name === map &&
              variants.some((variant) => atmosphereName(variant.atmosphere) === atmosphere),
          ),
    isFighter: (id): id is FighterId => ROSTER.some((entry) => entry.id === id),
    title: ({ map }) => maps.find(({ name }) => name === map)?.title ?? 'la boîte grise',
    name: (id) => ROSTER.find((entry) => entry.id === id)?.template.name ?? id,
  };
}
