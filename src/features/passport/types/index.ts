import type { Ionicons } from '@expo/vector-icons';

export type StampCategory = 'logged' | 'beaten' | 'genres' | 'platform';

export type Stamp = {
  id: string;
  category: StampCategory;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  target: number;
  progress: number;
  earned: boolean;
};
