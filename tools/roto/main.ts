/**
 * The page of the rotoscope tool (docs/art/roto.md): `npm run roto`. Wiring only — it imports an
 * image, hands it to the pure steps (silhouette.ts, place.ts, pixelize.ts), and draws what they
 * return. Every number the steps need is a control here, because they are all empirical: the right
 * tolerance depends on the photo, the right radius on the subject. Seeing the silhouette and the
 * anchor is the point of having a page at all.
 */

import { ANCHOR, CELL_SIZE } from '../../src/art/types.ts';
import { toLab } from '../stage/kit/unify.ts';
import type { Bitmap } from './pixels.ts';
import { labBufferOf } from './pixels.ts';
import type { Placed } from './place.ts';
import {
  PLACEMENT_DEFAULTS,
  placeOnCell,
  PORTRAIT_DEFAULTS,
  PORTRAIT_SIZE,
  STANDING_HEIGHT,
} from './place.ts';
import type { Pixelized } from './pixelize.ts';
import { PIXELIZE_DEFAULTS, pixelize } from './pixelize.ts';
import type { Edges, Mask } from './silhouette.ts';
import type { Corners } from './silhouette.ts';
import { SILHOUETTE_DEFAULTS, silhouetteOf, soleOf } from './silhouette.ts';
import type { Concern } from './concerns.ts';
import { anchorIsAGuess, concernsOf } from './concerns.ts';

/**
 * The longest side the page works at. A 4 000 px photo holds nothing a 512 px cell can show, and
 * every slider move would wait on it; 1 600 keeps the chain interactive and loses nothing.
 */
const WORK_MAX = 1600;

const state = {
  tolerance: SILHOUETTE_DEFAULTS.tolerance,
  minShare: SILHOUETTE_DEFAULTS.minShare,
  tidy: SILHOUETTE_DEFAULTS.tidy,
  corners: { ...SILHOUETTE_DEFAULTS.corners },
  frame: PLACEMENT_DEFAULTS.frame,
  /** The frame's own size, before `finesse`. */
  cell: PLACEMENT_DEFAULTS.cell,
  /** The subject's height in the frame's own pixels, before `finesse`. */
  height: PLACEMENT_DEFAULTS.height,
  /**
   * How many pixels the square really holds, as a multiple of the frame's own size. The grain of
   * the result is nothing but this: at ×4 the same framing is drawn four times as finely, at ×½
   * twice as coarsely. Only ×1 is the size the game loads.
   */
  finesse: 1,
  edge: PLACEMENT_DEFAULTS.edge,
  method: PIXELIZE_DEFAULTS.method,
  flip: PLACEMENT_DEFAULTS.flip,
  nudgeX: PLACEMENT_DEFAULTS.nudgeX,
  nudgeY: PLACEMENT_DEFAULTS.nudgeY,
  kuwahara: PIXELIZE_DEFAULTS.kuwahara,
  sharpen: PIXELIZE_DEFAULTS.sharpen,
  saturation: PIXELIZE_DEFAULTS.saturation,
  outline: PIXELIZE_DEFAULTS.outline,
  colors: PIXELIZE_DEFAULTS.colors,
  orphans: PIXELIZE_DEFAULTS.orphans,
  zoom: 1,
  anchor: true,
};

let work: { readonly image: Bitmap; readonly lab: Float32Array } | undefined;
let mask: Mask | undefined;
let placed: Placed | undefined;
let pixels: Pixelized | undefined;

