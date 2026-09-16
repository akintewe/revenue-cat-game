import { cropForBox } from '../focusImageStyle';
import { centerFocus, type CoverFocus } from '../analyzeCover';

const PLAIN = centerFocus(3 / 4);

describe('cropForBox', () => {
  test('a square box shows exactly the focus square', () => {
    const focus: CoverFocus = { x: 0, y: 0.05, side: 1, aspect: 4 / 3, content: { x: 0, y: 0, w: 1, h: 4 / 3 } };

    const crop = cropForBox(focus, 58, 58);

    expect(crop.x).toBeCloseTo(0, 5);
    expect(crop.y).toBeCloseTo(0.05, 5);
    expect(crop.w).toBe(1);
    expect(crop.h).toBe(1);
  });

  test('a portrait box on a plain cover keeps the full height, like contentFit cover', () => {
    const crop = cropForBox(PLAIN, 115, 173);

    expect(crop.h).toBeCloseTo(4 / 3, 5);
    expect(crop.w).toBeCloseTo((4 / 3) * (115 / 173), 5);
    expect(crop.x).toBeCloseTo((1 - crop.w) / 2, 5);
    expect(crop.y).toBe(0);
  });

  describe('a crop shorter than the focus square hugs the edge the square hugs', () => {
    const content = { x: 0, y: 0, w: 1, h: 4 / 3 };

    test('square at the top of the art: crop keeps the top', () => {
      const focus: CoverFocus = { x: 0, y: 0, side: 1, aspect: 4 / 3, content };

      const crop = cropForBox(focus, 110, 104);

      expect(crop.w).toBe(1);
      expect(crop.h).toBeCloseTo(104 / 110, 5);
      expect(crop.y).toBeCloseTo(0, 5);
    });

    test('square near the top of the art: crop still starts exactly at the square', () => {
      // 12% of the way down the slack — a tight crop above a title. Hug fully, do not interpolate.
      const focus: CoverFocus = { x: 0, y: 0.04, side: 1, aspect: 4 / 3, content };

      const crop = cropForBox(focus, 72, 64);

      expect(crop.y).toBeCloseTo(0.04, 5);
    });

    test('square at the bottom of the art: crop keeps the bottom', () => {
      const focus: CoverFocus = { x: 0, y: 4 / 3 - 1, side: 1, aspect: 4 / 3, content };

      const crop = cropForBox(focus, 110, 104);

      expect(crop.y + crop.h).toBeCloseTo(4 / 3, 5);
    });

    test('square in the middle of the art: crop is centred on it', () => {
      const focus: CoverFocus = { x: 0, y: (4 / 3 - 1) / 2, side: 1, aspect: 4 / 3, content };

      const crop = cropForBox(focus, 110, 104);

      expect(crop.y + crop.h / 2).toBeCloseTo(4 / 3 / 2, 5);
    });
  });

  test('bars limit the crop width, and the crop never leaves the content rect', () => {
    // Content is the middle 75% of the width; focus square sits at the bottom of the content.
    const focus: CoverFocus = {
      x: 0.125,
      y: 4 / 3 - 0.75,
      side: 0.75,
      aspect: 4 / 3,
      content: { x: 0.125, y: 0, w: 0.75, h: 4 / 3 },
    };

    const crop = cropForBox(focus, 115, 173);

    expect(crop.w).toBeCloseTo(0.75, 5);
    expect(crop.h).toBeCloseTo(0.75 * (173 / 115), 5);
    expect(crop.x).toBeCloseTo(0.125, 5);
    expect(crop.y + crop.h).toBeCloseTo(4 / 3, 5);
  });
});
