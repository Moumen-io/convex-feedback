import { Host, Text as NativeText, Picker, Row, Spacer } from "@expo/ui";
import type { NativeAccentPickerProps } from "./helpers";

export function NativeAccentPicker({
  changeAccentColor,
  selectedPresetId,
  colorPresets,
  theme,
}: NativeAccentPickerProps) {
  return (
    <Host style={{ minHeight: 44, width: "100%" }}>
      <Row alignment="center" spacing={12} style={{ padding: 16 }}>
        <NativeText textStyle={{ color: theme.mutedText }}>Accent</NativeText>
        <Spacer flexible />
        <Picker
          appearance="menu"
          onValueChange={(value) => {
            const preset = colorPresets.find(
              (candidate) => candidate.id === value,
            );
            if (preset) changeAccentColor(preset.value);
          }}
          selectedValue={selectedPresetId}
        >
          {colorPresets.map((preset) => (
            <Picker.Item
              key={preset.id}
              label={preset.label}
              value={preset.id}
            />
          ))}
          <Picker.Item label="Custom" value="custom" />
        </Picker>
      </Row>
    </Host>
  );
}
