import type { FeedbackEntry } from "convex-feedback";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider.js";
import { allowAuthenticatedAction } from "../../../shared/helpers.js";
import { useNativeAction } from "../helpers.js";
import { Button } from "./Button.js";
import { FeedbackForm } from "./primitives.js";

export interface EditEntryFormRef {
  save: () => void;
}

export interface EditEntryFormState {
  canSave: boolean;
  pending: boolean;
}

interface EditEntryFormProps {
  entry: FeedbackEntry;
  onRequestClose: () => void;
  onStateChange?: (state: EditEntryFormState) => void;
  autoFocus?: boolean;
  showSubmitButton?: boolean;
}

export const EditEntryForm = forwardRef<EditEntryFormRef, EditEntryFormProps>(
  function EditEntryForm(
    {
      entry,
      onRequestClose,
      onStateChange,
      autoFocus = true,
      showSubmitButton = true,
    },
    ref,
  ) {
    const { hooks, isAuthenticated, onUnauthenticated } = useFeedbackBody();
    const { messages, theme } = useFeedbackUi();
    const updateEntry = hooks.useUpdateEntry();
    const action = useNativeAction({
      cancel: messages.form.cancel,
      retry: messages.form.retry,
    });
    const [title, setTitle] = useState(entry.title);
    const [body, setBody] = useState(entry.body);
    const canSave = title.trim().length > 0 && body.trim().length > 0;

    useEffect(() => {
      setTitle(entry.title);
      setBody(entry.body);
    }, [entry.body, entry.id, entry.title]);

    const save = useCallback(() => {
      if (
        action.pending ||
        !canSave ||
        !allowAuthenticatedAction(isAuthenticated, onUnauthenticated)
      ) {
        return;
      }

      void action.run(async () => {
        await updateEntry({
          entryId: entry.id,
          title: title.trim(),
          body: body.trim(),
        });
        onRequestClose();
      }, messages.form.editError);
    }, [
      action,
      body,
      canSave,
      entry.id,
      isAuthenticated,
      messages.form.editError,
      onRequestClose,
      onUnauthenticated,
      title,
      updateEntry,
    ]);

    useImperativeHandle(ref, () => ({ save }), [save]);

    useEffect(() => {
      onStateChange?.({ canSave, pending: action.pending });
    }, [action.pending, canSave, onStateChange]);

    return (
      <>
        <Text
          style={{
            color: theme.colors.mutedText,
            fontSize: 14,
            lineHeight: 21,
          }}
        >
          {messages.form.editDescription}
        </Text>

        <FeedbackForm.Root>
          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {messages.form.kind}
            </Text>
            <Text style={{ color: theme.colors.mutedText }}>
              {messages.kinds[entry.kind]}
            </Text>
          </View>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {messages.form.title}
            </Text>
            <FeedbackForm.Input
              autoFocus={autoFocus}
              value={title}
              onChangeText={setTitle}
              placeholder={messages.form.titlePlaceholder}
              editable={!action.pending}
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 13,
                fontWeight: "600",
              }}
            >
              {messages.form.body}
            </Text>
            <FeedbackForm.Textarea
              value={body}
              onChangeText={setBody}
              placeholder={messages.form.bodyPlaceholder}
              editable={!action.pending}
            />
          </View>

          {showSubmitButton ? (
            <View style={{ gap: 8 }}>
              <Button
                label={messages.form.saveChanges}
                variant="primary"
                disabled={action.pending || !canSave}
                onPress={save}
              />
              {action.pending && (
                <Text
                  style={{
                    color: theme.colors.mutedText,
                    fontSize: 12,
                    textAlign: "center",
                  }}
                >
                  {messages.board.loading}
                </Text>
              )}
            </View>
          ) : action.pending ? (
            <Text
              style={{
                color: theme.colors.mutedText,
                fontSize: 12,
                textAlign: "center",
              }}
            >
              {messages.board.loading}
            </Text>
          ) : null}
        </FeedbackForm.Root>
      </>
    );
  },
);

EditEntryForm.displayName = "EditEntryForm";

export function EditEntryModal({
  entry,
  onRequestClose,
}: {
  entry: FeedbackEntry;
  onRequestClose: () => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const [pending, setPending] = useState(false);
  const isIos = Platform.OS === "ios";
  const handleStateChange = useCallback(
    (state: EditEntryFormState) => setPending(state.pending),
    [],
  );

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={isIos}
      onRequestClose={() => {
        if (!pending) onRequestClose();
      }}
      role="dialog"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 20,
            paddingVertical: 18,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            {messages.form.editTitle}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.form.cancel}
            disabled={pending}
            onPress={onRequestClose}
            hitSlop={8}
            style={{ opacity: pending ? 0.5 : 1 }}
          >
            <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
              {messages.form.cancel}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={isIos ? "interactive" : "on-drag"}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            flexGrow: 1,
            gap: 18,
            padding: 20,
            paddingBottom: 32,
          }}
        >
          <EditEntryForm
            entry={entry}
            onRequestClose={onRequestClose}
            onStateChange={handleStateChange}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}
