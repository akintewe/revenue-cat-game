import { focusImageStyle } from '../focusImageStyle';
import { centerFocus } from '../analyzeCover';

describe('focusImageStyle', () => {
  test('the centre focus of a 3:4 cover in a 58 pt box matches contentFit cover', () => {
    // Image scaled to 58 wide, 77.33 tall, shifted up by half the overflow.
    expect(focusImageStyle(centerFocus(3 / 4), 58, 58)).toEqual({
      position: 'absolute',
      width: 58,
      height: (58 * 4) / 3,
      left: 0,
      top: -((58 * 4) / 3 - 58) / 2,
    });
  });

  test('a zoomed focus scales the image so the crop square fills the box', () => {
    // Crop covers 75% of the width starting at x = 12.5%: the image renders at 4/3 of the box.
    const focus = {
      x: 0.125,
      y: 0.2,
      side: 0.75,
      aspect: 4 / 3,
      content: { x: 0.125, y: 0, w: 0.75, h: 4 / 3 },
    };

    const style = focusImageStyle(focus, 60, 60);

    expect(style.position).toBe('absolute');
    expect(style.width).toBe(80);
    expect(style.height).toBeCloseTo((80 * 4) / 3, 5);
    expect(style.left).toBeCloseTo(-10, 5);
    expect(style.top).toBeCloseTo(-16, 5);
  });
});
