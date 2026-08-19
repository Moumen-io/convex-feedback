import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { useEffect, useRef, type ReactNode } from "react";
import { FeedbackScreen } from "convex-feedback-ui";
import "convex-feedback-ui/styles.css";

import { feedbackHooks } from "./feedback";

function AnonymousSession({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || started.current) return;
    started.current = true;
    void signIn("anonymous").catch(() => {
      started.current = false;
    });
  }, [isAuthenticated, isLoading, signIn]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="demo-loading">Preparing anonymous demo session…</div>
    );
  }

  return children;
}

export default function App() {
  return (
    <AnonymousSession>
      <main className="demo-shell">
        <header className="demo-heading">
          <p>convex-feedback</p>
          <h1>React demo</h1>
          <span>
            Entries, upvotes, full-text search, lazy replies, and comment likes.
          </span>
        </header>
        <FeedbackScreen
          hooks={feedbackHooks}
          primaryColor="#5b5bd6"
          messages={{ board: { title: "Product feedback" } }}
        />
      </main>
    </AnonymousSession>
  );
}