function must(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} is missing from the page`);
  return element;
}

const drop = must('drop');
const file = must('file') as HTMLInputElement;
const sourceView = must('source-view');
const cellView = must('cell-view');
const sourceCanvas = must('source') as HTMLCanvasElement;
const cellCanvas = must('cell') as HTMLCanvasElement;
const sourceInfo = must('source-info');
const cellInfo = must('cell-info');
const cellLabel = must('cell-label');
const status = must('status');
const controls = must('controls');

function contextOf(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser gives no 2D canvas');
  return context;
}

// Controls ------------------------------------------------------------------------------------

/**
 * Every control knows how to read the state back. One control can change another's value — picking
 * the portrait frame sets the height — and a control showing a number the tool is not using is a
 * lie the eye believes. They are all refreshed after each pass.
 */
const refreshers: (() => void)[] = [];

function refreshControls(): void {
  for (const refresh of refreshers) refresh();
}

function group(title: string, children: readonly HTMLElement[]): HTMLElement {
  const set = document.createElement('fieldset');
  const legend = document.createElement('legend');
  legend.textContent = title;
  set.append(legend, ...children);
  return set;
}

function range(
  label: string,
  get: () => number,
  set: (value: number) => void,
  min: number,
  max: number,
  step: number,
  show: (value: number) => string = (value) => String(value),
): HTMLElement {
  const wrap = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = label;
  const value = document.createElement('span');
  value.className = 'value';
  value.textContent = show(get());
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(get());
  input.addEventListener('input', () => {
    set(Number(input.value));
    value.textContent = show(get());
    schedule();
  });
  refreshers.push(() => {
    // Only when it differs: writing the same value back mid-drag can interrupt the drag.
    if (input.value !== String(get())) input.value = String(get());
    value.textContent = show(get());
  });
  wrap.append(name, value, input);
  return wrap;
}

function check(label: string, get: () => boolean, set: (value: boolean) => void): HTMLElement {
  const wrap = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = label;
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = get();
  input.addEventListener('change', () => {
    set(input.checked);
    schedule();
  });
  refreshers.push(() => {
    input.checked = get();
  });
  wrap.append(name, input);
  return wrap;
}

function choice(
  label: string,
  get: () => number,
  set: (value: number) => void,
  values: readonly { readonly value: number; readonly label: string }[],
): HTMLElement {
  const wrap = document.createElement('label');
  const name = document.createElement('span');
  name.textContent = label;
  const select = document.createElement('select');
  for (const option of values) {
    const node = document.createElement('option');
    node.value = String(option.value);
    node.textContent = option.label;
    select.append(node);
  }
  select.value = String(get());
  select.addEventListener('change', () => {
    set(Number(select.value));
    schedule();
  });
  refreshers.push(() => {
    select.value = String(get());
  });
  wrap.append(name, select);
  return wrap;
}

/** The four corners, drawn where they sit on the image, so the choice reads at a glance. */
function cornerGrid(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'corners';
  const name = document.createElement('span');
  name.textContent = 'Coins de départ';
  const grid = document.createElement('div');
  grid.className = 'corner-grid';
  const sides: readonly (readonly [keyof Corners, string])[] = [
    ['topLeft', '↖'],
    ['topRight', '↗'],
    ['bottomLeft', '↙'],
    ['bottomRight', '↘'],
  ];
  for (const [side, arrow] of sides) {
    const label = document.createElement('label');
    label.className = 'corner';
    label.title = `Partir du coin ${arrow}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = state.corners[side];
    input.addEventListener('change', () => {
      state.corners = { ...state.corners, [side]: input.checked };
      schedule();
    });
    refreshers.push(() => {
      input.checked = state.corners[side];
    });
    const mark = document.createElement('span');
    mark.textContent = arrow;
    label.append(input, mark);
    grid.append(label);
  }
  wrap.append(name, grid);
  return wrap;
}

const save = document.createElement('button');
save.textContent = 'Enregistrer la case (PNG)';
save.disabled = true;
save.addEventListener('click', () => {
  exportCell();
});

