import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, type ImageSource } from 'expo-image';
import type { PostCategory } from '../../../services/social/feed';
import { CATEGORY_STYLE } from '../theme';

const TROPHY = require('../../../../assets/feed-icons/trophy_filled.png') as ImageSource;

/** Frame 268: a 16pt pill. Every category uses the trophy glyph in its own colour. */
export function CategoryChip({ category }: { category: PostCategory }) {
  const style = CATEGORY_STYLE[category];
  return (
    <LinearGradient colors={style.gradient} style={styles.chip}>
      <Image source={TROPHY} style={styles.icon} tintColor={style.icon} contentFit="contain" />
      <Text style={[styles.label, { color: style.text }]}>{style.label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 16,
    borderRadius: 100,
    paddingHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  icon: {
    width: 12,
    height: 12,
  },
  label: {
    paddingHorizontal: 4,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
