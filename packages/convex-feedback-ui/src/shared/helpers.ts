import type { EntryKind, EntryStatusFilter } from "convex-feedback";
import type { FeedbackMessages } from "./types/messages.js";
import type { ChoiceChipOption } from "./types/choice.js";

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

export function entryStatusChoices(
  messages: FeedbackMessages,
): readonly ChoiceChipOption<EntryStatusFilter>[] {
  return [
    { value: "open", label: messages.statuses.open },
    { value: "closed", label: messages.statuses.closed },
  ];
}

/**
 * Returns whether an authenticated-only action may run and invokes the host
 * callback for an anonymous request. Unknown auth state remains blocked until
 * the auth query resolves.
 */
export function allowAuthenticatedAction(
  isAuthenticated: boolean | undefined,
  onUnauthenticated: (() => void) | undefined,
): boolean {
  if (isAuthenticated === false) {
    onUnauthenticated?.();
    return false;
  }
  return isAuthenticated === true;
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