controls.append(
  group('Silhouette', [
    range(
      'Tolérance du fond',
      () => state.tolerance,
      (value) => (state.tolerance = value),
      0,
      60,
      1,
    ),
    range(
      'Poussières ignorées',
      () => state.minShare,
      (value) => (state.minShare = value),
      0,
      0.2,
      0.005,
      (value) => `${Math.round(value * 100)} %`,
    ),
    range(
      'Nettoyage du bord',
      () => state.tidy,
      (value) => (state.tidy = value),
      0,
      3,
      1,
      (value) => (value === 0 ? 'aucun' : `${value} passe(s)`),
    ),
    cornerGrid(),
  ]),
  group('Pose', [
    choice(
      'Cadre',
      () => state.cell,
      (value) => {
        if (value === PORTRAIT_SIZE) {
          state.frame = 'portrait';
          state.cell = PORTRAIT_SIZE;
          state.height = PORTRAIT_DEFAULTS.height;
          return;
        }
        // A fighter's height follows its square, so switching does not halve the fighter.
        state.height =
          state.frame === 'portrait'
            ? Math.round((STANDING_HEIGHT * value) / CELL_SIZE)
            : Math.round((state.height * value) / state.cell);
        state.frame = 'fighter';
        state.cell = value;
      },
      [
        { value: CELL_SIZE, label: `Planche, ${CELL_SIZE} px` },
        { value: CELL_SIZE * 2, label: `Planche HD, ${CELL_SIZE * 2} px` },
        { value: PORTRAIT_SIZE, label: `Portrait, ${PORTRAIT_SIZE} px` },
      ],
    ),
    range(
      'Hauteur du sujet',
      () => state.height,
      (value) => (state.height = value),
      20,
      CELL_SIZE * 2,
      1,
      (value) => `${value} px`,
    ),
    check(
      'Retourner (doit regarder à droite)',
      () => state.flip,
      (value) => (state.flip = value),
    ),
    choice(
      'Finesse',
      () => state.finesse * 100,
      (value) => (state.finesse = value / 100),
      [
        { value: 50, label: '×½ (gros grain)' },
        { value: 100, label: '×1 (taille du jeu)' },
        { value: 200, label: '×2' },
        { value: 400, label: '×4 (très fin)' },
      ],
    ),
    range(
      'Décalage ←→',
      () => state.nudgeX,
      (value) => (state.nudgeX = value),
      -80,
      80,
      1,
    ),
    range(
      'Décalage ↑↓',
      () => state.nudgeY,
      (value) => (state.nudgeY = value),
      -80,
      80,
      1,
    ),
  ]),
  group('Pixels', [
    range(
      'Arêtes nettes',
      () => state.edge,
      (value) => (state.edge = value),
      0,
      40,
      1,
      (value) => (value === 0 ? 'moyenne' : String(value)),
    ),
    choice(
      'Palette',
      () => (state.method === 'kmeans' ? 1 : 0),
      (value) => (state.method = value === 1 ? 'kmeans' : 'median'),
      [
        { value: 1, label: 'k-means Lab' },
        { value: 0, label: 'médiane RVB' },
      ],
    ),
    range(
      'Kuwahara',
      () => state.kuwahara,
      (value) => (state.kuwahara = value),
      0,
      4,
      1,
    ),
    range(
      'Netteté',
      () => state.sharpen,
      (value) => (state.sharpen = value),
      0,
      2,
      0.1,
    ),
    range(
      'Saturation',
      () => state.saturation,
      (value) => (state.saturation = value),
      1,
      1.6,
      0.05,
    ),
    range(
      'Contour',
      () => state.outline,
      (value) => (state.outline = value),
      0.3,
      1,
      0.05,
      (value) => (value >= 1 ? 'aucun' : `${Math.round(value * 100)} %`),
    ),
    range(
      'Couleurs',
      () => state.colors,
      (value) => (state.colors = value),
      0,
      64,
      1,
      (value) => (value === 0 ? 'toutes' : String(value)),
    ),
    range(
      'Orphelins',
      () => state.orphans,
      (value) => (state.orphans = value),
      0,
      4,
      1,
    ),
  ]),
  group('Affichage', [
    range(
      'Zoom',
      () => state.zoom,
      (value) => (state.zoom = value),
      1,
      4,
      1,
      (value) => `×${value}`,
    ),
    check(
      'Repères',
      () => state.anchor,
      (value) => (state.anchor = value),
    ),
    save,
  ]),
);

// The chain -----------------------------------------------------------------------------------

let pending = 0;

function schedule(): void {
  if (!work) return;
  window.clearTimeout(pending);
  pending = window.setTimeout(run, 60);
}

