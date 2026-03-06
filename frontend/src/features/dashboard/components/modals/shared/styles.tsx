import type { CSSProperties } from "react";
import { C } from "./tokens";

// ── Shared form field styles ──────────────────────────────────────────────────

export const inputStyle: CSSProperties = {
  width:           "100%",
  backgroundColor: C.surfaceEl,
  border:          `1px solid ${C.border}`,
  borderRadius:    "0.5rem",
  color:           C.fg,
  fontSize:        "0.875rem",
  padding:         "0.5rem 0.75rem",
  outline:         "none",
  transition:      "border-color 0.15s",
  boxSizing:       "border-box",
};

export const labelStyle: CSSProperties = {
  display:       "block",
  fontSize:      "0.75rem",
  fontWeight:    500,
  color:         C.fgMuted,
  marginBottom:  "0.35rem",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

// ── Focused border helper ─────────────────────────────────────────────────────
// Usage: { ...inputStyle, borderColor: focusedField === "myField" ? focusBorder : C.border }
export const focusBorder = C.borderFoc;