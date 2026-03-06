import { X, ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { C } from "./tokens";

// ── ModalHeader ───────────────────────────────────────────────────────────────
// Covers all header patterns found across the modals:
//   - title + subtitle + close button              (most modals)
//   - + optional leading icon                      (GenerateReport, HandleDeletion, etc.)
//   - + optional "Back" button                     (ManageCategories, HandleDeletion)
//   - + optional accent color on the icon          (varies per modal)

interface ModalHeaderProps {
  title:        string;
  subtitle?:    string;
  /** Lucide icon shown left of the title */
  icon?:        LucideIcon;
  iconColor?:   string;
  /** Shows an ← Back button before the icon/title block */
  onBack?:      () => void;
  /** Text for the back button. Defaults to "Back" */
  backLabel?:   string;
  onClose:      () => void;
  /** Extra padding preset. "compact" = 1rem, "normal" (default) = 1.25rem */
  padding?:     "compact" | "normal";
}

export default function ModalHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  onBack,
  backLabel = "Back",
  onClose,
  padding = "normal",
}: ModalHeaderProps) {
  const vPad = padding === "compact" ? "1rem" : "1.25rem";

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        `${vPad} 1.5rem`,
        borderBottom:   `1px solid ${C.border}`,
        flexShrink:     0,
      }}
    >
      {/* ── Left: optional Back + icon + title ──────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              background:   "transparent",
              border:       `1px solid ${C.border}`,
              borderRadius: "0.4rem",
              color:        C.fgMuted,
              cursor:       "pointer",
              padding:      "0.25rem 0.5rem",
              display:      "flex",
              alignItems:   "center",
              gap:          "0.25rem",
              fontSize:     "0.75rem",
            }}
          >
            <ArrowLeft style={{ width: "0.8rem", height: "0.8rem" }} />
            {backLabel}
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {Icon && (
            <Icon
              style={{
                width:  "1rem",
                height: "1rem",
                color:  iconColor ?? C.fg,
                flexShrink: 0,
              }}
            />
          )}
          <div>
            <h2
              style={{
                color:      C.fg,
                fontSize:   "1.125rem",
                fontWeight: 700,
                margin:     0,
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                style={{
                  color:     C.fgMuted,
                  fontSize:  "0.75rem",
                  margin:    "0.15rem 0 0",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Close button ──────────────────────────────────────────── */}
      <button
        onClick={onClose}
        style={{
          background:   "transparent",
          border:       `1px solid ${C.border}`,
          borderRadius: "0.5rem",
          color:        C.fgMuted,
          cursor:       "pointer",
          padding:      "0.3rem",
          display:      "flex",
          alignItems:   "center",
          flexShrink:   0,
        }}
      >
        <X style={{ width: "1rem", height: "1rem" }} />
      </button>
    </div>
  );
}