export type AdminThemeMode = "light" | "system" | "dark";

export interface AdminColorPreset {
  id: string;
  label: string;
  value: string;
  description: string;
}

export interface AdminAccountSummary {
  name?: string;
  email?: string;
  imageUrl?: string;
}

export interface AdminSettingsScreenProps {
  account?: AdminAccountSummary;
  themeMode?: AdminThemeMode;
  onThemeModeChange?: (mode: AdminThemeMode) => void;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
  colorPresets?: readonly AdminColorPreset[];
  onManageAccount?: () => void;
  onSignOut?: () => void;
}
