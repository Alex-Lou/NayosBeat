/**
 * Two films of the same fight side by side (docs/art/animation-plan.md §2, V0), in one page that
 * needs nothing else: the strips it shows are inside, with their atlases. Played at 60 Hz, at
 * full speed, at half or a quarter of it, or tick by tick; at the scale of a phone (480×270 world
 * pixels over 15 cm) or twice that. The spark of each blow is laid over its point of contact as
 * the game would hide the body under it: an opaque disc of 34 px (a light blow) or 58 px (a heavy
 * one), held 7 or 10 frames (the game draws its sparks, it has no strip of them).
 *
 *   npm run anim:compare -- tools/anim/out/ko-avant.json tools/anim/out/ko-apres.json
 *   npm run anim:compare -- before.json after.json --out page.html --note "What to look at."
 */

import { readFile, writeFile } from 'node:fs/promises';
import { NAYO_CELLS } from '../../src/art/nayo/cells.ts';
import { RIFF_CELLS } from '../../src/art/riff/cells.ts';
import type { Atlas, Cell } from '../../src/art/types.ts';
import { templateOf, type FighterId } from '../../src/data/roster.ts';
import { TRAINING_STAGE } from '../../src/data/stages.ts';
import { GREYBOX_COLORS, GROUND_Y } from '../../src/render/greybox-stage.ts';
import { toPx } from '../../src/core/constants.ts';
import { fileUrl, option, type Film, type FilmTick } from './film.ts';

const CELLS: Readonly<Record<FighterId, Readonly<Record<string, Cell>>>> = {
  nayo: NAYO_CELLS,
  riff: RIFF_CELLS,
};

/** Everything the page plays from. */
interface PageData {
  readonly title: string;
  readonly films: readonly [Film, Film];
  readonly names: readonly [string, string];
  /** The strips, by `fighter/colorway/sheet` (`fx/` before the sheet for front effects). */
  readonly images: Readonly<Record<string, string>>;
  /** Where each image's frames are, by the same key: cut to what they draw and packed. */
  readonly atlases: Readonly<Record<string, Atlas>>;
  readonly cells: Readonly<Record<string, Readonly<Record<string, Cell>>>>;
  readonly groundY: number;
  readonly stageWidth: number;
  readonly colors: readonly [string, string];
  /** Where to look (chaptersOf). */
  readonly chapters: readonly Chapter[];
}

/** A button of the page: its label, and the index of the tick it goes to look at. */
export type Chapter = readonly [label: string, at: number];

/**
 * Where to look, in the new film: the first tremble, the KO, its landing, the victory; those it
 * has. The landing is the first thud the film of before has not: the KO's, the only fall the
 * animation changes (a fighter sent flying lands with a thud in both).
 */
export function chaptersOf(before: Film, after: Film): Chapter[] {
  const firstOf = (test: (tick: FilmTick, at: number) => boolean) => after.ticks.findIndex(test);
  const chapters: Chapter[] = [
    ['1er tremblement', firstOf((tick) => tick.fighters.some((each) => each.shake !== 0))],
    ['KO', firstOf((tick) => tick.phase === 'roundEnd')],
    ['retombée', firstOf((tick, at) => tick.thud && !(before.ticks[at]?.thud ?? false))],
    ['victoire', firstOf((tick) => tick.fighters.some((each) => each.clip === 'victory'))],
  ];
  return chapters.filter(([, at]) => at >= 0);
}

