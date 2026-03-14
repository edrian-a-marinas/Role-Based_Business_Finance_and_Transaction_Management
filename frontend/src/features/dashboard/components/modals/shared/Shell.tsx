import { C } from "./tokens";

interface ShellProps {
  children:        React.ReactNode;
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
      onMouseDown={e => { if (e.target === e.currentTarget) onBackdropDown?.(e); }}
      onMouseUp={e =>   { if (e.target === e.currentTarget) onBackdropUp?.(e);   }}
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

export function ShellTable({
  children,
  maxWidth = "xl",
  onBackdropDown,
  onBackdropUp,
}: ShellProps) {
  const resolvedMaxWidth = MAX_WIDTH_MAP[maxWidth] ?? maxWidth;

  return (
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onBackdropDown?.(e); }}
      onMouseUp={e =>   { if (e.target === e.currentTarget) onBackdropUp?.(e);   }}
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