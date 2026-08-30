import type { FeedbackMetadataValue } from "convex-feedback";
import Constants from "expo-constants";
import { Platform } from "react-native";

import type {
  StandardMetadataKey,
  EnabledStandardMetadataSelection,
} from "../../shared/types/metadata.js";
import {
  collectNativeMetadata,
  defaultNativeMetadataKeys,
} from "../shared/metadata.js";

const defaultExpoMetadataKeys: readonly StandardMetadataKey[] = [
  ...defaultNativeMetadataKeys,
  "appVersion",
  "buildNumber",
  "applicationId",
  "expoRuntimeVersion",
  "executionEnvironment",
];

export function collectExpoMetadata(
  selection: EnabledStandardMetadataSelection,
): Partial<Record<StandardMetadataKey, FeedbackMetadataValue>> {
  const selected = selection === true ? defaultExpoMetadataKeys : selection;
  const keys = new Set(selected);
  const metadata = collectNativeMetadata(selected);
  const config = Constants.expoConfig;

  if (keys.has("appVersion") && config?.version)
    metadata.appVersion = config.version;

  if (keys.has("buildNumber")) {
    const buildNumber =
      Platform.OS === "ios"
        ? (Constants.platform?.ios?.buildNumber ?? config?.ios?.buildNumber)
        : Platform.OS === "android"
          ? (Constants.platform?.android?.versionCode ??
            config?.android?.versionCode)
          : undefined;
    if (buildNumber !== undefined && buildNumber !== null)
      metadata.buildNumber = buildNumber;
  }

  if (keys.has("applicationId")) {
    const applicationId =
      Platform.OS === "ios"
        ? config?.ios?.bundleIdentifier
        : Platform.OS === "android"
          ? config?.android?.package
          : undefined;
    if (applicationId) metadata.applicationId = applicationId;
  }

  if (keys.has("expoRuntimeVersion") && Constants.expoRuntimeVersion)
    metadata.expoRuntimeVersion = Constants.expoRuntimeVersion;
  if (keys.has("executionEnvironment"))
    metadata.executionEnvironment = Constants.executionEnvironment;

  return metadata;
}
