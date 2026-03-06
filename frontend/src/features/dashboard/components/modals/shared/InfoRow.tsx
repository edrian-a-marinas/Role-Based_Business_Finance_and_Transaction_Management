import type { CSSProperties, ReactNode } from "react";
import { C } from "./tokens";

// ── InfoRow ───────────────────────────────────────────────────────────────────
// A single label → value row separated by a bottom border.
// Used on confirmation screens and detail panels throughout the modals.

interface InfoRowProps {
  label:      string;
  value:      ReactNode;
  /** Override the value text color (e.g. C.income, C.expense) */
  color?:     string;
  /** Make the label uppercase + spaced (default true) */
  uppercase?: boolean;
}

export default function InfoRow({
  label,
  value,
  color,
  uppercase = true,
}: InfoRowProps) {
  const labelStyle: CSSProperties = {
    fontSize:      "0.75rem",
    color:         C.fgMuted,
    textTransform: uppercase ? "uppercase" : "none",
    letterSpacing: uppercase ? "0.04em" : "normal",
  };

  return (
    <div
      style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        padding:        "0.45rem 0",
        borderBottom:   `1px solid ${C.border}`,
      }}
    >
      <span style={labelStyle}>{label}</span>
      <span
        style={{
          fontSize:   "0.875rem",
          fontWeight: 500,
          color:      color ?? C.fg,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── DetailRow ─────────────────────────────────────────────────────────────────
// Variant used in detail/expand panels (HandleDeletion, UserDetail).
// Label is left-anchored with a fixed minWidth; value wraps naturally.

interface DetailRowProps {
  label:  string;
  value:  ReactNode;
  accent?: string;
}

export function DetailRow({ label, value, accent }: DetailRowProps) {
  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "flex-start",
        gap:          "0.5rem",
        padding:      "0.55rem 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span
        style={{
          fontSize:      "0.72rem",
          fontWeight:    600,
          color:         C.fgMuted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          minWidth:      "140px",
          paddingTop:    "0.05rem",
          flexShrink:    0,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: "0.82rem", color: accent ?? C.fg }}>
        {value}
      </span>
    </div>
  );
}