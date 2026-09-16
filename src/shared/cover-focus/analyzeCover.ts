/**
 * Picks a square crop for a game cover so the thumbnail keeps the title and skips letterbox bars.
 * Pure: pixels in, crop rect out. No I/O, so it is unit-tested with synthetic grids.
 */

/** A rectangle in image units: the image width is 1 and the image height is `aspect`. */
export type CoverRect = { x: number; y: number; w: number; h: number };

/**
 * The square that must stay visible, plus the content rect (the art minus letterbox bars), in
 * image units. `x`/`y` is the square's top-left corner, `side` its edge length.
 */
export type CoverFocus = {
  x: number;
  y: number;
  side: number;
  aspect: number;
  content: CoverRect;
};

export type CoverPixels = {
  width: number;
  height: number;
  /** RGBA, row-major, 4 bytes per pixel. */
  rgba: Uint8Array;
};

/** A line (row or column) is a bar when every pixel sits within this many levels of the line mean. */
const FLAT_TOLERANCE = 12;
/**
 * A bar ends with a hard edge: on the first line past it, at least `EDGE_FRACTION` of the pixels
 * differ from the bar level by more than `EDGE_CONTRAST`. A vignette fades instead, and is art.
 */
const EDGE_CONTRAST = 40;
const EDGE_FRACTION = 0.3;
/**
 * A flat run longer than this fraction of a dimension is art (a dark sky, a flat cover), not a
 * letterbox bar, so it is ignored — otherwise a dark cover would zoom itself away.
 */
const MAX_BAR_FRACTION = 0.25;

/** The plain centre crop — what `contentFit="cover"` would show. Also the fallback for every failure. */
export function centerFocus(widthOverHeight: number): CoverFocus {
  const aspect = 1 / widthOverHeight;
  const side = Math.min(1, aspect);
  return { x: (1 - side) / 2, y: (aspect - side) / 2, side, aspect, content: { x: 0, y: 0, w: 1, h: aspect } };
}

export function analyzeCover(pixels: CoverPixels): CoverFocus {
  const { width, height } = pixels;
  const luma = toLuminance(pixels);
  const content = findContentRect(luma, width, height);

  const side = Math.min(content.width, content.height);
  let x = content.left;
  let y = content.top;
  if (content.height > side) {
    const activity = rowActivity(luma, width, content);
    y = content.top + pickWindowStart(activity, side);
  } else if (content.width > side) {
    const activity = columnActivity(luma, width, content);
    x = content.left + pickWindowStart(activity, side);
  }

  return {
    x: x / width,
    y: y / width,
    side: side / width,
    aspect: height / width,
    content: {
      x: content.left / width,
      y: content.top / width,
      w: content.width / width,
      h: content.height / width,
    },
  };
}

/**
 * Slides a window of `size` along `activity` and returns the start that keeps the most activity
 * inside while placing both cut lines on calm entries. Ties go to the position nearest the centre.
 */
function pickWindowStart(activity: Float32Array, size: number): number {
  const slack = activity.length - size;
  const cutPenalty = size / 4;
  const centre = slack / 2;

  let bestStart = 0;
  let bestScore = -Infinity;
  for (let start = 0; start <= slack; start++) {
    let inside = 0;
    for (let i = start; i < start + size; i++) inside += activity[i];
    const score = inside - cutPenalty * (cutCost(activity, start) + cutCost(activity, start + size));
    const better = score > bestScore + 1e-6;
    const tieNearerCentre =
      Math.abs(score - bestScore) <= 1e-6 && Math.abs(start - centre) < Math.abs(bestStart - centre);
    if (better || tieNearerCentre) {
      bestScore = score;
      bestStart = start;
    }
  }
  return bestStart;
}

/**
 * Cost of cutting between entries `cut - 1` and `cut`. A cut only hurts when a busy band continues
 * across it, so the cost is the calmer of the two sides. A cut at the image edge is free.
 */
