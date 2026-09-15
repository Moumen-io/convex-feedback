import type { FeedbackEntry } from "convex-feedback";
import { Stack } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useFeedbackUi } from "../../shared/context/FeedbackProvider.js";
import type { FeedbackColorProps } from "../../shared/types/context.js";
import { FeedbackBoard } from "../shared/ui/primitives.js";
import {
  EditEntryForm,
  type EditEntryFormRef,
  type EditEntryFormState,
} from "../shared/ui/EditEntry.js";
import type {
  FeedbackAndroidToolbarIcons,
  FeedbackStackScreenOptions,
} from "./types.js";

export function EditEntryStackScreen({
  entry,
  onRequestClose,
  colors,
  androidToolbarIcons = {},
  stackOptions,
}: {
  entry: FeedbackEntry | null | undefined;
  onRequestClose: () => void;
  colors?: FeedbackColorProps;
  androidToolbarIcons?: FeedbackAndroidToolbarIcons;
  stackOptions?: FeedbackStackScreenOptions;
}) {
  const { messages, theme } = useFeedbackUi();
  const formRef = useRef<EditEntryFormRef>(null);
  const [formState, setFormState] = useState<EditEntryFormState>({
    canSave: false,
    pending: false,
  });
  const isIos = Platform.OS === "ios";
  const backgroundColor = colors?.backgroundColor ?? theme.colors.background;
  const primaryColor = colors?.primaryColor ?? theme.colors.primary;
  const textColor = colors?.textColor ?? theme.colors.text;
  const mutedColor = colors?.mutedColor ?? theme.colors.mutedText;
  const canSave =
    entry !== undefined &&
    entry !== null &&
    formState.canSave &&
    !formState.pending;

  return (
    <>
      <Stack.Screen
        options={{
          ...stackOptions,
          headerShown: true,
          headerTransparent: false,
          headerShadowVisible: true,
          headerTintColor: textColor,
          contentStyle: { backgroundColor },
          headerTitle: messages.form.editTitle,
          headerBackVisible: false,
          presentation: isIos ? "formSheet" : "modal",
          sheetAllowedDetents: "fitToContents",
        }}
      />

      <FeedbackBoard.Root {...colors}>
        <View
          style={{
            flex: 1,
            backgroundColor,
          }}
        >
          {entry === undefined ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <ActivityIndicator color={primaryColor} />
              <Text style={{ color: mutedColor }}>
                {messages.board.loading}
              </Text>
            </View>
          ) : entry === null ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: theme.spacing,
              }}
            >
              <Text style={{ color: mutedColor }}>
                {messages.form.editNotFound}
              </Text>
            </View>
          ) : (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={isIos ? "padding" : "height"}
            >
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={isIos ? "interactive" : "on-drag"}
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={{
                  flexGrow: 1,
                  gap: 18,
                  padding: 20,
                  paddingBottom: 32,
                }}
              >
                <EditEntryForm
                  ref={formRef}
                  entry={entry}
                  onRequestClose={onRequestClose}
                  onStateChange={setFormState}
                  autoFocus={false}
                  showSubmitButton={false}
                />
              </ScrollView>
            </KeyboardAvoidingView>
          )}
        </View>

        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon={isIos ? "xmark" : androidToolbarIcons.close}
            accessibilityLabel={messages.form.cancel}
            disabled={formState.pending}
            onPress={onRequestClose}
            tintColor={textColor}
          >
            {messages.form.cancel}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={isIos ? "checkmark" : androidToolbarIcons.save}
            variant="done"
            accessibilityLabel={messages.form.saveChanges}
            disabled={!canSave}
            onPress={() => formRef.current?.save()}
            tintColor={primaryColor}
          >
            {messages.form.saveChanges}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      </FeedbackBoard.Root>
    </>
  );
}
