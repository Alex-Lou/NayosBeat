// What the film tools use of Node.js besides what the sprite and replay tools declare
// (tools/sprites/node.d.ts, tools/replays/node.d.ts).
interface ImportMeta {
  /** This module is the script Node runs (`node tools/anim/film.ts`), not one it imports. */
  readonly main?: boolean;
}
