/**
 * The in-betweens of a fighter's strips (docs/art/animation-plan.md §3.1, §3.3, F2): which
 * drawings go between the keys, and the clips that play them. Drawn ahead of time and played
 * on the core's ticks (D23: nothing is interpolated on screen).
 *
 * - The keys stay first in their strip, untouched; the in-betweens come after them, numbered
 *   "number of keys + rank". Whatever names a key (a clip borrowing frames, the Finisher's
 *   scripts, the tests) keeps naming it.
 * - A hold of a key (an entry of a clip, followed by the next key) is cut: the key keeps the
 *   start of its ticks, its in-betweens toward the next key the rest. Every key comes on screen
 *   on the same tick as before, and the clip lasts as long.
 * - What must not move is never cut (`frozenOf`): the active entries of the blows, the one just
 *   before, the end of a stun and the last hold, any hold across a change of the move's boxes,
 *   and the clips that are never smoothed (`UNSMOOTHED_CLIPS`).
 * - The ladder (`planStrip`): the pose in joint space, then the fists in a straight line, then a
 *   clean cut; an in-between less than a sprite pixel from its neighbours is dropped.
 */

import type { Clip, ClipId, Played, PlayedClip } from '../../src/art/types.ts';
import type { FighterTemplate } from '../../src/core/config.ts';
import type { MoveId } from '../../src/core/move-data.ts';
import { anatomyIssues } from './anatomy.ts';
import type { Clips } from './clips.ts';
import { moveHurtboxesAt } from './measure.ts';
import { solve, type Body, type Pose } from './skeleton.ts';
import { inbetween } from './tween.ts';

export type Ease = 'linear' | 'in' | 'out' | 'inOut';

/** The curves of the in-betweens, `t` from 0 to 1. */
export const EASES: Readonly<Record<Ease, (t: number) => number>> = {
  linear: (t) => t,
  /** Fast start, soft landing: after the blow. */
  out: (t) => 1 - (1 - t) * (1 - t),
  /** Soft start, fast end: before the blow. */
  in: (t) => t * t,
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
};

/** How one strip is smoothed (tools/sprites/<fighter>/smoothing.ts). */
export interface Smoothing {
  /** Ticks aimed at per drawing in a hold that is cut: 1.5 is 40 drawings a second. */
  readonly every: number;
  /** In-betweens wanted on a transition `'a>b'` (keys of the strip), whatever `every` says. */
  readonly counts?: Readonly<Record<string, number>>;
  /** The curve of a transition `'a>b'`: before the blow `in`, after it `out`, else `inOut`. */
  readonly ease?: Readonly<Record<string, Ease>>;
  /** Rounds the hips to this step (world pixels), against the shimmering of small moves. */
  readonly snap?: number;
  /** The fists in a straight line between the keys from the first rung of the ladder. */
  readonly straightArms?: boolean;
  /**
   * Cut the holds of a loop too: all of them the same way, or none (a loop that gets a drawing
   * more here and not there jerks once a turn).
   */
  readonly loop?: boolean;
}

/** The smoothing of a fighter's strips, by strip: the strips not named keep their keys alone. */
export type SmoothingTable = Readonly<Record<string, Smoothing>>;

/**
 * Clips never smoothed (§3.1, points 2 and 8): the hold pairs, whose two fighters' drawings must
 * keep the grip on the collar together (two in-betweens apart lose it: F5, planned together),
 * and the Finisher's, whose limited animation on its beats is wanted (its team turns it on).
 */
export const UNSMOOTHED_CLIPS: readonly ClipId[] = [
  'hold',
  'held',
  'pummel',
  'throwBack',
  'thrownBack',
  'thrownFall',
  'super',
  'finale',
];

/** An in-between of a strip: between keys `from` and `to`, `at` of the hold (before easing). */
export interface Inbetween {
  readonly from: number;
  readonly to: number;
  readonly at: number;
}

/** An in-between kept by the ladder: its curve's `t`, its pose, and how it was reached. */
export interface Planned extends Inbetween {
  readonly t: number;
  readonly pose: Pose;
  readonly mode: 'joint' | 'straight';
}

