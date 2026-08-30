import type { FeedbackMetadataValue } from "convex-feedback";
import { Dimensions, PixelRatio, Platform } from "react-native";

import type {
  StandardMetadataKey,
  EnabledStandardMetadataSelection,
} from "../../shared/types/metadata.js";

export const defaultNativeMetadataKeys: readonly StandardMetadataKey[] = [
  "platform",
  "osVersion",
  "deviceModel",
  "screenWidth",
  "screenHeight",
  "pixelRatio",
  "fontScale",
];

export function collectNativeMetadata(
  selection: EnabledStandardMetadataSelection,
): Partial<Record<StandardMetadataKey, FeedbackMetadataValue>> {
  const keys = new Set(
    selection === true ? defaultNativeMetadataKeys : selection,
  );
  const metadata: Partial<Record<StandardMetadataKey, FeedbackMetadataValue>> =
    {};
  const screen = Dimensions.get("screen");

  if (keys.has("platform")) metadata.platform = Platform.OS;
  if (keys.has("osVersion")) metadata.osVersion = Platform.Version;
  if (keys.has("deviceModel") && Platform.OS === "android")
    metadata.deviceModel = Platform.constants.Model;
  if (keys.has("screenWidth")) metadata.screenWidth = screen.width;
  if (keys.has("screenHeight")) metadata.screenHeight = screen.height;
  if (keys.has("pixelRatio")) metadata.pixelRatio = PixelRatio.get();
  if (keys.has("fontScale")) metadata.fontScale = PixelRatio.getFontScale();

  return metadata;
}
