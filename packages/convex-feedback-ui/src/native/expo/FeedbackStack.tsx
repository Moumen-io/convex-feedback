import { Stack, useRouter } from "expo-router";
import { useFeedbackBody } from "../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../shared/context/FeedbackProvider";
import type { FeedbackStackProps } from "./types";

export function FeedbackStack({
  searchRef,
  stackOptions,
  children,
}: FeedbackStackProps) {
  const {
    query,
    enabledKinds,
    selectedEntryId,
    setQuery,
    setShowForm,
    setIsSearching,
    setSelectedEntryId,
  } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const router = useRouter();

  const canGoBack = !!selectedEntryId || router.canGoBack();

  const handleBackPress = () => {
    if (selectedEntryId === null) {
      router.back();
      return;
    }

    if (searchRef.current && query) searchRef.current.focus();

    setSelectedEntryId(null);
    return true;
  };

  const pageTitle =
    enabledKinds.length === 1
      ? messages.kindsPlural[enabledKinds.at(0)!]
      : messages.board.title;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: pageTitle,
          headerShown: true,
          headerTransparent: true,
          headerShadowVisible: true,
          headerBackVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
          ...stackOptions,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          variant="prominent"
          accessibilityLabel={messages.board.createEntry}
          onPress={() => setShowForm(true)}
          tintColor={theme.colors.primary}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          hidden={!canGoBack}
          icon="chevron.backward"
          onPress={handleBackPress}
        />
      </Stack.Toolbar>

      {children}

      <Stack.SearchBar
        onChangeText={(q) => {
          if (selectedEntryId) setSelectedEntryId(null);
          setQuery(q.nativeEvent.text);
        }}
        onOpen={() => console.log("opened")}
        onClose={() => console.log("closed")}
        onSearchButtonPress={() => console.log("search button pressed")}
        onCancelButtonPress={() => console.log("cancel button pressed")}
        onFocus={() => {
          if (selectedEntryId) setSelectedEntryId(null);
          setIsSearching(true);
        }}
        onBlur={() => setIsSearching(false)}
        obscureBackground={false}
        allowToolbarIntegration
        hideNavigationBar={false}
        ref={searchRef}
        textColor={theme.colors.text}
      />
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.SearchBarSlot />
      </Stack.Toolbar>
    </>
  );
}
