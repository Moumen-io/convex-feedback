import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  children,
}: PropsWithChildren<FeedbackScreenProviderProps>) {
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const updateDebouncedQuery = useMemo(
    () => debounce(setDebouncedQuery, debounceDuration),
    [],
  );

  useEffect(() => {
    updateDebouncedQuery(query);

    return updateDebouncedQuery.cancel;
  }, [query, updateDebouncedQuery]);

  const value = {
    query,
    debouncedQuery,
    showForm,
    isSearching,
    selectedEntryId,

    setQuery,
    setDebouncedQuery,
    setShowForm,
    setIsSearching,
    setSelectedEntryId,

    hooks,
    entrySort,
    commentSort,
    enabledKinds,
    maxCommentDepth,
    debounceDuration,
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
    throw new Error(
      "useOnboardingFlow must be used inside OnboardingFlowProvider",
    );
  }

  return context;
}
