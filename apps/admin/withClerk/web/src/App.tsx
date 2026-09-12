import { ClerkProvider, SignIn, UserButton, useAuth } from "@clerk/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { anyApi } from "convex/server";
import { InboxIcon, MapIcon, ShieldXIcon } from "lucide-react";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

import { InboxView } from "@/components/inbox";
import { RoadmapView } from "@/components/roadmap-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!publishableKey || !convexUrl) {
  throw new Error(
    "Set VITE_CLERK_PUBLISHABLE_KEY and VITE_CONVEX_URL in .env.local",
  );
}

const convex = new ConvexReactClient(convexUrl);

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <ClerkProvider publishableKey={publishableKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <AuthGate />
        </ConvexProviderWithClerk>
      </ClerkProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
}

function AuthGate() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <SignIn routing="hash" />
      </main>
    );
  }
  return <AdminGate />;
}

function AdminGate() {
  const [allowed, setAllowed] = useState<boolean | undefined>();
  useEffect(() => {
    let active = true;
    void convex
      .query(anyApi.feedback.isAdmin, {})
      .then((result) => {
        if (active) setAllowed(result as boolean);
      })
      .catch(() => {
        if (active) setAllowed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (allowed === undefined) return <LoadingScreen />;
  if (!allowed) {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldXIcon className="size-5" />
          </span>
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            Your account is authenticated, but the host actor resolver did not
            grant admin access.
          </p>
          <UserButton />
        </div>
      </main>
    );
  }
  return <AdminShell />;
}

function AdminShell() {
  const [view, setView] = useState<"inbox" | "roadmap">("inbox");
  const nav = [
    { value: "inbox" as const, label: "Inbox", icon: InboxIcon },
    { value: "roadmap" as const, label: "Roadmap", icon: MapIcon },
  ];
  return (
    <main className="grid min-h-svh bg-background md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="flex items-center justify-between border-b bg-sidebar px-3 py-3 md:flex-col md:items-stretch md:border-r md:border-b-0 md:py-4">
        <div className="flex items-center gap-2 px-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
            CF
          </span>
          <span className="text-sm font-semibold">Feedback admin</span>
        </div>
        <nav className="mx-3 flex flex-1 gap-1 md:mx-0 md:mt-8 md:flex-col">
          {nav.map(({ value, label, icon: Icon }) => (
            <Button
              key={value}
              variant={view === value ? "secondary" : "ghost"}
              className="justify-start"
              onClick={() => setView(value)}
            >
              <Icon data-icon="inline-start" />{" "}
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </nav>
        <div className="hidden items-center justify-between gap-2 px-2 md:flex">
          <span className="text-xs text-muted-foreground">Admin</span>
          <UserButton />
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col md:h-svh">
        {view === "inbox" && <InboxView />}
        {view === "roadmap" && <RoadmapView />}
      </div>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="grid min-h-svh place-items-center">
      <div className="flex w-56 flex-col gap-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    </main>
  );
}
