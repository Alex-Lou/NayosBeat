import { describe, expect, it } from 'vitest';
import {
  openSalon,
  salonStep,
  type Salon,
  type SalonEvent,
  type SalonRules,
} from '../../src/app/salon';
import type { FighterId } from '../../src/data/roster';
import type { NetMessage } from '../../src/net/protocol';

const STAGES = [{ map: 'gym', atmosphere: 'midnight-rain' }];

function rules(role: 'host' | 'guest'): SalonRules {
  return {
    role,
    isFighter: (id): id is FighterId => id === 'nayo' || id === 'riff',
    isStage: ({ map, atmosphere }) =>
      STAGES.some((stage) => stage.map === map && stage.atmosphere === atmosphere),
  };
}

const received = (message: NetMessage): SalonEvent => ({ type: 'received', message });

/** Plays `events` from a fresh salon, returning the salon and everything it sent. */
function play(role: 'host' | 'guest', events: readonly SalonEvent[]) {
  const opened = openSalon('Moi');
  let salon: Salon = opened.salon;
  const sent: NetMessage[] = [...opened.send];
  for (const event of events) {
    const next = salonStep(salon, event, rules(role));
    salon = next.salon;
    sent.push(...next.send);
  }
  return { salon, sent };
}

const MET: SalonEvent[] = [received({ type: 'name', name: 'Toi' }), { type: 'accept' }];
const AGREED: SalonEvent[] = [...MET, received({ type: 'accept' })];

