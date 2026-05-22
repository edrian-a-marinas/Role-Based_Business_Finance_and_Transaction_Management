// ReportPage.tsx
import { useState, useContext } from "react";
import { FileText, TrendingUp, TrendingDown, BarChart2, HelpCircle } from "lucide-react";
import { AuthContext } from "@/features/auth/AuthContext";
import { GenerateReport } from "@/features/dashboard/components/modals";
import AIChatPanel from "@/features/dashboard/components/ui/AIChatPanel";
import type { ReportMode } from "@/features/dashboard/schemas/report";

const C = {
  primary: "hsl(var(--primary))",
  income:  "hsl(var(--income))",
  expense: "hsl(var(--expense))",
};

interface ReportCard {
  mode:        ReportMode;
  label:       string;
  description: string;
  icon:        typeof FileText;
  color:       string;
  bgColor:     string;
}

const reportCards: ReportCard[] = [
  {
    mode:        "income",
    label:       "Income Report",
    description: "View all income transactions, category breakdown, and revenue trends",
    icon:        TrendingUp,
    color:       C.income,
    bgColor:     "hsl(var(--income) / 0.08)",
  },
  {
    mode:        "expense",
    label:       "Expense Report",
    description: "Analyze spending by category, track costs, and identify top expenses",
    icon:        TrendingDown,
    color:       C.expense,
    bgColor:     "hsl(var(--expense) / 0.08)",
  },
  {
    mode:        "combined",
    label:       "Combined Report",
    description: "Full financial summary with net profit, margins, and side-by-side comparison",
    icon:        BarChart2,
    color:       C.primary,
    bgColor:     "hsl(var(--primary) / 0.08)",
  },
];

const TOOLTIP_LINES = [
  "Select a report type, set a date range,",
  "and choose daily, weekly, or monthly grouping.",
  "Results can be downloaded as a PDF.",
  "",
  "• Income — revenue by category",
  "• Expense — spending breakdown",
  "• Combined — net profit & full summary",
];

function InfoTooltip() {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        style={{
          background: "transparent", border: "none", padding: "0.15rem",
          cursor: "default", display: "flex", alignItems: "center",
          color: "hsl(var(--page-fg-muted))", lineHeight: 1,
        }}
        aria-label="Report help"
        tabIndex={0}
      >
        <HelpCircle style={{ width: "0.85rem", height: "0.85rem" }} />
      </button>
      {visible && (
        <div style={{
          position: "absolute", left: "calc(100% + 8px)", top: "50%",
          transform: "translateY(-50%)", zIndex: 50,
          background: "hsl(var(--modal-bg))", border: "1px solid hsl(var(--modal-border))",
          borderRadius: "0.55rem", padding: "0.65rem 0.875rem",
          minWidth: "230px", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", left: "-5px", top: "50%", transform: "translateY(-50%)",
            width: 0, height: 0, borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent", borderRight: "5px solid hsl(var(--modal-border))",
          }} />
          {TOOLTIP_LINES.map((line, i) =>
            line === "" ? (
              <div key={i} style={{ height: "0.4rem" }} />
            ) : (
              <p key={i} style={{
                fontSize: "0.72rem",
                color: line.startsWith("•") ? "hsl(var(--modal-fg))" : "hsl(var(--modal-fg-muted))",
                margin: 0, lineHeight: 1.6, fontWeight: line.startsWith("•") ? 500 : 400,
              }}>
                {line}
              </p>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useContext(AuthContext);
  const isAdmin  = user!.role_id === 1;
  const [activeMode,  setActiveMode]  = useState<ReportMode | null>(null);
  const [hoveredCard, setHoveredCard] = useState<ReportMode | null>(null);

  return (
    <>
      <title>Reports</title>
      <div className="space-y-6">

        {/* Page header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" style={{ color: C.primary }} />
            <h1 className="text-2xl font-bold tracking-tight ts-page-fg">Reports</h1>
            <InfoTooltip />
          </div>
          <p className="text-sm ts-page-fg-light">
            {isAdmin
              ? "Generate financial reports across all users"
              : "Generate your personal financial reports"}
          </p>
        </div>

        {/* ── Top: Report cards ── */}
        <div>
          <p className="ts-section-title" style={{ margin: "0 0 0.75rem" }}>Generate Reports</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reportCards.map((card) => {
              const hovered = hoveredCard === card.mode;
              return (
                <button
                  key={card.mode}
                  onClick={() => setActiveMode(card.mode)}
                  onMouseEnter={() => setHoveredCard(card.mode)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="ts-action-card"
                  style={{
                    border: `1px solid ${hovered ? card.color : "hsl(var(--page-border))"}`,
                    boxShadow: hovered
                      ? `0 4px 16px hsl(0 0% 0% / 0.08), 0 0 0 3px ${card.color}1a`
                      : "0 1px 3px hsl(0 0% 0% / 0.06)",
                    transform: hovered ? "translateY(-2px)" : "none",
                  }}
                >
                  <div style={{
                    width: "2.5rem", height: "2.5rem", borderRadius: "0.5rem",
                    backgroundColor: hovered ? card.color : card.bgColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background-color 0.15s", flexShrink: 0,
                  }}>
                    <card.icon style={{
                      width: "1.1rem", height: "1.1rem",
                      color: hovered ? "hsl(0,0%,100%)" : card.color,
                      transition: "color 0.15s",
                    }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold ts-page-fg" style={{ marginBottom: "0.2rem" }}>
                      {card.label}
                    </p>
                    <p className="text-xs ts-page-fg-light" style={{ lineHeight: "1.4" }}>
                      {card.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Bottom: AI Chat Panel ── */}
        <div>
          <p className="ts-section-title" style={{ margin: "0 0 0.75rem" }}>AI Financial Assistant</p>
          <AIChatPanel />
        </div>

      </div>

      {activeMode && (
        <GenerateReport
          reportMode={activeMode}
          onClose={() => setActiveMode(null)}
        />
      )}
    </>
  );
}