function run(): void {
  const loaded = work;
  if (!loaded) return;
  mask = silhouetteOf(
    loaded.image,
    {
      tolerance: state.tolerance,
      alphaFloor: SILHOUETTE_DEFAULTS.alphaFloor,
      minShare: state.minShare,
      tidy: state.tidy,
      corners: state.corners,
    },
    toLab,
    loaded.lab,
  );
  placed = placeOnCell(
    loaded.image,
    mask,
    {
      frame: state.frame,
      cell: Math.round(state.cell * state.finesse),
      height: Math.round(state.height * state.finesse),
      flip: state.flip,
      nudgeX: Math.round(state.nudgeX * state.finesse),
      nudgeY: Math.round(state.nudgeY * state.finesse),
      edge: state.edge,
    },
    loaded.lab,
  );
  pixels = pixelize(placed.cell, placed.on, {
    kuwahara: state.kuwahara,
    sharpen: state.sharpen,
    saturation: state.saturation,
    outline: state.outline,
    colors: state.colors,
    orphans: state.orphans,
    method: state.method,
  });
  save.disabled = false;
  refreshControls();
  drawSource(loaded.image, mask);
  drawCell(pixels.cell);
  report(mask, placed, pixels);
}

// Drawing -------------------------------------------------------------------------------------

/** The imported image with the background pushed back, so the silhouette is plain to see. */
function drawSource(image: Bitmap, found: Mask): void {
  sourceView.hidden = false;
  sourceCanvas.width = image.width;
  sourceCanvas.height = image.height;
  const context = contextOf(sourceCanvas);
  const shown = context.createImageData(image.width, image.height);
  for (let pixel = 0; pixel < image.width * image.height; pixel++) {
    const at = pixel * 4;
    const subject = (found.on[pixel] ?? 0) === 1;
    const red = image.data[at] ?? 0;
    const green = image.data[at + 1] ?? 0;
    const blue = image.data[at + 2] ?? 0;
    shown.data[at] = subject ? red : Math.round(red * 0.25 + 40);
    shown.data[at + 1] = subject ? green : Math.round(green * 0.25);
    shown.data[at + 2] = subject ? blue : Math.round(blue * 0.25 + 30);
    shown.data[at + 3] = 255;
  }
  context.putImageData(shown, 0, 0);
  const sole = soleOf(found);
  context.lineWidth = Math.max(1, Math.round(image.width / 400));
  context.strokeStyle = '#3bd16f';
  context.strokeRect(
    found.box.left,
    found.box.top,
    found.box.right - found.box.left + 1,
    found.box.bottom - found.box.top + 1,
  );
  context.strokeStyle = '#ffb020';
  context.beginPath();
  context.moveTo(found.box.left, sole.y + 1);
  context.lineTo(found.box.right + 1, sole.y + 1);
  context.moveTo(sole.x, found.box.top);
  context.lineTo(sole.x, sole.y + 1);
  context.stroke();
  sourceInfo.textContent = `${image.width} × ${image.height} px`;
}

