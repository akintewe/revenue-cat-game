import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../../shared/components/Screen';
import { colors, radii, spacing, typography } from '../../../shared/theme/theme';
import { useLibraryStore } from '../../library/store/useLibraryStore';
import { computeStamps } from '../logic/stamps';
import type { Stamp } from '../types';
import type { RootScreenProps } from '../../../core/navigation/types';

type Props = RootScreenProps<'Passport'>;

export function PassportScreen({ navigation }: Props) {
  const entries = useLibraryStore((state) => state.entries);
  const stamps = useMemo(() => computeStamps(entries), [entries]);
  const earnedCount = stamps.filter((stamp) => stamp.earned).length;

  return (
    <Screen>
      <Text style={typography.heading}>Passport</Text>
      <Text style={[typography.body, styles.subtitle]}>
        {earnedCount}/{stamps.length} stamps earned
      </Text>

      <FlatList
        data={stamps}
        keyExtractor={(stamp) => stamp.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <StampCard stamp={item} onPress={() => navigation.navigate('AchievementDetail', { stamp: item })} />
        )}
      />
    </Screen>
  );
}

function StampCard({ stamp, onPress }: { stamp: Stamp; onPress: () => void }) {
  return (
    <Pressable style={[styles.card, !stamp.earned && styles.cardLocked]} onPress={onPress}>
      <View style={[styles.iconWrap, stamp.earned && styles.iconWrapEarned]}>
        <Ionicons
          name={stamp.icon}
          size={22}
          color={stamp.earned ? colors.accent : colors.textFaint}
        />
      </View>
      <Text style={[typography.subheading, styles.cardTitle, !stamp.earned && styles.textLocked]}>
        {stamp.title}
      </Text>
      <Text style={[typography.body, styles.cardDescription]} numberOfLines={2}>
        {stamp.description}
      </Text>
      {!stamp.earned && (
        <Text style={styles.progress}>
          {stamp.progress}/{stamp.target}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: spacing.lg,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 4,
  },
  cardLocked: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconWrapEarned: {
    backgroundColor: colors.accentMuted,
  },
  cardTitle: {
    fontSize: 14,
  },
  textLocked: {
    color: colors.textMuted,
  },
  cardDescription: {
    fontSize: 12,
  },
  progress: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});
