import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { EntryStatusFilter } from "convex-feedback";
import { debounce } from "../helpers";
import type {
  FeedbackScreenBodyContextValue,
  FeedbackScreenProviderProps,
} from "../types";

const FeedbackBodyContext =
  createContext<FeedbackScreenBodyContextValue | null>(null);

export function FeedbackBodyProvider({
  hooks,
  entrySort,
  commentSort,
  enabledKinds,
  maxCommentDepth,
  debounceDuration,
  collectMetadata,
  emptyState,
  loading,
  collectStandardMetadata,
  transformComments,
  renderActor,
  onUnauthenticated,
  children,
}: PropsWithChildren<FeedbackScreenProviderProps>) {
  const isAuthenticated = hooks.useIsAuthenticated();
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<EntryStatusFilter>("open");

  const updateDebouncedQuery = useMemo(
    () => debounce(setDebouncedQuery, debounceDuration),
    [debounceDuration],
  );

  useEffect(() => {
    updateDebouncedQuery(query);

    return updateDebouncedQuery.cancel;
  }, [query, updateDebouncedQuery]);

  useEffect(() => {
    setIsSearching(query.trim().length > 0);
  }, [query, setIsSearching]);

  const value = {
    query,
    debouncedQuery,
    showForm,
    isSearching,
    selectedEntryId,
    statusFilter,

    setQuery,
    setDebouncedQuery,
    setShowForm,
    setIsSearching,
    setSelectedEntryId,
    setStatusFilter,

    hooks,
    entrySort,
    commentSort,
    enabledKinds,
    maxCommentDepth,
    debounceDuration,
    collectMetadata,
    emptyState,
    loading,
    collectStandardMetadata,
    transformComments,
    renderActor,
    onUnauthenticated,
    isAuthenticated,
  } satisfies FeedbackScreenBodyContextValue;

  return (
    <FeedbackBodyContext.Provider value={value}>
      {children}
    </FeedbackBodyContext.Provider>
  );
}

export function useFeedbackBody(): FeedbackScreenBodyContextValue {
  const context = useContext(FeedbackBodyContext);

  if (!context) {
    throw new Error("useFeedbackBody must be used inside FeedbackBodyProvider");
  }

  return context;
}