/** The cell, on a checkerboard so transparency reads, with the anchor the game will use. */
function drawCell(cell: Bitmap): void {
  cellView.hidden = false;
  const zoom = state.zoom;
  cellCanvas.width = cell.width * zoom;
  cellCanvas.height = cell.height * zoom;
  const context = contextOf(cellCanvas);
  const square = 8 * zoom;
  for (let y = 0; y < cellCanvas.height; y += square) {
    for (let x = 0; x < cellCanvas.width; x += square) {
      context.fillStyle = (x / square + y / square) % 2 === 0 ? '#15151c' : '#1c1c25';
      context.fillRect(x, y, square, square);
    }
  }
  const sheet = document.createElement('canvas');
  sheet.width = cell.width;
  sheet.height = cell.height;
  const own = contextOf(sheet);
  const image = own.createImageData(cell.width, cell.height);
  image.data.set(cell.data);
  own.putImageData(image, 0, 0);
  context.imageSmoothingEnabled = false;
  context.drawImage(sheet, 0, 0, cellCanvas.width, cellCanvas.height);
  if (!state.anchor) return;
  if (state.frame === 'portrait') {
    // The game's own framing: the head's middle at 45 % of the square, its crown near a sixth
    // down (tools/sprites/aseprite-template.ts). Lines to aim at, nothing the tool enforces.
    context.strokeStyle = 'rgba(255, 176, 32, 0.45)';
    context.lineWidth = 1;
    context.setLineDash([3, 5]);
    context.beginPath();
    context.moveTo((cell.width / 2) * zoom, 0);
    context.lineTo((cell.width / 2) * zoom, cellCanvas.height);
    for (const share of [0.06, 0.45]) {
      context.moveTo(0, cell.height * share * zoom);
      context.lineTo(cellCanvas.width, cell.height * share * zoom);
    }
    context.stroke();
    context.setLineDash([]);
    return;
  }
  const unit = cell.width / CELL_SIZE;
  const x = (ANCHOR.x * unit + 0.5) * zoom;
  const y = (ANCHOR.y * unit + 0.5) * zoom;
  // Dashed across the cell, solid only at the anchor itself: the lines have to be readable over a
  // pale sprite without hiding the pixels they are there to check.
  context.lineWidth = 1;
  context.strokeStyle = 'rgba(255, 176, 32, 0.45)';
  context.setLineDash([3, 5]);
  context.beginPath();
  context.moveTo(x, 0);
  context.lineTo(x, cellCanvas.height);
  context.moveTo(0, y);
  context.lineTo(cellCanvas.width, y);
  context.stroke();
  context.setLineDash([]);
  context.strokeStyle = '#ffb020';
  const arm = 6 * zoom;
  context.beginPath();
  context.moveTo(x, y - arm);
  context.lineTo(x, y + arm);
  context.moveTo(x - arm, y);
  context.lineTo(x + arm, y);
  context.stroke();
}

/** A share as the page says it. */
function percent(share: number): string {
  return `${Math.round(share * 100)} %`;
}

function listOf(parts: readonly (string | false)[]): string {
  const kept = parts.filter((part): part is string => part !== false);
  const last = kept[kept.length - 1] ?? '';
  return kept.length <= 1 ? last : `${kept.slice(0, -1).join(', ')} et ${last}`;
}

function sidesOf(edges: Edges): string {
  return listOf([
    edges.left && 'gauche',
    edges.top && 'haut',
    edges.right && 'droit',
    edges.bottom && 'bas',
  ]);
}

/** A concern (concerns.ts) in the words the page says it. */
function sentenceOf(concern: Concern): string {
  switch (concern.kind) {
    case 'nothing-kept':
      return `Presque rien n’a été gardé (${percent(concern.share)} de l’image) : la tolérance est trop haute, ou le sujet a la couleur de son fond.`;
    case 'everything-kept':
      return `Presque tout a été gardé (${percent(concern.share)}) : le fond n’a pas été reconnu. Baisse la tolérance.`;
    case 'narrow-base':
      return `Ce qui est pris pour les pieds ne fait que ${concern.width} px, soit ${percent(concern.share)} de la largeur du sujet : c’est une ombre, une queue ou un col, pas des semelles. L’ancre est une supposition.`;
    case 'cut-off':
      return `Le sujet touche le bord ${sidesOf(concern.edges)} de l’image : ce qui est hors cadre manque à toutes les mesures.`;
    case 'corner-dropped':
      return `${concern.dropped} coin(s) de l’image écarté(s) : ils tombent sur le sujet, pas sur le fond. Le détourage est parti des autres.`;
    case 'specks':
      return `${concern.specks} îlots écartés : le détourage accroche le fond, le bord de la silhouette n’est pas sûr.`;
    case 'overflow': {
      const over = concern.overflow;
      return `Le sujet dépasse la case de ${listOf([
        over.left > 0 && `${over.left} px à gauche`,
        over.top > 0 && `${over.top} px en haut`,
        over.right > 0 && `${over.right} px à droite`,
        over.bottom > 0 && `${over.bottom} px en bas`,
      ])} : baisse la hauteur.`;
    }
  }
}

