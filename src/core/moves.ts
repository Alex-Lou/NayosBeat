import type { MoveData, MoveId } from './config';
import type { AttackButton } from './state';

export function moveDuration(move: MoveData): number {
  return move.startup + move.active + move.recovery;
}

export function isActiveFrame(move: MoveData, actionFrame: number): boolean {
  return actionFrame >= move.startup && actionFrame < move.startup + move.active;
}

export function groundMove(button: AttackButton, crouching: boolean): MoveId {
  if (crouching) return button === 'light' ? 'crouchLight' : 'crouchHeavy';
  return button === 'light' ? 'standLight' : 'standHeavy';
}

export function airMove(button: AttackButton): MoveId {
  return button === 'light' ? 'jumpLight' : 'jumpHeavy';
}
