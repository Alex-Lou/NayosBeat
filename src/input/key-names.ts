/**
 * What the screens call a key (`KeyboardEvent.code`, a physical position), AZERTY first as the
 * help writes it, with its QWERTY name when it differs. `cap`: what its drawing says, short
 * enough for one key of the drawn keyboard. Every key a player can take is here (see
 * `src/input/bindings.ts`, ASSIGNABLE): the others are not listed.
 *
 * The pixel font has no capital accented letter and no ← nor →: « Echap », and the arrows of
 * the help turned from its ↑ (controls-content.ts, ARROWS).
 */
export interface KeyName {
  /** In the help and the messages: « Maj gauche », « Pavé 1 ». */
  readonly name: string;
  /** On the drawn key: « Maj », « 1 ». */
  readonly cap: string;
  /** Its QWERTY name, when it is not the AZERTY one. */
  readonly qwerty?: string;
}

function letters(): Record<string, KeyName> {
  // The letters AZERTY moves: A and Q, Z and W, M (where QWERTY has ";").
  const azerty: Readonly<Record<string, string>> = { KeyQ: 'A', KeyA: 'Q', KeyW: 'Z', KeyZ: 'W' };
  const keys: Record<string, KeyName> = {};
  for (let at = 0; at < 26; at++) {
    const letter = String.fromCharCode(65 + at);
    const code = `Key${letter}`;
    const shown = azerty[code] ?? letter;
    keys[code] = shown === letter ? { name: letter, cap: letter } : named(shown, letter);
  }
  // M on QWERTY is "," on AZERTY.
  keys['KeyM'] = named(',', 'M');
  return keys;
}

function named(azerty: string, qwerty: string): KeyName {
  return { name: azerty, cap: azerty, qwerty };
}

function digits(): Record<string, KeyName> {
  const keys: Record<string, KeyName> = {};
  for (let digit = 0; digit <= 9; digit++) {
    keys[`Digit${digit}`] = { name: String(digit), cap: String(digit) };
    keys[`Numpad${digit}`] = { name: `Pavé ${digit}`, cap: String(digit) };
  }
  return keys;
}

export const KEY_NAMES: Readonly<Record<string, KeyName>> = {
  ...letters(),
  ...digits(),
  Backquote: named('²', '`'),
  Minus: named(')', '-'),
  Equal: { name: '=', cap: '=' },
  BracketLeft: named('^', '['),
  BracketRight: named('$', ']'),
  Backslash: named('*', '\\'),
  Semicolon: named('M', ';'),
  Quote: named('ù', "'"),
  IntlBackslash: { name: '<', cap: '<' },
  Comma: named(';', ','),
  Period: named(':', '.'),
  Slash: named('!', '/'),
  Space: { name: 'Espace', cap: 'Espace' },
  Enter: { name: 'Entrée', cap: 'Entr' },
  ShiftLeft: { name: 'Maj gauche', cap: 'Maj' },
  ShiftRight: { name: 'Maj droite', cap: 'Maj' },
  ArrowUp: { name: 'Flèche haut', cap: '↑' },
  ArrowDown: { name: 'Flèche bas', cap: '↓' },
  ArrowLeft: { name: 'Flèche gauche', cap: '←' },
  ArrowRight: { name: 'Flèche droite', cap: '→' },
  NumpadDecimal: { name: 'Pavé .', cap: '.' },
  NumpadAdd: { name: 'Pavé +', cap: '+' },
  NumpadSubtract: { name: 'Pavé -', cap: '-' },
  NumpadMultiply: { name: 'Pavé *', cap: '*' },
  NumpadDivide: { name: 'Pavé /', cap: '/' },
  NumpadEnter: { name: 'Pavé Entrée', cap: 'Ent' },
};

/** A key's name in the help, its code if it has none (never shown: such a key cannot be taken). */
export function keyName(code: string): string {
  return KEY_NAMES[code]?.name ?? code;
}

/** Its QWERTY name: the AZERTY one where both agree. */
export function qwertyName(code: string): string {
  const key = KEY_NAMES[code];
  return key?.qwerty ?? key?.name ?? code;
}