function report(found: Mask, set: Placed, made: Pixelized): void {
  const sole = soleOf(found);
  const concerns = concernsOf(found, sole, set.overflow, state.frame);
  const guessed = state.frame === 'fighter' && anchorIsAGuess(concerns);
  const subjectHeight = found.box.bottom - found.box.top + 1;
  const scaled = `${subjectHeight} px de source → ${state.height} px de carré (×${set.scale.toFixed(3)})`;
  const lines = [
    `Silhouette : ${found.from === 'alpha' ? 'canal alpha de l’image' : `fond détouré depuis ${found.seeds} coin(s)`} — ${found.pixels.toLocaleString('fr-FR')} px, boîte ${found.box.right - found.box.left + 1} × ${subjectHeight} px, ${found.islands} îlot(s) gardé(s)${found.specks > 0 ? `, ${found.specks} poussière(s) écartée(s)` : ''}.`,
    state.frame === 'portrait'
      ? `Cadrage : ${scaled}, tête centrée sur le carré, couronne à 6 % du haut. Les épaules sortent par le bas, c’est voulu.`
      : `Pose : ${scaled}, ` +
        (guessed
          ? `base posée sur l’ancre ${ANCHOR.x}, ${ANCHOR.y} — mais voir ci-dessous, ce ne sont pas des pieds.`
          : `pieds posés sur l’ancre ${ANCHOR.x}, ${ANCHOR.y} (case ${CELL_SIZE}), base large de ${sole.width} px.`),
    `Pixels : ${made.colors} couleur(s)${state.colors > 0 ? ` (${state.method === 'kmeans' ? 'k-means Lab' : 'médiane RVB'}, ${state.colors} demandées)` : ''}, arêtes ${state.edge === 0 ? 'moyennées' : `à ${state.edge}`}.`,
    ...(state.finesse === 1
      ? []
      : [
          `Finesse ×${state.finesse} : le carré fait ${set.cell.width} px au lieu de ${state.cell}. À réduire d’autant avant de l’installer — le jeu ne lit que la taille du cadre.`,
        ]),
  ];
  status.textContent = lines.join('\n');
  for (const concern of concerns) {
    const warn = document.createElement('div');
    warn.className = 'warn';
    warn.textContent = `⚠ ${sentenceOf(concern)}`;
    status.append(warn);
  }
  cellInfo.textContent = `${set.cell.width} × ${set.cell.height} px`;
  cellLabel.textContent =
    state.frame === 'portrait' ? 'Portrait' : state.cell === CELL_SIZE ? 'Case du jeu' : 'Case HD';
}

function exportCell(): void {
  const made = pixels;
  if (!made) return;
  const sheet = document.createElement('canvas');
  sheet.width = made.cell.width;
  sheet.height = made.cell.height;
  const context = contextOf(sheet);
  const image = context.createImageData(made.cell.width, made.cell.height);
  image.data.set(made.cell.data);
  context.putImageData(image, 0, 0);
  sheet.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roto-${state.frame}-${made.cell.width}.png`;
    link.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Loading -------------------------------------------------------------------------------------

async function load(blob: Blob): Promise<void> {
  const source = await createImageBitmap(blob);
  const scale = Math.min(1, WORK_MAX / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const sheet = document.createElement('canvas');
  sheet.width = width;
  sheet.height = height;
  const context = contextOf(sheet);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  source.close();
  const image = context.getImageData(0, 0, width, height);
  work = { image, lab: labBufferOf(image, toLab) };
  // A subject that fills the frame is the common case: start at the measured standing height.
  state.height = Math.round((STANDING_HEIGHT * state.cell) / CELL_SIZE);
  drop.hidden = true;
  run();
}

function take(files: FileList | null | undefined): void {
  const first = files?.[0];
  if (!first) return;
  load(first).catch((error: unknown) => {
    status.textContent = `Image illisible : ${String(error)}`;
  });
}

drop.addEventListener('click', () => {
  file.click();
});
file.addEventListener('change', () => {
  take(file.files);
});
for (const name of ['dragenter', 'dragover'] as const) {
  drop.addEventListener(name, (event) => {
    event.preventDefault();
    drop.classList.add('over');
  });
}
drop.addEventListener('dragleave', () => {
  drop.classList.remove('over');
});
document.addEventListener('drop', (event) => {
  event.preventDefault();
  drop.classList.remove('over');
  take(event.dataTransfer?.files);
});
document.addEventListener('dragover', (event) => {
  event.preventDefault();
});
document.addEventListener('paste', (event) => {
  take(event.clipboardData?.files);
});
