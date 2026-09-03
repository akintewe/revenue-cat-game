export const colors = {
  background: '#0B0B0F',
  surface: '#18181F',
  surfaceAlt: '#1F1F28',
  border: '#2A2A35',
  accent: '#FF5A1F',
  accentMuted: 'rgba(255, 90, 31, 0.16)',
  text: '#F5F5F7',
  textMuted: '#8C8C97',
  textFaint: '#5C5C66',
  success: '#35C56A',
  danger: '#FF5C5C',
  info: '#4C8DFF',
};

export const statusColors = {
  playing: '#4C8DFF',
  backlog: '#8C8C97',
  beaten: '#35C56A',
  dropped: '#FF5C5C',
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
