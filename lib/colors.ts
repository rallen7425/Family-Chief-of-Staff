import type { AccentColor } from "@/lib/types";

/**
 * Person colours. 18 values — too many to keep as static Tailwind class
 * maps (Tailwind only compiles class names it can see literally), so a
 * person's colour is rendered inline: `style={{ background: ACCENT_HEX[c] }}`.
 * Fixed UI colours that happen to be named "accent-*" (e.g. `bg-accent-berry`
 * for "critical"/"destructive") stay as Tailwind classes and are unrelated
 * to this.
 */
export const ACCENT_HEX: Record<AccentColor, string> = {
  coral: "#F0714B",
  teal: "#2FA9A0",
  gold: "#E3A73A",
  berry: "#E8567A",
  blue: "#4B7BE5",
  navyBlue: "#2E4374",
  lightBlue: "#6FB7E0",
  green: "#4C9A6A",
  lightGreen: "#8FC97A",
  yellow: "#E8C24D",
  purple: "#8B6FD1",
  pink: "#E896B8",
  fuchsia: "#C34FA0",
  maroon: "#9A3B4A",
  brown: "#9C6B45",
  grey: "#8B93A0",
  black: "#3A3F47",
  red: "#E14B3C",
};

export const ACCENT_NAME: Record<AccentColor, string> = {
  coral: "Coral",
  teal: "Teal",
  gold: "Gold",
  berry: "Berry",
  blue: "Blue",
  navyBlue: "Navy Blue",
  lightBlue: "Light Blue",
  green: "Green",
  lightGreen: "Light Green",
  yellow: "Yellow",
  purple: "Purple",
  pink: "Pink",
  fuchsia: "Fuchsia",
  maroon: "Maroon",
  brown: "Brown",
  grey: "Grey",
  black: "Black",
  red: "Red",
};

/** Display order for the colour picker — original brand accents first. */
export const ACCENT_COLORS = Object.keys(ACCENT_HEX) as AccentColor[];
