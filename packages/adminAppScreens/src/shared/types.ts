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

export interface AdminProjectSummary {
  id: string;
  name: string;
  convexUrl: string;
  apiNamespace: string;
  authProvider: string;
}

export interface AdminProjectsSettingsProps {
  projects?: readonly AdminProjectSummary[];
  activeProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onAddProject?: () => void;
  onEditProject?: (projectId: string) => void;
  onRemoveProject?: (projectId: string) => void;
}

export interface AdminSettingsScreenProps extends AdminProjectsSettingsProps {
  account?: AdminAccountSummary;
  themeMode?: AdminThemeMode;
  onThemeModeChange?: (mode: AdminThemeMode) => void;
  accentColor?: string;
  onAccentColorChange?: (color: string) => void;
  colorPresets?: readonly AdminColorPreset[];
  onManageAccount?: () => void;
  onSignOut?: () => void;
}
