import { ColorPicker, Host } from "@expo/ui/swift-ui";
import { StyleSheet } from "react-native";

import type { NativeAccentColorPickerProps } from "./NativeAccentColorPicker.js";

export function NativeAccentColorPicker({
  value,
  onChange,
}: NativeAccentColorPickerProps) {
  return (
    <Host style={styles.host}>
      <ColorPicker
        label="Custom color"
        onSelectionChange={onChange}
        selection={value}
        supportsOpacity={false}
      />
    </Host>
  );
}

const styles = StyleSheet.create({
  host: { height: 44, width: 180 },
});