describe('the online salon (docs/multijoueur.md §7)', () => {
  it('opens by sending its name, then waits for both answers', () => {
    const { salon, sent } = play('host', MET);
    expect(sent).toEqual([{ type: 'name', name: 'Moi' }, { type: 'accept' }]);
    expect(salon).toEqual({ phase: 'meeting', them: 'Toi', accepted: true, theyAccepted: false });
  });

  it('goes to the place once both accepted, in either order', () => {
    expect(play('host', AGREED).salon).toEqual({ phase: 'stage', them: 'Toi' });
    const theirsFirst = [
      MET[0] as SalonEvent,
      received({ type: 'accept' }),
      { type: 'accept' } as const,
    ];
    expect(play('guest', theirsFirst).salon).toEqual({ phase: 'stage', them: 'Toi' });
  });

  it('ends on a refusal, sent or received, and on the time to answer running out', () => {
    const mine = play('host', [MET[0] as SalonEvent, { type: 'refuse' }]);
    expect(mine.salon).toEqual({ phase: 'over', them: 'Toi', end: 'refused' });
    expect(mine.sent.at(-1)).toEqual({ type: 'refuse' });
    expect(play('host', [...MET, received({ type: 'refuse' })]).salon).toMatchObject({
      end: 'refusedByThem',
    });
  });

  it('cannot accept before seeing who it is, nor twice', () => {
    const early = play('host', [{ type: 'accept' }]);
    expect(early.sent).toEqual([{ type: 'name', name: 'Moi' }]);
    expect(play('host', [...MET, { type: 'accept' }]).sent).toHaveLength(2);
  });

  it('lets the host choose the place, and the guest take it from the host', () => {
    const pick = STAGES[0] ?? { map: '', atmosphere: '' };
    const host = play('host', [...AGREED, { type: 'stage', stage: pick }]);
    expect(host.sent.at(-1)).toEqual({ type: 'stage', ...pick });
    expect(host.salon).toMatchObject({ phase: 'fighters', stage: pick });
    const guest = play('guest', [...AGREED, received({ type: 'stage', ...pick })]);
    expect(guest.salon).toMatchObject({ phase: 'fighters', stage: pick });
    // The guest chooses no place.
    expect(play('guest', [...AGREED, { type: 'stage', stage: pick }]).salon.phase).toBe('stage');
  });

  it('agrees once both chose, the host as player 1, neither choice shown before', () => {
    const pick = STAGES[0] ?? { map: '', atmosphere: '' };
    const chose: SalonEvent[] = [{ type: 'fighter', fighter: 'nayo' }];
    const theirs = received({ type: 'fighter', fighter: 'riff' });
    const host = play('host', [...AGREED, { type: 'stage', stage: pick }, ...chose, theirs]);
    expect(host.salon).toEqual({
      phase: 'ready',
      them: 'Toi',
      plan: { stage: pick, fighters: ['nayo', 'riff'] },
    });
    const guest = play('guest', [
      ...AGREED,
      received({ type: 'stage', ...pick }),
      theirs,
      ...chose,
    ]);
    expect(guest.salon).toMatchObject({ plan: { fighters: ['riff', 'nayo'] } });
    expect(guest.sent.at(-1)).toEqual({ type: 'fighter', fighter: 'nayo' });
    // Ready, nothing more is to be said until the fight (gate 2).
    const late = play('host', [
      ...AGREED,
      { type: 'stage', stage: pick },
      ...chose,
      theirs,
      received({ type: 'accept' }),
    ]);
    expect(late.salon).toMatchObject({ phase: 'over', end: 'protocol' });
    // Waiting for the other one: its choice is kept, not shown (the screen only says it waits).
    const waiting = play('guest', [...AGREED, received({ type: 'stage', ...pick }), theirs]);
    expect(waiting.salon).toMatchObject({ phase: 'fighters', mine: null, theirs: 'riff' });
  });

  it('ends on anything said out of turn, or a place or fighter this game has not', () => {
    const pick = STAGES[0] ?? { map: '', atmosphere: '' };
    const atStage = [...AGREED, received({ type: 'stage', ...pick })];
    const outOfTurn: SalonEvent[][] = [
      [received({ type: 'accept' })],
      [MET[0] as SalonEvent, received({ type: 'name', name: 'Encore' })],
      [MET[0] as SalonEvent, received({ type: 'accept' }), received({ type: 'accept' })],
      [received({ type: 'hello' })],
      [...AGREED, received({ type: 'fighter', fighter: 'nayo' })],
      [...AGREED, received({ type: 'stage', map: 'lune', atmosphere: 'midnight-rain' })],
      [...atStage, received({ type: 'fighter', fighter: 'saphir' })],
      [
        ...atStage,
        received({ type: 'fighter', fighter: 'riff' }),
        received({ type: 'fighter', fighter: 'riff' }),
      ],
      [...atStage, received({ type: 'refuse' })],
    ];
    for (const events of outOfTurn) {
      expect(play('guest', events).salon, JSON.stringify(events.at(-1))).toMatchObject({
        phase: 'over',
        end: 'protocol',
      });
    }
    // A host is never told a place.
    expect(play('host', [...AGREED, received({ type: 'stage', ...pick })]).salon).toMatchObject({
      end: 'protocol',
    });
  });

  it('lets the host start the fight with its delay, and the guest take it', () => {
    const pick = STAGES[0] ?? { map: '', atmosphere: '' };
    const plan = { stage: pick, fighters: ['nayo', 'riff'] };
    const host = play('host', [
      ...AGREED,
      { type: 'stage', stage: pick },
      { type: 'fighter', fighter: 'nayo' },
      received({ type: 'fighter', fighter: 'riff' }),
      { type: 'start', delay: 3 },
    ]);
    expect(host.salon).toEqual({ phase: 'fight', them: 'Toi', plan, delay: 3 });
    expect(host.sent.at(-1)).toEqual({ type: 'start', delay: 3 });
    const atReady = [
      ...AGREED,
      received({ type: 'stage', ...pick }),
      received({ type: 'fighter', fighter: 'nayo' }),
      { type: 'fighter', fighter: 'riff' } as const,
    ];
    const guest = play('guest', [...atReady, received({ type: 'start', delay: 2 })]);
    expect(guest.salon).toEqual({ phase: 'fight', them: 'Toi', plan, delay: 2 });
    // The guest starts nothing, and is never told twice.
    expect(play('guest', [...atReady, { type: 'start', delay: 2 }]).salon.phase).toBe('ready');
    const twice = play('guest', [
      ...atReady,
      received({ type: 'start', delay: 2 }),
      received({ type: 'start', delay: 2 }),
    ]);
    expect(twice.salon.phase).toBe('fight');
  });

  it('stays over once over', () => {
    const over = play('host', [MET[0] as SalonEvent, { type: 'refuse' }, { type: 'accept' }]);
    expect(over.salon).toMatchObject({ phase: 'over', end: 'refused' });
    expect(over.sent).toHaveLength(2);
  });
});
