import { useEffect, useRef } from "react";

import type { SearchBarCommands } from "react-native-screens";
import { useFeedbackBody } from "../../shared/context/FeedbackBodyProvider.js";
import { type FeedbackScreenBodyProps } from "../../shared/types/index.js";

import { FeedbackScreenContent } from "../shared/ui/BodyContent.js";
import { FeedbackStack } from "./FeedbackStack.js";
import type { FeedbackScreenStackProps } from "./types.js";

export function ExpoFeedbackBody({
  useStack = true,
  StackOptions,
  ...props
}: FeedbackScreenBodyProps & FeedbackScreenStackProps) {
  const { query, isSearching, setIsSearching, setSelectedEntryId } =
    useFeedbackBody();
  const searchRef = useRef<SearchBarCommands>(null);

  const onEntryOpen = (entryId: string) => {
    setSelectedEntryId(entryId);
    if ((query || isSearching) && searchRef.current) {
      searchRef.current.blur();
    }
  };

  useEffect(() => {
    const searching = query.trim().length > 0;

    if (searching !== isSearching) {
      setIsSearching(searching);
    }
  }, [query, isSearching, setIsSearching]);

  if (!useStack)
    return <FeedbackScreenContent onEntryOpen={onEntryOpen} {...props} />;

  return (
    <FeedbackStack stackOptions={StackOptions} searchRef={searchRef}>
      <FeedbackScreenContent
        hideBackButton
        showHeader={false}
        onEntryOpen={onEntryOpen}
        {...props}
      />
    </FeedbackStack>
  );
}
