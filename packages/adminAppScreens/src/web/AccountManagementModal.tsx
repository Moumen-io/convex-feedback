import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.js";

export interface AdminAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * Presentation shell for a provider's account-management component.
 *
 * Clerk, WorkOS, or another provider can supply the prebuilt account UI as
 * the child without the shared package importing that provider.
 */
export function AdminAccountModal({
  open,
  onOpenChange,
  children,
}: AdminAccountModalProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="grid max-h-[min(48rem,calc(100svh-2rem))] max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0"
        showCloseButton
      >
        <DialogHeader className="border-b bg-muted/30 px-6 py-5 pr-14">
          <DialogTitle>Account settings</DialogTitle>
          <DialogDescription>
            Manage your profile and security.
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
