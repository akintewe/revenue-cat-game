import React from 'react';
import Svg, { Polygon } from 'react-native-svg';

/**
 * The Prysm pyramid, redrawn as vector from the 38×33 Figma export (Frame 207):
 * apex top-centre, base vertex bottom-centre, white left face, peach right face.
 * Aspect ratio is fixed at 35:33; pass `width` and the height follows.
 */
type Props = { width: number };

const VB_W = 35;
const VB_H = 33;
const APEX = `${VB_W / 2},0`;
const BASE = `${VB_W / 2},${VB_H}`;
const LEFT = `0,23`;
const RIGHT = `${VB_W},23`;

export const PRYSM_MARK_RATIO = VB_H / VB_W;

export function PrysmMark({ width }: Props) {
  return (
    <Svg width={width} height={width * PRYSM_MARK_RATIO} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      <Polygon points={`${APEX} ${LEFT} ${BASE}`} fill="#FFFFFF" />
      <Polygon points={`${APEX} ${BASE} ${RIGHT}`} fill="#FFBCA9" />
    </Svg>
  );
}
