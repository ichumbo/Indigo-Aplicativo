import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const APP_MAX_CONTENT_WIDTH = 720;
export const TAB_BAR_HEIGHT = 64;

const MIN_TAB_BAR_BOTTOM = 12;
const TAB_BAR_CONTENT_GAP = 24;

export function getResponsiveHorizontalPadding(width: number) {
  if (width <= 340) return 12;
  if (width <= 390) return 16;
  if (width >= 768) return 24;
  return 20;
}

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isCompact = width < 380;
  const horizontalPadding = getResponsiveHorizontalPadding(width);
  const tabBarHeight = isCompact ? 62 : TAB_BAR_HEIGHT;
  const tabBarBottom = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  return {
    width,
    height,
    insets,
    isCompact,
    horizontalPadding,
    contentMaxWidth: APP_MAX_CONTENT_WIDTH,
    topPadding: Math.max(48, insets.top + 18),
    stackBottomPadding: Math.max(32, insets.bottom + 24),
    tabBarBottom,
    tabBarHeight,
    tabBarHorizontalMargin: isCompact ? 10 : 18,
    tabBarContentPadding: tabBarBottom + tabBarHeight + TAB_BAR_CONTENT_GAP,
  };
}
