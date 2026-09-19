import {
  ChevronDownIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  UserRoundIcon,
} from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar.js";
import { Button } from "./ui/button.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu.js";
import { Input } from "./ui/input.js";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group.js";
import {
  ADMIN_COLOR_PRESETS,
  createAdminTheme,
  DEFAULT_ADMIN_ACCENT_COLOR,
  type AdminColorPreset,
  type AdminSettingsScreenProps,
  type AdminThemeMode,
} from "../shared/index.js";
import { applyAdminTheme, useAdminThemeSettings } from "./theme.js";

const themeOptions: {
  value: AdminThemeMode;
  label: string;
  Icon: typeof SunIcon;
}[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
];

export function AdminSettingsScreen({
  account,
  themeMode: themeModeProp,
  onThemeModeChange,
  accentColor: accentColorProp,
  onAccentColorChange,
  colorPresets = ADMIN_COLOR_PRESETS,
  onManageAccount,
  onSignOut,
}: AdminSettingsScreenProps) {
  const themeSettings = useAdminThemeSettings();
  const selectedThemeMode =
    themeModeProp ?? themeSettings?.themeMode ?? "system";
  const selectedAccentColor =
    accentColorProp ?? themeSettings?.accentColor ?? DEFAULT_ADMIN_ACCENT_COLOR;
  const colorInputId = useId();
  const [themeMode, setThemeMode] = useState<AdminThemeMode>(selectedThemeMode);
  const [accentColor, setAccentColor] = useState(selectedAccentColor);

  useEffect(() => setThemeMode(selectedThemeMode), [selectedThemeMode]);
  useEffect(() => setAccentColor(selectedAccentColor), [selectedAccentColor]);

  const generatedTheme = useMemo(
    () =>
      themeSettings?.theme ??
      createAdminTheme(accentColor, getColorScheme(themeMode)),
    [accentColor, themeMode, themeSettings?.theme],
  );
  useEffect(() => applyAdminTheme(generatedTheme), [generatedTheme]);

  const changeThemeMode = (nextMode: AdminThemeMode) => {
    setThemeMode(nextMode);
    if (onThemeModeChange) onThemeModeChange(nextMode);
    else themeSettings?.setThemeMode(nextMode);
  };

  const changeAccentColor = (nextColor: string) => {
    setAccentColor(nextColor);
    if (onAccentColorChange) onAccentColorChange(nextColor);
    else themeSettings?.setAccentColor(nextColor);
  };

  const selectedPreset = colorPresets.find(
    (preset) => preset.value.toLowerCase() === accentColor.toLowerCase(),
  );
  const accountName = account?.name ?? "Admin account";
  const accountEmail = account?.email ?? "Signed-in account";

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-3xl px-6 py-8 sm:px-10 sm:py-10">
        <header className="border-b pb-6">
          <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em]">
            Settings
          </h1>
        </header>

        <section className="grid gap-6 border-b py-8 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-10">
          <h2 className="text-sm font-semibold">Appearance</h2>
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Theme</p>
              <ToggleGroup
                aria-label="Theme"
                className="grid w-full grid-cols-3"
                onValueChange={(values) => {
                  const value = values[0];
                  if (isThemeMode(value)) changeThemeMode(value);
                }}
                multiple={false}
                value={[themeMode]}
                variant="outline"
              >
                {themeOptions.map(({ value, label, Icon }) => (
                  <ToggleGroupItem
                    className="flex h-10 items-center gap-2"
                    key={value}
                    value={value}
                  >
                    <Icon aria-hidden="true" />
                    <span>{label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Accent color</p>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="w-full justify-between sm:w-64"
                      variant="outline"
                    />
                  }
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-4 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: accentColor }}
                    />
                    <span className="truncate">
                      {selectedPreset?.label ?? "Custom"}
                    </span>
                  </span>
                  <ChevronDownIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Predefined colors</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                      onValueChange={(value) => {
                        const preset = colorPresets.find(
                          (candidate) => candidate.id === value,
                        );
                        if (preset) changeAccentColor(preset.value);
                      }}
                      value={selectedPreset?.id ?? ""}
                    >
                      {colorPresets.map((preset) => (
                        <ColorPresetItem key={preset.id} preset={preset} />
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-3">
                <label
                  className="flex items-center gap-3"
                  htmlFor={colorInputId}
                >
                  <Input
                    aria-label="Choose a custom accent color"
                    className="size-10 cursor-pointer p-1"
                    id={colorInputId}
                    onChange={(event) => changeAccentColor(event.target.value)}
                    type="color"
                    value={
                      isHexColor(accentColor)
                        ? accentColor
                        : DEFAULT_ADMIN_ACCENT_COLOR
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    Custom color
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 py-8 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-10">
          <h2 className="text-sm font-semibold">Account</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-xl border bg-muted/15 p-3">
              <Avatar size="lg">
                {account?.imageUrl && (
                  <AvatarImage alt="" src={account.imageUrl} />
                )}
                <AvatarFallback>
                  {getInitials(accountName, accountEmail)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{accountName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {accountEmail}
                </p>
              </div>
            </div>

            <Button
              className="justify-start"
              onClick={onManageAccount}
              variant="outline"
            >
              <UserRoundIcon data-icon="inline-start" />
              Manage account
            </Button>
            <Button
              className="justify-start"
              onClick={onManageAccount}
              variant="outline"
            >
              Manage security
            </Button>
            <Button
              className="justify-start"
              onClick={onSignOut}
              variant="destructive"
            >
              <LogOutIcon data-icon="inline-start" />
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ColorPresetItem({ preset }: { preset: AdminColorPreset }) {
  return (
    <DropdownMenuRadioItem value={preset.id}>
      <span
        aria-hidden="true"
        className="size-4 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: preset.value }}
      />
      {preset.label}
    </DropdownMenuRadioItem>
  );
}

function getInitials(name: string, email: string): string {
  const source = name === "Admin account" ? email : name;
  const initials = source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "A";
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function getColorScheme(themeMode: AdminThemeMode): "light" | "dark" {
  if (themeMode === "dark") return "dark";
  if (themeMode === "light") return "light";
  return typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function isThemeMode(
  value: string | null | undefined,
): value is AdminThemeMode {
  return value === "light" || value === "system" || value === "dark";
}
