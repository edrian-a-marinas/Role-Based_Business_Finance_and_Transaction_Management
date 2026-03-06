// ── Shared design tokens for all dashboard modals ────────────────────────────
// Dark-surface palette (used by transaction & user modals)
export const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  muted:      "hsl(220,10%,46%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  borderFoc:  "hsl(199,89%,38%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  error:      "hsl(0,72%,60%)",
  overlay:    "rgba(0,0,0,0.55)",
  tooltip:    "hsl(220,20%,8%)",
  diffDel:    "hsl(0,72%,51%)",
  diffIns:    "hsl(160,60%,45%)",
} as const;

export type CTokens = typeof C;