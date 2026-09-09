import type { EntryKind } from "convex-feedback";
import type { FeedbackMessages } from "./types/messages.js";

export const kinds: readonly EntryKind[] = [
  "feedback",
  "feature_request",
  "bug_report",
];

export function createEntryLabel(
  enabledKinds: readonly EntryKind[],
  messages: FeedbackMessages,
): string {
  return enabledKinds.length === 1
    ? messages.newFeedback[enabledKinds[0]!]
    : messages.board.createEntry;
}

export function debounce<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: TArgs) => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      callback(...args);
    }, delay);
  };

  debounced.cancel = () => {
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  return debounced;
}
