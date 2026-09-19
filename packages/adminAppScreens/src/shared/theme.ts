import type { AdminColorPreset, AdminThemeMode } from "./types.js";

export const ADMIN_COLOR_PRESETS = [
  {
    id: "cobalt",
    label: "Cobalt",
    value: "#2563EB",
    description: "Focused and familiar",
  },
  {
    id: "iris",
    label: "Iris",
    value: "#7357E8",
    description: "Calm and expressive",
  },
  {
    id: "moss",
    label: "Moss",
    value: "#2F8F6B",
    description: "Grounded and steady",
  },
  {
    id: "coral",
    label: "Coral",
    value: "#E76F51",
    description: "Warm and direct",
  },
  {
    id: "amber",
    label: "Amber",
    value: "#D58A2A",
    description: "Bright and optimistic",
  },
  {
    id: "slate",
    label: "Slate",
    value: "#64748B",
    description: "Quiet and neutral",
  },
  {
    id: "black",
    label: "Black",
    value: "#000000",
    description: "Minimal and stark",
  },
] as const satisfies readonly AdminColorPreset[];

export type AdminColorPresetId = (typeof ADMIN_COLOR_PRESETS)[number]["id"];

export const DEFAULT_ADMIN_ACCENT_COLOR = ADMIN_COLOR_PRESETS[0].value;

export type AdminThemeScheme = Exclude<AdminThemeMode, "system">;

export interface AdminTheme {
  primary: string;
  primaryForeground: string;
  background: string;
  surface: string;
  input: string;
  surfaceMuted: string;
  mutedSurface: string;
  text: string;
  mutedText: string;
  muted: string;
  primarySoft: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface AdminThemeOptions {
  baseColor?: string;
  colorScheme?: AdminThemeScheme;
  mode?: AdminThemeScheme;
}

/**
 * Creates the admin palette from one base color.
 *
 * The reference palettes below are the original admin colors. Accent-related
 * colors retain their original lightness and relative hue offsets while their
 * hue and saturation are adapted to the supplied base. This keeps the default
 * blue theme visually stable while allowing any valid hex color to drive the
 * rest of the palette.
 */
export function createAdminTheme(
  baseColor?: string,
  colorScheme?: AdminThemeScheme,
): AdminTheme;
export function createAdminTheme(options?: AdminThemeOptions): AdminTheme;
export function createAdminTheme(
  baseColorOrOptions: string | AdminThemeOptions = DEFAULT_ADMIN_ACCENT_COLOR,
  colorScheme: AdminThemeScheme = "light",
): AdminTheme {
  const options =
    typeof baseColorOrOptions === "string"
      ? { baseColor: baseColorOrOptions, colorScheme }
      : baseColorOrOptions;
  const baseColor =
    normalizeAdminColor(options.baseColor) ?? DEFAULT_ADMIN_ACCENT_COLOR;
  const scheme = options.colorScheme ?? options.mode ?? "light";
  const baseHsl = rgbToHsl(hexToRgb(baseColor));
  const references = scheme === "dark" ? DARK_REFERENCES : LIGHT_REFERENCES;
  const background = adaptReferenceColor(
    references.background,
    baseColor,
    baseHsl,
  );

  const primary =
    scheme === "dark"
      ? adaptReferenceColor(references.primary, baseColor, baseHsl)
      : baseColor;
  const primaryForeground = ensureReadableForeground(
    primary,
    adaptReferenceColor(references.primaryForeground, baseColor, baseHsl),
    adaptReferenceColor(
      scheme === "dark" ? "#EEF3FF" : "#09142C",
      baseColor,
      baseHsl,
    ),
  );
  const secondary = adaptReferenceColor(
    references.secondary,
    baseColor,
    baseHsl,
  );
  const accent = adaptReferenceColor(references.accent, baseColor, baseHsl);
  const secondaryForeground = ensureReadableForeground(
    secondary,
    adaptReferenceColor(references.secondaryForeground, baseColor, baseHsl),
    adaptReferenceColor(
      scheme === "dark" ? "#09142C" : "#141A2E",
      baseColor,
      baseHsl,
    ),
  );
  const accentForeground = ensureReadableForeground(
    accent,
    adaptReferenceColor(references.accentForeground, baseColor, baseHsl),
    adaptReferenceColor(
      scheme === "dark" ? "#09142C" : "#141A2E",
      baseColor,
      baseHsl,
    ),
  );
  const text = adaptReferenceColor(references.text, baseColor, baseHsl);
  const mutedText = ensureTextContrast(
    adaptReferenceColor(references.mutedText, baseColor, baseHsl),
    background,
    scheme,
  );
  const border = adaptReferenceColor(references.border, baseColor, baseHsl);
  const surfaceMuted = adaptReferenceColor(
    references.surfaceMuted,
    baseColor,
    baseHsl,
  );
  const mutedSurface = adaptReferenceColor(
    references.mutedSurface,
    baseColor,
    baseHsl,
  );
  const ring = adaptReferenceColor(references.ring, baseColor, baseHsl);
  const sidebar = adaptReferenceColor(references.sidebar, baseColor, baseHsl);

  return {
    primary,
    primaryForeground,
    background,
    surface: adaptReferenceColor(references.surface, baseColor, baseHsl),
    input: adaptReferenceColor(references.input, baseColor, baseHsl),
    surfaceMuted,
    mutedSurface,
    text,
    mutedText,
    muted: mutedText,
    primarySoft: surfaceMuted,
    border,
    danger: references.danger,
    success: references.success,
    warning: references.warning,
    secondary,
    secondaryForeground,
    accent,
    accentForeground,
    ring,
    sidebar,
    sidebarForeground: text,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: primaryForeground,
    sidebarAccent: accent,
    sidebarAccentForeground: accentForeground,
    sidebarBorder: border,
    sidebarRing: ring,
  };
}

export function normalizeAdminColor(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const match = value.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1];
  if (!hex) return null;
  if (hex.length === 3) {
    return `#${hex
      .split("")
      .map((channel) => `${channel}${channel}`)
      .join("")}`.toUpperCase();
  }
  return `#${hex}`.toUpperCase();
}

