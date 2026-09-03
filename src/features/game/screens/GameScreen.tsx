import React, { useEffect, useRef } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../../shared/components/Screen';
import { Button } from '../../../shared/components/Button';
import { spacing, typography } from '../../../shared/theme/theme';
import { ScoreBoard } from '../components/ScoreBoard';
import { TapTarget } from '../components/TapTarget';
import { useGameStore } from '../store/useGameStore';
import type { RootStackParamList } from '../../../core/navigation/RootNavigator';

const MISS_CHANCE = 0.15;

type Props = NativeStackScreenProps<RootStackParamList, 'Game'>;

export function GameScreen({ navigation }: Props) {
  const score = useGameStore((state) => state.score);
  const highScore = useGameStore((state) => state.highScore);
  const livesRemaining = useGameStore((state) => state.livesRemaining);
  const addPoint = useGameStore((state) => state.addPoint);
  const loseLife = useGameStore((state) => state.loseLife);
  const resetGame = useGameStore((state) => state.resetGame);

  const hasShownGameOver = useRef(false);

  useEffect(() => {
    if (livesRemaining === 0 && !hasShownGameOver.current) {
      hasShownGameOver.current = true;
      Alert.alert('Game over', `Final score: ${score}`, [
        {
          text: 'Play again',
          onPress: () => {
            hasShownGameOver.current = false;
            resetGame();
          },
        },
      ]);
    }
  }, [livesRemaining, score, resetGame]);

  function handleTap() {
    if (livesRemaining === 0) return;
    if (Math.random() < MISS_CHANCE) {
      loseLife();
    } else {
      addPoint();
    }
  }

  return (
    <Screen>
      <Text style={typography.heading}>Tap the Cat</Text>
      <ScoreBoard score={score} highScore={highScore} livesRemaining={livesRemaining} />

      <View style={styles.playArea}>
        <TapTarget onPress={handleTap} />
      </View>

      <Button
        label="Get more lives"
        onPress={() => navigation.navigate('Store')}
        variant="secondary"
        style={styles.storeButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  playArea: {
    flex: 1,
    justifyContent: 'center',
  },
  storeButton: {
    marginTop: spacing.md,
  },
});
