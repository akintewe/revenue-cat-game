import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/theme';

const LOCKUP = require('../../../assets/splash-lockup.png');

/** Matches the Figma splash frame (node 2164:2740) — sampled top gradient, centered wordmark lockup. */
export function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 480,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 6,
          tension: 55,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 55,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [opacity, scale, translateY, glowOpacity]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ opacity: glowOpacity }}>
        <LinearGradient
          colors={['#872B11', '#170502', colors.background]}
          locations={[0, 0.4, 1]}
          style={styles.gradient}
        />
      </Animated.View>
      <View style={styles.content}>
        <Animated.View style={{ opacity, transform: [{ scale }, { translateY }] }}>
          <Image source={LOCKUP} style={styles.lockup} contentFit="contain" />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: {
    width: 220,
    height: 220 * (102 / 438),
  },
});
