import { useState } from "react";
import { toast } from "sonner";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

/** Runs an admin action and adds a single retry action to its error toast. */
export function useAdminAction() {
  const [pending, setPending] = useState(false);

  const run = async (
    action: () => Promise<unknown>,
    successMessage: string,
    retryAction: () => Promise<unknown> = action,
  ): Promise<boolean> => {
    if (pending) return false;
    setPending(true);
    try {
      await action();
      toast.success(successMessage);
      return true;
    } catch (error) {
      toast.error(errorMessage(error), {
        action: {
          label: "Retry",
          onClick: () => {
            void run(retryAction, successMessage, retryAction);
          },
        },
      });
      return false;
    } finally {
      setPending(false);
    }
  };

  return { pending, run };
}
