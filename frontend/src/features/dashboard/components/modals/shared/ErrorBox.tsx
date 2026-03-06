import { C } from "./tokens";

// ── ErrorBox ──────────────────────────────────────────────────────────────────
// Renders one or more error messages in a red-tinted box.
// Accepts either a single string or an array of strings.

interface ErrorBoxProps {
  /** Single error message or array of messages */
  message?: string;
  messages?: string[];
}

export default function ErrorBox({ message, messages }: ErrorBoxProps) {
  const items: string[] = messages?.length
    ? messages
    : message
    ? [message]
    : [];

  if (items.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: "hsl(0 72% 51% / 0.1)",
        border:          `1px solid ${C.error}`,
        borderRadius:    "0.5rem",
        padding:         "0.75rem",
        marginBottom:    "1rem",
      }}
    >
      {items.map((err, i) => (
        <p
          key={i}
          style={{
            color:     C.error,
            fontSize:  "0.8rem",
            margin:    i > 0 ? "0.15rem 0 0" : 0,
          }}
        >
          • {err}
        </p>
      ))}
    </div>
  );
}