interface Rgb {
  red: number;
  green: number;
  blue: number;
}

interface Hsl {
  hue: number;
  saturation: number;
  lightness: number;
}

interface ThemeReferences {
  primary: string;
  primaryForeground: string;
  background: string;
  surface: string;
  input: string;
  surfaceMuted: string;
  mutedSurface: string;
  text: string;
  mutedText: string;
  border: string;
  danger: string;
  success: string;
  warning: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
  sidebar: string;
}

const LIGHT_REFERENCES: ThemeReferences = {
  primary: "#2563EB",
  primaryForeground: "#FFFFFF",
  background: "#F7F9FF",
  surface: "#FFFFFF",
  input: "#F1F5FF",
  surfaceMuted: "#EEF0FF",
  mutedSurface: "#EEF2FF",
  text: "#141A2E",
  mutedText: "#65708A",
  border: "#D8E0F2",
  danger: "#C83B59",
  success: "#1D9B72",
  warning: "#F5A623",
  secondary: "#EAF0FF",
  secondaryForeground: "#1A2A58",
  accent: "#F0ECFF",
  accentForeground: "#5A3BC7",
  ring: "#78A1FF",
  sidebar: "#F1F5FF",
};

const DARK_REFERENCES: ThemeReferences = {
  primary: "#79A1FF",
  primaryForeground: "#09142C",
  background: "#0B1224",
  surface: "#111B34",
  input: "#182544",
  surfaceMuted: "#23284B",
  mutedSurface: "#1A2646",
  text: "#EEF3FF",
  mutedText: "#A3B1CF",
  border: "#2D3C61",
  danger: "#FF8EAB",
  success: "#71D5B0",
  warning: "#FFB869",
  secondary: "#1A2A4D",
  secondaryForeground: "#E9F0FF",
  accent: "#2B234F",
  accentForeground: "#C9BDFF",
  ring: "#79A1FF",
  sidebar: "#0E1830",
};

const REFERENCE_BASE_COLOR = LIGHT_REFERENCES.primary;
const REFERENCE_BASE_HSL = rgbToHsl(hexToRgb(REFERENCE_BASE_COLOR));

export const lightAdminTheme = createAdminTheme(
  DEFAULT_ADMIN_ACCENT_COLOR,
  "light",
);

export const darkAdminTheme = createAdminTheme(
  DEFAULT_ADMIN_ACCENT_COLOR,
  "dark",
);

