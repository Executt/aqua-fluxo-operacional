/**
 * CRM Desktop chart color palette.
 * These match the --chart-* CSS variables in index.css.
 */
export const CHART_COLORS = {
  primary: "hsl(232, 72%, 56%)",       // Indigo
  informative: "hsl(210, 90%, 50%)",   // Blue
  success: "hsl(152, 60%, 38%)",       // Green
  warning: "hsl(38, 92%, 50%)",        // Amber
  destructive: "hsl(0, 72%, 51%)",     // Red
  violet: "hsl(270, 60%, 56%)",        // Violet
  purple: "hsl(270, 60%, 56%)",        // Alias (legacy)
  teal: "hsl(187, 72%, 42%)",          // Teal
} as const;

/** Grid/axis colors for light CRM theme */
export const CHART_GRID = "hsl(220, 18%, 92%)";
export const CHART_TICK = "hsl(220, 12%, 46%)";
