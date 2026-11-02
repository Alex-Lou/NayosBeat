import { describe, expect, it } from 'vitest';
import {
  encodeMessage,
  MAX_MESSAGE_LENGTH,
  parseMessage,
  PROTOCOL_VERSION,
  SEQ_LIMIT,
  type NetMessage,
} from '../../src/net/protocol';

describe('the online protocol (docs/multijoueur.md §4)', () => {
  const MESSAGES: NetMessage[] = [
    { type: 'hello' },
    { type: 'busy' },
    { type: 'ping', seq: 0 },
    { type: 'pong', seq: SEQ_LIMIT - 1 },
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
    ];
    for (const raw of refused) expect(parseMessage(raw), String(raw)).toBeNull();
  });
});
