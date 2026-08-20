import { Pressable, Text } from "react-native";
import { useFeedbackBody } from "../../../shared/context/FeedbackBodyProvider";
import { useFeedbackUi } from "../../../shared/context/FeedbackProvider";
import { FeedbackBoard } from "./primitives";

export function FeedbackScreenHeader() {
  const { query, setShowForm, setQuery, enabledKinds } = useFeedbackBody();
  const { messages, theme } = useFeedbackUi();

  const pageTitle =
    enabledKinds.length === 1
      ? messages.kindsPlural[enabledKinds.at(0)!]
      : messages.board.title;

  return (
    <>
      <FeedbackBoard.Header>
        <FeedbackBoard.Title>{pageTitle}</FeedbackBoard.Title>
        <Text style={{ color: theme.colors.mutedText }}>
          {messages.board.subtitle}
        </Text>
        <Pressable
          onPress={() => setShowForm(true)}
          style={{
            alignSelf: "flex-start",
            paddingVertical: 9,
            paddingHorizontal: 12,
            borderRadius: 9,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: theme.colors.text, fontWeight: "700" }}>
            {messages.board.createEntry}
          </Text>
        </Pressable>
      </FeedbackBoard.Header>
      <FeedbackBoard.Search value={query} onValueChange={(q) => setQuery(q)} />
    </>
  );
}
