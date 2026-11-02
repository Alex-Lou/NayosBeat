import type { MoveId } from '../core/move-data';
import type { FighterId } from '../data/roster';

/**
 * A fighter's signature (docs/art/nayo-vfx.md): what its moves light around them and the effects
 * they play over the pixel art, as data. Rendering only: read from the state and the fight
 * events, never written back (D17). A fighter without one (Riff) shows none of it.
 */

/** Whose color a light or an effect takes: the fighter's energy, or the Boost's platine. */
export type Tone = 'energy' | 'platine';

/** The Boost's platine, the super's halo's (veils.ts HALO_COLOR), as a light. */
export const PLATINE = 0xf2f6ff;

/**
 * A light a move holds over its frames (`from` to `to`, its action frames, both included): a
 * source `height` world px over the feet, `reach` px ahead of them, of `strength` 0 to 1 at its
 * height, rising over its first RISE frames and fading over its last FADE.
 */
export interface MoveLight {
  readonly from: number;
  readonly to: number;
  readonly tone: Tone;
  readonly strength: number;
  readonly height: number;
  readonly reach: number;
  /** Where it ends up by `to`, if it moves with the blow (the Uppercut's fist rising). */
  readonly toHeight?: number;
  /** How far its live light reaches, world px (live-lights.ts LIGHT_SHAPE: a move's, else). */
  readonly radius?: number;
}

/**
 * The afterimages a move leaves (move-echo.ts): one every `every` ticks from action frame `from`
 * to `to`, each fading over `life` ticks. The Boost's moves keep their white echoes instead
 * (boost-echo.ts), the same for every fighter.
 */
export interface MoveEchoSpec {
  readonly from: number;
  readonly to: number;
  readonly every: number;
  readonly life: number;
  readonly tone: Tone;
}

/**
 * The one-shot effects of signature-fx.ts. `throwRing`: a speaker ring where the disc leaves the
 * hand. `kick`: the speed arc and the floor streaks of a forward blow. `groundRing`: a shock ring
 * flat on the floor. `rise`: speed streaks climbing the body. `charge`: a ring closing in and
 * sparks drawn up to the body (the run-up). `drop`: the bass hitting the floor, a shock ring and
 * the equalizer's bars rising around it. `burst`: the Boost spent, a platine ring and shards.
 * `dash`: speed lines on the floor behind a dash. Saphir's: `facets`, her cut sapphire where the
 * heel lands (a slim crescent, facets thrown on in a fan, sparkles); `grooves`, the grooves of a
 * record round her turn (three thin crescents, one inside the other).
 */
export type CueKind =
  | 'throwRing'
  | 'kick'
  | 'groundRing'
  | 'rise'
  | 'charge'
  | 'drop'
  | 'burst'
  | 'dash'
  | 'facets'
  | 'grooves';

/** An effect a move plays on one of its action frames. */
export interface Cue {
  readonly frame: number;
  readonly kind: CueKind;
  readonly tone: Tone;
  /** World px over the feet, and ahead of them. */
  readonly height: number;
  readonly reach: number;
  /** Its size over its own (a Remix's is bigger). */
  readonly size: number;
}

/**
 * A bold shape a move draws on one of its action frames (bold-fx.ts): `shock`, a thick ring
 * standing up where a disc leaves the hand; `quake`, a ring flat on the floor and impact lines.
 */
export interface BoldCue {
  readonly frame: number;
  readonly kind: 'shock' | 'quake';
  readonly tone: Tone;
  readonly height: number;
  readonly reach: number;
  readonly size: number;
}

export interface MoveSignature {
  readonly light?: MoveLight;
  readonly echo?: MoveEchoSpec;
  readonly cues?: readonly Cue[];
  readonly bold?: readonly BoldCue[];
}

