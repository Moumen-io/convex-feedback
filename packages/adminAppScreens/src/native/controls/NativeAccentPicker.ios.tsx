import { Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import type { NativeAccentPickerProps } from "./helpers";

export function NativeAccentPicker({
  changeAccentColor,
  selectedPresetId,
  colorPresets,
}: NativeAccentPickerProps) {
  return (
    <Picker
      label="Accent color"
      modifiers={[pickerStyle("menu")]}
      onSelectionChange={(value) => {
        const preset = colorPresets.find((candidate) => candidate.id === value);
        if (preset) changeAccentColor(preset.value);
      }}
      selection={selectedPresetId}
    >
      {colorPresets.map((preset) => (
        <Text key={preset.id} modifiers={[tag(preset.id)]}>
          {preset.label}
        </Text>
      ))}
      <Text key={"custom"} modifiers={[tag("custom")]}>
        Custom
      </Text>
    </Picker>
  );
}
