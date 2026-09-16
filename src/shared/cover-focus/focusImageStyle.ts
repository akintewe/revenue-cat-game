import type { CoverFocus, CoverRect } from './analyzeCover';

export type FocusImageStyle = {
  position: 'absolute';
  width: number;
  height: number;
  left: number;
  top: number;
};

/**
 * The crop a `boxWidth` × `boxHeight` container should show, in image units: as large as fits
 * inside the content rect at the box's aspect, placed over the focus square, kept inside the
 * content. A square box gets exactly the focus square. A crop larger than the square is centred
 * on it. A crop smaller than the square hugs the edge the square hugs: a square at the top of the
 * art means the title is at the top, so the crop keeps the top.
 */
export function cropForBox(focus: CoverFocus, boxWidth: number, boxHeight: number): CoverRect {
  const { content } = focus;
  const ratio = boxWidth / boxHeight;
  const w = Math.min(content.w, content.h * ratio);
  const h = w / ratio;
  return {
    x: clamp(place(focus.x, focus.side, w, content.x, content.w), content.x, content.x + content.w - w),
    y: clamp(place(focus.y, focus.side, h, content.y, content.h), content.y, content.y + content.h - h),
    w,
    h,
  };
}

/** A square within this fraction of the slack from an edge hugs that edge fully. */
const HUG_ZONE = 0.25;

/** Where a span of `length` goes relative to the focus `side` that starts at `start`. */
function place(start: number, side: number, length: number, contentStart: number, contentLength: number): number {
  if (length >= side) return start + (side - length) / 2;
  // 0 = the square sits at the start of the content, 1 = at its end, 0.5 = in the middle.
  const slack = contentLength - side;
  const position = slack > 1e-9 ? (start - contentStart) / slack : 0.5;
  const t = position <= HUG_ZONE ? 0 : position >= 1 - HUG_ZONE ? 1 : position;
  return start + t * (side - length);
}

/**
 * Sizes and offsets the full image inside a `boxWidth` × `boxHeight` container so that
 * `cropForBox` fills it. The container must clip (`overflow: 'hidden'`).
 */
export function focusImageStyle(focus: CoverFocus, boxWidth: number, boxHeight: number): FocusImageStyle {
  const crop = cropForBox(focus, boxWidth, boxHeight);
  const scale = boxWidth / crop.w;
  return {
    position: 'absolute',
    width: scale,
    height: scale * focus.aspect,
    // `|| 0` turns a -0 into 0.
    left: -(crop.x * scale) || 0,
    top: -(crop.y * scale) || 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