export interface Signature {
  readonly moves: Partial<Readonly<Record<MoveId, MoveSignature>>>;
  /** The projectiles its moves fire, their light and their sound waves in the tone given. */
  readonly discs: Partial<Readonly<Record<MoveId, Tone>>>;
  /** Its heavy normals swing a speed arc on their first active frame (signature-fx.ts). */
  readonly heavySwing: boolean;
  /** A heavy blow it lands flares at the impact (light-rig.ts). */
  readonly flares: boolean;
  /** Its discs in flight trail speed lines (bold-fx.ts). */
  readonly discLines?: boolean;
  /**
   * Its presence between its blows (presence.ts): the color of its outfit's LEDs in each
   * colorway, which shine, and the shape of its specks (square, or Saphir's cut-gem diamonds).
   * None: no presence.
   */
  readonly presence?: {
    readonly leds: Readonly<Record<'main' | 'alt', number>>;
    readonly specks?: 'square' | 'diamond';
  };
}

const bold = (
  frame: number,
  kind: BoldCue['kind'],
  tone: Tone,
  where: { height: number; reach: number },
  size = 1,
): BoldCue => ({ frame, kind, tone, height: where.height, reach: where.reach, size });

const cue = (
  frame: number,
  kind: CueKind,
  tone: Tone,
  where: { height: number; reach: number },
  size = 1,
): Cue => ({ frame, kind, tone, height: where.height, reach: where.reach, size });

/** The disc's hand, as it leaves (Vinyle: thrown on frame 12, its hitbox 32 to 52 px high). */
const HAND = { height: 44, reach: 24 } as const;
const FEET = { height: 0, reach: 0 } as const;
const FOOT = { height: 30, reach: 30 } as const;
const BODY = { height: 44, reach: 0 } as const;
/** The Mégabasse's fist on the floor, ahead of him. */
const FIST = { height: 0, reach: 26 } as const;

/**
 * Nayo (docs/art/nayo-vfx.md §3): his specials in his energy, their Remixes in platine with more
 * of everything, the Mégabasse a run-up then three drops of bass, the equalizer bouncing.
 * Frames from his data (src/data/fighters/nayo.ts, nayo-boost.ts).
 */
