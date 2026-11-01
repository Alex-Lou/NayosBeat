import { artOf } from '../art';
import { cellOf, type Atlas, type FighterArt } from '../art/types';
import { TICK_RATE } from '../core/constants';
import { ROSTER, type FighterId } from '../data/roster';
import type { FighterLook, FrameCut, SelectFighter } from '../ui/fighter-select';

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
  const frames = art.sheets[idle.sheet]?.frames ?? 1;
  return {
    strip,
    ...cutsOf(art.idleAtlas, frames, width, height),
    width,
    height,
    portrait: art.portrait ?? { x: 0, y: 0, size: Math.min(width, height) },
    ...(art.portraitImage !== undefined && { portraitImage: art.portraitImage }),
    idle: idle.frames.map((frame, index) => ({
      frame,
      seconds: (idle.ticks[index] ?? 0) / TICK_RATE,
    })),
  };
}

/**
 * Where each of the `frames` frames of the idle (cells of `width` by `height`) is in its image:
 * cut to what it draws and packed, as its atlas says, or side by side without one.
 */
function cutsOf(
  atlas: Atlas | undefined,
  frames: number,
  width: number,
  height: number,
): Pick<FighterLook, 'image' | 'cuts'> {
  const cuts = Array.from({ length: frames }, (_, frame): FrameCut => {
    if (!atlas) return { x: 0, y: 0, width, height, left: frame * width, top: 0 };
    const cut = atlas.frames[String(frame)];
    if (!cut) return { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 };
    const { spriteSourceSize: place, frame: from } = cut;
    return { x: place.x, y: place.y, width: from.w, height: from.h, left: from.x, top: from.y };
  });
  const image = atlas
    ? { width: atlas.meta.size.w, height: atlas.meta.size.h }
    : { width: frames * width, height };
  return { image, cuts };
}
