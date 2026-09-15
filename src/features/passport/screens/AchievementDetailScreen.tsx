import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { ScreenBackground } from '../../../shared/components/ScreenBackground';
import { Trophy3D } from '../components/Trophy3D';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'AchievementDetail'>;

export function AchievementDetailScreen({ route, navigation }: Props) {
  const { stamp } = route.params;
  const insets = useSafeAreaInsets();

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <View style={styles.root}>
      <ScreenBackground />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <Trophy3D icon={stamp.icon} earned={stamp.earned} />
        </Animated.View>

        <Text style={styles.hint}>Drag to turn it in the light</Text>

        <Text style={styles.title}>{stamp.title}</Text>
        <Text style={styles.description}>{stamp.description}</Text>

        {stamp.earned ? (
          <View style={styles.earnedPill}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
            <Text style={styles.earnedText}>Earned</Text>
          </View>
        ) : (
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, (stamp.progress / stamp.target) * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {stamp.progress}/{stamp.target}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.md,
  },
  title: {
    ...typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  description: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  earnedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentMuted,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginTop: spacing.lg,
  },
  earnedText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  progressWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  progressText: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
  },
});