const NAYO_SIGNATURE: Signature = {
  moves: {
    // Vinyle: thrown on frame 12; the hand lights as it winds up, a ring as it lets go.
    special: {
      light: { from: 6, to: 18, tone: 'energy', strength: 0.7, ...HAND },
      echo: { from: 9, to: 13, every: 2, life: 8, tone: 'energy' },
      cues: [cue(12, 'throwRing', 'energy', HAND)],
      bold: [bold(12, 'shock', 'energy', HAND)],
    },
    specialBoost: {
      light: { from: 4, to: 20, tone: 'platine', strength: 1, ...HAND },
      cues: [
        cue(2, 'burst', 'platine', BODY, 0.8),
        cue(12, 'throwRing', 'platine', HAND, 1.3),
        cue(12, 'throwRing', 'energy', HAND, 0.8),
      ],
      bold: [bold(12, 'shock', 'platine', HAND, 1.3)],
    },
    // Pied fendu: the slide (frames 3 to 15), the kick out on frame 11.
    specialForward: {
      light: { from: 8, to: 18, tone: 'energy', strength: 0.8, ...FOOT },
      echo: { from: 3, to: 15, every: 3, life: 9, tone: 'energy' },
      cues: [cue(11, 'kick', 'energy', FOOT)],
    },
    specialForwardBoost: {
      light: { from: 4, to: 20, tone: 'platine', strength: 1, ...FOOT },
      cues: [
        cue(1, 'burst', 'platine', BODY, 0.8),
        cue(11, 'kick', 'platine', FOOT, 1.25),
        cue(11, 'groundRing', 'energy', FOOT, 0.8),
      ],
    },
    // Uppercut: out on frame 3, up to frame 10; the floor rings as he pushes off.
    specialAntiAir: {
      light: { from: 1, to: 14, tone: 'energy', strength: 1, height: 30, reach: 10, toHeight: 90 },
      echo: { from: 2, to: 10, every: 2, life: 8, tone: 'energy' },
      cues: [cue(2, 'groundRing', 'energy', FEET), cue(3, 'rise', 'energy', BODY)],
    },
    specialAntiAirBoost: {
      light: {
        from: 0,
        to: 16,
        tone: 'platine',
        strength: 1,
        height: 30,
        reach: 10,
        toHeight: 110,
      },
      cues: [
        cue(0, 'burst', 'platine', BODY, 0.8),
        cue(2, 'groundRing', 'platine', FEET, 1.3),
        cue(5, 'groundRing', 'energy', FEET, 0.9),
        cue(3, 'rise', 'platine', BODY, 1.3),
      ],
    },
    // Mégabasse: the cue and the freeze on frame 0, then his fist on the floor on 2, 8 and 14.
    super: {
      light: { from: 0, to: 22, tone: 'platine', strength: 1, height: 6, reach: 26, radius: 200 },
      cues: [
        cue(0, 'charge', 'platine', BODY, 1.2),
        cue(2, 'drop', 'energy', FIST),
        cue(8, 'drop', 'energy', FIST, 1.15),
        cue(14, 'drop', 'platine', FIST, 1.3),
      ],
      bold: [
        bold(2, 'quake', 'energy', FIST),
        bold(8, 'quake', 'energy', FIST, 1.1),
        bold(14, 'quake', 'platine', FIST, 1.3),
      ],
    },
    // The dashes: speed lines on the floor as they set off (their afterimages: dash-trail.ts).
    dashForward: { cues: [cue(1, 'dash', 'energy', FEET)] },
    dashBack: { cues: [cue(1, 'dash', 'energy', FEET)] },
    // Rewind: the dive, head low.
    boostCancel: {
      light: { from: 0, to: 8, tone: 'platine', strength: 0.8, ...BODY },
      cues: [cue(0, 'burst', 'platine', BODY, 0.7)],
    },
  },
  discs: { special: 'energy', specialBoost: 'platine' },
  heavySwing: true,
  flares: true,
  discLines: true,
  // His LEDs' soft core (tools/sprites/nayo/palette.ts, `neonCore`).
  presence: { leds: { main: 0x62c4d0, alt: 0xd878b8 } },
};

/** Her heel out at hip height (the Syncope's and the Chassé's hitbox, 34 to 48 px high). */
const HEEL = { height: 41, reach: 40 } as const;
/** The Rubato's lunge, its foot out low. */
const LUNGE = { height: 44, reach: 36 } as const;
/** Her hips as she turns: where the grooves of her turns spin. */
const TURN = { height: 40, reach: 8 } as const;
/** The Contre-ut's foot at the top, over her head. */
const SKY = { height: 96, reach: 18 } as const;
/** A turning heel at rib height (the Revers tournant's, the Chassé arrière's). */
const RIBS = { height: 46, reach: 40 } as const;

/**
 * Saphir (docs/saphir.md §9, porte 4): her light lives on her three signature blows, the
 * Syncope, the Chassé and the Contre-ut, in her sapphire; their Remixes, the Coda and the Reprise
 * in platine. Her specials leave afterimages. Her own effects: the facets of her cut sapphire
 * where a heel lands, the grooves of a record round her turns (porte 4, lot 3); none of Nayo's
 * (rings, the equalizer, speed arcs) but the Boost's burst. Between her blows, a glint deep in
 * both slits of her mask, and cut-gem specks: her presence. Frames from her data
 * (src/data/fighters/saphir.ts, saphir-strings.ts, saphir-boost.ts).
 */
