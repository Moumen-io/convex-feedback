import type { AdminColorPreset } from "@/shared";
import type { StyleProp, ViewStyle } from "react-native";
import type { AdminScreenTheme } from "../theme";

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export interface NativeAccentPickerProps {
  changeAccentColor: (value: string) => void;
  selectedPresetId: string;
  colorPresets: readonly AdminColorPreset[];
  theme: AdminScreenTheme;
}

export interface NativeAccentColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export interface NativeAccentSettingsProps extends NativeAccentPickerProps {
  style: StyleProp<ViewStyle>;
  accentColor: string;
}