function adaptReferenceColor(
  referenceColor: string,
  baseColor: string,
  baseHsl: Hsl,
): string {
  const normalizedReference = normalizeAdminColor(referenceColor);
  if (!normalizedReference) return DEFAULT_ADMIN_ACCENT_COLOR;
  if (baseColor === REFERENCE_BASE_COLOR) return normalizedReference;

  const referenceHsl = rgbToHsl(hexToRgb(normalizedReference));
  if (referenceHsl.saturation === 0) return normalizedReference;

  const saturationRatio =
    baseHsl.saturation / Math.max(REFERENCE_BASE_HSL.saturation, 1);
  const hue =
    baseHsl.saturation === 0
      ? referenceHsl.hue
      : baseHsl.hue + (referenceHsl.hue - REFERENCE_BASE_HSL.hue);

  return hslToHex({
    hue,
    saturation: clamp(referenceHsl.saturation * saturationRatio, 0, 100),
    lightness: referenceHsl.lightness,
  });
}

function chooseForeground(
  background: string,
  darkForeground: string,
  lightForeground: string,
): string {
  const darkContrast = contrastRatio(background, darkForeground);
  const lightContrast = contrastRatio(background, lightForeground);
  return darkContrast >= lightContrast ? darkForeground : lightForeground;
}

function ensureReadableForeground(
  background: string,
  preferredForeground: string,
  fallbackForeground: string,
): string {
  if (contrastRatio(background, preferredForeground) >= 4.5) {
    return preferredForeground;
  }
  const bestCandidate = chooseForeground(
    background,
    preferredForeground,
    fallbackForeground,
  );
  if (contrastRatio(background, bestCandidate) >= 4.5) return bestCandidate;

  return chooseForeground(background, "#000000", "#FFFFFF");
}

function ensureTextContrast(
  foreground: string,
  background: string,
  scheme: AdminThemeScheme,
): string {
  if (contrastRatio(background, foreground) >= 4.5) return foreground;

  const referenceHsl = rgbToHsl(hexToRgb(foreground));
  const direction = scheme === "light" ? -1 : 1;
  for (let step = 1; step <= 100; step += 1) {
    const candidate = hslToHex({
      ...referenceHsl,
      lightness: clamp(referenceHsl.lightness + direction * step, 0, 100),
    });
    if (contrastRatio(background, candidate) >= 4.5) return candidate;
  }

  return scheme === "light" ? "#000000" : "#FFFFFF";
}

function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(hexToRgb(first));
  const secondLuminance = relativeLuminance(hexToRgb(second));
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance({ red, green, blue }: Rgb): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * linearize(red) +
    0.7152 * linearize(green) +
    0.0722 * linearize(blue)
  );
}

function hexToRgb(hex: string): Rgb {
  return {
    red: Number.parseInt(hex.slice(1, 3), 16),
    green: Number.parseInt(hex.slice(3, 5), 16),
    blue: Number.parseInt(hex.slice(5, 7), 16),
  };
}

function rgbToHsl({ red, green, blue }: Rgb): Hsl {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness: lightness * 100 };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  switch (max) {
    case r:
      hue = (g - b) / delta + (g < b ? 6 : 0);
      break;
    case g:
      hue = (b - r) / delta + 2;
      break;
    default:
      hue = (r - g) / delta + 4;
  }

  return {
    hue: hue * 60,
    saturation: saturation * 100,
    lightness: lightness * 100,
  };
}

function hslToHex({ hue, saturation, lightness }: Hsl): string {
  const s = clamp(saturation, 0, 100) / 100;
  const l = clamp(lightness, 0, 100) / 100;
  const normalizedHue = ((hue % 360) + 360) % 360;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePart = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((huePart % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePart < 1) {
    red = chroma;
    green = x;
  } else if (huePart < 2) {
    red = x;
    green = chroma;
  } else if (huePart < 3) {
    green = chroma;
    blue = x;
  } else if (huePart < 4) {
    green = x;
    blue = chroma;
  } else if (huePart < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return rgbToHex({
    red: Math.round((red + match) * 255),
    green: Math.round((green + match) * 255),
    blue: Math.round((blue + match) * 255),
  });
}

function rgbToHex({ red, green, blue }: Rgb): string {
  return `#${[red, green, blue]
    .map((channel) =>
      clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"),
    )
    .join("")}`.toUpperCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
