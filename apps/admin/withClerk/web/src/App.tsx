import {
  ClerkProvider,
  SignIn,
  UserButton,
  UserProfile,
  useAuth,
  useClerk,
  useUser,
} from "@clerk/react";
import type { RoadmapItem } from "convex-feedback";
import {
  AdminAppFrame,
  AdminAccountModal,
  AdminThemeProvider,
  AdminSettingsScreen,
  Button,
  InboxView,
  RoadmapView,
  Skeleton,
  Toaster,
} from "convex-feedback-admin-app-screens/web";
import {
  ConvexReactClient,
  useConvexAuth,
  useQuery_experimental,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { anyApi } from "convex/server";
import { InboxIcon, MapIcon, Settings2Icon, ShieldXIcon } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

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
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AdminThemeProvider>
        <ClerkProvider publishableKey={publishableKey}>
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <AuthGate />
          </ConvexProviderWithClerk>
        </ClerkProvider>
        <Toaster position="bottom-right" />
      </AdminThemeProvider>
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
  const { isAuthenticated } = useConvexAuth();
  const [retryCount, setRetryCount] = useState(0);
  const retry = useCallback(() => {
    setRetryCount((value) => value + 1);
  }, []);

  if (!isAuthenticated) return <LoadingScreen />;
  return <AdminAccessCheck key={retryCount} onRetry={retry} />;
}

function AdminAccessCheck({ onRetry }: { onRetry: () => void }) {
  const accessCheck = useQuery_experimental({
    query: anyApi.feedback.isAdmin,
    args: {},
  });
  const errorMessage =
    accessCheck.status === "error" ? accessCheck.error.message : undefined;

  useEffect(() => {
    if (errorMessage === undefined) return;
    toast.error(errorMessage, {
      action: { label: "Retry", onClick: onRetry },
    });
  }, [errorMessage, onRetry]);

  if (accessCheck.status === "pending") return <LoadingScreen />;
  if (accessCheck.status === "error") {
    return (
      <main className="grid min-h-svh place-items-center p-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <span className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldXIcon className="size-5" />
          </span>
          <h1 className="text-lg font-semibold">Unable to verify access</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Button onClick={onRetry}>Retry</Button>
        </div>
      </main>
    );
  }
  if (!accessCheck.data) {
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
  const [view, setView] = useState<"inbox" | "roadmap" | "settings">("inbox");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string | null>(
    null,
  );
  const [selectedRoadmapItem, setSelectedRoadmapItem] =
    useState<RoadmapItem | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const themeMode =
    theme === "light" || theme === "dark" || theme === "system"
      ? theme
      : "system";
  const nav = [
    { value: "inbox" as const, label: "Inbox", icon: InboxIcon },
    { value: "roadmap" as const, label: "Roadmap", icon: MapIcon },
    { value: "settings" as const, label: "Settings", icon: Settings2Icon },
  ];

  const openEntry = (entryId: string) => {
    setView("inbox");
    setSelectedEntryId(entryId);
    setSelectedRoadmapId(null);
    setSelectedRoadmapItem(null);
  };

  const openRoadmap = (roadmapId: string, roadmapItem?: RoadmapItem) => {
    setView("roadmap");
    setSelectedRoadmapId(roadmapId);
    setSelectedRoadmapItem(roadmapItem ?? null);
    setSelectedEntryId(null);
  };

  const changeView = (nextView: "inbox" | "roadmap" | "settings") => {
    setView(nextView);
    setSelectedEntryId(null);
    setSelectedRoadmapId(null);
    setSelectedRoadmapItem(null);
  };

  const account = user
    ? {
        name: user.fullName ?? user.username ?? undefined,
        email: user.primaryEmailAddress?.emailAddress,
        imageUrl: user.imageUrl,
      }
    : undefined;

  return (
    <>
      <AdminAppFrame
        accountSlot={<UserButton />}
        activeView={view}
        navigation={nav}
        onViewChange={changeView}
      >
        {view === "inbox" && (
          <InboxView
            entryId={selectedEntryId}
            onEntryIdChange={setSelectedEntryId}
            onOpenRoadmap={openRoadmap}
          />
        )}
        {view === "roadmap" && (
          <RoadmapView
            selectedId={selectedRoadmapId}
            selectedItem={selectedRoadmapItem}
            onSelectedIdChange={setSelectedRoadmapId}
            onOpenEntry={openEntry}
          />
        )}
        {view === "settings" && (
          <AdminSettingsScreen
            account={account}
            onManageAccount={() => setAccountOpen(true)}
            onSignOut={() => void signOut()}
            onThemeModeChange={setTheme}
            themeMode={themeMode}
          />
        )}
      </AdminAppFrame>
      <AdminAccountModal onOpenChange={setAccountOpen} open={accountOpen}>
        <UserProfile routing="hash" />
      </AdminAccountModal>
    </>
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
