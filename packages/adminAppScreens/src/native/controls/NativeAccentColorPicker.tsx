import { Host, Text as NativeText, Slider, Spacer } from "@expo/ui";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { DEFAULT_ADMIN_ACCENT_COLOR } from "../../shared";
import type { NativeAccentColorPickerProps } from "./helpers";

/** Android fallback: native Expo UI sliders provide RGB color selection. */
export function NativeAccentColorPicker({
  value,
  onChange,
}: NativeAccentColorPickerProps) {
  const rgb = useMemo(() => hexToRgb(value), [value]);
  const update = (channel: keyof Rgb, next: number) => {
    onChange(rgbToHex({ ...rgb, [channel]: Math.round(next) }));
  };

  return (
    <Host style={styles.host}>
      <View style={styles.controls}>
        <NativeText textStyle={styles.label}>Custom color</NativeText>
        <Spacer flexible />
        <Slider
          max={255}
          min={0}
          onValueChange={(next) => update("red", next)}
          step={1}
          value={rgb.red}
        />
        <Slider
          max={255}
          min={0}
          onValueChange={(next) => update("green", next)}
          step={1}
          value={rgb.green}
        />
        <Slider
          max={255}
          min={0}
          onValueChange={(next) => update("blue", next)}
          step={1}
          value={rgb.blue}
        />
      </View>
    </Host>
  );
}

type Rgb = { red: number; green: number; blue: number };

function hexToRgb(value: string): Rgb {
  const normalized = /^#[0-9a-f]{6}$/i.test(value)
    ? value.slice(1)
    : DEFAULT_ADMIN_ACCENT_COLOR.slice(1);
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ red, green, blue }: Rgb): string {
  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

const styles = StyleSheet.create({
  host: { minHeight: 112, width: "100%" },
  controls: { gap: 2, paddingVertical: 4 },
  label: { fontSize: 13, fontWeight: "600", marginBottom: 2 },
});
