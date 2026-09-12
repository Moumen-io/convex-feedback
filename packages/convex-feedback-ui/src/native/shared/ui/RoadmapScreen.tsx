import type {
  FeedbackEntry as FeedbackEntryData,
  RoadmapItem,
} from "convex-feedback";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  FeedbackProvider,
  useFeedbackUi,
} from "../../../shared/context/FeedbackProvider.js";
import { allowAuthenticatedAction } from "../../../shared/helpers.js";
import type { RoadmapScreenProps } from "../../../shared/types/index.js";
import { useNativeAction } from "../helpers.js";
import { Button } from "./Button.js";
import { FeedbackBoard, FeedbackEntry } from "./primitives.js";

export function RoadmapScreen({
  hooks,
  messages,
  theme,
  unstyled,
  onEntryOpen,
  onUnauthenticated,
  pageSize,
  entryPageSize,
  ...colors
}: RoadmapScreenProps) {
  return (
    <FeedbackProvider messages={messages} theme={theme} unstyled={unstyled}>
      <RoadmapScreenInner
        hooks={hooks}
        onEntryOpen={onEntryOpen}
        onUnauthenticated={onUnauthenticated}
        pageSize={pageSize ?? hooks.pageSizes.roadmap}
        entryPageSize={entryPageSize ?? hooks.pageSizes.entries}
        {...colors}
      />
    </FeedbackProvider>
  );
}

function RoadmapScreenInner({
  hooks,
  onEntryOpen,
  onUnauthenticated,
  pageSize,
  entryPageSize,
  ...colors
}: RoadmapScreenProps & {
  pageSize: number;
  entryPageSize: number;
}) {
  const { messages, theme } = useFeedbackUi();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const roadmap = hooks.useRoadmap();
  const search = hooks.useSearchRoadmap(query);
  const searching = query.trim().length > 0;
  const items = searching ? (search ?? []) : roadmap.results;
  const selected = items.find((item) => item.id === selectedId) ?? null;

  if (selected !== null) {
    return (
      <FeedbackBoard.Root {...colors}>
        <ScrollView
          contentContainerStyle={{ gap: theme.spacing, padding: theme.spacing }}
        >
          <RoadmapDetail
            item={selected}
            hooks={hooks}
            entryPageSize={entryPageSize}
            onEntryOpen={onEntryOpen}
            onUnauthenticated={onUnauthenticated}
            onBack={() => setSelectedId(null)}
          />
        </ScrollView>
      </FeedbackBoard.Root>
    );
  }

  const loading = searching
    ? search === undefined
    : roadmap.status === "LoadingFirstPage";

  return (
    <FeedbackBoard.Root {...colors}>
      <FeedbackBoard.Header
        style={{ gap: theme.spacing, padding: theme.spacing }}
      >
        <FeedbackBoard.Title>Roadmap</FeedbackBoard.Title>
        <Text style={{ color: theme.colors.mutedText }}>
          See what is planned, in progress, and shipped.
        </Text>
        <FeedbackBoard.Search
          value={query}
          onValueChange={setQuery}
          placeholder="Search roadmap"
        />
      </FeedbackBoard.Header>
      {loading ? (
        <FeedbackBoard.State>
          <Text style={{ color: theme.colors.mutedText }}>
            {messages.board.loading}
          </Text>
        </FeedbackBoard.State>
      ) : items.length === 0 ? (
        <FeedbackBoard.State>
          <Text style={{ color: theme.colors.mutedText }}>
            {searching ? "No roadmap items found." : "No roadmap items yet."}
          </Text>
        </FeedbackBoard.State>
      ) : (
        <FeedbackBoard.List contentContainerStyle={{ padding: theme.spacing }}>
          {items.map((item) => (
            <RoadmapCard
              key={item.id}
              item={item}
              onOpen={() => setSelectedId(item.id)}
            />
          ))}
        </FeedbackBoard.List>
      )}
      {!searching &&
        (roadmap.status === "CanLoadMore" ||
          roadmap.status === "LoadingMore") && (
          <Button
            label={messages.board.loadMore}
            disabled={roadmap.status === "LoadingMore"}
            onPress={() => roadmap.loadMore(pageSize)}
          />
        )}
    </FeedbackBoard.Root>
  );
}

