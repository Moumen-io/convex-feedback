import type { FeedbackTag } from "convex-feedback";
import { createContext, useContext, type ReactNode } from "react";

import { feedbackHooks } from "@/lib/feedback";

const TagsContext = createContext<FeedbackTag[] | undefined>(undefined);

export function TagsProvider({ children }: { children: ReactNode }) {
  const tags = feedbackHooks.useTags();
  return <TagsContext.Provider value={tags}>{children}</TagsContext.Provider>;
}

export function useTags(): FeedbackTag[] | undefined {
  return useContext(TagsContext);
}
