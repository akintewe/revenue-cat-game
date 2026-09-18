import React from 'react';
import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';
import type { ImageWidgetSource } from 'react-native-android-widget';
import { dim } from './model';

export const ACCENT = '#FD5021';
export const INK = '#FFFFFF';
export const INK_2 = 'rgba(255, 255, 255, 0.62)';
export const GLASS_BLEED = '#D46947';
const RADIUS = 28;

export type Click = { clickAction: string; clickActionData?: Record<string, unknown> };
export type Art = { title: string; coverUrl: string | null; bleed: string };

export function openUri(uri: string): Click {
  return { clickAction: 'OPEN_URI', clickActionData: { uri } };
}

export function gameLink(path: 'game' | 'start', catalogId: string): Click {
  return openUri(`prysm://${path}/${encodeURIComponent(catalogId)}`);
}

/**
 * The black card. Android draws the tree to a bitmap and has no radial gradient, so a diagonal
 * one toward a dimmed bleed colour stands in for the iOS glow.
 */
export function Card({ bleed, children, ...click }: { bleed: string | null; children: React.ReactNode } & Click) {
  return (
    <OverlapWidget
      {...click}
      style={{
        width: 'match_parent',
        height: 'match_parent',
        borderRadius: RADIUS,
        overflow: 'hidden',
        backgroundGradient: { from: '#000000', to: bleed ? dim(bleed, 0.55) : '#000000', orientation: 'TL_BR' },
      }}
    >
      {children}
    </OverlapWidget>
  );
}

/** Fills its parent. Put it under a text layer inside an OverlapWidget. */
export function Layer({ children, align = 'flex-start', justify = 'flex-start', padding = 16 }: {
  children?: React.ReactNode;
  align?: 'flex-start' | 'center' | 'flex-end';
  justify?: 'flex-start' | 'center' | 'flex-end';
  padding?: number;
}) {
  return (
    <FlexWidget style={{ width: 'match_parent', height: 'match_parent', padding, flexDirection: 'column', alignItems: align, justifyContent: justify }}>
      {children}
    </FlexWidget>
  );
}

export function Cover({ art, width, radius = 8, tag }: { art: Art; width: number; radius?: number; tag?: string }) {
  const height = Math.round((width * 4) / 3);
  return (
    <OverlapWidget style={{ width, height }}>
      {art.coverUrl ? (
        <ImageWidget image={art.coverUrl as ImageWidgetSource} imageWidth={width} imageHeight={height} radius={radius} resizeMode="cover" />
      ) : (
        <FlexWidget style={{ width, height, borderRadius: radius, backgroundColor: dim(art.bleed, 1), alignItems: 'center', justifyContent: 'center' }}>
          <TextWidget text={art.title.slice(0, 2).toUpperCase()} style={{ fontSize: Math.round(width * 0.3), fontWeight: '800', color: INK }} />
        </FlexWidget>
      )}
      {tag ? (
        <FlexWidget style={{ width, height, justifyContent: 'flex-end', padding: 4 }}>
          <TextWidget
            text={tag}
            style={{ fontSize: 10, fontWeight: '700', color: INK, backgroundColor: 'rgba(0, 0, 0, 0.72)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 }}
          />
        </FlexWidget>
      ) : null}
    </OverlapWidget>
  );
}

/** A cover across the whole card with the dark foot the text sits on. Sizes are the widget's own. */
export function FullBleed({ art, width, height }: { art: Art; width: number; height: number }) {
  return (
    <OverlapWidget style={{ width: 'match_parent', height: 'match_parent' }}>
      {art.coverUrl ? (
        <ImageWidget image={art.coverUrl as ImageWidgetSource} imageWidth={width} imageHeight={height} resizeMode="cover" />
      ) : (
        <FlexWidget style={{ width: 'match_parent', height: 'match_parent', backgroundColor: dim(art.bleed, 0.8) }} />
      )}
      <FlexWidget
        style={{ width: 'match_parent', height: 'match_parent', backgroundGradient: { from: 'rgba(0, 0, 0, 0)', to: 'rgba(0, 0, 0, 0.94)', orientation: 'TOP_BOTTOM' } }}
      />
    </OverlapWidget>
  );
}

export function Label({ text }: { text: string }) {
  return <TextWidget text={text} maxLines={1} truncate="END" style={{ fontSize: 12, fontWeight: '600', color: ACCENT }} />;
}

export function Pill({ text, quiet, ...click }: { text: string; quiet?: boolean } & Click) {
  return (
    <TextWidget
      {...click}
      text={text}
      style={{
        fontSize: 13,
        fontWeight: '600',
        color: INK,
        backgroundColor: quiet ? 'rgba(255, 255, 255, 0.12)' : ACCENT,
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
      }}
    />
  );
}
