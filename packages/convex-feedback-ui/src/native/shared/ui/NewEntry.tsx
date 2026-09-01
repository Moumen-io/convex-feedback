import type { EntryKind } from "convex-feedback";
import { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import type { FeedbackScreenEntryModalProps } from "../../../shared/types";
import { collectEntryMetadata } from "../../../shared/metadata";
import { EntryDetail } from "./EntryDetail";
import { FeedbackForm } from "./primitives";

export function CreateEntryModal({
  onRequestClose,
  onCreated,
}: FeedbackScreenEntryModalProps & {
  onRequestClose: () => void;
}) {
  const { enabledKinds } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const isIos = Platform.OS === "ios";

  const [previewEntryId, setPreviewEntryId] = useState<string | null>(null);

  const [kind, setKind] = useState<EntryKind>(enabledKinds[0] ?? "feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const modalTile =
    enabledKinds.length === 1
      ? messages.newFeedback[enabledKinds.at(0)!]
      : messages.board.createEntry;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={"pageSheet"}
      allowSwipeDismissal={isIos}
      onRequestClose={onRequestClose}
      role="dialog"
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: isIos ? theme.colors.background : "transparent",
        }}
      >
        {isIos && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={messages.form.cancel}
            onPress={onRequestClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />
        )}

        <View
          style={{
            flex: 1,
            minHeight: 360,
            overflow: "hidden",
            borderTopLeftRadius: theme.radius * 2,
            borderTopRightRadius: theme.radius * 2,
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
              {modalTile}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={onRequestClose}
              hitSlop={8}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: "600",
                }}
              >
                {messages.form.cancel}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={isIos ? "interactive" : "on-drag"}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 32,
            }}
          >
            {previewEntryId !== null ? (
              <EntryDetail
                entryId={previewEntryId}
                onBack={() => setPreviewEntryId(null)}
              />
            ) : (
              <CreateEntryForm
                kind={kind}
                onKindChange={setKind}
                title={title}
                onTitleChange={setTitle}
                body={body}
                onBodyChange={setBody}
                onCreated={onCreated}
                onOpenSuggestion={setPreviewEntryId}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function CreateEntryForm({
  kind,
  onKindChange,
  title,
  onTitleChange,
  body,
  onBodyChange,
  onCreated,
  onOpenSuggestion,
}: FeedbackScreenEntryModalProps & {
  kind: EntryKind;
  onKindChange: (kind: EntryKind) => void;
  title: string;
  onTitleChange: (title: string) => void;
  body: string;
  onBodyChange: (body: string) => void;
  onOpenSuggestion: (id: string) => void;
}) {
  const { hooks, enabledKinds, collectMetadata, collectStandardMetadata } =
    useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const [submitting, setSubmitting] = useState(false);
  const create = hooks.useCreateEntry();
  const similar = hooks.useSimilarEntries({ title, body, kind, limit: 3 });

  const suggestions = useMemo(() => {
    if (similar === undefined) return [];
    return [...similar.exact, ...similar.similar];
  }, [similar]);

  const submit = async () => {
    if (submitting || title.trim().length === 0 || body.trim().length === 0) {
      return;
    }

    setSubmitting(true);

    try {
      const metadata = await collectEntryMetadata(
        collectMetadata,
        kind,
        collectStandardMetadata,
      );
      onCreated(
        await create({
          kind,
          title,
          body,
          ...(metadata === undefined ? {} : { metadata }),
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestSubmit = () => {
    if (
      submitting ||
      similar === undefined ||
      title.trim().length === 0 ||
      body.trim().length === 0
    ) {
      return;
    }

    if (suggestions.length === 0) {
      void submit();
      return;
    }

    Alert.alert(
      similar.exact.length > 0
        ? messages.form.exactDuplicate
        : messages.form.possibleDuplicates,
      messages.form.duplicateWarning,
      [
        {
          text: messages.form.cancel,
          style: "cancel",
        },
        {
          text: messages.form.submitAnyway,
          onPress: () => {
            void submit();
          },
        },
      ],
    );
  };

  return (
    <FeedbackForm.Root>
      {enabledKinds.length > 1 && (
        <>
          <Text style={{ color: theme.colors.text, fontWeight: "600" }}>
            {messages.form.kind}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {enabledKinds.map((value) => (
              <Pressable
                key={value}
                onPress={() => onKindChange(value)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 9,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor:
                    value === kind ? theme.colors.primary : theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color:
                      value === kind
                        ? theme.colors.primary
                        : theme.colors.mutedText,
                  }}
                >
                  {messages.kinds[value]}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <FeedbackForm.Input
        value={title}
        onChangeText={onTitleChange}
        placeholder={messages.form.titlePlaceholder}
      />
      <FeedbackForm.Textarea
        value={body}
        onChangeText={onBodyChange}
        placeholder={messages.form.bodyPlaceholder}
      />
      {suggestions.length > 0 ? (
        <View
          style={{
            gap: 8,
            padding: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <Text
            style={{
              color: theme.colors.text,
              fontWeight: "600",
            }}
          >
            {similar?.exact.length
              ? messages.form.exactDuplicate
              : messages.form.possibleDuplicates}
          </Text>

          {suggestions.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => onOpenSuggestion(entry.id)}
              style={{
                gap: 4,
                padding: 10,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: Math.max(8, theme.radius - 2),
                backgroundColor: theme.colors.surface,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text
                  style={{
                    flexShrink: 1,
                    color: theme.colors.mutedText,
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  {messages.kinds[entry.kind]}
                </Text>

                <Text
                  style={{
                    color: theme.colors.mutedText,
                    fontSize: 12,
                  }}
                >
                  {messages.statuses[entry.status]}
                </Text>
              </View>

              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.text,
                  fontWeight: "700",
                }}
              >
                {entry.title}
              </Text>

              <Text
                numberOfLines={2}
                style={{
                  color: theme.colors.mutedText,
                  lineHeight: 18,
                }}
              >
                {entry.body}
              </Text>

              <Text
                style={{
                  color: theme.colors.mutedText,
                  fontSize: 12,
                }}
              >
                ▲ {entry.upvoteCount} ·{" "}
                {messages.entry.comments(entry.commentCount)}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <FeedbackForm.Submit submitting={submitting} onPress={requestSubmit} />
    </FeedbackForm.Root>
  );
}
