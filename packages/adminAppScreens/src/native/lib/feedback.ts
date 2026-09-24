import { createFeedbackHooks, type FeedbackHooks } from "convex-feedback/react";
import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";

export const feedbackHooks: FeedbackHooks<never> = createFeedbackHooks();

const AdminFeedbackHooksContext =
  createContext<FeedbackHooks<never>>(feedbackHooks);

export function AdminFeedbackHooksProvider({
  hooks,
  children,
}: {
  hooks: FeedbackHooks<never>;
  children: ReactNode;
}) {
  return createElement(
    AdminFeedbackHooksContext.Provider,
    { value: hooks },
    children,
  );
}

export function useAdminFeedbackHooks(): FeedbackHooks<never> {
  return useContext(AdminFeedbackHooksContext);
}
