import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Wordmark } from './brand/Wordmark';
import { colors, discoverColors } from '../theme/theme';

/**
 * The app's top navigation bar, from the Figma "Frame 151/119/152/153" set.
 *
 * Rules it encodes:
 * - Home: side-menu button, the wordmark, the notifications button.
 * - Inner pages: a back button replaces the menu, a page label replaces the wordmark.
 * - Up to two action buttons on the right. A third is dropped, with a warning in development.
 * - An optional count badge sits after the back button to flag changes in earlier routes.
 * - Promotional / seasonal icons stack on the menu button's axis (`leadingExtra`).
 * - A page may have no title at all (`title={null}`).
 *
 * Sizes: the frames are drawn 1:1 with the 126px icon exports. Anchoring the 180px circular
 * button at the 44pt tap size gives 4.09px per point; everything below derives from that.
 */
const PX_PER_PT = 180 / 44;
const px = (n: number) => n / PX_PER_PT;

const BUTTON = px(180); // 44
const ICON_FRAME = px(126); // 30.8 — the exports' square frame, so glyph sizes stay as designed
const GAP = px(37); // 9
const BADGE = px(144); // 35.2
const WORDMARK_FONT = px(291) / 4; // 71pt wide → the Wordmark's 4×-per-pt rule

export const TOP_BAR_HEIGHT = BUTTON;

const ICONS = {
  menu: require('../../../assets/figma-icons/topbar-menu.png') as ImageSource,
  back: require('../../../assets/figma-icons/topbar-back.png') as ImageSource,
  bell: require('../../../assets/figma-icons/topbar-bell.png') as ImageSource,
  pencil: require('../../../assets/figma-icons/topbar-pencil.png') as ImageSource,
  share: require('../../../assets/figma-icons/topbar-share.png') as ImageSource,
  gift: require('../../../assets/figma-icons/topbar-gift.png') as ImageSource,
};

export type TopBarIcon = keyof typeof ICONS;

export type TopBarAction = {
  icon: TopBarIcon;
  accessibilityLabel: string;
  onPress?: () => void;
};

type Props = {
  /** `menu` on the home dashboard, `back` on inner pages. */
  leading: 'menu' | 'back';
  onLeadingPress?: () => void;
  /** Count or sign shown after the back button. */
  badge?: number | string;
  /** Promo / seasonal icon on the menu axis, e.g. `gift`. */
  leadingExtra?: TopBarIcon;
  onLeadingExtraPress?: () => void;
  /** Page label. `undefined` shows the wordmark; `null` shows nothing. */
  title?: string | null;
  /** Right-hand actions, first one outermost. At most two. */
  actions?: TopBarAction[];
  style?: ViewStyle;
};

const glassAvailable = Platform.OS === 'ios' && isLiquidGlassAvailable();

export function TopBar({
  leading,
  onLeadingPress,
  badge,
  leadingExtra,
  onLeadingExtraPress,
  title,
  actions = [],
  style,
}: Props) {
  if (__DEV__ && actions.length > 2) {
    console.warn(`[TopBar] ${actions.length} actions given; the design allows two.`);
  }
  const shown = actions.slice(0, 2);

  return (
    <View style={[styles.bar, style]}>
      <View style={styles.side}>
        {leading === 'back' ? (
          <CircleButton icon="back" accessibilityLabel="Back" onPress={onLeadingPress} />
        ) : (
          <Pressable
            onPress={onLeadingPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Open menu"
            style={styles.menuHit}
          >
            <Image source={ICONS.menu} style={styles.menuIcon} contentFit="contain" />
          </Pressable>
        )}
        {badge !== undefined && badge !== '' && (
          <View style={styles.badge} accessibilityLabel={`${badge} updates`}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        {leadingExtra && (
          <Pressable onPress={onLeadingExtraPress} hitSlop={8} accessibilityRole="button" style={styles.extraHit}>
            <Image source={ICONS[leadingExtra]} style={styles.extraIcon} contentFit="contain" />
          </Pressable>
        )}
      </View>

      <View style={styles.center} pointerEvents="none">
        {title === undefined ? (
          <Wordmark fontSize={WORDMARK_FONT} glow />
        ) : title === null ? null : (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
      </View>

      <View style={[styles.side, styles.sideRight]}>
        {/* Outermost action is listed first; render reversed so it lands on the right edge. */}
        {[...shown].reverse().map((action) => (
          <CircleButton key={action.icon} {...action} />
        ))}
      </View>
    </View>
  );
}

function CircleButton({ icon, accessibilityLabel, onPress }: TopBarAction) {
  const image = (
    <Image
      source={ICONS[icon]}
      style={styles.icon}
      contentFit="contain"
      // The bell carries its own orange dot; every other glyph is tinted the muted icon grey.
      tintColor={icon === 'bell' ? undefined : discoverColors.iconMuted}
    />
  );
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} hitSlop={4}>
      {glassAvailable ? (
        <GlassView
          style={styles.circle}
          glassEffectStyle="regular"
          colorScheme="dark"
          isInteractive
          tintColor={discoverColors.pillBg}
        >
          {image}
        </GlassView>
      ) : (
        <View style={[styles.circle, styles.circleFallback]}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.circleTint]} />
          {image}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: BUTTON,
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuHit: {
    height: BUTTON,
    justifyContent: 'center',
  },
  menuIcon: {
    width: ICON_FRAME,
    height: px(72),
  },
  extraHit: {
    height: BUTTON,
    justifyContent: 'center',
  },
  extraIcon: {
    width: ICON_FRAME,
    height: px(138),
  },
  badge: {
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '700',
  },
  title: {
    color: '#BBBABA',
    fontSize: 19,
    lineHeight: 23,
    fontWeight: '400',
    maxWidth: '55%',
  },
  circle: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: BUTTON / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleFallback: {
    overflow: 'hidden',
  },
  circleTint: {
    backgroundColor: discoverColors.pillBg,
  },
  icon: {
    width: ICON_FRAME,
    height: ICON_FRAME,
  },
});
