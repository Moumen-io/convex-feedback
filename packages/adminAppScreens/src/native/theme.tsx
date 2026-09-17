import {
  createAdminTheme,
  DEFAULT_ADMIN_ACCENT_COLOR,
  darkAdminTheme,
  lightAdminTheme,
  normalizeAdminColor,
  type AdminTheme as SharedAdminTheme,
  type AdminThemeMode,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

export type AdminTheme = Pick<
  SharedAdminTheme,
  | "primary"
  | "primaryForeground"
  | "background"
  | "surface"
  | "input"
  | "surfaceMuted"
  | "text"
  | "mutedText"
  | "muted"
  | "primarySoft"
  | "border"
  | "danger"
  | "success"
  | "warning"
>;
export type AdminScreenTheme = AdminTheme;

export interface AdminThemeProviderProps {
  children: ReactNode;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
  themeMode?: AdminThemeMode;
  onThemeModeChange?: (mode: AdminThemeMode) => void;
}

export const ADMIN_THEME_ACCENT_COLOR_STORAGE_KEY =
  "convex-feedback-admin.accent-color";
export const ADMIN_THEME_MODE_STORAGE_KEY = "convex-feedback-admin.theme-mode";

export interface AdminThemeSettings {
  theme: SharedAdminTheme;
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
  themeMode: themeModeProp,
  onThemeModeChange,
}: AdminThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [internalAccentColor, setInternalAccentColor] = useState(
    () => normalizeAdminColor(accentColorProp) ?? DEFAULT_ADMIN_ACCENT_COLOR,
  );
  const [internalThemeMode, setInternalThemeMode] = useState<
    AdminThemeSettings["themeMode"]
  >(themeModeProp ?? "system");
  const [isHydrated, setIsHydrated] = useState(false);
  const accentColorChangedBeforeHydration = useRef(false);
  const themeModeChangedBeforeHydration = useRef(false);

  useEffect(() => {
    let mounted = true;

    void Promise.all([
      AsyncStorage.getItem(ADMIN_THEME_ACCENT_COLOR_STORAGE_KEY),
      AsyncStorage.getItem(ADMIN_THEME_MODE_STORAGE_KEY),
    ])
      .then(([storedAccentColor, storedThemeMode]) => {
        if (!mounted) return;

        if (
          accentColorProp === undefined &&
          !accentColorChangedBeforeHydration.current
        ) {
          const normalizedAccentColor = normalizeAdminColor(storedAccentColor);
          if (normalizedAccentColor) {
            setInternalAccentColor(normalizedAccentColor);
          }
        }

        if (
          themeModeProp === undefined &&
          !themeModeChangedBeforeHydration.current &&
          isAdminThemeMode(storedThemeMode)
        ) {
          setInternalThemeMode(storedThemeMode);
        }

        setIsHydrated(true);
      })
      .catch(() => {
        if (mounted) setIsHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (accentColorProp === undefined) return;
    setInternalAccentColor(
      normalizeAdminColor(accentColorProp) ?? DEFAULT_ADMIN_ACCENT_COLOR,
    );
  }, [accentColorProp]);
  useEffect(() => {
    if (themeModeProp !== undefined) setInternalThemeMode(themeModeProp);
  }, [themeModeProp]);

  const accentColor =
    accentColorProp === undefined
      ? internalAccentColor
      : (normalizeAdminColor(accentColorProp) ?? DEFAULT_ADMIN_ACCENT_COLOR);
  const themeMode = themeModeProp ?? internalThemeMode;
  const colorScheme = resolveColorScheme(themeMode, systemColorScheme);
  const theme = useMemo(
    () => createAdminTheme(accentColor, colorScheme),
    [accentColor, colorScheme],
  );

  useEffect(() => {
    if (!isHydrated || accentColorProp !== undefined) return;
    void AsyncStorage.setItem(
      ADMIN_THEME_ACCENT_COLOR_STORAGE_KEY,
      accentColor,
    ).catch(() => undefined);
  }, [accentColor, accentColorProp, isHydrated]);

  useEffect(() => {
    if (!isHydrated || themeModeProp !== undefined) return;
    void AsyncStorage.setItem(ADMIN_THEME_MODE_STORAGE_KEY, themeMode).catch(
      () => undefined,
    );
  }, [isHydrated, themeMode, themeModeProp]);

  const setAccentColor = useCallback(
    (nextColor: string) => {
      const normalizedColor =
        normalizeAdminColor(nextColor) ?? DEFAULT_ADMIN_ACCENT_COLOR;
      if (accentColorProp === undefined) {
        accentColorChangedBeforeHydration.current = true;
        setInternalAccentColor(normalizedColor);
      }
      onAccentColorChange?.(normalizedColor);
    },
    [accentColorProp, onAccentColorChange],
  );
  const setThemeMode = useCallback(
    (nextMode: AdminThemeSettings["themeMode"]) => {
      if (themeModeProp === undefined) {
        themeModeChangedBeforeHydration.current = true;
        setInternalThemeMode(nextMode);
      }
      onThemeModeChange?.(nextMode);
    },
    [onThemeModeChange, themeModeProp],
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
  const systemColorScheme = useColorScheme();
  const fallbackScheme = resolveColorScheme("system", systemColorScheme);
  const fallbackTheme = useMemo(
    () => createAdminTheme(DEFAULT_ADMIN_ACCENT_COLOR, fallbackScheme),
    [fallbackScheme],
  );
  return providedSettings?.theme ?? fallbackTheme;
}

export function useAdminScreenTheme(): AdminScreenTheme {
  return useAdminTheme();
}

export {
  createAdminTheme,
  darkAdminTheme,
  lightAdminTheme,
  normalizeAdminColor,
};

function resolveColorScheme(
  themeMode: AdminThemeSettings["themeMode"],
  systemColorScheme: string | null | undefined,
): "light" | "dark" {
  if (themeMode === "dark") return "dark";
  if (themeMode === "light") return "light";
  return systemColorScheme === "dark" ? "dark" : "light";
}

function isAdminThemeMode(value: string | null): value is AdminThemeMode {
  return value === "light" || value === "system" || value === "dark";
}
