import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radii, spacing } from '../../../shared/theme/theme';
import type { PostCategory } from '../../../services/social/feed';

const CATEGORY_META: Record<PostCategory, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  trophies: { label: 'Trophies', color: '#F2994A', icon: 'trophy-outline' },
  questions: { label: 'Questions', color: '#9B59F6', icon: 'help-circle-outline' },
  memes: { label: 'Memes', color: '#4A90E2', icon: 'happy-outline' },
};

export const POST_CATEGORIES: PostCategory[] = ['trophies', 'questions', 'memes'];

export function categoryLabel(category: PostCategory): string {
  return CATEGORY_META[category].label;
}

export function PostCategoryPill({ category }: { category: PostCategory }) {
  const meta = CATEGORY_META[category];
  return (
    <View style={[styles.pill, { backgroundColor: meta.color }]}>
      <Ionicons name={meta.icon} size={11} color="#FFFFFF" />
      <Text style={styles.label}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