/** `#rrggbb` of a color. */
function css(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * The strips the films show, by image key, with their atlases (docs/art/atlas.md): a front effect
 * only if its fighter has one.
 */
async function imagesOf(films: readonly Film[]): Promise<Pick<PageData, 'images' | 'atlases'>> {
  const wanted = new Set<string>();
  for (const film of films) {
    for (const tick of film.ticks) {
      tick.fighters.forEach((fighter, player) => {
        const folder = `${film.fighters[player]}/${film.colorways[player]}`;
        wanted.add(`${folder}/${fighter.sheet}`);
        wanted.add(`${folder}/fx/${fighter.effects}`);
      });
      for (const projectile of tick.projectiles) {
        const owner = projectile.owner;
        wanted.add(`${film.fighters[owner]}/${film.colorways[owner]}/${projectile.sheet}`);
      }
    }
  }
  const images: Record<string, string> = {};
  const atlases: Record<string, Atlas> = {};
  for (const key of [...wanted].sort()) {
    let bytes: Uint8Array;
    try {
      bytes = await readFile(fileUrl(`src/art/${key}.png`));
    } catch {
      // A strip without front effects has no fx image.
      continue;
    }
    images[key] = `data:image/png;base64,${base64(bytes)}`;
    // Without its atlas, an image is a row of equal cells, as the game loads it.
    const atlas = await readFile(fileUrl(`src/art/${key}.json`), 'utf8').catch(() => undefined);
    if (atlas !== undefined) atlases[key] = JSON.parse(atlas) as Atlas;
  }
  return { images, atlases };
}

function base64(bytes: Uint8Array): string {
  let text = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    text += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(text);
}

/** Text shown as it is in the page: nothing in it is markup. */
function escaped(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The page of `before` and `after`, two films of the same take; `note`: what to look at. */
export async function comparePage(before: Film, after: Film, note = ''): Promise<string> {
  if (before.ticks.length !== after.ticks.length || before.from !== after.from) {
    throw new Error('The two films must be of the same ticks of the same fight');
  }
  const films = [before, after] as const;
  const [first, second] = before.fighters;
  const data: PageData = {
    title: `${before.name} : avant / après`,
    films,
    names: [templateOf(first).name, templateOf(second).name],
    ...(await imagesOf(films)),
    cells: { nayo: CELLS.nayo, riff: CELLS.riff },
    groundY: GROUND_Y,
    stageWidth: toPx(TRAINING_STAGE.width),
    colors: [css(GREYBOX_COLORS[0] ?? 0), css(GREYBOX_COLORS[1] ?? 0)],
    chapters: chaptersOf(before, after),
  };
  // Inside a script: nothing in the data may close it.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escaped(data.title)}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>${escaped(data.title)}</h1>
  <p class="what">Même combat, même tic, deux rendus : à gauche l'animation d'avant, à droite la nouvelle. Gerbe incrustée (disque opaque au point de contact). Cadre fixe de 480×270 px du monde ; le jeu zoome jusqu'à ×1,45. Une ligne d'état en jaune : les deux rendus diffèrent sur ce tic. Clavier : espace, flèches, 1, 2, 4.</p>
  ${note ? `<p class="note">${escaped(note)}</p>` : ''}
  <nav>
    <button id="play">▶ Lecture</button>
    <span class="group">Vitesse <button data-speed="1">1</button><button data-speed="2">½</button><button data-speed="4">¼</button></span>
    <span class="group"><button id="back">◀ tic</button><button id="next">tic ▶</button></span>
    <span class="group">Échelle <button data-scale="1">téléphone ×1</button><button data-scale="2">×2</button></span>
    <span class="group" id="chapters"></span>
  </nav>
  <input id="scrub" type="range" min="0" value="0">
</header>
<main>
  <figure><figcaption>Avant</figcaption><canvas id="c0" width="960" height="540"></canvas><div class="status" id="s0"></div></figure>
  <figure><figcaption>Après</figcaption><canvas id="c1" width="960" height="540"></canvas><div class="status" id="s1"></div></figure>
</main>
<script>(${play.toString()})(${json});</script>
</body>
</html>
`;
}

const STYLE = `
:root { color-scheme: dark; --ink: #e8e8f0; --dim: #9a9ab8; --hot: #ffd84a; }
body { margin: 0; padding: 16px; background: #10101c; color: var(--ink); font: 14px/1.4 system-ui, sans-serif; }
h1 { font-size: 18px; margin: 0 0 4px; }
.what { margin: 0 0 8px; color: var(--dim); max-width: 60em; }
.note { margin: 0 0 8px; max-width: 60em; }
nav { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; margin-bottom: 8px; }
.group { display: inline-flex; gap: 4px; align-items: center; color: var(--dim); }
button { background: #2a2a44; color: var(--ink); border: 1px solid #44446a; border-radius: 4px; padding: 4px 8px; font: inherit; cursor: pointer; }
button.on { background: #4a4a7a; border-color: var(--hot); }
#scrub { width: 100%; max-width: 60cm; }
main { display: flex; flex-wrap: wrap; gap: 16px; }
figure { margin: 0; }
figcaption { font-weight: 600; margin-bottom: 4px; }
canvas { display: block; width: 15cm; max-width: 100%; height: auto; image-rendering: pixelated; background: #000; }
canvas.twice { width: 30cm; }
.status { font: 12px/1.4 ui-monospace, monospace; color: var(--dim); white-space: pre; min-height: 3em; }
.status.differs { color: var(--hot); }
`;

/** The player, run in the page (everything it uses is its argument or the page's). */
function play(data: PageData): void {
  const FRAME_MS = 1000 / 60;
  const SCALE = 2;
  const VIEW_WIDTH = 480;
  const SPARK = { light: { radius: 17, frames: 7 }, heavy: { radius: 29, frames: 10 } };
  const THUD_FRAMES = 24;
  const JOLT = [2, -2, 2, -1, 1, -1, 1, 0];

  interface Spark {
    x: number;
    y: number;
    radius: number;
    color: string;
    left: number;
  }
  interface Column {
    readonly film: Film;
    readonly ctx: CanvasRenderingContext2D;
    readonly canvas: HTMLCanvasElement;
    readonly status: HTMLElement;
    sparks: Spark[];
    thud: number;
  }

  const byId = (id: string): HTMLElement => {
    const found = document.getElementById(id);
    if (!found) throw new Error(`#${id} missing`);
    return found;
  };
  const images = new Map<string, HTMLImageElement>();
  for (const [key, uri] of Object.entries(data.images)) {
    const image = new Image();
    image.src = uri;
    image.onload = () => {
      render();
    };
    images.set(key, image);
  }
  const columns: Column[] = data.films.map((film, at) => {
    const canvas = byId(`c${at}`) as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas');
    ctx.imageSmoothingEnabled = false;
    return { film, ctx, canvas, status: byId(`s${at}`), sparks: [], thud: 0 };
  });
  const length = data.films[0].ticks.length;
  const scrub = byId('scrub') as HTMLInputElement;
  scrub.max = String(length - 1);
  let tick = 0;
  let playing = false;
  let slowdown = 1;
  let owed = 0;
  let last = 0;
  let carried = 0;

  const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

  /** The tick `at` comes on screen: its blows' sparks, its thud. */
  function arrive(at: number): void {
    for (const column of columns) {
      const shown = column.film.ticks[at];
      if (!shown) continue;
      for (const blow of shown.blows) {
        const spark = blow.heavy ? SPARK.heavy : SPARK.light;
        const color = blow.blocked ? '#dde4ff' : hex(column.film.energies[blow.by]);
        column.sparks.push({
          x: blow.x,
          y: blow.y,
          radius: spark.radius,
          color,
          left: spark.frames,
        });
      }
      if (shown.thud) column.thud = THUD_FRAMES;
    }
  }

  /** A frame of the visual clock goes by: the sparks and the thud fade. */
  function age(): void {
    for (const column of columns) {
      for (const spark of column.sparks) spark.left -= 1;
      column.sparks = column.sparks.filter((spark) => spark.left > 0);
      column.thud = Math.max(0, column.thud - 1);
    }
  }

  function goTo(at: number): void {
    tick = Math.max(0, Math.min(length - 1, at));
    for (const column of columns) {
      column.sparks = [];
      column.thud = 0;
    }
    arrive(tick);
    render();
  }

  function sprite(
    ctx: CanvasRenderingContext2D,
    key: string,
    cell: Cell | undefined,
    frame: number,
    x: number,
    y: number,
    flip: boolean,
  ): void {
    const image = images.get(key);
    if (!image?.complete || !cell) return;
    ctx.save();
    ctx.translate(Math.round(x * SCALE), Math.round((data.groundY - y) * SCALE));
    if (flip) ctx.scale(-1, 1);
    const { width, height, anchor } = cell;
    const atlas = data.atlases[key];
    if (atlas) {
      // The frame's cut, put back at its place in the cell.
      const cut = atlas.frames[String(frame)];
      if (cut) {
        const { frame: from, spriteSourceSize: to } = cut;
        const [left, top] = [to.x - anchor.x, to.y - anchor.y];
        ctx.drawImage(image, from.x, from.y, from.w, from.h, left, top, from.w, from.h);
      }
    } else {
      ctx.drawImage(image, frame * width, 0, width, height, -anchor.x, -anchor.y, width, height);
    }
    ctx.restore();
  }

  function draw(column: Column): void {
    const { ctx, film } = column;
    const shown = film.ticks[tick];
    if (!shown) return;
    const jolt = column.thud > 0 ? (JOLT[THUD_FRAMES - column.thud] ?? 0) : 0;
    const left = shown.cameraX - VIEW_WIDTH / 2 - jolt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = data.colors[0];
    ctx.fillRect(0, 0, 960, 540);
    ctx.translate(-left * SCALE, Math.abs(jolt) * SCALE * 0.5);
    ctx.fillStyle = data.colors[1];
    ctx.fillRect(0, data.groundY * SCALE, data.stageWidth * SCALE, 540);
    ctx.fillStyle = '#50507a';
    for (let x = 0; x <= data.stageWidth; x += 32) {
      ctx.fillRect(x * SCALE, (data.groundY + 2) * SCALE, 4, 4);
    }
    const order = shown.front === 0 ? [1, 0] : [0, 1];
    for (const fighter of shown.fighters) {
      const shrink = 120 / (120 + fighter.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(
        fighter.x * SCALE,
        data.groundY * SCALE,
        36 * shrink,
        6 * shrink,
        0,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    }
    const folder = (player: number) =>
      `${film.fighters[player] ?? ''}/${film.colorways[player] ?? ''}`;
    const cellsOf = (player: number) => data.cells[film.fighters[player] ?? ''] ?? {};
    for (const player of order) {
      const fighter = shown.fighters[player];
      if (!fighter) continue;
      const key = `${folder(player)}/${fighter.sheet}`;
      const cell = cellsOf(player)[fighter.sheet];
      sprite(ctx, key, cell, fighter.frame, fighter.x + fighter.shake, fighter.y, fighter.flip);
    }
    for (const projectile of shown.projectiles) {
      const key = `${folder(projectile.owner)}/${projectile.sheet}`;
      const cell = cellsOf(projectile.owner)[projectile.sheet];
      sprite(ctx, key, cell, projectile.frame, projectile.x, 0, projectile.flip);
    }
    shown.fighters.forEach((fighter, player) => {
      const key = `${folder(player)}/fx/${fighter.effects}`;
      const cell = cellsOf(player)[`fx/${fighter.effects}`];
      sprite(ctx, key, cell, fighter.frame, fighter.x, fighter.y, fighter.flip);
    });
    for (const spark of column.sparks) {
      ctx.fillStyle = spark.color;
      ctx.beginPath();
      ctx.arc(
        spark.x * SCALE,
        (data.groundY - spark.y) * SCALE,
        spark.radius * SCALE,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    }
    if (column.thud > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#ffd84a';
      ctx.font = 'bold 48px system-ui, sans-serif';
      ctx.fillText('BOUM (son de chute)', 24, 64);
    }
  }

  function describe(column: Column, other: Column): void {
    const shown = column.film.ticks[tick];
    const twin = other.film.ticks[tick];
    if (!shown) return;
    const lines = [
      `tic ${column.film.from + tick}  ${shown.phase}${shown.hitstop > 0 ? `  gel ${shown.hitstop}` : ''}`,
    ];
    let differs = false;
    shown.fighters.forEach((fighter, player) => {
      const tremble =
        fighter.shake !== 0 ? `  tremble ${fighter.shake > 0 ? '+' : ''}${fighter.shake}` : '';
      lines.push(`${data.names[player] ?? ''} : ${fighter.clip} ${fighter.tick}${tremble}`);
      const mate = twin?.fighters[player];
      differs ||=
        !mate ||
        mate.sheet !== fighter.sheet ||
        mate.frame !== fighter.frame ||
        mate.shake !== fighter.shake;
    });
    differs ||= shown.thud !== twin?.thud;
    column.status.textContent = lines.join('\n');
    column.status.classList.toggle('differs', differs);
  }

  function render(): void {
    const [before, after] = columns;
    if (!before || !after) return;
    for (const column of columns) draw(column);
    describe(before, after);
    describe(after, before);
    scrub.value = String(tick);
  }

  function frame(now: number): void {
    if (!playing) return;
    carried = Math.min(carried + now - last, 250);
    last = now;
    while (carried >= FRAME_MS) {
      carried -= FRAME_MS;
      age();
      owed += 1;
      if (owed < slowdown) continue;
      owed = 0;
      if (tick >= length - 1) {
        setPlaying(false);
        break;
      }
      tick += 1;
      arrive(tick);
    }
    render();
    requestAnimationFrame(frame);
  }

  const playButton = byId('play');
  function setPlaying(on: boolean): void {
    playing = on;
    playButton.textContent = on ? '❚❚ Pause' : '▶ Lecture';
    if (!on) return;
    if (tick >= length - 1) goTo(0);
    last = performance.now();
    carried = 0;
    requestAnimationFrame(frame);
  }
  function step(by: number): void {
    setPlaying(false);
    if (by > 0) {
      age();
      tick = Math.min(length - 1, tick + 1);
      arrive(tick);
      render();
    } else goTo(tick - 1);
  }
  function setSpeed(denominator: number): void {
    slowdown = denominator;
    owed = 0;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
      button.classList.toggle('on', button.dataset.speed === String(denominator));
    }
  }
  function setScale(scale: number): void {
    for (const column of columns) column.canvas.classList.toggle('twice', scale === 2);
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-scale]')) {
      button.classList.toggle('on', button.dataset.scale === String(scale));
    }
  }

  const nav = byId('chapters');
  for (const [label, at] of data.chapters) {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = () => {
      setPlaying(false);
      goTo(at - 12);
    };
    nav.append(button);
  }

  playButton.onclick = () => {
    setPlaying(!playing);
  };
  byId('back').onclick = () => {
    step(-1);
  };
  byId('next').onclick = () => {
    step(1);
  };
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
    button.onclick = () => {
      setSpeed(Number(button.dataset.speed));
    };
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-scale]')) {
    button.onclick = () => {
      setScale(Number(button.dataset.scale));
    };
  }
  scrub.oninput = () => {
    setPlaying(false);
    goTo(Number(scrub.value));
  };
  document.addEventListener('keydown', (event) => {
    if (event.key === ' ') setPlaying(!playing);
    else if (event.key === 'ArrowRight') step(1);
    else if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === '1' || event.key === '2' || event.key === '4')
      setSpeed(Number(event.key));
    else return;
    event.preventDefault();
  });
  setSpeed(1);
  setScale(1);
  goTo(0);
}

async function main(args: readonly string[]): Promise<void> {
  const [beforePath, afterPath] = args;
  if (!beforePath || !afterPath || beforePath.startsWith('--')) {
    throw new Error('Usage: npm run anim:compare -- <before.json> <after.json> [--out page.html]');
  }
  const read = async (path: string) => JSON.parse(await readFile(fileUrl(path), 'utf8')) as Film;
  const before = await read(beforePath);
  const after = await read(afterPath);
  const out = fileUrl(option(args, 'out') ?? `tools/anim/out/${before.name}.html`);
  await writeFile(out, await comparePage(before, after, option(args, 'note')));
  console.log(out.pathname);
}

if (import.meta.main) await main(process.argv.slice(2));