/** A strip's plan: its keys, then the in-betweens kept, in the order they are drawn. */
export interface StripPlan {
  readonly sheet: string;
  readonly keys: number;
  readonly inbetweens: readonly Planned[];
  /** What the ladder dropped, and why (a clean cut instead). */
  readonly dropped: readonly { readonly inbetween: Inbetween; readonly reason: string }[];
}

/** Whether entry `entry` of clip `id` must stay as it is. */
export type Frozen = (id: ClipId, entry: number) => boolean;

/** The key that follows entry `entry` of `clip`, or undefined on its last hold. */
export function successor(clip: Clip, entry: number): number | undefined {
  if (entry + 1 < clip.frames.length) return clip.frames[entry + 1];
  return clip.loopFrom === undefined ? undefined : clip.frames[clip.loopFrom];
}

/** Ticks before entry `entry` of `clip`. */
function startOf(clip: Clip, entry: number): number {
  let tick = 0;
  for (let i = 0; i < entry; i++) tick += clip.ticks[i] ?? 0;
  return tick;
}

/**
 * The entries of a fighter's clips that are never cut (§3.1, point 1): the active ones of the
 * blows that touch (a hitbox, a grab, a projectile) and the one just before them, the end of a
 * stun (`endFrames`) and the last hold, any hold across a change of the move's own boxes, and
 * every entry of `UNSMOOTHED_CLIPS`. The movements (dashes, the Rewind) are not frozen.
 */
export function frozenOf(clips: Clips, template: FighterTemplate): Frozen {
  return (id, entry) => {
    const clip = clips[id];
    if (!clip) throw new Error(`${template.name} has no clip ${id}`);
    if (UNSMOOTHED_CLIPS.includes(id)) return true;
    if (clip.endFrames !== undefined && entry >= clip.frames.length - clip.endFrames) return true;
    if (successor(clip, entry) === undefined) return true;
    const move = id in template.moves ? template.moves[id as MoveId] : undefined;
    if (!move) return false;
    const start = startOf(clip, entry);
    const end = start + (clip.ticks[entry] ?? 0);
    const touches =
      move.hitbox !== undefined || move.projectile !== undefined || move.kind === 'grab';
    if (touches) {
      const from = move.startup;
      const to = move.startup + move.active;
      // This entry is active, or the next one is: the strike and the pose that loads it.
      const next = end + (clip.ticks[entry + 1] ?? 0);
      if (start < to && next > from) return true;
    }
    // The boxes in force through the hold, up to the next key's first tick: all the same.
    const boxes = moveHurtboxesAt(template, id as MoveId, move, start);
    const last = clip.ticks.reduce((sum, ticks) => sum + ticks, 0) - 1;
    for (let tick = start + 1; tick <= Math.min(end, last); tick++) {
      if (moveHurtboxesAt(template, id as MoveId, move, tick) !== boxes) return true;
    }
    return false;
  };
}

/** Whether entry `entry` of clip `id` is cut, by `smoothing`: not frozen, toward another key. */
function cuts(
  id: ClipId,
  clip: Clip,
  entry: number,
  frozen: Frozen,
  smoothing: Smoothing,
): boolean {
  const next = successor(clip, entry);
  if (next === undefined || next === clip.frames[entry] || frozen(id, entry)) return false;
  const inLoop = clip.loopFrom !== undefined && entry >= clip.loopFrom;
  return !inLoop || smoothing.loop === true;
}

const pairOf = (from: number, to: number): string => `${from}>${to}`;

/**
 * The in-betweens a strip is offered (before the ladder), in the order the strip would keep
 * them: for each transition between two keys that a clip plays and may cut, as many as `every`
 * asks of the clip that holds it (the clip named after the strip first, else the longest).
 */
