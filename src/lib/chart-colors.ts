/**
 * SAP Fiori Horizon chart color palette.
 * These match the --chart-* CSS variables in index.css.
 * Use these constants in Recharts components for consistency.
 */
export const CHART_COLORS = {
  primary: "hsl(212, 100%, 47%)",     // --chart-1: SAP Blue
  success: "hsl(152, 56%, 34%)",      // --chart-2: SAP Positive
  warning: "hsl(27, 90%, 48%)",       // --chart-3: SAP Critical/Warning
  destructive: "hsl(0, 76%, 44%)",    // --chart-4: SAP Negative
  purple: "hsl(267, 55%, 50%)",       // --chart-5
  teal: "hsl(187, 72%, 40%)",         // --chart-6
} as const;

/** Grid/axis colors for light theme */
export const CHART_GRID = "hsl(210, 16%, 88%)";
export const CHART_TICK = "hsl(210, 12%, 48%)";
