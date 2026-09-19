import { analyzeCover, centerFocus, type CoverFocus } from '../analyzeCover';

type Rgb = [number, number, number];

/** Build an RGBA grid from a per-pixel colour function. */
function makeGrid(width: number, height: number, pixel: (x: number, y: number) => Rgb): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixel(x, y);
      const i = (y * width + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }
  return rgba;
}

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];

function expectFocus(actual: CoverFocus, expected: CoverFocus) {
  expect(actual.x).toBeCloseTo(expected.x, 5);
  expect(actual.y).toBeCloseTo(expected.y, 5);
  expect(actual.side).toBeCloseTo(expected.side, 5);
  expect(actual.aspect).toBeCloseTo(expected.aspect, 5);
  expect(actual.content.x).toBeCloseTo(expected.content.x, 5);
  expect(actual.content.y).toBeCloseTo(expected.content.y, 5);
  expect(actual.content.w).toBeCloseTo(expected.content.w, 5);
  expect(actual.content.h).toBeCloseTo(expected.content.h, 5);
}

/** Busy art: a checkerboard has strong horizontal contrast on every row. */
const checker = (x: number, y: number): Rgb => ((x + y) % 2 === 0 ? WHITE : BLACK);

/** Calm art: a gentle horizontal gradient — low contrast, but not a flat bar. */
const calm = (x: number): Rgb => [x * 2, x * 2, x * 2];

describe('centerFocus', () => {
  test('portrait image: full width, vertically centred square', () => {
    expect(centerFocus(3 / 4)).toEqual({
      x: 0,
      y: (4 / 3 - 1) / 2,
      side: 1,
      aspect: 4 / 3,
      content: { x: 0, y: 0, w: 1, h: 4 / 3 },
    });
  });
});

describe('analyzeCover', () => {
  test('flat portrait image falls back to the centre crop', () => {
    const rgba = makeGrid(48, 64, () => [40, 40, 40]);

    expectFocus(analyzeCover({ width: 48, height: 64, rgba }), centerFocus(48 / 64));
  });

  test('black bars on the left and right are excluded from the crop', () => {
    // 6 black columns each side, busy art in the middle 36 columns.
    const rgba = makeGrid(48, 64, (x, y) => (x < 6 || x >= 42 ? BLACK : checker(x, y)));

    const focus = analyzeCover({ width: 48, height: 64, rgba });

    expect(focus.x).toBeCloseTo(6 / 48, 5);
    expect(focus.side).toBeCloseTo(36 / 48, 5);
    expect(focus.aspect).toBeCloseTo(64 / 48, 5);
    expect(focus.content).toEqual({ x: 6 / 48, y: 0, w: 36 / 48, h: 64 / 48 });
  });

  test('a flat run wider than a quarter of the image is art, not a bar', () => {
    // 20 of 48 columns are black: a dark sky, not letterboxing. No zoom.
    const rgba = makeGrid(48, 64, (x, y) => (x < 20 ? BLACK : checker(x, y)));

    const focus = analyzeCover({ width: 48, height: 64, rgba });

    expect(focus.x).toBe(0);
    expect(focus.side).toBe(1);
  });

  test('dark edges that fade into the art are not bars', () => {
    // Columns 0–5 pure black, then noise that grows slowly (a vignette), then busy art at 14+.
    // No hard edge follows the flat run, so nothing is cut and there is no zoom.
    const rgba = makeGrid(48, 64, (x, y) => {
      if (x < 6) return BLACK;
      if (x < 14) {
        const v = (x - 5) * 3 * ((y % 2) * 2 - 1) + 20; // ±3, ±6, … around 20
        return [v, v, v];
      }
      return checker(x, y);
    });

    const focus = analyzeCover({ width: 48, height: 64, rgba });

    expect(focus.x).toBe(0);
    expect(focus.side).toBe(1);
  });

  test('a title band near the top stays inside the square', () => {
    // Calm gradient everywhere except a busy band on rows 2–8.
    const rgba = makeGrid(48, 64, (x, y) => (y >= 2 && y <= 8 ? checker(x, y) : calm(x)));

    const focus = analyzeCover({ width: 48, height: 64, rgba });

    expect(focus.side).toBe(1);
    expect(focus.y).toBeLessThanOrEqual(2 / 48);
  });

  test('a title band near the bottom pulls the square down', () => {
    // Busy band on rows 56–62 of 64. The 48-row window must end at row 63 or later.
    const rgba = makeGrid(48, 64, (x, y) => (y >= 56 && y <= 62 ? checker(x, y) : calm(x)));

    const focus = analyzeCover({ width: 48, height: 64, rgba });

    expect(focus.y + focus.side).toBeGreaterThanOrEqual(63 / 48);
  });

  test('the cut line does not slice through a band the window cannot fully avoid', () => {
    // Two bands: rows 0–3 and rows 50–63. The window (48 rows) cannot hold both.
    // Wherever it lands, neither cut may fall inside a band.
    const band = (y: number) => y <= 3 || y >= 50;
    const rgba = makeGrid(48, 64, (x, y) => (band(y) ? checker(x, y) : calm(x)));

    const focus = analyzeCover({ width: 48, height: 64, rgba });

    const topCut = Math.round(focus.y * 48);
    const bottomCut = topCut + 48;
    const slices = (cut: number) => cut > 0 && cut < 64 && band(cut - 1) && band(cut);
    expect(slices(topCut)).toBe(false);
    expect(slices(bottomCut)).toBe(false);
  });

  test('landscape image slides the square horizontally toward the busy part', () => {
    // 64 × 48: busy band in columns 0–8, calm elsewhere. Square is 48 wide.
    const rgba = makeGrid(64, 48, (x, y) => (x <= 8 ? checker(x, y) : [y * 2, y * 2, y * 2]));

    const focus = analyzeCover({ width: 64, height: 48, rgba });

    expect(focus.aspect).toBeCloseTo(48 / 64, 5);
    expect(focus.side).toBeCloseTo(48 / 64, 5);
    expect(focus.y).toBe(0);
    expect(focus.x).toBe(0);
  });
});