export function candidates(
  sheet: string,
  clips: Clips,
  smoothing: Smoothing,
  frozen: Frozen,
): Inbetween[] {
  const spans = new Map<string, { n: number; ticks: number; own: boolean }>();
  for (const [name, clip] of Object.entries(clips) as [ClipId, Clip][]) {
    if (clip.sheet !== sheet) continue;
    const own = name === sheet;
    clip.frames.forEach((from, entry) => {
      const to = successor(clip, entry);
      if (to === undefined || !cuts(name, clip, entry, frozen, smoothing)) return;
      const key = pairOf(from, to);
      const ticks = clip.ticks[entry] ?? 0;
      const wanted = smoothing.counts?.[key] ?? Math.max(0, Math.ceil(ticks / smoothing.every) - 1);
      const n = Math.min(wanted, ticks - 1);
      const known = spans.get(key);
      if (!known || (own && !known.own) || (own === known.own && n > known.n)) {
        spans.set(key, { n, ticks, own });
      }
    });
  }
  const out: Inbetween[] = [];
  for (const [key, { n, ticks }] of spans) {
    const [from = 0, to = 0] = key.split('>').map(Number);
    // The key keeps the longest piece (rounded up): it always reads.
    const starts = new Set<number>();
    for (let k = 1; k <= n; k++) starts.add(Math.ceil((ticks * k) / (n + 1)));
    for (const start of starts) {
      if (start > 0 && start < ticks) out.push({ from, to, at: start / ticks });
    }
  }
  return out.sort(drawOrder);
}

const drawOrder = (p: Inbetween, q: Inbetween): number =>
  p.from - q.from || p.to - q.to || p.at - q.at;

interface Point {
  readonly x: number;
  readonly y: number;
}

/** How far past the wrist the glove reaches, along the forearm (world pixels). */
const GLOVE = 5.4;

/**
 * The points of a pose the ladder checks (world pixels): the joints, and the tips of the gloves,
 * which the drawing pushes farthest when a fist goes out.
 */
export function markersOf(pose: Pose, body: Body): Point[] {
  const s = solve(pose, body);
  const side = (k: 'near' | 'far'): Point[] => {
    const glove = {
      x: s[k].wrist.x + s[k].forearm.x * GLOVE,
      y: s[k].wrist.y + s[k].forearm.y * GLOVE,
    };
    return [
      s[k].shoulder,
      s[k].elbow,
      s[k].wrist,
      glove,
      s[k].knee,
      s[k].ankle,
      s[k].heel,
      s[k].toe,
    ];
  };
  return [s.hip, s.neck, s.head, ...side('near'), ...side('far')];
}

/** The farthest any marker moved between two poses. */
export function moved(p: readonly Point[], q: readonly Point[]): number {
  let most = 0;
  p.forEach((a, i) => {
    const b = q[i];
    if (b) most = Math.max(most, Math.hypot(a.x - b.x, a.y - b.y));
  });
  return most;
}

/** The lowest point of the body, its thickness included (roughly), above the floor. */
function lowestOf(pose: Pose, body: Body): number {
  const s = solve(pose, body);
  const side = (k: 'near' | 'far'): number[] => [
    Math.min(s[k].heel.y, s[k].toe.y) - body.footRadius,
    s[k].knee.y - 3.5,
    s[k].elbow.y - 2,
    s[k].wrist.y - 2,
    s[k].shoulder.y - 4.5,
  ];
  return Math.min(
    s.hip.y - 6,
    s.neck.y - 5,
    s.head.y - body.headRadius,
    ...side('near'),
    ...side('far'),
  );
}

/** The strips the hurtboxes are calibrated on (measure.ts, POSTURE_CLIPS): never past the keys. */
export const POSTURE_SHEETS: ReadonlySet<string> = new Set([
  'idle',
  'block',
  'hitHigh',
  'hitMid',
  'crouch',
  'hitCrouch',
  'jump',
]);

/** Less than this between two drawings (world pixels: one sprite pixel), one is a duplicate. */
const DUPLICATE = 0.5;

