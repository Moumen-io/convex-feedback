import { Stack, useRouter } from "expo-router";
import { Fragment } from "react";
import { useFeedbackBody } from "../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../shared/context/FeedbackProvider";
import {
  allowAuthenticatedAction,
  createEntryLabel,
  entryStatusChoices,
} from "../../shared/helpers";
import type { FeedbackStackProps } from "./types";

export function FeedbackStack({
  searchRef,
  stackOptions,
  androidToolbarIcons = {},
  BottomToolbarWrapper,
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
    statusFilter,
    setStatusFilter,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const router = useRouter();
  const ToolbarWrapper = BottomToolbarWrapper ?? Fragment;

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
          headerTintColor: theme.colors.text,
          contentStyle: { backgroundColor: theme.colors.background },
          ...stackOptions,
        }}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={
            process.env.EXPO_OS === "ios" ? "plus" : androidToolbarIcons.create
          }
          variant="prominent"
          accessibilityLabel={createEntryLabel(enabledKinds, messages)}
          disabled={isAuthenticated === undefined}
          onPress={() => {
            if (allowAuthenticatedAction(isAuthenticated, onUnauthenticated)) {
              setShowForm(true);
            }
          }}
          tintColor={theme.colors.primary}
        >
          {createEntryLabel(enabledKinds, messages)}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          hidden={!canGoBack}
          icon={
            process.env.EXPO_OS === "ios"
              ? "chevron.backward"
              : androidToolbarIcons.back
          }
          accessibilityLabel={messages.entry.back}
          onPress={handleBackPress}
          tintColor={theme.colors.text}
        >
          {messages.entry.back}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      {children}

      <Stack.SearchBar
        onChangeText={(q) => {
          if (selectedEntryId) setSelectedEntryId(null);
          setQuery(q.nativeEvent.text);
        }}
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
      <ToolbarWrapper>
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.SearchBarSlot />
          <Stack.Toolbar.Spacer />
          <Stack.Toolbar.Menu
            icon={
              process.env.EXPO_OS === "ios"
                ? "line.3.horizontal.decrease"
                : androidToolbarIcons.filter
            }
            title={messages.board.statusFilter}
            accessibilityLabel={messages.board.statusFilter}
            tintColor={theme.colors.text}
          >
            {entryStatusChoices(messages).map(({ value, label }) => (
              <Stack.Toolbar.MenuAction
                key={value}
                isOn={statusFilter === value}
                onPress={() => setStatusFilter(value)}
              >
                {label}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </ToolbarWrapper>
    </>
  );
}
