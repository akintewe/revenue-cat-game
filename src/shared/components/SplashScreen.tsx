import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { PrysmMark } from './brand/PrysmMark';
import { Wordmark } from './brand/Wordmark';
import { authTheme } from '../theme/theme';

/**
 * In-app splash, shown while the session restores. Matches the Figma splash frame:
 * flat brand orange, pyramid + 9pt gap + wordmark, the lockup 15pt above true centre.
 *
 * The native splash (SplashScreen.storyboard) can only draw an image, so it shows the pyramid
 * alone at screen centre. This view mounts with the pyramid in that exact spot, then slides it
 * into its lockup slot while the wordmark fades in — one motion instead of a visible jump.
 */
const MARK_WIDTH = 34;
const GAP = 9;
const WORDMARK_SIZE = 24.3;
const LIFT = 15;

export function SplashScreen() {
  const [progress] = useState(() => new Animated.Value(0));
  const [wordmarkWidth, setWordmarkWidth] = useState<number | null>(null);

  useEffect(() => {
    if (wordmarkWidth == null) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 480,
      delay: 60,
      easing: Easing.bezier(0.2, 0.8, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [progress, wordmarkWidth]);

  const onWordmarkLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== wordmarkWidth) setWordmarkWidth(w);
  };

  // Final lockup is centred as a group: the mark ends up half the (gap + wordmark) to the left.
  const markShift = wordmarkWidth == null ? 0 : -(GAP + wordmarkWidth) / 2;
  const wordmarkShift = wordmarkWidth == null ? 0 : (MARK_WIDTH + GAP) / 2;

  const markStyle = {
    transform: [
      { translateX: Animated.multiply(progress, markShift) },
      { translateY: Animated.multiply(progress, -LIFT) },
    ],
  };
  const wordmarkStyle = {
    opacity: progress,
    transform: [
      { translateX: Animated.add(wordmarkShift, Animated.multiply(Animated.subtract(1, progress), 14)) },
      { translateY: Animated.multiply(progress, -LIFT) },
    ],
  };

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.centered, markStyle]}>
        <PrysmMark width={MARK_WIDTH} />
      </Animated.View>
      <Animated.View style={[styles.centered, wordmarkStyle]} onLayout={onWordmarkLayout}>
        <Wordmark fontSize={WORDMARK_SIZE} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: authTheme.splashBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    position: 'absolute',
  },
});
