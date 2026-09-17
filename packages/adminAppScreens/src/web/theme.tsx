import {
  createAdminTheme,
  DEFAULT_ADMIN_ACCENT_COLOR,
  normalizeAdminColor,
  type AdminTheme,
  type AdminThemeMode,
  type AdminThemeScheme,
} from "../shared/index.js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTheme } from "next-themes";

export interface AdminThemeProviderProps {
  children: ReactNode;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
}

export const ADMIN_THEME_ACCENT_COLOR_COOKIE =
  "convex-feedback-admin.accent-color";
export const ADMIN_THEME_MODE_COOKIE = "convex-feedback-admin.theme-mode";

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface AdminThemeSettings {
  theme: AdminTheme;
  accentColor: string;
  themeMode: AdminThemeMode;
  setAccentColor: (color: string) => void;
  setThemeMode: (mode: AdminThemeMode) => void;
}

const AdminThemeContext = createContext<AdminThemeSettings | null>(null);

export function AdminThemeProvider({
  children,
  accentColor: accentColorProp,
  onAccentColorChange,
}: AdminThemeProviderProps) {
  const { resolvedTheme, setTheme, theme: themeModeProp } = useTheme();
  const [internalAccentColor, setInternalAccentColor] = useState(
    () =>
      normalizeAdminColor(accentColorProp) ??
      normalizeAdminColor(readCookie(ADMIN_THEME_ACCENT_COLOR_COOKIE)) ??
      DEFAULT_ADMIN_ACCENT_COLOR,
  );
  const [persistedThemeMode, setPersistedThemeMode] =
    useState<AdminThemeMode | null>(() => readThemeModeCookie());
  const hasInitializedThemePersistence = useRef(false);
  const pendingThemeMode = useRef<AdminThemeMode | null>(null);
  const accentColor =
    accentColorProp === undefined
      ? internalAccentColor
      : (normalizeAdminColor(accentColorProp) ?? DEFAULT_ADMIN_ACCENT_COLOR);
  const currentThemeMode = normalizeThemeMode(themeModeProp);
  const themeMode = persistedThemeMode ?? currentThemeMode;
  const colorScheme: AdminThemeScheme =
    themeMode === "dark"
      ? "dark"
      : themeMode === "light"
        ? "light"
        : resolvedTheme === "dark"
          ? "dark"
          : "light";
  const theme = useMemo(
    () => createAdminTheme(accentColor, colorScheme),
    [accentColor, colorScheme],
  );

  useEffect(() => {
    if (accentColorProp === undefined) return;
    setInternalAccentColor(
      normalizeAdminColor(accentColorProp) ?? DEFAULT_ADMIN_ACCENT_COLOR,
    );
  }, [accentColorProp]);
  useEffect(() => {
    if (typeof document !== "undefined") applyAdminTheme(theme, colorScheme);
  }, [colorScheme, theme]);

  useEffect(() => {
    if (!hasInitializedThemePersistence.current) {
      hasInitializedThemePersistence.current = true;

      if (persistedThemeMode !== null) {
        if (persistedThemeMode !== currentThemeMode) {
          setTheme(persistedThemeMode);
          return;
        }
      } else {
        setPersistedThemeMode(currentThemeMode);
      }
    }

    if (pendingThemeMode.current !== null) {
      if (currentThemeMode !== pendingThemeMode.current) return;
      pendingThemeMode.current = null;
    }

    if (persistedThemeMode !== currentThemeMode) {
      setPersistedThemeMode(currentThemeMode);
    }
    writeCookie(ADMIN_THEME_MODE_COOKIE, currentThemeMode);
  }, [currentThemeMode, persistedThemeMode, setTheme]);

  useEffect(() => {
    if (accentColorProp !== undefined) return;
    writeCookie(ADMIN_THEME_ACCENT_COLOR_COOKIE, accentColor);
  }, [accentColor, accentColorProp]);

  const setAccentColor = useCallback(
    (nextColor: string) => {
      const normalizedColor =
        normalizeAdminColor(nextColor) ?? DEFAULT_ADMIN_ACCENT_COLOR;
      if (accentColorProp === undefined)
        setInternalAccentColor(normalizedColor);
      writeCookie(ADMIN_THEME_ACCENT_COLOR_COOKIE, normalizedColor);
      onAccentColorChange?.(normalizedColor);
    },
    [accentColorProp, onAccentColorChange],
  );
  const setThemeMode = useCallback(
    (nextMode: AdminThemeMode) => {
      pendingThemeMode.current = nextMode;
      setPersistedThemeMode(nextMode);
      writeCookie(ADMIN_THEME_MODE_COOKIE, nextMode);
      setTheme(nextMode);
    },
    [setTheme],
  );

  const settings = useMemo<AdminThemeSettings>(
    () => ({
      theme,
      accentColor,
      themeMode,
      setAccentColor,
      setThemeMode,
    }),
    [accentColor, setAccentColor, setThemeMode, theme, themeMode],
  );

  return (
    <AdminThemeContext.Provider value={settings}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminThemeSettings(): AdminThemeSettings | null {
  return useContext(AdminThemeContext);
}

export function useAdminTheme(): AdminTheme {
  const providedSettings = useAdminThemeSettings();
  const { resolvedTheme } = useTheme();
  const colorScheme: AdminThemeScheme =
    resolvedTheme === "dark" ? "dark" : "light";
  const fallbackTheme = useMemo(
    () => createAdminTheme(DEFAULT_ADMIN_ACCENT_COLOR, colorScheme),
    [colorScheme],
  );
  return providedSettings?.theme ?? fallbackTheme;
}

/** Applies a generated theme to the CSS variables consumed by the web UI. */
export function applyAdminTheme(
  theme: AdminTheme,
  colorScheme?: AdminThemeScheme,
): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const variables: Record<string, string> = {
    "--background": theme.background,
    "--foreground": theme.text,
    "--card": theme.surface,
    "--card-foreground": theme.text,
    "--popover": theme.surface,
    "--popover-foreground": theme.text,
    "--primary": theme.primary,
    "--primary-foreground": theme.primaryForeground,
    "--secondary": theme.secondary,
    "--secondary-foreground": theme.secondaryForeground,
    "--muted": theme.mutedSurface,
    "--muted-foreground": theme.mutedText,
    "--accent": theme.accent,
    "--accent-foreground": theme.accentForeground,
    "--destructive": theme.danger,
    "--border": theme.border,
    "--input": theme.border,
    "--ring": theme.ring,
    "--sidebar": theme.sidebar,
    "--sidebar-foreground": theme.sidebarForeground,
    "--sidebar-primary": theme.sidebarPrimary,
    "--sidebar-primary-foreground": theme.sidebarPrimaryForeground,
    "--sidebar-accent": theme.sidebarAccent,
    "--sidebar-accent-foreground": theme.sidebarAccentForeground,
    "--sidebar-border": theme.sidebarBorder,
    "--sidebar-ring": theme.sidebarRing,
  };

  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
  root.style.setProperty(
    "color-scheme",
    colorScheme ?? (root.classList.contains("dark") ? "dark" : "light"),
  );
}

function normalizeThemeMode(value: string | undefined): AdminThemeMode {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

function readThemeModeCookie(): AdminThemeMode | null {
  const value = readCookie(ADMIN_THEME_MODE_COOKIE);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
}
