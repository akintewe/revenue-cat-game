import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const MAX_TILT_DEG = 26;

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  earned: boolean;
  size?: number;
};

/**
 * A tiltable "medal" — drag to rotate in 3D (real perspective/rotateX/rotateY
 * transforms, not a sprite swap) and watch the specular highlight slide across
 * the metal, the way a coin catches light when you turn it in your hand.
 * Built from react-native-svg + PanResponder + Animated only — no new native
 * module, so it works on any build this app already has installed.
 */
export function Trophy3D({ icon, earned, size = 240 }: Props) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 2,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 5,
          tension: 35,
          useNativeDriver: false,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, tension: 35, useNativeDriver: false }).start();
      },
    }),
  ).current;

  const rotateY = pan.x.interpolate({
    inputRange: [-size, size],
    outputRange: [`-${MAX_TILT_DEG}deg`, `${MAX_TILT_DEG}deg`],
    extrapolate: 'clamp',
  });
  const rotateX = pan.y.interpolate({
    inputRange: [-size, size],
    outputRange: [`${MAX_TILT_DEG}deg`, `-${MAX_TILT_DEG}deg`],
    extrapolate: 'clamp',
  });

  const highlightX = pan.x.interpolate({
    inputRange: [-size, size],
    outputRange: [size * 0.78, size * 0.22],
    extrapolate: 'clamp',
  });
  const highlightY = pan.y.interpolate({
    inputRange: [-size, size],
    outputRange: [size * 0.26, size * 0.46],
    extrapolate: 'clamp',
  });

  const shadowTranslateX = pan.x.interpolate({ inputRange: [-size, size], outputRange: [10, -10], extrapolate: 'clamp' });
  const shadowTranslateY = pan.y.interpolate({ inputRange: [-size, size], outputRange: [-6, 10], extrapolate: 'clamp' });

  const rim = earned ? ['#FFE9B8', '#FD5021', '#7A230A'] : ['#9C9CA6', '#57565F', '#26252A'];
  const face = earned ? ['#FFF4DE', '#E8873F'] : ['#78777F', '#3A3940'];

  return (
    <View style={{ width: size, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            width: size * 0.7,
            height: size * 0.16,
            borderRadius: 999,
            transform: [{ translateX: shadowTranslateX }, { translateY: shadowTranslateY }],
          },
        ]}
      />
      <View style={{ width: size, height: size }} {...panResponder.panHandlers}>
        <Animated.View
          style={{
            width: size,
            height: size,
            transform: [{ perspective: 900 }, { rotateX }, { rotateY }],
          }}
        >
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <RadialGradient id="rim" cx="35%" cy="28%" r="78%">
                <Stop offset="0%" stopColor={rim[0]} />
                <Stop offset="55%" stopColor={rim[1]} />
                <Stop offset="100%" stopColor={rim[2]} />
              </RadialGradient>
              <RadialGradient id="face" cx="38%" cy="32%" r="72%">
                <Stop offset="0%" stopColor={face[0]} />
                <Stop offset="100%" stopColor={face[1]} />
              </RadialGradient>
            </Defs>
            <Circle cx={size / 2} cy={size / 2} r={size / 2 - 3} fill="url(#rim)" />
            <Circle cx={size / 2} cy={size / 2} r={size * 0.4} fill="url(#face)" />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={size * 0.4}
              fill="none"
              stroke="rgba(0,0,0,0.22)"
              strokeWidth={2}
            />
          </Svg>

          <View style={[StyleSheet.absoluteFill, styles.iconWrap]} pointerEvents="none">
            <Ionicons name={icon} size={size * 0.32} color={earned ? '#FFFFFF' : 'rgba(255,255,255,0.45)'} />
          </View>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.highlight,
              {
                width: size * 0.36,
                height: size * 0.2,
                transform: [
                  { translateX: Animated.subtract(highlightX, size * 0.18) },
                  { translateY: Animated.subtract(highlightY, size * 0.1) },
                  { rotate: '-18deg' },
                ],
              },
            ]}
          />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  shadow: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
});
