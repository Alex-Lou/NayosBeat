import type { BoxSize, Pushbox, StageConfig } from './config';
import { CAMERA_WIDTH_PX, px } from './constants';
import type { FighterState } from './state';

const HALF_CAMERA_WIDTH = Math.trunc(px(CAMERA_WIDTH_PX) / 2);

export interface Body {
  readonly fighter: FighterState;
  readonly box: Pushbox;
}

export interface Range {
  readonly min: number;
  readonly max: number;
}

/**
 * Keeps both fighters inside the stage and the camera (screen edges act as walls),
 * then pushes them apart so their pushboxes never overlap.
 * Uses the camera of the previous tick so the result does not depend on processing order.
 */
export function resolvePositions(
  a: Body,
  b: Body,
  cameraX: number,
  stage: StageConfig,
): [FighterState, FighterState] {
  const walls = wallsAt(cameraX, stage);
  const rangeA = centerRange(walls, a.box);
  const rangeB = centerRange(walls, b.box);

  let xA = clamp(a.fighter.x, rangeA);
  let xB = clamp(b.fighter.x, rangeB);

  // Corner pushback: when a wall stops a fighter sliding from a hit, the opponent is pushed
  // away instead, so pressure cannot be kept up forever in the corner. Both wall stops are
  // measured before either push is applied, so the result does not depend on player order.
  const wallStopA = isSliding(a.fighter) ? xA - a.fighter.x : 0;
  const wallStopB = isSliding(b.fighter) ? xB - b.fighter.x : 0;
  xA = clamp(xA + wallStopB, rangeA);
  xB = clamp(xB + wallStopA, rangeB);

  const overlap = horizontalOverlap(a, xA, b, xB);
  if (overlap > 0) {
    const aIsLeft = isLeftOf(a.fighter, xA, b.fighter, xB);
    const sign = aIsLeft ? -1 : 1;
    // An odd overlap is split upward on both sides, so a player's slot never earns them a
    // sub-pixel (dash curves make odd overlaps common); the 1 sub-pixel gap left is invisible.
    const push = Math.ceil(overlap / 2);
    xA += sign * push;
    xB -= sign * push;

    // If a wall stops one fighter, the other one takes the rest of the push.
    const blockedA = clamp(xA, rangeA) - xA;
    xA += blockedA;
    xB += blockedA;
    const blockedB = clamp(xB, rangeB) - xB;
    xB += blockedB;
    xA = clamp(xA + blockedB, rangeA);
  }

  return [withX(a.fighter, xA), withX(b.fighter, xB)];
}

/**
 * Places the pair of a hold, which never pushes itself apart: the held fighter touching the
 * holder on `side` (`distance` between their centers), and the pair shifted as one block when
 * the held one would go through a wall, the holder stepping back as much (docs/combat-v2.md
 * §4.2): a throw backward from the corner puts the opponent in it.
 */
export function placePair(
  holder: Body,
  held: Body,
  side: 1 | -1,
  distance: number,
  cameraX: number,
  stage: StageConfig,
): [FighterState, FighterState] {
  const walls = wallsAt(cameraX, stage);
  const touching = holder.fighter.x + side * distance;
  const shift = clamp(touching, centerRange(walls, held.box)) - touching;
  const holderX = clamp(holder.fighter.x + shift, centerRange(walls, holder.box));
  return [withX(holder.fighter, holderX), withX(held.fighter, holderX + side * distance)];
}

/**
 * The walls of a tick: the stage's ends, and the screen edges of the previous tick's camera.
 * Exported for the CPU, which throws away from them.
 */
export function wallsAt(cameraX: number, stage: StageConfig): Range {
  return {
    min: Math.max(0, cameraX - HALF_CAMERA_WIDTH),
    max: Math.min(stage.width, cameraX + HALF_CAMERA_WIDTH),
  };
}

/** The camera follows the midpoint of the fighters without leaving the stage. */
export function followCamera(a: FighterState, b: FighterState, stage: StageConfig): number {
  const midpoint = Math.trunc((a.x + b.x) / 2);
  return clamp(midpoint, { min: HALF_CAMERA_WIDTH, max: stage.width - HALF_CAMERA_WIDTH });
}

/** Pushed back by a blow, or apart by a tech. */
function isSliding(fighter: FighterState): boolean {
  const { action } = fighter;
  const pushed = action === 'hitstun' || action === 'blockstun' || action === 'tech';
  return pushed && fighter.vx !== 0;
}

function horizontalOverlap(a: Body, xA: number, b: Body, xB: number): number {
  const bottomA = a.fighter.y + (a.box.lift ?? 0);
  const bottomB = b.fighter.y + (b.box.lift ?? 0);
  const verticalOverlap = bottomA < bottomB + b.box.height && bottomB < bottomA + a.box.height;
  if (!verticalOverlap) return 0;
  const minDistance = Math.trunc((a.box.width + b.box.width) / 2);
  return minDistance - Math.abs(xA - xB);
}

/** Ties are broken by facing, then by player order, so the result is always deterministic. */
function isLeftOf(a: FighterState, xA: number, b: FighterState, xB: number): boolean {
  if (xA !== xB) return xA < xB;
  if (a.facing !== b.facing) return a.facing === 1;
  return true;
}

function centerRange(walls: Range, box: BoxSize): Range {
  const half = Math.trunc(box.width / 2);
  return { min: walls.min + half, max: walls.max - half };
}

function clamp(value: number, range: Range): number {
  return Math.min(range.max, Math.max(range.min, value));
}

function withX(fighter: FighterState, x: number): FighterState {
  return x === fighter.x ? fighter : { ...fighter, x };
}
