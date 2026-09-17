import {
  CheckIcon,
  ChevronRightIcon,
  KeyRoundIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SunIcon,
  UserRoundIcon,
} from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  ADMIN_COLOR_PRESETS,
  type AdminColorPreset,
  type AdminSettingsScreenProps,
  type AdminThemeMode,
} from "../shared/index.js";

const themeOptions: {
  value: AdminThemeMode;
  label: string;
  description: string;
  Icon: typeof SunIcon;
}[] = [
  {
    value: "light",
    label: "Light",
    description: "Bright surfaces",
    Icon: SunIcon,
  },
  {
    value: "system",
    label: "System",
    description: "Follow device",
    Icon: MonitorIcon,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low light",
    Icon: MoonIcon,
  },
];

export function AdminSettingsScreen({
  account,
  themeMode: themeModeProp = "system",
  onThemeModeChange,
  accentColor: accentColorProp = ADMIN_COLOR_PRESETS[0].value,
  onAccentColorChange,
  colorPresets = ADMIN_COLOR_PRESETS,
  onManageAccount,
  onSignOut,
}: AdminSettingsScreenProps) {
  const customColorId = useId();
  const [themeMode, setThemeMode] = useState<AdminThemeMode>(themeModeProp);
  const [accentColor, setAccentColor] = useState(accentColorProp);
  const [customColor, setCustomColor] = useState(accentColorProp);

  useEffect(() => {
    setThemeMode(themeModeProp);
  }, [themeModeProp]);

  useEffect(() => {
    setAccentColor(accentColorProp);
    setCustomColor(accentColorProp);
  }, [accentColorProp]);

  const changeThemeMode = (nextMode: AdminThemeMode) => {
    setThemeMode(nextMode);
    onThemeModeChange?.(nextMode);
  };

  const changeAccentColor = (nextColor: string) => {
    setAccentColor(nextColor);
    setCustomColor(nextColor);
    onAccentColorChange?.(nextColor);
  };

  const accountName = account?.name ?? "Admin account";
  const accountEmail = account?.email ?? "Signed-in account";
  const accountInitials = getInitials(accountName, accountEmail);
  const selectedPresetId = colorPresets.find(
    (preset) => preset.value.toLowerCase() === accentColor.toLowerCase(),
  )?.id;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-4xl px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12">
        <header className="flex items-start justify-between gap-8 border-b pb-8">
          <div className="max-w-xl">
            <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Workspace preferences
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Settings
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
              Tune the way your feedback workspace looks, then manage the
              account that has access to it.
            </p>
          </div>
          <div className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:flex">
            <PaletteIcon className="size-6" strokeWidth={1.8} />
          </div>
        </header>

        <div className="divide-y">
          <section className="grid gap-8 py-9 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
            <SectionIntro
              eyebrow="Appearance"
              title="Make it yours"
              description="Small visual choices make a busy admin surface easier to scan."
            />
            <div className="space-y-9">
              <div>
                <SettingLabel
                  title="Theme"
                  description="Choose the surface that feels right for this workspace."
                />
                <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border bg-muted/20 p-1.5">
                  {themeOptions.map(({ value, label, description, Icon }) => {
                    const selected = themeMode === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={selected}
                        className={`group flex min-h-20 flex-col items-start justify-between rounded-xl px-3 py-3 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring/50 ${
                          selected
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                        }`}
                        onClick={() => changeThemeMode(value)}
                      >
                        <Icon
                          className={`size-4 ${selected ? "text-primary" : "text-muted-foreground"}`}
                          strokeWidth={1.8}
                        />
                        <span>
                          <span className="block text-sm font-medium">
                            {label}
                          </span>
                          <span className="mt-0.5 hidden text-[11px] text-muted-foreground sm:block">
                            {description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <SettingLabel
                  title="Accent color"
                  description="Use one clear color to keep active states easy to find."
                />
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {colorPresets.map((preset) => (
                    <ColorPresetButton
                      key={preset.id}
                      preset={preset}
                      selected={selectedPresetId === preset.id}
                      onSelect={() => changeAccentColor(preset.value)}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-col gap-3 rounded-2xl border bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <label
                      className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm"
                      htmlFor={customColorId}
                    >
                      <span
                        aria-hidden="true"
                        className="size-6 rounded-full ring-1 ring-black/10"
                        style={{
                          backgroundColor: isHexColor(customColor)
                            ? customColor
                            : accentColor,
                        }}
                      />
                      <input
                        id={customColorId}
                        type="color"
                        aria-label="Choose a custom accent color"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        value={
                          isHexColor(customColor) ? customColor : "#2563EB"
                        }
                        onChange={(event) =>
                          changeAccentColor(event.target.value)
                        }
                      />
                    </label>
                    <div>
                      <p className="text-sm font-medium">Custom color</p>
                      <p className="text-xs text-muted-foreground">
                        Pick any color or enter its hex value.
                      </p>
                    </div>
                  </div>
                  <input
                    aria-label="Custom accent color hex value"
                    className="h-9 w-full rounded-lg border bg-background px-3 font-mono text-xs uppercase outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20 sm:w-32"
                    maxLength={7}
                    onChange={(event) => {
                      const value = event.target.value.toUpperCase();
                      setCustomColor(value);
                      if (isHexColor(value)) changeAccentColor(value);
                    }}
                    placeholder="#2563EB"
                    value={customColor}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-8 py-9 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
            <SectionIntro
              eyebrow="Account"
              title="Access and security"
              description="Keep your profile current and control how you leave the workspace."
            />
            <div className="space-y-3">
              <div className="flex items-center gap-4 rounded-2xl border bg-muted/15 p-4">
                {account?.imageUrl ? (
                  <img
                    alt=""
                    className="size-11 rounded-full object-cover ring-4 ring-background"
                    src={account.imageUrl}
                  />
                ) : (
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-4 ring-background">
                    {accountInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {accountName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {accountEmail}
                  </p>
                </div>
                <div className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <ShieldCheckIcon className="size-3.5 text-primary" />
                  Admin access
                </div>
              </div>

              <ActionRow
                Icon={UserRoundIcon}
                title="Manage account"
                description="Profile details, sign-in methods, and security settings"
                onClick={onManageAccount}
              />
              <ActionRow
                Icon={KeyRoundIcon}
                title="Security"
                description="Manage passwords and multi-factor authentication"
                onClick={onManageAccount}
              />
              <ActionRow
                Icon={LogOutIcon}
                title="Sign out"
                description="End this admin session on the current device"
                destructive
                onClick={onSignOut}
              />
            </div>
          </section>
        </div>

        <footer className="flex items-center gap-2 pt-6 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          Changes are ready to apply across this admin app.
        </footer>
      </div>
    </main>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-base font-semibold tracking-[-0.02em]">
        {title}
      </h2>
      <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function SettingLabel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function ColorPresetButton({
  preset,
  selected,
  onSelect,
}: {
  preset: AdminColorPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${preset.label}: ${preset.description}`}
      aria-pressed={selected}
      className={`group relative flex min-h-20 flex-col items-start justify-between rounded-xl border px-3 py-3 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring/50 ${
        selected
          ? "border-primary/50 bg-primary/5 ring-2 ring-primary/15"
          : "bg-background hover:border-primary/30 hover:bg-muted/30"
      }`}
      onClick={onSelect}
    >
      <span
        aria-hidden="true"
        className="size-5 rounded-full ring-1 ring-black/10"
        style={{ backgroundColor: preset.value }}
      />
      <span>
        <span className="block text-xs font-medium">{preset.label}</span>
        <span className="mt-0.5 hidden text-[10px] text-muted-foreground sm:block">
          {preset.description}
        </span>
      </span>
      {selected && (
        <span className="absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <CheckIcon className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function ActionRow({
  Icon,
  title,
  description,
  destructive = false,
  onClick,
}: {
  Icon: typeof UserRoundIcon;
  title: string;
  description: string;
  destructive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      className={`group flex w-full items-center gap-3 rounded-2xl border bg-background p-4 text-left transition-all focus-visible:ring-3 focus-visible:ring-ring/50 ${
        destructive
          ? "hover:border-destructive/30 hover:bg-destructive/5"
          : "hover:border-primary/30 hover:bg-muted/20"
      }`}
      onClick={onClick}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
          destructive
            ? "bg-destructive/10 text-destructive"
            : "bg-muted text-muted-foreground group-hover:text-primary"
        }`}
      >
        <Icon className="size-4" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-sm font-medium ${destructive ? "text-destructive" : ""}`}
        >
          {title}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRightIcon
        className={`size-4 shrink-0 ${
          destructive ? "text-destructive/60" : "text-muted-foreground"
        }`}
        strokeWidth={1.8}
      />
    </button>
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
