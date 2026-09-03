import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../../shared/theme/theme';

type ScoreBoardProps = {
  score: number;
  highScore: number;
  livesRemaining: number;
};

export function ScoreBoard({ score, highScore, livesRemaining }: ScoreBoardProps) {
  return (
    <View style={styles.row}>
      <Stat label="Score" value={score} />
      <Stat label="Best" value={highScore} />
      <Stat label="Lives" value={livesRemaining} />
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  value: {
    ...typography.heading,
    color: colors.accent,
  },
  label: {
    ...typography.body,
  },
});
