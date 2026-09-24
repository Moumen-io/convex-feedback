import { Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import { createEntryLabel, entryStatusChoices } from "../../../shared/helpers";
import { allowAuthenticatedAction } from "../../../shared/helpers";
import { ChoiceChips, FeedbackBoard } from "./primitives";

export function FeedbackScreenHeader() {
  const {
    query,
    setShowForm,
    setQuery,
    setIsSearching,
    enabledKinds,
    statusFilter,
    setStatusFilter,
    isAuthenticated,
    onUnauthenticated,
  } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();
  const { top } = useSafeAreaInsets();

  const pageTitle =
    enabledKinds.length === 1
      ? messages.kindsPlural[enabledKinds.at(0)!]
      : messages.board.title;

  return (
    <FeedbackBoard.Header style={{ padding: theme.spacing, paddingTop: top }}>
      <FeedbackBoard.Title>{pageTitle}</FeedbackBoard.Title>
      <Text style={{ color: theme.colors.mutedText }}>
        {messages.board.subtitle}
      </Text>
      <ChoiceChips
        accessibilityLabel={messages.board.statusFilter}
        options={entryStatusChoices(messages)}
        value={statusFilter}
        onValueChange={setStatusFilter}
      />
      <Pressable
        disabled={isAuthenticated === undefined}
        onPress={() => {
          if (allowAuthenticatedAction(isAuthenticated, onUnauthenticated)) {
            setShowForm(true);
          }
        }}
        style={{
          alignSelf: "flex-start",
          paddingVertical: 9,
          paddingHorizontal: 12,
          borderRadius: 9,
          backgroundColor: theme.colors.primary,
        }}
      >
        <Text
          style={{ color: theme.colors.primaryForeground, fontWeight: "700" }}
        >
          {createEntryLabel(enabledKinds, messages)}
        </Text>
      </Pressable>
      <FeedbackBoard.Search
        value={query}
        onValueChange={(q) => {
          setQuery(q);
          setIsSearching(q.trim().length > 0);
        }}
      />
    </FeedbackBoard.Header>
  );
}
