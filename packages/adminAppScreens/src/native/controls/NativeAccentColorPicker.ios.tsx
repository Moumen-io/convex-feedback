import { ColorPicker } from "@expo/ui/swift-ui";
import type { NativeAccentColorPickerProps } from "./helpers";

export function NativeAccentColorPicker({
  value,
  onChange,
}: NativeAccentColorPickerProps) {
  return (
    <ColorPicker
      label="Custom color"
      onSelectionChange={onChange}
      selection={value}
      supportsOpacity={false}
    />
  );
}
