import type { AdminColorPreset } from "./types.js";

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
] as const satisfies readonly AdminColorPreset[];

export type AdminColorPresetId = (typeof ADMIN_COLOR_PRESETS)[number]["id"];
