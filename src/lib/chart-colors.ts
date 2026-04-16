/**
 * SnowUI Dashboard chart color palette.
 * These match the --chart-* CSS variables in index.css.
 */
export const CHART_COLORS = {
  primary: "hsl(246, 58%, 63%)",       // Purple
  informative: "hsl(213, 90%, 58%)",   // Blue
  success: "hsl(152, 56%, 48%)",       // Green
  warning: "hsl(38, 92%, 58%)",        // Yellow
  destructive: "hsl(0, 72%, 56%)",     // Red
  purple: "hsl(280, 60%, 58%)",        // Purple B
  teal: "hsl(187, 72%, 45%)",          // Teal
} as const;

/** Grid/axis colors for dark theme */
export const CHART_GRID = "hsl(228, 10%, 22%)";
export const CHART_TICK = "hsl(0, 0%, 45%)";
