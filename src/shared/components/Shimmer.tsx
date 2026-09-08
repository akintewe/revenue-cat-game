import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { discoverColors } from '../theme/theme';

type ShimmerProps = {
  style: StyleProp<ViewStyle>;
};

/** A pulsing placeholder block — the loading-state building block for skeleton rows/cards. */
export function Shimmer({ style }: ShimmerProps) {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={[{ backgroundColor: discoverColors.rowBg, opacity }, style]} />;
}
