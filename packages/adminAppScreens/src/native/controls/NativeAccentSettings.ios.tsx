import { Form, Host, Section } from "@expo/ui/swift-ui";
import {
  frame,
  listRowBackground,
  listSectionMargins,
  listStyle,
  scrollContentBackground,
  scrollDisabled,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet } from "react-native";
import { NativeAccentColorPicker } from "./NativeAccentColorPicker";
import { NativeAccentPicker } from "./NativeAccentPicker";
import { isHexColor, type NativeAccentSettingsProps } from "./helpers";

export function NativeAccentSettings({
  changeAccentColor,
  selectedPresetId,
  colorPresets,
  theme,
  accentColor,
  style: rnStyle,
}: NativeAccentSettingsProps) {
  const { backgroundColor } = StyleSheet.flatten(rnStyle);

  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <Form
        modifiers={[
          listStyle("plain"),
          scrollContentBackground("hidden"),
          scrollDisabled(true),
          frame({ height: 120 }),
        ]}
      >
        <Section
          modifiers={[
            listRowBackground(backgroundColor as string),
            listSectionMargins({
              edges: "all",
              length: 1,
            }),
          ]}
        >
          <NativeAccentPicker
            changeAccentColor={changeAccentColor}
            selectedPresetId={selectedPresetId}
            colorPresets={colorPresets}
            theme={theme}
          />
          <NativeAccentColorPicker
            onChange={changeAccentColor}
            value={isHexColor(accentColor) ? accentColor : "#2563EB"}
          />
        </Section>
      </Form>
    </Host>
  );
}