function RoadmapCard({
  item,
  onOpen,
}: {
  item: RoadmapItem;
  onOpen: () => void;
}) {
  const { theme } = useFeedbackUi();
  return (
    <Pressable onPress={onOpen} style={{ gap: 5, padding: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text
          style={{
            color: theme.colors.mutedText,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {item.status.replaceAll("_", " ")}
        </Text>
        <Text style={{ color: theme.colors.mutedText, fontSize: 12 }}>
          {item.feedbackCount} linked
        </Text>
      </View>
      <Text
        style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700" }}
      >
        {item.title}
      </Text>
      {item.description && (
        <Text style={{ color: theme.colors.mutedText, lineHeight: 20 }}>
          {item.description}
        </Text>
      )}
    </Pressable>
  );
}

function RoadmapDetail({
  item,
  hooks,
  entryPageSize,
  onEntryOpen,
  onUnauthenticated,
  onBack,
}: {
  item: RoadmapItem;
  hooks: RoadmapScreenProps["hooks"];
  entryPageSize: number;
  onEntryOpen: RoadmapScreenProps["onEntryOpen"];
  onUnauthenticated: RoadmapScreenProps["onUnauthenticated"];
  onBack: () => void;
}) {
  const { messages, theme } = useFeedbackUi();
  const feedback = hooks.useRoadmapFeedback(item.id);
  return (
    <View style={{ gap: theme.spacing }}>
      <Button label={messages.entry.back} onPress={onBack} />
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: theme.colors.mutedText,
            fontSize: 12,
            fontWeight: "600",
          }}
        >
          {item.status.replaceAll("_", " ")} · Position {item.position}
        </Text>
        <Text
          style={{ color: theme.colors.text, fontSize: 23, fontWeight: "700" }}
        >
          {item.title}
        </Text>
        <Text style={{ color: theme.colors.mutedText, lineHeight: 21 }}>
          {item.description ?? "No description."}
        </Text>
      </View>
      <View style={{ gap: 4 }}>
        <RoadmapField label="ID" value={item.id} />
        <RoadmapField
          label="Linked feedback"
          value={String(item.feedbackCount)}
        />
        <RoadmapField
          label="Created"
          value={new Date(item.createdAt).toLocaleString()}
        />
        <RoadmapField
          label="Updated"
          value={new Date(item.updatedAt).toLocaleString()}
        />
        <RoadmapField
          label="Document created"
          value={new Date(item.creationTime).toLocaleString()}
        />
      </View>
      <Text
        style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}
      >
        Attached feedback
      </Text>
      {feedback.status === "LoadingFirstPage" ? (
        <Text style={{ color: theme.colors.mutedText }}>
          {messages.board.loading}
        </Text>
      ) : feedback.results.length === 0 ? (
        <Text style={{ color: theme.colors.mutedText }}>
          No feedback attached.
        </Text>
      ) : (
        <View style={{ gap: 8 }}>
          {feedback.results.map((entry) => (
            <RoadmapEntry
              key={entry.id}
              entry={entry}
              hooks={hooks}
              onOpen={onEntryOpen}
              onUnauthenticated={onUnauthenticated}
            />
          ))}
        </View>
      )}
      {(feedback.status === "CanLoadMore" ||
        feedback.status === "LoadingMore") && (
        <Button
          label={messages.comments.loadMore}
          disabled={feedback.status === "LoadingMore"}
          onPress={() => feedback.loadMore(entryPageSize)}
        />
      )}
    </View>
  );
}

function RoadmapField({ label, value }: { label: string; value: string }) {
  const { theme } = useFeedbackUi();
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Text style={{ color: theme.colors.mutedText, fontWeight: "600" }}>
        {label}:
      </Text>
      <Text style={{ flex: 1, color: theme.colors.text }}>{value}</Text>
    </View>
  );
}

function RoadmapEntry({
  entry,
  hooks,
  onOpen,
  onUnauthenticated,
}: {
  entry: FeedbackEntryData;
  hooks: RoadmapScreenProps["hooks"];
  onOpen: RoadmapScreenProps["onEntryOpen"];
  onUnauthenticated: RoadmapScreenProps["onUnauthenticated"];
}) {
  const { isAuthenticated } = useFeedbackAuth(hooks);
  const setUpvote = hooks.useSetEntryUpvote();
  const action = useNativeAction();
  const toggle = (desiredState: boolean) => {
    if (
      !allowAuthenticatedAction(isAuthenticated, onUnauthenticated) ||
      action.pending
    ) {
      return;
    }
    void action.run(
      () => setUpvote({ entryId: entry.id, desiredState }),
      "Could not update vote",
    );
  };

  return (
    <FeedbackEntry.Root entry={entry}>
      <FeedbackEntry.Upvote
        disabled={isAuthenticated === undefined || action.pending}
        onToggle={toggle}
      />
      <FeedbackEntry.Content
        onTouchEnd={onOpen === undefined ? undefined : () => onOpen(entry.id)}
      >
        <View style={{ gap: 5 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <FeedbackEntry.Kind />
            <FeedbackEntry.Status />
          </View>
          <FeedbackEntry.Title />
          <FeedbackEntry.Body />
          <FeedbackEntry.CommentCount />
        </View>
      </FeedbackEntry.Content>
    </FeedbackEntry.Root>
  );
}

function useFeedbackAuth(hooks: RoadmapScreenProps["hooks"]) {
  return { isAuthenticated: hooks.useIsAuthenticated() };
}
