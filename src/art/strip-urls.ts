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
