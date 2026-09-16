import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const IOS_STACK_BOTTOM_TOOLBAR_HEIGHT = 44;
const ANDROID_STACK_BOTTOM_TOOLBAR_HEIGHT = 64;

const stackBottomToolbarHeight = Platform.select({
  ios: IOS_STACK_BOTTOM_TOOLBAR_HEIGHT,
  android: ANDROID_STACK_BOTTOM_TOOLBAR_HEIGHT,
  default: 0,
});

/**
 * Expo Router currently supports the native bottom search-bar slot on iOS 26
 * and newer. Rendering the host on other platforms would create an empty
 * overlay, because `Stack.Toolbar.SearchBarSlot` is unavailable there.
 */
export const supportsRoadmapBottomToolbar =
  Platform.OS === "ios" && Number.parseInt(String(Platform.Version), 10) >= 26;

/**
 * Resolves the total bottom space occupied by the safe area and, when
 * requested, the native stack bottom toolbar.
 *
 * An explicit value is returned unchanged so callers can provide a custom
 * host inset or disable automatic spacing with `0`.
 *
 * @param bottomInset Total host-provided bottom space, if supplied.
 * @param bottomToolbarVisible Whether the package's native bottom toolbar is
 * rendered for the current platform.
 */
export function useStackBottomInset(
  bottomInset: number | undefined,
  bottomToolbarVisible: boolean,
): number {
  const insets = useSafeAreaInsets();

  return (
    bottomInset ??
    insets.bottom + (bottomToolbarVisible ? stackBottomToolbarHeight : 0)
  );
}
