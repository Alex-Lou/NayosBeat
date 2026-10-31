import type { Clip } from './types';

/**
 * The image URL of each strip of a fighter found in one of its folders (a colorway, or its
 * front effects), from what the bundler globbed there (`import.meta.glob` takes only literal
 * paths, so each fighter's index globs its own folders). A strip missing from the folder is
 * left out: validation reports a body strip without image, and a strip without front effects
 * simply has none.
 */
export function urlsOf(
  files: Readonly<Record<string, string>>,
  folder: string,
  sheets: Readonly<Record<string, unknown>>,
): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const sheet of Object.keys(sheets)) {
    const url = files[`./${folder}/${sheet}.png`];
    if (url !== undefined) urls[sheet] = url;
  }
  return urls;
}

/**
 * The bust drawn for the select screen among the images of a colorway's folder (`portrait.png`,
 * drawn by hand: tools/sprites/drawn.ts), when it has one.
 */
export function portraitOf(
  files: Readonly<Record<string, string>>,
  folder: string,
): { portraitImage?: string } {
  const url = files[`./${folder}/portrait.png`];
  return url === undefined ? {} : { portraitImage: url };
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
