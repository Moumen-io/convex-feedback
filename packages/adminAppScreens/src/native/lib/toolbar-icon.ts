import {
  unstable_getMaterialSymbolSourceAsync,
  type AndroidSymbol,
} from "expo-symbols";
import { useEffect, useState } from "react";
import { useAdminTheme } from "../theme.js";
import type { ImageSourcePropType } from "react-native";
import type { SFSymbol } from "sf-symbols-typescript";

/**
 * Resolves the platform-native icon shape expected by Expo Router toolbars.
 * Android needs a material-symbol image source while iOS uses an SF Symbol.
 */
export function useToolbarIcon(
  ios: SFSymbol,
  android: AndroidSymbol,
): SFSymbol | ImageSourcePropType | undefined {
  const theme = useAdminTheme();
  const [androidSource, setAndroidSource] =
    useState<ImageSourcePropType | null>(null);

  useEffect(() => {
    if (process.env.EXPO_OS === "ios") return;

    let active = true;
    void unstable_getMaterialSymbolSourceAsync(android, 24, theme.text).then(
      (source) => {
        if (active) setAndroidSource(source);
      },
    );

    return () => {
      active = false;
    };
  }, [android, theme.text]);

  return process.env.EXPO_OS === "ios" ? ios : (androidSource ?? undefined);
}
