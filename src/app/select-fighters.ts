import { artOf } from '../art';
import { cellOf, type FighterArt } from '../art/types';
import { TICK_RATE } from '../core/constants';
import { ROSTER, type FighterId } from '../data/roster';
import type { FighterLook, SelectFighter } from '../ui/fighter-select';

/** Tiles of the character select screen: two rows of five, room for the roster to come. */
export const SELECT_SLOTS = 10;
export const SELECT_COLUMNS = 5;

/** The fighters of the select screen, in roster order, with their looks in both colorways. */
export function selectFighters(): SelectFighter<FighterId>[] {
  return ROSTER.map(({ id, template, description }) => {
    const look = lookOf(artOf(id));
    const mirrorLook = lookOf(artOf(id, 'alt'));
    return {
      id,
      name: template.name,
      description,
      ...(look && { look }),
      ...(mirrorLook && { mirrorLook }),
    };
  });
}

/** How `art` stands on the select screen: its idle at the game's pace, the bust on its tile. */
export function lookOf(art: FighterArt | undefined): FighterLook | undefined {
  const idle = art?.clips.idle;
  const strip = idle && art.urls[idle.sheet];
  if (!art || !idle || !strip) return undefined;
  const { width, height } = cellOf(art, idle.sheet);
  return {
    strip,
    frames: art.sheets[idle.sheet]?.frames ?? 1,
    width,
    height,
    portrait: art.portrait ?? { x: 0, y: 0, size: Math.min(width, height) },
    idle: idle.frames.map((frame, index) => ({
      frame,
      seconds: (idle.ticks[index] ?? 0) / TICK_RATE,
    })),
  };
}
