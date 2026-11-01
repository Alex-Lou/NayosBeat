import type { Atlas, Clip, FighterArt } from './types';

/**
 * The image URL of each strip of a fighter found in one of its folders (a colorway, or its
 * front effects), from what the bundler globbed there (`import.meta.glob` takes only literal
 * paths, so each fighter's index globs its own folders). A strip missing from the folder is
 * left out: validation reports a body strip without image, and a strip without front effects
 * simply has none. `extension`: the files' (`json` for the atlases written next to the images).
 */
export function urlsOf(
  files: Readonly<Record<string, string>>,
  folder: string,
  sheets: Readonly<Record<string, unknown>>,
  extension = 'png',
): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const sheet of Object.keys(sheets)) {
    const url = files[`./${folder}/${sheet}.${extension}`];
    if (url !== undefined) urls[sheet] = url;
  }
  return urls;
}

/**
 * The bust drawn for the select screen among the images of a colorway's folder (`portrait.png`,
 * drawn by hand: tools/sprites/drawn.ts), when it has one. One image shown whole: no atlas.
 */
export function portraitOf(
  files: Readonly<Record<string, string>>,
  folder: string,
): { portraitImage?: string } {
  const url = files[`./${folder}/portrait.png`];
  return url === undefined ? {} : { portraitImage: url };
}

/**
 * The URL of the atlas of each image of a colorway (`folder`), by strip ('idle') and by strip
 * effects ('fx/idle'), as `cells` names them: the atlases its folder and its `fx/` folder hold.
 */
export function atlasesOf(
  files: Readonly<Record<string, string>>,
  folder: string,
  sheets: Readonly<Record<string, unknown>>,
  effects: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const fx = Object.entries(urlsOf(files, `${folder}/fx`, effects, 'json'));
  return {
    ...urlsOf(files, folder, sheets, 'json'),
    ...Object.fromEntries(fx.map(([name, url]) => [`fx/${name}`, url])),
  };
}

/** The atlas of the idle's strip `sheet` in `folder`, as the art's `idleAtlas` (none without one). */
export function idleAtlasOf(
  files: Readonly<Record<string, Atlas>>,
  folder: string,
  sheet: string,
): Pick<FighterArt, 'idleAtlas'> {
  const atlas = files[`./${folder}/${sheet}.json`];
  return atlas ? { idleAtlas: atlas } : {};
}

/**
 * Every name a fighter's effects images may have: its strips', and the names its clips give their
 * effects (`Clip.fx`, a Remix's platine ones).
 */
export function effectNames(
  sheets: Readonly<Record<string, unknown>>,
  clips: Readonly<Partial<Record<string, Clip>>>,
): Record<string, unknown> {
  const names: Record<string, unknown> = { ...sheets };
  for (const clip of Object.values(clips)) if (clip?.fx !== undefined) names[clip.fx] = clip.sheet;
  return names;
}
