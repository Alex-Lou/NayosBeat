import { describe, expect, it } from 'vitest';
import { helpSections } from '../../src/app/controls-content';
import { NAYO } from '../../src/data/fighters/nayo';
import { RIFF } from '../../src/data/fighters/riff';

function titles(devices: { touch: boolean; gamepad: boolean }): string[] {
  return helpSections(devices).map((section) => section.title);
}

describe('helpSections', () => {
  it('shows the touch controls on a phone, not the keyboard', () => {
    expect(titles({ touch: true, gamepad: false })).toEqual(['Tactile', 'Combattre']);
  });

  it('shows the keyboard on a computer', () => {
    expect(titles({ touch: false, gamepad: false })).toEqual(['Clavier', 'Combattre']);
  });

  it('adds the gamepad when one is connected', () => {
    expect(titles({ touch: false, gamepad: true })).toEqual(['Clavier', 'Manette', 'Combattre']);
  });

  it('names the special moves from the fighter data', () => {
    const combat = helpSections({ touch: true, gamepad: false }).at(-1);
    const text = combat?.rows.map((row) => row.join(' ')).join('\n') ?? '';
    for (const template of [NAYO, RIFF]) {
      expect(text).toContain(template.moves.special.name);
      expect(text).toContain(template.moves.specialForward.name);
      expect(text).toContain(template.moves.specialAntiAir.name);
    }
  });
});
