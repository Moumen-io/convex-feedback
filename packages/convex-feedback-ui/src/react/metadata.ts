import type { FeedbackMetadataValue } from "convex-feedback";

import type {
  StandardMetadataKey,
  EnabledStandardMetadataSelection,
} from "../shared/types/metadata.js";

const defaultWebMetadataKeys: readonly StandardMetadataKey[] = [
  "platform",
  "userAgent",
  "language",
  "timezone",
  "screenWidth",
  "screenHeight",
  "viewportWidth",
  "viewportHeight",
  "devicePixelRatio",
];

export function collectWebMetadata(
  selection: EnabledStandardMetadataSelection,
): Partial<Record<StandardMetadataKey, FeedbackMetadataValue>> {
  const keys = new Set(selection === true ? defaultWebMetadataKeys : selection);
  const metadata: Partial<Record<StandardMetadataKey, FeedbackMetadataValue>> =
    {};
  const browserNavigator =
    typeof navigator === "undefined" ? undefined : navigator;
  const browserWindow = typeof window === "undefined" ? undefined : window;

  if (keys.has("platform")) metadata.platform = "web";
  if (keys.has("userAgent") && browserNavigator?.userAgent)
    metadata.userAgent = browserNavigator.userAgent;
  if (keys.has("language") && browserNavigator?.language)
    metadata.language = browserNavigator.language;
  if (keys.has("timezone")) {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (timezone) metadata.timezone = timezone;
  }
  if (keys.has("screenWidth") && browserWindow?.screen)
    metadata.screenWidth = browserWindow.screen.width;
  if (keys.has("screenHeight") && browserWindow?.screen)
    metadata.screenHeight = browserWindow.screen.height;
  if (keys.has("viewportWidth") && browserWindow)
    metadata.viewportWidth = browserWindow.innerWidth;
  if (keys.has("viewportHeight") && browserWindow)
    metadata.viewportHeight = browserWindow.innerHeight;
  if (keys.has("devicePixelRatio") && browserWindow)
    metadata.devicePixelRatio = browserWindow.devicePixelRatio;

  return metadata;
}