/** What a strip is planned from. */
export interface StripSource {
  readonly sheet: string;
  readonly keys: readonly Pose[];
  readonly body: Body;
  readonly clips: Clips;
  readonly template: FighterTemplate;
  readonly smoothing: Smoothing;
}

/**
 * The ladder (§3.1), in-between by in-between: the pose in joint space; brought down to the
 * floor when both keys touch it (a roll does not float); kept if no hard limit of anatomy.ts is
 * broken, no marker rises over the keys' highest (the strip keeps its height: the Finisher's
 * framing counts on it) and, on a posture strip, none leaves the box of the keys'. Else the fists
 * in a straight line, then a clean cut (dropped, and said why). Then the duplicates, less than a
 * sprite pixel from the drawing before or the key after, are dropped; and a loop cut unevenly
 * is not cut at all.
 */
export function planStrip(source: StripSource): StripPlan {
  const { sheet, keys, body, clips, template, smoothing } = source;
  const frozen = frozenOf(clips, template);
  const own = clips[sheet as ClipId];
  const move = sheet in template.moves ? template.moves[sheet as MoveId] : undefined;
  const easeOf = (from: number): Ease => {
    if (!own || !move) return 'inOut';
    return startOf(own, own.frames.indexOf(from)) < move.startup ? 'in' : 'out';
  };
  const curveOf = (ib: Inbetween): number =>
    EASES[smoothing.ease?.[pairOf(ib.from, ib.to)] ?? easeOf(ib.from)](ib.at);
  const markers = keys.map((pose) => markersOf(pose, body));
  const all = markers.flat();
  const box = {
    left: Math.min(...all.map((p) => p.x)),
    right: Math.max(...all.map((p) => p.x)),
    bottom: Math.min(...all.map((p) => p.y)),
    top: Math.max(...all.map((p) => p.y)),
  };
  const posture = POSTURE_SHEETS.has(sheet);
  const kept: Planned[] = [];
  const dropped: { inbetween: Inbetween; reason: string }[] = [];
  for (const ib of candidates(sheet, clips, smoothing, frozen)) {
    const a = keys[ib.from];
    const b = keys[ib.to];
    if (!a || !b) throw new Error(`${sheet}: no key ${a ? ib.to : ib.from}`);
    const t = curveOf(ib);
    const modes = smoothing.straightArms
      ? (['straight'] as const)
      : (['joint', 'straight'] as const);
    let reason = '';
    for (const mode of modes) {
      const snap = smoothing.snap === undefined ? {} : { snap: smoothing.snap };
      const options = { ...snap, straightArms: mode === 'straight' };
      let pose = inbetween(a, b, t, body, options);
      const [lowA, lowB] = [lowestOf(a, body), lowestOf(b, body)];
      if (lowA <= 1 && lowB <= 1) {
        const gap = lowestOf(pose, body) - (lowA + (lowB - lowA) * t);
        if (gap > 0.25) pose = inbetween(a, b, t, body, { ...options, lower: gap });
      }
      const broken = anatomyIssues(pose, body).filter((issue) => issue.hard);
      if (broken.length > 0) {
        reason = `${mode}: ${broken.map((i) => `${i.side} ${i.rule} ${i.value}`).join(', ')}`;
        continue;
      }
      const out = markersOf(pose, body).find(
        (p) =>
          p.y > box.top || (posture && (p.x < box.left || p.x > box.right || p.y < box.bottom)),
      );
      if (out) {
        reason = `${mode}: out of the keys' box at (${out.x.toFixed(1)}, ${out.y.toFixed(1)})`;
        continue;
      }
      kept.push({ ...ib, t, pose, mode });
      reason = '';
      break;
    }
    if (reason) dropped.push({ inbetween: ib, reason });
  }
  // The duplicates, transition by transition, in order: against the drawing kept before and
  // the key after.
  const distinct: Planned[] = [];
  let previous: { pair: string; markers: readonly Point[] } | undefined;
  for (const ib of kept) {
    const pair = pairOf(ib.from, ib.to);
    const before = previous?.pair === pair ? previous.markers : (markers[ib.from] ?? []);
    const mine = markersOf(ib.pose, body);
    if (moved(mine, before) < DUPLICATE || moved(mine, markers[ib.to] ?? []) < DUPLICATE) {
      dropped.push({ inbetween: ib, reason: 'duplicate (under a sprite pixel)' });
      continue;
    }
    distinct.push(ib);
    previous = { pair, markers: mine };
  }
  const plan: StripPlan = { sheet, keys: keys.length, inbetweens: distinct, dropped };
  return evenLoops(plan, clips, frozen, smoothing);
}

