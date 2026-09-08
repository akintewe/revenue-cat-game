import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image, type ImageSource } from 'expo-image';
import { colors, radii, spacing } from '../theme/theme';

type SegmentedTabsProps<T extends string> = {
  options: {
    value: T;
    label: string;
    icon?: keyof typeof Ionicons.glyphMap;
    /**
     * Figma-exported glyph, pre-colored per active state — `tintColor` isn't reliable
     * across Expo Go environments, so active/inactive are two separate baked assets
     * rather than one tinted at runtime.
     */
    image?: { active: ImageSource; inactive: ImageSource };
  }[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedTabs<T extends string>({ options, value, onChange }: SegmentedTabsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const tint = isActive ? colors.background : colors.textMuted;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.pill, isActive && styles.pillActive]}
          >
            {option.image ? (
              <Image
                source={isActive ? option.image.active : option.image.inactive}
                style={styles.iconImage}
                contentFit="contain"
              />
            ) : (
              option.icon && <Ionicons name={option.icon} size={14} color={tint} />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  row: {
    flexGrow: 0,
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
  },
  pillActive: {
    backgroundColor: colors.text,
  },
  iconImage: {
    width: 14,
    height: 14,
  },
  label: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  labelActive: {
    color: colors.background,
  },
});
