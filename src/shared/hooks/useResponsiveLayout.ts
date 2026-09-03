import { useWindowDimensions } from 'react-native';

const WIDE_BREAKPOINT = 700;

export function useResponsiveLayout() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  return {
    isWide,
    columns: isWide ? 2 : 1,
    navPlacement: isWide ? ('rail' as const) : ('bar' as const),
  };
}
