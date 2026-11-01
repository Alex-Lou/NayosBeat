/**
 * Button indices of the W3C "standard" gamepad mapping (`Gamepad.mapping === 'standard'`): the
 * same index is the same place on every such pad, whatever its maker prints on it.
 */
export const PadButton = {
  South: 0,
  East: 1,
  West: 2,
  North: 3,
  LeftBumper: 4,
  RightBumper: 5,
  LeftTrigger: 6,
  RightTrigger: 7,
  Select: 8,
  Start: 9,
  LeftStick: 10,
  RightStick: 11,
  DpadUp: 12,
  DpadDown: 13,
  DpadLeft: 14,
  DpadRight: 15,
  Home: 16,
} as const;

/**
 * What the help calls each button: the letter of the most common layout, then the shape of the
 * other one, as players know them. The drawn pad itself shows neither (src/ui/pad-drawing.ts).
 */
export const PAD_BUTTON_NAMES: Readonly<Record<number, string>> = {
  [PadButton.South]: 'A (Croix)',
  [PadButton.East]: 'B (Rond)',
  [PadButton.West]: 'X (Carré)',
  [PadButton.North]: 'Y (Triangle)',
  [PadButton.LeftBumper]: 'LB (L1)',
  [PadButton.RightBumper]: 'RB (R1)',
  [PadButton.LeftTrigger]: 'LT (L2)',
  [PadButton.RightTrigger]: 'RT (R2)',
  [PadButton.Select]: 'Select',
  [PadButton.Start]: 'Start',
  [PadButton.LeftStick]: 'Stick gauche',
  [PadButton.RightStick]: 'Stick droit',
};

/** A button's name, its short form being the first word: « X » of « X (Carré) ». */
export function padButtonName(button: number, short = false): string {
  const name = PAD_BUTTON_NAMES[button] ?? `Bouton ${button}`;
  return short ? (name.split(' ')[0] ?? name) : name;
}
