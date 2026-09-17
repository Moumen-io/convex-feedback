import type { ReactNode } from "react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "lucide-react";

export interface AdminAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Presentation shell for a provider's account-management component.
 *
 * The child is deliberately untyped beyond ReactNode so Clerk, WorkOS, or a
 * future provider can supply its own prebuilt account UI.
 */
export function AdminAccountModal({
  open,
  onOpenChange,
  children,
}: AdminAccountModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      role="dialog"
    >
      <div className="grid max-h-[min(48rem,calc(100svh-2rem))] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10">
        <div className="relative border-b bg-muted/30 px-6 py-5 pr-14">
          <h2 className="text-lg font-medium">Account settings</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your profile, security, and connected sign-in methods.
          </p>
          <button
            type="button"
            aria-label="Close account settings"
            className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => onOpenChange(false)}
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