/**
 * A loop cut unevenly (a hold cut in two pieces, the next one in three) jerks once a turn: its
 * in-betweens are dropped then, the loop keeps its keys (§3.1, point 3).
 */
function evenLoops(plan: StripPlan, clips: Clips, frozen: Frozen, smoothing: Smoothing): StripPlan {
  const uneven = new Set<string>();
  for (const [id, clip] of Object.entries(clips) as [ClipId, Clip][]) {
    if (clip.sheet !== plan.sheet || clip.loopFrom === undefined) continue;
    const pieces = new Set<number>();
    const pairs: string[] = [];
    for (let entry = clip.loopFrom; entry < clip.frames.length; entry++) {
      const from = clip.frames[entry] ?? 0;
      const to = successor(clip, entry) ?? from;
      pairs.push(pairOf(from, to));
      pieces.add(cuts(id, clip, entry, frozen, smoothing) ? piecesOf(clip, entry, plan) : 1);
    }
    if (pieces.size > 1) for (const pair of pairs) uneven.add(pair);
  }
  if (uneven.size === 0) return plan;
  const keep = (ib: Inbetween): boolean => !uneven.has(pairOf(ib.from, ib.to));
  return {
    ...plan,
    inbetweens: plan.inbetweens.filter(keep),
    dropped: [
      ...plan.dropped,
      ...plan.inbetweens
        .filter((ib) => !keep(ib))
        .map((inbetween) => ({ inbetween, reason: 'loop cut unevenly' })),
    ],
  };
}

/** How many drawings entry `entry` of `clip` shows once cut by `plan`. */
function piecesOf(clip: Clip, entry: number, plan: StripPlan): number {
  return splitOf(clip, entry, plan).length;
}

/**
 * The pieces entry `entry` of `clip` is cut into: the key first, then its in-betweens toward
 * the next key (strip frames, with the tick each starts on, rounded; at least a tick each).
 */
function splitOf(
  clip: Clip,
  entry: number,
  plan: StripPlan,
): { readonly frame: number; readonly start: number }[] {
  const from = clip.frames[entry] ?? 0;
  const to = successor(clip, entry);
  const ticks = clip.ticks[entry] ?? 0;
  const pieces = [{ frame: from, start: 0 }];
  plan.inbetweens.forEach((ib, rank) => {
    if (ib.from !== from || ib.to !== to) return;
    const start = Math.round(ticks * ib.at);
    const last = pieces[pieces.length - 1]?.start ?? 0;
    if (start > last && start < ticks) pieces.push({ frame: plan.keys + rank, start });
  });
  return pieces;
}

/**
 * The clip played (§3.3): each entry that may be cut shares its ticks between its key and its
 * in-betweens; the others stay. Same length, same keys on the same ticks.
 */
export function smoothClip(
  id: ClipId,
  clip: Clip,
  plan: StripPlan,
  frozen: Frozen,
  smoothing: Smoothing,
): Clip {
  const frames: number[] = [];
  const ticks: number[] = [];
  let loopFrom: number | undefined;
  clip.frames.forEach((frame, entry) => {
    if (entry === clip.loopFrom) loopFrom = frames.length;
    const hold = clip.ticks[entry] ?? 0;
    const pieces = cuts(id, clip, entry, frozen, smoothing)
      ? splitOf(clip, entry, plan)
      : [{ frame, start: 0 }];
    pieces.forEach((piece, k) => {
      frames.push(piece.frame);
      ticks.push((pieces[k + 1]?.start ?? hold) - piece.start);
    });
  });
  return { ...clip, frames, ticks, ...(loopFrom === undefined ? {} : { loopFrom }) };
}