const SAPHIR_SIGNATURE: Signature = {
  moves: {
    // Syncope: the crescent turning over her head, the heel down through the hitbox on frames 12
    // to 14, its facets thrown on.
    special: {
      light: { from: 7, to: 18, tone: 'energy', strength: 0.8, ...HEEL },
      echo: { from: 8, to: 15, every: 2, life: 8, tone: 'energy' },
      cues: [cue(9, 'grooves', 'energy', TURN), cue(12, 'facets', 'energy', HEEL)],
    },
    specialBoost: {
      light: { from: 4, to: 20, tone: 'platine', strength: 1, ...HEEL },
      cues: [
        cue(2, 'burst', 'platine', BODY, 0.8),
        cue(9, 'grooves', 'platine', TURN, 1.2),
        cue(12, 'facets', 'platine', HEEL, 1.3),
        cue(12, 'facets', 'energy', HEEL, 0.8),
      ],
    },
    // Rubato: the lunge (frames 4 to 16), the kick out on frame 16.
    specialForward: {
      echo: { from: 4, to: 16, every: 3, life: 9, tone: 'energy' },
      cues: [cue(16, 'facets', 'energy', LUNGE)],
    },
    specialForwardBoost: {
      light: { from: 4, to: 22, tone: 'platine', strength: 1, ...LUNGE },
      cues: [cue(1, 'burst', 'platine', BODY, 0.8), cue(16, 'facets', 'platine', LUNGE, 1.25)],
    },
    // Contre-ut: out on frame 5, the leg to the sky up to frame 10; the light rises with the foot.
    specialAntiAir: {
      light: { from: 2, to: 14, tone: 'energy', strength: 1, height: 30, reach: 14, toHeight: 100 },
      echo: { from: 2, to: 10, every: 2, life: 8, tone: 'energy' },
      cues: [cue(6, 'facets', 'energy', SKY)],
    },
    specialAntiAirBoost: {
      light: {
        from: 0,
        to: 16,
        tone: 'platine',
        strength: 1,
        height: 30,
        reach: 14,
        toHeight: 110,
      },
      cues: [cue(0, 'burst', 'platine', BODY, 0.8), cue(6, 'facets', 'platine', SKY, 1.3)],
    },
    // Chassé: turned, the heel out at hip height on frames 10 to 12, her signature normal.
    standHeavy: {
      light: { from: 7, to: 15, tone: 'energy', strength: 0.6, ...HEEL },
      cues: [cue(8, 'grooves', 'energy', TURN, 0.8), cue(10, 'facets', 'energy', HEEL, 0.8)],
    },
    // Her turning kicks: the Revers tournant (the heel on frame 8), the Chassé arrière (on 9).
    lightFinisher: {
      cues: [cue(6, 'grooves', 'energy', TURN, 0.8), cue(8, 'facets', 'energy', RIBS, 0.8)],
    },
    chainHeavy: {
      cues: [cue(7, 'grooves', 'energy', TURN, 0.8), cue(9, 'facets', 'energy', RIBS, 0.8)],
    },
    // Coda: three blows from frame 10, the last on 22; she turns through them.
    super: {
      light: { from: 0, to: 34, tone: 'platine', strength: 1, height: 30, reach: 30, radius: 180 },
      cues: [
        cue(8, 'grooves', 'platine', TURN, 1.2),
        cue(10, 'facets', 'energy', FOOT),
        cue(16, 'facets', 'energy', RIBS),
        cue(22, 'facets', 'platine', RIBS, 1.3),
      ],
    },
    // Reprise: the swing step.
    boostCancel: { light: { from: 0, to: 8, tone: 'platine', strength: 0.8, ...BODY } },
  },
  discs: {},
  heavySwing: false,
  flares: true,
  // The glint in her mask's slits (tools/sprites/saphir/palette.ts, `maskGlow`), her specks
  // cut like the gem.
  presence: { leds: { main: 0x5c8cff, alt: 0xcbb2ff }, specks: 'diamond' },
};

const SIGNATURES: Partial<Readonly<Record<FighterId, Signature>>> = {
  nayo: NAYO_SIGNATURE,
  saphir: SAPHIR_SIGNATURE,
};

/** A fighter's signature, null for one without. */
export function signatureOf(fighter: FighterId): Signature | null {
  return SIGNATURES[fighter] ?? null;
}

/** A tone's color for a fighter of `energy`. */
export function toneColor(tone: Tone, energy: number): number {
  return tone === 'platine' ? PLATINE : energy;
}
