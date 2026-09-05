export const colors = {
  background: '#FFFFFF',
  surface: '#F2F2F5',
  surfaceAlt: '#E9E9EE',
  border: '#E3E3E9',
  accent: '#FF5A3C',
  accentMuted: 'rgba(255, 90, 60, 0.12)',
  /** Text/icon color for content placed on top of an accent-colored background. */
  onAccent: '#FFFFFF',
  text: '#15151A',
  textMuted: '#6E6E78',
  textFaint: '#9C9CA6',
  success: '#2E8B57',
  danger: '#E14B4B',
  info: '#2F6FED',
};

export const statusColors = {
  playing: '#2F6FED',
  backlog: '#8C8C97',
  beaten: '#2E8B57',
  dropped: '#E8467F',
};

export const coverColors: Record<string, string> = {
  teal: '#2FB6A8',
  orange: '#E8823C',
  purple: '#6C5CE7',
  pink: '#E85C8A',
  gold: '#D9A441',
  navy: '#2C3E66',
  red: '#C0392B',
  green: '#2E8B57',
  blue: '#3B6FD9',
  slate: '#4A4A57',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 18,
  pill: 999,
};

export const typography = {
  heading: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.text,
    letterSpacing: 0.2,
  },
  subheading: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
  caption: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textFaint,
    letterSpacing: 0.6,
  },
};
