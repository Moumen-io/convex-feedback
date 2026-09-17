import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export interface AdminNavigationItem<TValue extends string = string> {
  value: TValue;
  label: string;
  icon: LucideIcon;
}

export interface AdminAppFrameProps<TValue extends string = string> {
  navigation: readonly AdminNavigationItem<TValue>[];
  activeView: TValue;
  onViewChange: (value: TValue) => void;
  accountSlot?: ReactNode;
  children: ReactNode;
}

/**
 * Provider-neutral desktop frame for admin screens.
 *
 * Navigation state and the authenticated account control stay in the host app;
 * this component only owns the reusable frame and its responsive treatment.
 */
export function AdminAppFrame<TValue extends string>({
  navigation,
  activeView,
  onViewChange,
  accountSlot,
  children,
}: AdminAppFrameProps<TValue>) {
  return (
    <main className="grid min-h-svh bg-background md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="flex items-center justify-between border-b bg-sidebar px-3 py-3 md:flex-col md:items-stretch md:border-r md:border-b-0 md:py-4">
        <div className="flex items-center gap-2 px-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            CF
          </span>
          <span className="text-sm font-semibold">Feedback admin</span>
        </div>
        <nav
          aria-label="Admin sections"
          className="mx-3 flex flex-1 gap-1 md:mx-0 md:mt-8 md:flex-col"
        >
          {navigation.map(({ value, label, icon: Icon }) => {
            const selected = activeView === value;
            return (
              <button
                key={value}
                type="button"
                aria-current={selected ? "page" : undefined}
                className={`group flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent px-2.5 text-sm font-medium whitespace-nowrap outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:justify-start ${
                  selected
                    ? "bg-secondary text-secondary-foreground"
                    : "text-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => onViewChange(value)}
              >
                <Icon
                  aria-hidden="true"
                  className="size-4 shrink-0"
                  strokeWidth={1.8}
                />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </nav>
        {accountSlot && (
          <div className="hidden items-center justify-between gap-2 px-2 md:flex">
            <span className="text-xs text-muted-foreground">Admin</span>
            {accountSlot}
          </div>
        )}
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col md:h-svh">{children}</div>
    </main>
  );
}
