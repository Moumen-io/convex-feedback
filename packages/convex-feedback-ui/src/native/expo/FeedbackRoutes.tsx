import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import type { SearchBarCommands } from "react-native-screens";
import type { EntryKind } from "convex-feedback";

import { useFeedbackBody } from "../../shared/context/FeedbackBodyProvider.js";
import { useFeedbackUi } from "../../shared/context/FeedbackProvider.js";
import { EntryDetail } from "../shared/ui/EntryDetail.js";
import { FeedbackScreenList } from "../shared/ui/FeedbackScreenList.js";
import { CreateEntryForm } from "../shared/ui/NewEntry.js";
import { FeedbackBoard } from "../shared/ui/primitives.js";
import { feedbackRouteHref } from "./routes.js";
import { useRoutedFeedbackModal } from "./RoutedFeedbackModalContext.js";
import { useRoutedFeedback } from "./RoutedFeedbackContext.js";

export function FeedbackBoardScreen() {
  const { query, isSearching, setQuery, setIsSearching } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const { routes, colors, androidToolbarIcons } = useRoutedFeedback();
  const router = useRouter();
  const searchRef = useRef<SearchBarCommands>(null);

  useEffect(() => {
    const searching = query.trim().length > 0;
    if (searching !== isSearching) setIsSearching(searching);
  }, [query, isSearching, setIsSearching]);

  const openEntry = (entryId: string) => {
    if ((query || isSearching) && searchRef.current) {
      searchRef.current.blur();
    }
    router.push(feedbackRouteHref(routes.entry, { entryId }), {
      relativeToDirectory: true,
    });
  };

  return (
    <>
      <FeedbackBoard.Root {...colors}>
        <FeedbackScreenList
          showSelectedEntry={false}
          hideBackButton
          onEntryOpen={openEntry}
        />
      </FeedbackBoard.Root>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={
            process.env.EXPO_OS === "ios" ? "plus" : androidToolbarIcons.create
          }
          variant="prominent"
          accessibilityLabel={messages.board.createEntry}
          onPress={() =>
            router.push(feedbackRouteHref(routes.create), {
              relativeToDirectory: true,
            })
          }
          tintColor={theme.colors.primary}
        >
          {messages.board.createEntry}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          hidden={!router.canGoBack()}
          icon={
            process.env.EXPO_OS === "ios"
              ? "chevron.backward"
              : androidToolbarIcons.back
          }
          accessibilityLabel={messages.entry.back}
          onPress={() => router.back()}
        >
          {messages.entry.back}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.SearchBar
        ref={searchRef}
        placeholder={messages.board.searchPlaceholder}
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onFocus={() => setIsSearching(true)}
        onBlur={() => setIsSearching(query.trim().length > 0)}
        obscureBackground={false}
        allowToolbarIntegration
        hideNavigationBar={false}
        textColor={theme.colors.text}
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}

export function FeedbackEntryScreen() {
  const params = useLocalSearchParams<{
    entryId?: string | string[];
  }>();
  const entryId = Array.isArray(params.entryId)
    ? params.entryId[0]
    : params.entryId;

  if (!entryId) {
    throw new Error(
      'FeedbackEntryScreen requires an "entryId" dynamic route parameter.',
    );
  }

  return <FeedbackEntryRouteContent entryId={entryId} />;
}

function FeedbackEntryRouteContent({ entryId }: { entryId: string }) {
  const { hooks } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const { colors, androidToolbarIcons } = useRoutedFeedback();
  const modal = useRoutedFeedbackModal();
  const router = useRouter();
  const entry = hooks.useEntry(entryId);

  return (
    <>
      {entry && <Stack.Screen options={{ headerTitle: entry.title }} />}
      <FeedbackBoard.Root {...colors}>
        <FeedbackBoard.List style={{ padding: theme.spacing }}>
          <EntryDetail
            entryId={entryId}
            hideBackButton
            onBack={() => router.back()}
          />
        </FeedbackBoard.List>
      </FeedbackBoard.Root>
      {modal && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon={
              process.env.EXPO_OS === "ios"
                ? "xmark"
                : androidToolbarIcons.close
            }
            accessibilityLabel={messages.form.cancel}
            onPress={modal.dismiss}
          >
            {messages.form.cancel}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
    </>
  );
}

export function CreateFeedbackScreen() {
  const { enabledKinds } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const { routes, colors, androidToolbarIcons } = useRoutedFeedback();
  const modal = useRoutedFeedbackModal();
  const router = useRouter();
  const [kind, setKind] = useState<EntryKind>(enabledKinds[0] ?? "feedback");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const entryHref = (entryId: string) =>
    feedbackRouteHref(routes.entry, { entryId });

  return (
    <>
      <FeedbackBoard.Root {...colors}>
        <FeedbackBoard.List
          style={{
            padding: theme.spacing,
            paddingBottom: theme.spacing * 2,
          }}
        >
          <CreateEntryForm
            kind={kind}
            onKindChange={setKind}
            title={title}
            onTitleChange={setTitle}
            body={body}
            onBodyChange={setBody}
            onOpenSuggestion={(entryId) =>
              router.push(entryHref(entryId), { relativeToDirectory: true })
            }
            onCreated={(entryId) => {
              router.dismissTo(entryHref(entryId));
            }}
          />
        </FeedbackBoard.List>
      </FeedbackBoard.Root>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon={
            process.env.EXPO_OS === "ios" ? "xmark" : androidToolbarIcons.close
          }
          accessibilityLabel={messages.form.cancel}
          onPress={() => (modal ? modal.dismiss() : router.dismiss())}
        >
          {messages.form.cancel}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
