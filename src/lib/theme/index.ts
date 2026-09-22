import "@/lib/zodSetup";
import { z } from "zod";
import { HEX_RE, shiftHue } from "./color";
import { tk } from "../i18n/messages";

// ─────────────────────────────────────────────────────────────
//  Persönliches Design eines Kontos.
//
//  Gespeichert als JSON am Benutzer (User.theme). Beim Lesen läuft alles
//  durch `resolveTheme`, das fehlende oder kaputte Felder mit Vorgaben
//  auffüllt – ältere gespeicherte Designs bleiben so nach jedem Update
//  gültig, auch wenn neue Felder dazukommen.
// ─────────────────────────────────────────────────────────────

const hex = z.string().regex(HEX_RE, tk("theme", "errors.invalidColor"));

// Anzeigenamen (Palette, Farbschemata, Hintergründe, Verläufe) stehen im
// Übersetzungs-Namensraum „theme“ – nachgeschlagen über die jeweilige ID.

export const PALETTE_KEYS = ["bg", "surface", "elevated", "text", "muted", "border"] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];
export type Palette = Record<PaletteKey, string>;

export const STATUS_KEYS = ["IDEA", "PLANNING", "OPEN", "IN_PROGRESS", "DONE", "ARCHIVED"] as const;
export type StatusKey = (typeof STATUS_KEYS)[number];

export const BACKGROUND_PRESETS = [
  "nebula",
  "starfield",
  "aurora",
  "particles",
  "waves",
  "mesh",
  "synthwave",
  "bokeh",
  "plain",
] as const;
type BackgroundPresetId = (typeof BACKGROUND_PRESETS)[number];

const GRADIENT_KINDS = ["linear", "radial", "conic"] as const;
export type GradientKind = (typeof GRADIENT_KINDS)[number];

const paletteSchema = z.object({
  bg: hex,
  surface: hex,
  elevated: hex,
  text: hex,
  muted: hex,
  border: hex,
});

export const themeSchema = z.object({
  mode: z.enum(["dark", "light", "system"]),
  scheme: z.string().max(40),
  accent: hex,
  dark: paletteSchema,
  light: paletteSchema,
  status: z.object({
    IDEA: hex,
    PLANNING: hex,
    OPEN: hex,
    IN_PROGRESS: hex,
    DONE: hex,
    ARCHIVED: hex,
  }),
  glass: z.object({
    /** Deckkraft der Karten in Prozent (0 = durchsichtig, 100 = deckend) */
    opacity: z.number().int().min(0).max(100),
    /** Unschärfe hinter Karten in px */
    blur: z.number().int().min(0).max(40),
  }),
  background: z.object({
    type: z.enum(["preset", "gradient", "image"]),
    preset: z.object({
      id: z.enum(BACKGROUND_PRESETS),
      /** null = automatisch aus der Akzentfarbe abgeleitet */
      colors: z.array(hex).length(3).nullable(),
      /** 0 = stillstehend, 100 = normal, 200 = doppelt so schnell */
      speed: z.number().int().min(0).max(200),
      /** Wie kräftig die Animation durchscheint (10–100) */
      intensity: z.number().int().min(10).max(100),
    }),
    gradient: z.object({
      kind: z.enum(GRADIENT_KINDS),
      angle: z.number().int().min(0).max(360),
      stops: z
        .array(z.object({ color: hex, pos: z.number().int().min(0).max(100) }))
        .min(2)
        .max(6),
      animate: z.boolean(),
      speed: z.number().int().min(10).max(200),
    }),
    image: z.object({
      uploadId: z.string().max(40).nullable(),
      blur: z.number().int().min(0).max(30),
      dim: z.number().int().min(0).max(90),
      fit: z.enum(["cover", "contain", "tile"]),
      position: z.enum(["center", "top", "bottom", "left", "right"]),
    }),
    /** Feines Rauschen über dem Hintergrund gegen Farbstreifen */
    grain: z.boolean(),
  }),
});

export type Theme = z.infer<typeof themeSchema>;
type ThemeMode = Theme["mode"];

// ── Farbschemata als Startpunkt ─────────────────────────────

export type ColorSchemeId = "nebula" | "ocean" | "forest" | "ember" | "sunset" | "graphite" | "sakura";

