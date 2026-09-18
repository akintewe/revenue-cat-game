import type { PostCategory } from '../../services/social/feed';

/**
 * Friends feed, from the Figma "iPhone 16 & 17 Pro - 49" frame (402pt wide, so 1:1 in points).
 * SF Pro weight 510 → '500', 590 → '600'. Letter spacing is em × font size.
 */
export const feedColors = {
  background: '#020101',
  /** Rectangle 211: 177pt tall behind the header. The 0.01% stop makes the orange a hairline. */
  heroGradient: ['#FD5021', '#49170A', '#000000'] as const,
  heroGradientLocations: [0, 0.0001, 1] as const,
  heroHeight: 177,

  name: '#DBD9D9',
  muted: 'rgba(219, 217, 217, 0.5)',
  body: 'rgba(219, 217, 217, 0.66)',
  /** Sampled from the mock: the CSS export keeps the body as one text layer. */
  mention: '#FBDA40',
  hashtag: '#E96A49',
  icon: '#777777',
  accent: '#FD5021',

  cardHairline: 'rgba(163, 163, 163, 0.25)',
  cardShade: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.36)', 'rgba(0, 0, 0, 0.9)'] as const,
  cardShadeLocations: [0, 0.2885, 0.5769, 0.976] as const,
  genreChipBg: 'rgba(4, 4, 4, 0.1)',
  /** Sampled from the mock: the chips have a faint outline the CSS export leaves out. */
  genreChipBorder: 'rgba(219, 217, 217, 0.3)',
  star: '#FFDC2D',

  pollTrack: 'rgba(255, 255, 255, 0.1)',
  pollFill: 'rgba(93, 85, 84, 0.5)',
  pollLabel: '#FFFFFF',
  pollPercent: 'rgba(255, 255, 255, 0.5)',
  pollFooter: ['rgba(57, 4, 111, 0.4)', 'rgba(51, 7, 84, 0.4)'] as const,
  pollFooterBorder: 'rgba(62, 39, 84, 0.66)',
  pollFooterText: 'rgba(188, 173, 217, 0.8)',
};

export const feedLayout = {
  /** Frame 255: 16pt side gutter, 24pt between posts. */
  gutter: 16,
  postGap: 24,
  avatar: 40,
  /** Avatar to content column. */
  avatarGap: 16,
  /** Header, body, attachment and actions inside a post. */
  sectionGap: 14,
  cardRadius: 12,
  /** Frame 258: 314 × 176.62. */
  gameCardAspect: 314 / 176.62,
  /** image 14: 314 × 263.86. */
  photoAspect: 314 / 263.86,
  pollRowHeight: 40,
  voterSize: 24,
};

export const CATEGORY_STYLE: Record<
  PostCategory,
  { label: string; gradient: readonly [string, string]; icon: string; text: string }
> = {
  trophies: { label: 'Trophies', gradient: ['#FDD390', '#FDD6A0'], icon: '#E94E00', text: '#9C3704' },
  questions: { label: 'Questions', gradient: ['#E5C9FE', '#FAFAFA'], icon: '#7800E9', text: '#7800E9' },
  memes: { label: 'Memes', gradient: ['#C9F2FE', '#FAFAFA'], icon: '#007CE9', text: '#007CE9' },
};

export const CATEGORIES: PostCategory[] = ['trophies', 'questions', 'memes'];
