import type { LucideIcon } from "lucide-react";

export interface ActionCard {
  label:       string;
  description: string;
  icon:        LucideIcon;
  color:       string;
  bgColor:     string;
  onClick:     () => void;
}

export function ActionButton({
  id,
  action,
  hoveredCard,
  setHoveredCard,
}: {
  id:             string;
  action:         ActionCard;
  hoveredCard:    string | null;
  setHoveredCard: (id: string | null) => void;
}) {
  const Icon    = action.icon;
  const hovered = hoveredCard === id;

  return (
    <button
      onClick={action.onClick}
      onMouseEnter={() => setHoveredCard(id)}
      onMouseLeave={() => setHoveredCard(null)}
      className="ts-action-card"
      style={{
        border:    `1px solid ${hovered ? action.color : "hsl(var(--page-border))"}`,
        boxShadow: hovered
          ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${action.color}1a`
          : "0 1px 3px hsl(0 0% 0% / 0.06)",
        transform: hovered ? "translateY(-2px)" : "none",
      }}
    >
      <div style={{
        width:           "2.5rem",
        height:          "2.5rem",
        borderRadius:    "0.5rem",
        backgroundColor: hovered ? action.color : action.bgColor,
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        transition:      "background-color 0.15s",
        flexShrink:      0,
      }}>
        <Icon style={{
          width:      "1.1rem",
          height:     "1.1rem",
          color:      hovered ? "hsl(0,0%,100%)" : action.color,
          transition: "color 0.15s",
        }} />
      </div>
      <div>
        <p className="text-sm font-semibold ts-page-fg" style={{ marginBottom: "0.2rem" }}>
          {action.label}
        </p>
        <p className="text-xs ts-page-fg-light" style={{ lineHeight: "1.4" }}>
          {action.description}
        </p>
      </div>
    </button>
  );
}