export interface ColorScheme {
  id: ColorSchemeId;
  accent: string;
  dark: Palette;
  light: Palette;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: "nebula",
    accent: "#8b5cf6",
    dark: { bg: "#06061a", surface: "#131430", elevated: "#1a1b3d", text: "#e8e9f8", muted: "#9ea6c2", border: "#2c2f5a" },
    light: { bg: "#f2f1fb", surface: "#ffffff", elevated: "#ffffff", text: "#17162b", muted: "#595d78", border: "#dcdaf0" },
  },
  {
    id: "ocean",
    accent: "#38bdf8",
    dark: { bg: "#03101d", surface: "#0b1d31", elevated: "#10263f", text: "#e4f1fb", muted: "#98afc4", border: "#1f3a58" },
    light: { bg: "#eef6fb", surface: "#ffffff", elevated: "#ffffff", text: "#0d2233", muted: "#4f6679", border: "#d3e3ee" },
  },
  {
    id: "forest",
    accent: "#34d399",
    dark: { bg: "#04110c", surface: "#0d2019", elevated: "#122a21", text: "#e3f5ec", muted: "#96b3a6", border: "#1f3d31" },
    light: { bg: "#eef7f2", surface: "#ffffff", elevated: "#ffffff", text: "#10261c", muted: "#4d6a5c", border: "#d3e6db" },
  },
  {
    id: "ember",
    accent: "#fb7185",
    dark: { bg: "#14060b", surface: "#241017", elevated: "#2e141e", text: "#fbe8ec", muted: "#c2a0a9", border: "#472431" },
    light: { bg: "#fbf1f2", surface: "#ffffff", elevated: "#ffffff", text: "#2b1218", muted: "#7a535c", border: "#f0d9dd" },
  },
  {
    id: "sunset",
    accent: "#f59e0b",
    dark: { bg: "#120a04", surface: "#22160c", elevated: "#2b1c10", text: "#fbf0e2", muted: "#c0a88f", border: "#46321f" },
    light: { bg: "#fbf6ee", surface: "#ffffff", elevated: "#ffffff", text: "#2a1d0e", muted: "#735e47", border: "#eee2d0" },
  },
  {
    id: "graphite",
    accent: "#a1a1aa",
    dark: { bg: "#09090b", surface: "#18181b", elevated: "#1f1f23", text: "#f4f4f5", muted: "#a1a1aa", border: "#2e2e33" },
    light: { bg: "#f4f4f5", surface: "#ffffff", elevated: "#ffffff", text: "#18181b", muted: "#5b5b63", border: "#e1e1e5" },
  },
  {
    id: "sakura",
    accent: "#ec4899",
    dark: { bg: "#12060f", surface: "#22101d", elevated: "#2b1425", text: "#fbe7f3", muted: "#c19db2", border: "#48243c" },
    light: { bg: "#fdf2f8", surface: "#ffffff", elevated: "#ffffff", text: "#2a1022", muted: "#7a4f67", border: "#f5d5e7" },
  },
];

export const ACCENT_SWATCHES = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#38bdf8", "#22d3ee", "#14b8a6",
  "#34d399", "#84cc16", "#facc15", "#f59e0b", "#f97316", "#ef4444",
  "#fb7185", "#ec4899", "#d946ef", "#a1a1aa",
];

export const DEFAULT_STATUS_COLORS: Record<StatusKey, string> = {
  IDEA: "#a78bfa",
  PLANNING: "#60a5fa",
  OPEN: "#94a3b8",
  IN_PROGRESS: "#fbbf24",
  DONE: "#34d399",
  ARCHIVED: "#71717a",
};

export const DEFAULT_THEME: Theme = {
  mode: "dark",
  scheme: "nebula",
  accent: COLOR_SCHEMES[0].accent,
  dark: COLOR_SCHEMES[0].dark,
  light: COLOR_SCHEMES[0].light,
  status: DEFAULT_STATUS_COLORS,
  glass: { opacity: 62, blur: 18 },
  background: {
    type: "preset",
    preset: { id: "nebula", colors: null, speed: 100, intensity: 70 },
    gradient: {
      kind: "linear",
      angle: 135,
      stops: [
        { color: "#1e1b4b", pos: 0 },
        { color: "#6d28d9", pos: 50 },
        { color: "#0e7490", pos: 100 },
      ],
      animate: true,
      speed: 100,
    },
    image: { uploadId: null, blur: 0, dim: 40, fit: "cover", position: "center" },
    grain: true,
  },
};

// ── Lesen & Auffüllen ───────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Tiefe Zusammenführung: nur Felder, die im Vorgabeobjekt existieren. */
function mergeDeep<T>(base: T, patch: unknown): T {
  if (!isObj(base) || !isObj(patch)) return (patch === undefined ? base : patch) as T;
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(base)) {
    if (key in patch) {
      const b = (base as Record<string, unknown>)[key];
      const p = patch[key];
      out[key] = isObj(b) && isObj(p) ? mergeDeep(b, p) : p;
    }
  }
  return out as T;
}

/**
 * Macht aus beliebigem gespeicherten JSON ein vollständiges, gültiges Design.
 * Was nicht passt, fällt auf die Vorgabe zurück – Feld für Feld, damit ein
 * einzelner kaputter Wert nicht das ganze Design verwirft.
 */
export function resolveTheme(stored: unknown): Theme {
  if (!isObj(stored)) return DEFAULT_THEME;
  const merged = mergeDeep(DEFAULT_THEME, stored);
  const parsed = themeSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  // Feldweise reparieren: jeden fehlerhaften Pfad auf die Vorgabe setzen.
  const repaired = structuredClone(merged) as Record<string, unknown>;
  for (const issue of parsed.error.issues) {
    const top = issue.path[0];
    if (typeof top === "string" && top in DEFAULT_THEME) {
      repaired[top] = structuredClone((DEFAULT_THEME as unknown as Record<string, unknown>)[top]);
    }
  }
  const second = themeSchema.safeParse(repaired);
  return second.success ? second.data : DEFAULT_THEME;
}

/** Farben der Hintergrund-Animation: eigene oder aus dem Akzent abgeleitet. */
export function presetColors(theme: Theme): [string, string, string] {
  const own = theme.background.preset.colors;
  if (own && own.length === 3) return [own[0], own[1], own[2]];
  const a = theme.accent;
  return [a, shiftHue(a, 48), shiftHue(a, -70)];
}

function schemeById(id: string): ColorScheme | undefined {
  return COLOR_SCHEMES.find((s) => s.id === id);
}
