import { useState } from "react";

export interface FeedbackActionFailure {
  message: string;
  retry: () => void;
}

function messageForError(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Runs a UI mutation and exposes a single retryable failure state. */
export function useFeedbackAction() {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<FeedbackActionFailure | null>(null);

  const run = async <T,>(
    action: () => Promise<T>,
    retryAction: () => Promise<unknown> = action,
  ): Promise<T | undefined> => {
    if (pending) return undefined;
    setPending(true);
    setFailure(null);
    try {
      return await action();
    } catch (error) {
      setFailure({
        message: messageForError(error),
        retry: () => {
          void run(retryAction, retryAction);
        },
      });
      return undefined;
    } finally {
      setPending(false);
    }
  };

  return { pending, failure, run };
}

export function FeedbackActionError({
  failure,
}: {
  failure: FeedbackActionFailure | null;
}) {
  if (failure === null) return null;
  return (
    <div className="cf-action-error" role="alert">
      <span>{failure.message}</span>
      <button type="button" className="cf-button" onClick={failure.retry}>
        Retry
      </button>
    </div>
  );
}
