import { C } from "./tokens";

// ── Shell — backdrop + floating card ─────────────────────────────────────────
// Defined outside modal components so React never remounts it on re-render,
// which would unmount/remount the DOM and kill input focus after every keystroke.

interface ShellProps {
  children:        React.ReactNode;
  /** Max width of the card. Defaults to "420px". Use "wide" preset or pass px string. */
  maxWidth?:       "default" | "narrow" | "wide" | "xl" | (string & {});
  onBackdropDown?: React.MouseEventHandler;
  onBackdropUp?:   React.MouseEventHandler;
}

const MAX_WIDTH_MAP: Record<string, string> = {
  default: "420px",
  narrow:  "500px",
  wide:    "640px",
  xl:      "1100px",
};

export default function Shell({
  children,
  maxWidth = "default",
  onBackdropDown,
  onBackdropUp,
}: ShellProps) {
  const resolvedMaxWidth = MAX_WIDTH_MAP[maxWidth] ?? maxWidth;

  return (
    <div
      onMouseDown={onBackdropDown}
      onMouseUp={onBackdropUp}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: C.overlay,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          50,
        padding:         "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:    C.surface,
          border:        `1px solid ${C.border}`,
          borderRadius:  "1rem",
          width:         "100%",
          maxWidth:      resolvedMaxWidth,
          position:      "relative",
          boxShadow:     "0 24px 48px rgba(0,0,0,0.4)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Large Shell variant — flex column with maxHeight for table modals ─────────
// Use this for modals that contain scrollable tables (Read*, History*, etc.)
interface ShellTableProps {
  children:        React.ReactNode;
  maxWidth?:       "default" | "narrow" | "wide" | "xl" | (string & {});
  onBackdropDown?: React.MouseEventHandler;
  onBackdropUp?:   React.MouseEventHandler;
}

export function ShellTable({
  children,
  maxWidth = "xl",
  onBackdropDown,
  onBackdropUp,
}: ShellTableProps) {
  const resolvedMaxWidth = MAX_WIDTH_MAP[maxWidth] ?? maxWidth;

  return (
    <div
      onMouseDown={onBackdropDown}
      onMouseUp={onBackdropUp}
      style={{
        position:        "fixed",
        inset:           0,
        backgroundColor: C.overlay,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        zIndex:          50,
        padding:         "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:    C.surface,
          border:        `1px solid ${C.border}`,
          borderRadius:  "1rem",
          width:         "100%",
          maxWidth:      resolvedMaxWidth,
          display:       "flex",
          flexDirection: "column",
          maxHeight:     "90vh",
          boxShadow:     "0 24px 48px rgba(0,0,0,0.5)",
          overflow:      "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