function cutCost(activity: Float32Array, cut: number): number {
  if (cut <= 0 || cut >= activity.length) return 0;
  return Math.min(activity[cut - 1], activity[cut]);
}

/** Mean horizontal luminance gradient per row of `rect`. Text and logos are high-activity rows. */
function rowActivity(luma: Float32Array, width: number, rect: Rect): Float32Array {
  const activity = new Float32Array(rect.height);
  for (let y = 0; y < rect.height; y++) {
    let sum = 0;
    const base = (rect.top + y) * width + rect.left;
    for (let x = 1; x < rect.width; x++) sum += Math.abs(luma[base + x] - luma[base + x - 1]);
    activity[y] = sum / Math.max(1, rect.width - 1);
  }
  return activity;
}

/** Mean vertical luminance gradient per column of `rect`, for landscape images. */
function columnActivity(luma: Float32Array, width: number, rect: Rect): Float32Array {
  const activity = new Float32Array(rect.width);
  for (let x = 0; x < rect.width; x++) {
    let sum = 0;
    const column = rect.left + x;
    for (let y = 1; y < rect.height; y++) {
      sum += Math.abs(luma[(rect.top + y) * width + column] - luma[(rect.top + y - 1) * width + column]);
    }
    activity[x] = sum / Math.max(1, rect.height - 1);
  }
  return activity;
}

function toLuminance({ width, height, rgba }: CoverPixels): Float32Array {
  const luma = new Float32Array(width * height);
  for (let i = 0; i < luma.length; i++) {
    const p = i * 4;
    luma[i] = 0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2];
  }
  return luma;
}

type Rect = { left: number; top: number; width: number; height: number };

/** The image minus any flat-colour bars along its edges, in pixels. */
function findContentRect(luma: Float32Array, width: number, height: number): Rect {
  const maxCols = Math.floor(width * MAX_BAR_FRACTION);
  const maxRows = Math.floor(height * MAX_BAR_FRACTION);

  const column = (x: number) => (y: number) => luma[y * width + x];
  const row = (y: number) => (x: number) => luma[y * width + x];

  const left = countFlatLines(maxCols, height, (i) => column(i));
  const right = countFlatLines(maxCols, height, (i) => column(width - 1 - i));
  const top = countFlatLines(maxRows, width, (i) => row(i));
  const bottom = countFlatLines(maxRows, width, (i) => row(height - 1 - i));

  return { left, top, width: width - left - right, height: height - top - bottom };
}

/**
 * Walks inward from an edge and counts consecutive flat lines of one colour that end in a hard
 * edge. `lineAt(i)` returns a reader for the i-th line from the edge, `length` is that line's
 * pixel count. Returns 0 when the run reaches `limit` or fades out instead of ending sharply.
 */
function countFlatLines(limit: number, length: number, lineAt: (i: number) => (j: number) => number): number {
  let count = 0;
  let barLevel: number | null = null;
  for (let i = 0; i <= limit; i++) {
    if (i === limit) return 0;
    const read = lineAt(i);
    let sum = 0;
    for (let j = 0; j < length; j++) sum += read(j);
    const mean = sum / length;

    let flat = true;
    for (let j = 0; j < length; j++) {
      if (Math.abs(read(j) - mean) > FLAT_TOLERANCE) {
        flat = false;
        break;
      }
    }
    const continuesBar = flat && (barLevel === null || Math.abs(mean - barLevel) <= FLAT_TOLERANCE);
    if (!continuesBar) {
      return barLevel !== null && isHardEdge(read, length, barLevel) ? count : 0;
    }
    if (barLevel === null) barLevel = mean;
    count++;
  }
  return count;
}

function isHardEdge(read: (j: number) => number, length: number, barLevel: number): boolean {
  let contrasting = 0;
  for (let j = 0; j < length; j++) {
    if (Math.abs(read(j) - barLevel) > EDGE_CONTRAST) contrasting++;
  }
  return contrasting >= length * EDGE_FRACTION;
}
