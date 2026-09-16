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
  /** Muted icon/chevron tint for top-bar glyphs, chevrons and inactive tab icons. */
  iconMuted: 'rgba(255,255,255,0.5)',
  /** Outline that separates the unread dot from the glyph under it. */
  badgeRing: '#290D06',
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

/** Auth screens (login + splash), sampled from Figma at 1.1× and divided back to points. */
export const authTheme = {
  splashBackground: '#FD5021',
  /** Full-page darkening over the cover collage: #00000054. */
  collageScrim: 'rgba(0,0,0,0.33)',
  /** Top rectangle, 289pt: solid black fading to clear (measured against the source collage). */
  topFadeColors: ['rgba(0,0,0,1)', 'rgba(0,0,0,0)'] as const,
  topFadeHeight: 289,
  /** Bottom rectangle, 651pt tall from y=223: the exact Figma four-stop gradient. */
  bottomFadeColors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.470925)', 'rgba(0,0,0,0.72)', 'rgba(0,0,0,0.8)'] as const,
  bottomFadeLocations: [0.1442, 0.4183, 0.5529, 1] as const,
  bottomFadeTop: 223,
  /** Glass pill fill (#00000080) and the orange button gradient. */
  glassTint: 'rgba(0,0,0,0.5)',
  /** Extra darkening over the glass so the pill interior matches the mock (measured ≈5/255). */
  glassOverlay: 'rgba(0,0,0,0.45)',
  buttonGradient: ['#FD5021', '#FF3C0B'] as const,
  /** Inset edge highlights — Figma's four inset shadows, ÷1.1. */
  glassInsetShadow:
    '0 1px 0.5px 0 rgba(251,230,112,0.05) inset, 0 -1px 0.5px 0 rgba(0,0,0,0.15) inset, 1px 0 0.5px 0 rgba(0,0,0,0.15) inset, -1px 0 0.5px 0 rgba(0,0,0,0.15) inset',
  buttonInsetShadow:
    '0 1px 0.5px 0 rgba(251,230,112,0.25) inset, 0 -1px 0.5px 0 rgba(0,0,0,0.15) inset, 1px 0 0.5px 0 rgba(0,0,0,0.15) inset, -1px 0 0.5px 0 rgba(0,0,0,0.15) inset',
  controlHeight: 48,
  controlRadius: 100,
  pagePaddingX: 20,
  /** Distance from the last control to the home indicator, plus the indicator's own inset. */
  pagePaddingBottom: 27.5,
  placeholder: 'rgba(255,255,255,0.36)',
  divider: 'rgba(255,255,255,0.2)',
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
