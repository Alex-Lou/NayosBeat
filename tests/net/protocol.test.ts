import { describe, expect, it } from 'vitest';
import {
  encodeMessage,
  MAX_MESSAGE_LENGTH,
  parseMessage,
  PROTOCOL_VERSION,
  SEQ_LIMIT,
  isPseudo,
  type NetMessage,
} from '../../src/net/protocol';

describe('the online protocol (docs/multijoueur.md §4)', () => {
  const MESSAGES: NetMessage[] = [
    { type: 'hello' },
    { type: 'busy' },
    { type: 'ping', seq: 0 },
    { type: 'pong', seq: SEQ_LIMIT - 1 },
    { type: 'name', name: 'Alex-Lou 26' },
    { type: 'accept' },
    { type: 'refuse' },
    { type: 'stage', map: 'gym', atmosphere: 'midnight-rain' },
    { type: 'fighter', fighter: 'riff' },
  ];

  it('reads back every message it writes, short enough to be accepted', () => {
    for (const message of MESSAGES) {
      const text = encodeMessage(message);
      expect(text.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
      expect(parseMessage(text)).toEqual(message);
    }
  });

  it('writes the version in every message', () => {
    expect(encodeMessage({ type: 'ping', seq: 7 })).toBe(
      `{"v":${PROTOCOL_VERSION},"t":"ping","n":7}`,
    );
  });

  it('refuses anything that is not exactly one of its messages', () => {
    const v = PROTOCOL_VERSION;
    const refused: unknown[] = [
      undefined,
      null,
      42,
      new ArrayBuffer(4),
      { v, t: 'hello' },
      '',
      'not json',
      '[1,2]',
      'null',
      '"hello"',
      `{"v":${v + 1},"t":"hello"}`,
      `{"t":"hello"}`,
      `{"v":"${v}","t":"hello"}`,
      `{"v":${v},"t":"bye"}`,
      `{"v":${v},"t":"hello","n":1}`,
      `{"v":${v},"t":"hello","__proto__":{}}`,
      `{"v":${v},"t":"ping"}`,
      `{"v":${v},"t":"ping","n":-1}`,
      `{"v":${v},"t":"ping","n":1.5}`,
      `{"v":${v},"t":"ping","n":"1"}`,
      `{"v":${v},"t":"ping","n":${SEQ_LIMIT}}`,
      `{"v":${v},"t":"pong","n":1,"x":0}`,
      `{"v":${v},"t":"ping","n":1${' '.repeat(MAX_MESSAGE_LENGTH)}}`,
      `{"v":${v},"t":"toString"}`,
      `{"v":${v},"t":"name","s":"<b>x</b>"}`,
      `{"v":${v},"t":"stage","m":"gym"}`,
      `{"v":${v},"t":"stage","m":"Gym","a":"dusk-fog"}`,
      `{"v":${v},"t":"stage","m":"gym","a":"../x"}`,
      `{"v":${v},"t":"fighter","f":"${'a'.repeat(25)}"}`,
      `{"v":${v},"t":"fighter","f":7}`,
      `{"v":${v},"t":"accept","f":"nayo"}`,
    ];
    for (const raw of refused) expect(parseMessage(raw), String(raw)).toBeNull();
  });

  it('takes as a name 2 to 12 letters without accents, digits, spaces and dashes', () => {
    for (const name of ['Al', 'Alex-Lou 26', 'a1', 'Riff fan'])
      expect(isPseudo(name), name).toBe(true);
    for (const name of [
      '',
      'A',
      ' Al',
      'Al ',
      '-Al',
      'Al-',
      'Élodie',
      'abcdefghijklm',
      'a_b',
      'a<b',
      7,
    ]) {
      expect(isPseudo(name), String(name)).toBe(false);
    }
  });
});
