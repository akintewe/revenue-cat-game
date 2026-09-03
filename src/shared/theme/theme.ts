export const colors = {
  background: '#0F1020',
  surface: '#1B1D33',
  primary: '#7C5CFF',
  primaryVariant: '#5B3FE0',
  accent: '#FFC145',
  text: '#F5F5FA',
  textMuted: '#9A9AB5',
  success: '#3DDC84',
  danger: '#FF5C5C',
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
  lg: 20,
  pill: 999,
};

export const typography = {
  heading: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: colors.text,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: colors.textMuted,
  },
};
