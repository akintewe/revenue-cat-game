export const colors = {
  /** App-wide dark canvas — matches the Library dashboard background everywhere. */
  background: '#090909',
  /** Slightly lifted dark surface for grouped cards/rows. */
  surface: '#0F0E0D',
  surfaceAlt: '#181615',
  border: 'rgba(255,255,255,0.08)',
  accent: '#FD5021',
  accentMuted: 'rgba(253, 80, 33, 0.16)',
  /** Text/icon color for content placed on top of an accent-colored background. */
  onAccent: '#FFFFFF',
  text: '#FFFFFF',
  textMuted: '#9C9CA6',
  textFaint: '#6B6B72',
  success: '#3FBE7C',
  danger: '#F0645F',
  info: '#5B9BFF',
};

/** Status pill bg/fg pairs, sampled directly from the Figma library-row components. */
export const statusColors = {
  playing: { bg: '#FED897', fg: '#7C2B08' },
  backlog: { bg: '#EBEAE9', fg: '#615048' },
  beaten: { bg: '#FD5021', fg: '#FFFFFF' },
  dropped: { bg: '#F7D8DC', fg: '#7C1D33' },
};

export const preorderColors = { bg: '#C4F4FC', fg: '#193679' };

/** Dark "Discover" palette for the Library dashboard — sampled exactly from the Figma redesign (node 2125:1078). */
export const discoverColors = {
  background: '#090909',
  cardBg: '#0F0E0D',
  rowBg: '#181615',
  titleText: '#E1D9D4',
  mutedText: '#646464',
  /** Muted icon/chevron gray used on "left_small_regular" and inactive tab glyphs. */
  iconMuted: '#8F8793',
  /** Fill tint for GLASS-effect chips (segmented toggle active pill, Add pill). */
  pillBg: 'rgba(255,255,255,0.1)',
  /** Fill tint for the GLASS-effect bottom nav pill — real blur is applied separately. */
  navBg: 'rgba(19,17,17,0.2)',
  /** Vertical hero gradient behind the header, top of screen down to background. */
  heroGradient: ['#FD5021', '#49170A', '#090909'] as const,
  heroGradientLocations: [0, 0.001, 1] as const,
  /** Bottom fade overlay — exact 4-stop black gradient at 75% max opacity, sampled from Rectangle 203. */
  bottomFadeColors: [
    'rgba(0,0,0,0)',
    'rgba(0,0,0,0.177)',
    'rgba(0,0,0,0.588)',
    'rgba(0,0,0,0.75)',
  ] as const,
  bottomFadeLocations: [0, 0.375, 0.654, 1] as const,
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
  lg: 16,
  pill: 999,
};

export const typography = {
  heading: {
    fontSize: 24,
    fontWeight: '600' as const,
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
