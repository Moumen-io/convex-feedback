import { StyleSheet, View } from "react-native";
import { DEFAULT_ADMIN_ACCENT_COLOR } from "../../shared";
import { NativeAccentColorPicker } from "./NativeAccentColorPicker";
import { NativeAccentPicker } from "./NativeAccentPicker";
import { isHexColor, type NativeAccentSettingsProps } from "./helpers";

export function NativeAccentSettings({
  changeAccentColor,
  selectedPresetId,
  colorPresets,
  theme,
  accentColor,
  style,
}: NativeAccentSettingsProps) {
  return (
    <View style={[style, { flexDirection: "column" }]}>
      <NativeAccentPicker
        changeAccentColor={changeAccentColor}
        selectedPresetId={selectedPresetId}
        colorPresets={colorPresets}
        theme={theme}
      />

      <View style={styles.customColorRow}>
        <View style={[styles.customSwatch, { backgroundColor: accentColor }]} />
        <NativeAccentColorPicker
          onChange={changeAccentColor}
          value={
            isHexColor(accentColor) ? accentColor : DEFAULT_ADMIN_ACCENT_COLOR
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  customColorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  customSwatch: {
    borderColor: "#0000001A",
    borderRadius: 11,
    borderWidth: 1,
    height: 34,
    width: 34,
  },
});
