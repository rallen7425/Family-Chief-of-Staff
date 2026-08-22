import type { AccentColor } from "@/lib/types";

/**
 * Explicit class-name maps (not dynamic `bg-accent-${color}` string building) —
 * Tailwind's compiler only picks up class names it can find as literal text.
 */
export const ACCENT_BG: Record<AccentColor, string> = {
  coral: "bg-accent-coral",
  teal: "bg-accent-teal",
  gold: "bg-accent-gold",
  berry: "bg-accent-berry",
};

export const ACCENT_TEXT: Record<AccentColor, string> = {
  coral: "text-accent-coral",
  teal: "text-accent-teal",
  gold: "text-accent-gold",
  berry: "text-accent-berry",
};

export const ACCENT_RING: Record<AccentColor, string> = {
  coral: "ring-accent-coral",
  teal: "ring-accent-teal",
  gold: "ring-accent-gold",
  berry: "ring-accent-berry",
};

export const ACCENT_BORDER: Record<AccentColor, string> = {
  coral: "border-accent-coral",
  teal: "border-accent-teal",
  gold: "border-accent-gold",
  berry: "border-accent-berry",
};