/**
 * The key on screen `tick` ticks into a played clip (an in-between counts for the key it
 * leaves); past the end, as clipFrameAt plays it (the loop again, or the last frame held).
 */
export function keyAt(clip: Clip, plan: StripPlan | undefined, tick: number): number {
  const total = clip.ticks.reduce((sum, t) => sum + t, 0);
  let t = tick;
  if (t >= total) {
    if (clip.loopFrom === undefined) t = total - 1;
    else {
      const loopStart = startOf(clip, clip.loopFrom);
      t = loopStart + ((t - loopStart) % (total - loopStart));
    }
  }
  for (let entry = 0; entry < clip.frames.length; entry++) {
    t -= clip.ticks[entry] ?? 0;
    if (t < 0) {
      const frame = clip.frames[entry] ?? 0;
      if (!plan || frame < plan.keys) return frame;
      const ib = plan.inbetweens[frame - plan.keys];
      if (!ib) throw new Error(`${plan.sheet}: no in-between ${frame}`);
      return ib.from;
    }
  }
  return clip.frames[clip.frames.length - 1] ?? 0;
}

/** A fighter's strips and clips, smoothed by its table. */
export interface Smoothed {
  /** Frames of every strip: its keys, then its in-betweens. */
  readonly sheets: Readonly<Record<string, { readonly frames: number }>>;
  readonly plans: ReadonlyMap<string, StripPlan>;
  /** What src/art/<fighter>/played.ts holds (written by `npm run sprites`). */
  readonly played: Played;
}

/** What a fighter's strips are smoothed from. */
export interface FighterSource {
  readonly name: string;
  readonly sheets: Readonly<Record<string, { readonly frames: number }>>;
  readonly keys: (sheet: string) => readonly Pose[] | undefined;
  readonly body: Body;
  readonly clips: Clips;
  readonly template: FighterTemplate;
  readonly table: SmoothingTable;
}

/**
 * Every strip of the table planned, and the clips played from them. A table naming a strip
 * that has no poses, or that only clips never smoothed play, is a mistake: it fails here.
 */
export function smoothFighter(source: FighterSource): Smoothed {
  const { name, clips, template, table } = source;
  const frozen = frozenOf(clips, template);
  const plans = new Map<string, StripPlan>();
  const sheets: Record<string, { frames: number }> = {};
  for (const [sheet, spec] of Object.entries(source.sheets))
    sheets[sheet] = { frames: spec.frames };
  const playedSheets: Record<string, { keys: number; frames: number }> = {};
  const playedClips: Partial<Record<ClipId, PlayedClip>> = {};
  for (const [sheet, smoothing] of Object.entries(table)) {
    const keys = source.keys(sheet);
    if (!keys) throw new Error(`${name}: smoothing.ts names ${sheet}, which has no poses`);
    const playing = (Object.entries(clips) as [ClipId, Clip][]).filter(
      ([, c]) => c.sheet === sheet,
    );
    if (playing.every(([id]) => UNSMOOTHED_CLIPS.includes(id))) {
      throw new Error(`${name}: smoothing.ts names ${sheet}, which is never smoothed`);
    }
    const plan = planStrip({ sheet, keys, body: source.body, clips, template, smoothing });
    plans.set(sheet, plan);
    const frames = plan.keys + plan.inbetweens.length;
    sheets[sheet] = { frames };
    playedSheets[sheet] = { keys: plan.keys, frames };
    for (const [id, clip] of playing) {
      const played = smoothClip(id, clip, plan, frozen, smoothing);
      if (played.frames.length === clip.frames.length) continue;
      playedClips[id] = {
        frames: played.frames,
        ticks: played.ticks,
        ...(played.loopFrom === undefined ? {} : { loopFrom: played.loopFrom }),
      };
    }
  }
  return { sheets, plans, played: { sheets: playedSheets, clips: playedClips } };
}
