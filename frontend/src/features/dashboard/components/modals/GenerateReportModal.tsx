import { useState, useContext } from "react";
import { X, ChevronRight, ChevronLeft, FileText, Download, Loader2 } from "lucide-react";

import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { formatDate, formatCurrency } from "@/features/dashboard/lib/utility";
import type { ReportType, ReportResult, OnCloseProps } from "@/features/dashboard/schemas/report";
import { generateReportPDF } from "@/features/dashboard/lib/generateReportPdf";

// ── Same tokens ───────────────────────────────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  border:     "hsl(220,16%,22%)",
  borderFoc:  "hsl(199,89%,38%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  error:      "hsl(0,72%,60%)",
  overlay:    "rgba(0,0,0,0.55)",
};

const inputStyle: React.CSSProperties = {
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

const labelStyle: React.CSSProperties = {
  display:       "block",
  fontSize:      "0.75rem",
  fontWeight:    500,
  color:         C.fgMuted,
  marginBottom:  "0.35rem",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
};

const MODE_LABEL: Record<string, string> = {
  income:   "Income",
  expense:  "Expense",
  combined: "Combined",
};

const MODE_COLOR: Record<string, string> = {
  income:   C.income,
  expense:  C.expense,
  combined: C.primary,
};

// ── Shell — outside to prevent remount/focus-loss ─────────────────────────────
interface ShellProps {
  children:        React.ReactNode;
  wide?:           boolean;
  onBackdropDown?: React.MouseEventHandler;
  onBackdropUp?:   React.MouseEventHandler;
}
function Shell({ children, wide = false, onBackdropDown, onBackdropUp }: ShellProps) {
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
          maxWidth:      wide ? "640px" : "440px",
          maxHeight:     "90vh",
          display:       "flex",
          flexDirection: "column",
          boxShadow:     "0 24px 48px rgba(0,0,0,0.4)",
          overflow:      "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Modal header ──────────────────────────────────────────────────────────────
function ModalHeader({ title, subtitle, accentColor, onClose }: {
  title:        string;
  subtitle:     string;
  accentColor?: string;
  onClose:      () => void;
}) {
  return (
    <div style={{
      display:        "flex",
      alignItems:     "center",
      justifyContent: "space-between",
      padding:        "1.25rem 1.5rem",
      borderBottom:   `1px solid ${C.border}`,
      flexShrink:     0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <FileText style={{ width: "1rem", height: "1rem", color: accentColor ?? C.primary }} />
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>{title}</h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.15rem 0 0" }}>{subtitle}</p>
        </div>
      </div>
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

// ── Error box ─────────────────────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      backgroundColor: "hsl(0 72% 51% / 0.1)",
      border:          `1px solid ${C.error}`,
      borderRadius:    "0.5rem",
      padding:         "0.6rem 0.75rem",
      marginBottom:    "1rem",
    }}>
      <p style={{ color: C.error, fontSize: "0.8rem", margin: 0 }}>• {message}</p>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{
      display:        "flex",
      justifyContent: "space-between",
      alignItems:     "center",
      padding:        "0.45rem 0",
      borderBottom:   `1px solid ${C.border}`,
    }}>
      <span style={{ fontSize: "0.75rem", color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.875rem", fontWeight: 500, color: color ?? C.fg }}>
        {value}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GenerateReportModal({ reportMode, onClose }: OnCloseProps) {
  const { user }  = useContext(AuthContext);
  const userRole  = user!.role_id;
  const isAdmin   = userRole === 1;
  const modeColor = MODE_COLOR[reportMode] ?? C.primary;
  const modeLabel = MODE_LABEL[reportMode] ?? reportMode;

  const [reportType,       setReportType]       = useState<ReportType>("monthly");
  const [startDate,        setStartDate]        = useState("");
  const [endDate,          setEndDate]          = useState("");
  const [viewMode,         setViewMode]         = useState<"all users" | "own">(
    isAdmin ? "all users" : "own"
  );
  const [loading,          setLoading]          = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSummary,      setShowSummary]      = useState(false);
  const [reportResult,     setReportResult]     = useState<ReportResult | null>(null);
  const [error,            setError]            = useState<string | null>(null);
  const [focusedField,     setFocusedField]     = useState<string | null>(null);

  // ── Outside-click via mousedown/mouseup ──────────────────────────────────
  // mousedown fires when press begins; if it starts on backdrop we flag it.
  // mouseup checks the flag — only closes if both started AND ended on backdrop.
  const [backdropPressed, setBackdropPressed] = useState(false);

  const handleBackdropMouseDown = () => setBackdropPressed(true);
  const handleBackdropMouseUp   = () => {
    if (backdropPressed) onClose();
    setBackdropPressed(false);
  };

  const stopInner = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBackdropPressed(false);
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setError("Start and End date are required.");
      return;
    }
    if (new Date(`${startDate}T00:00:00`) > new Date(`${endDate}T00:00:00`)) {
      setError("End date cannot be earlier than Start date.");
      return;
    }
    setError(null);
    setShowConfirmation(true);
  };

  const handleBackToEdit = () => {
    if (loading) return;
    setError(null);
    setShowConfirmation(false);
    setReportResult(null);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        report_type: reportType,
        start_date:  startDate,
        end_date:    endDate,
        all_users:   isAdmin ? viewMode === "all users" : false,
      };
      const response = await api.post(
        "api/reports/?transaction_type=" + reportMode,
        payload
      );
      if (!response.data.summary || response.data.summary.length === 0) {
        setError("No transactions found for the selected period.");
        return;
      }
      setReportResult(response.data);
      setShowConfirmation(false);
      setShowSummary(true);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
        `Failed to generate ${modeLabel} report.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSummary = () => {
    setShowSummary(false);
    onClose();
  };

  // ── Group summary entries by period ──────────────────────────────────────
  const groupSummary = () => {
    if (!reportResult) return {};
    const grouped: Record<string, any[]> = {};
    reportResult.summary.forEach(item => {
      let key = "default";
      if      (reportResult.report.report_type === "weekly")  key = `${item.week_start} → ${item.week_end}`;
      else if (reportResult.report.report_type === "daily")   key = item.date || "Unknown Date";
      else if (reportResult.report.report_type === "monthly") key = `${reportResult.report.start_date} → ${reportResult.report.end_date}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  };

  const groupedData = groupSummary();

  const totalIncome  = reportResult
    ? reportResult.summary.filter(i => i.transaction_type === "Income") .reduce((a, i) => a + i.total_amount, 0)
    : 0;
  const totalExpense = reportResult
    ? reportResult.summary.filter(i => i.transaction_type === "Expense").reduce((a, i) => a + i.total_amount, 0)
    : 0;
  const overallTotal = totalIncome - totalExpense;

  // ── Step 1 — Form ────────────────────────────────────────────────────────
  if (!showConfirmation && !showSummary) return (
    <Shell onBackdropDown={handleBackdropMouseDown} onBackdropUp={handleBackdropMouseUp}>
      <ModalHeader
        title={`${modeLabel} Report`}
        subtitle="Configure your report parameters"
        accentColor={modeColor}
        onClose={onClose}
      />

      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        {error && <ErrorBox message={error} />}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* View mode — admin only */}
          {isAdmin && (
            <div>
              <label style={labelStyle}>View Mode</label>
              <select
                value={viewMode}
                onChange={e => setViewMode(e.target.value as "all users" | "own")}
                onFocus={() => setFocusedField("viewMode")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, borderColor: focusedField === "viewMode" ? C.borderFoc : C.border }}
              >
                <option value="all users" style={{ background: C.surface }}>All Users</option>
                <option value="own"       style={{ background: C.surface }}>My Own Only</option>
              </select>
            </div>
          )}

          {/* Report type */}
          <div>
            <label style={labelStyle}>Report Type</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as ReportType)}
              onFocus={() => setFocusedField("reportType")}
              onBlur={() => setFocusedField(null)}
              style={{ ...inputStyle, borderColor: focusedField === "reportType" ? C.borderFoc : C.border }}
            >
              <option value="monthly" style={{ background: C.surface }}>Monthly</option>
              <option value="weekly"  style={{ background: C.surface }}>Weekly</option>
              <option value="daily"   style={{ background: C.surface }}>Daily</option>
            </select>
          </div>

          {/* Date range */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                onFocus={() => setFocusedField("startDate")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, borderColor: focusedField === "startDate" ? C.borderFoc : C.border, colorScheme: "dark" }}
              />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                onFocus={() => setFocusedField("endDate")}
                onBlur={() => setFocusedField(null)}
                style={{ ...inputStyle, borderColor: focusedField === "endDate" ? C.borderFoc : C.border, colorScheme: "dark" }}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={onClose}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: modeColor,
            color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          Review <ChevronRight style={{ width: "0.9rem", height: "0.9rem" }} />
        </button>
      </div>
    </Shell>
  );

  // ── Step 2 — Confirm ─────────────────────────────────────────────────────
  if (showConfirmation) return (
    <Shell onBackdropDown={handleBackdropMouseDown} onBackdropUp={handleBackdropMouseUp}>
      <ModalHeader
        title="Confirm Report"
        subtitle="Review settings before generating"
        accentColor={modeColor}
        onClose={handleBackToEdit}
      />

      <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
        {error && <ErrorBox message={error} />}

        {/* Mode badge */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <span style={{
            display:         "inline-block",
            padding:         "0.3rem 1rem",
            borderRadius:    "999px",
            fontSize:        "0.8rem",
            fontWeight:      600,
            backgroundColor: `${modeColor}18`,
            color:           modeColor,
            border:          `1px solid ${modeColor}40`,
          }}>
            {modeLabel} Report
          </span>
        </div>

        <InfoRow label="View Mode"   value={viewMode === "all users" ? "All Users" : "My Own Only"} />
        <InfoRow label="Report Type" value={reportType.charAt(0).toUpperCase() + reportType.slice(1)} />
        <InfoRow label="Start Date"  value={startDate} />
        <InfoRow label="End Date"    value={endDate} />
      </div>

      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={handleBackToEdit}
          disabled={loading}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          <ChevronLeft style={{ width: "0.9rem", height: "0.9rem" }} /> Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: loading ? C.surfaceEl : modeColor,
            color: loading ? C.fgMuted : "hsl(0,0%,100%)",
            fontSize: "0.875rem", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          {loading
            ? <><Loader2 style={{ width: "0.9rem", height: "0.9rem", animation: "spin 1s linear infinite" }} /> Generating…</>
            : "Confirm & Generate"
          }
        </button>
      </div>
    </Shell>
  );

  // ── Step 3 — Summary ─────────────────────────────────────────────────────
  if (showSummary && reportResult) return (
    <Shell wide onBackdropDown={handleBackdropMouseDown} onBackdropUp={handleBackdropMouseUp}>
      <ModalHeader
        title={`${modeLabel} Report Summary`}
        subtitle={`${formatDate(reportResult.report.start_date)} → ${formatDate(reportResult.report.end_date)}`}
        accentColor={modeColor}
        onClose={handleCloseSummary}
      />

      {/* Scrollable body */}
      <div style={{ overflowY: "auto", flex: 1, padding: "1.5rem" }}>

        {/* Meta */}
        <div style={{ marginBottom: "1.25rem" }}>
          <InfoRow label="View Mode"    value={viewMode === "all users" ? "All Users" : "Own"} />
          <InfoRow label="Report Type"  value={reportResult.report.report_type} />
          <InfoRow label="Generated At" value={formatDate(reportResult.report.created_at)} />
        </div>

        {/* Period groups */}
        {Object.entries(groupedData).map(([periodKey, items], idx) => {
          // ── Per-group totals (not grand totals) ──
          const groupIncome  = items.filter(i => i.transaction_type === "Income") .reduce((a: number, i: any) => a + i.total_amount, 0);
          const groupExpense = items.filter(i => i.transaction_type === "Expense").reduce((a: number, i: any) => a + i.total_amount, 0);
          const groupTotal   = groupIncome - groupExpense;
          const totalEntries = items.reduce((a: number, i: any) => a + (i.entry_count ?? 1), 0);

          return (
          <div
            key={idx}
            style={{
              marginBottom:  "1.25rem",
              background:    C.surfaceEl,
              border:        `1px solid ${C.border}`,
              borderRadius:  "0.75rem",
              overflow:      "hidden",
            }}
          >
            {/* Period header with total entry count */}
            {periodKey !== "default" && (
              <div style={{
                padding:        "0.5rem 1rem",
                borderBottom:   `1px solid ${C.border}`,
                fontSize:       "0.75rem",
                fontWeight:     600,
                color:          C.fgMuted,
                textTransform:  "uppercase",
                letterSpacing:  "0.05em",
                display:        "flex",
                justifyContent: "space-between",
                alignItems:     "center",
              }}>
                <span>{periodKey}</span>
                <span style={{
                  background:   C.surface,
                  border:       `1px solid ${C.border}`,
                  borderRadius: "999px",
                  padding:      "0.1rem 0.5rem",
                  fontSize:     "0.68rem",
                  fontWeight:   600,
                  color:        C.fg,
                }}>
                  {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
                </span>
              </div>
            )}

            <div style={{ padding: "0.75rem 1rem" }}>

              {/* Income section */}
              {items.some((i: any) => i.transaction_type === "Income") && (
                <div style={{ marginBottom: items.some((i: any) => i.transaction_type === "Expense") ? "1rem" : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, color: C.income,
                      background: "hsl(160 60% 45% / 0.12)", border: `1px solid ${C.income}40`,
                      borderRadius: "999px", padding: "0.1rem 0.5rem",
                    }}>
                      INCOME · {items.filter((i: any) => i.transaction_type === "Income").length} entries
                    </span>
                  </div>
                  {items.filter((i: any) => i.transaction_type === "Income").map((i: any, ii: number) => (
                    <div key={ii} style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      padding:        "0.3rem 0",
                      borderBottom:   `1px solid ${C.border}`,
                      fontSize:       "0.8rem",
                    }}>
                      <span style={{ color: C.fg }}>
                        {i.category_name}
                        {i.entry_count > 1 && <span style={{ color: C.fgMuted }}> ×{i.entry_count}</span>}
                      </span>
                      <span style={{ color: C.income, fontWeight: 600 }}>
                        +₱{formatCurrency(i.total_amount).replace("₱ ", "")}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: C.income }}>
                    Total: +₱{formatCurrency(groupIncome).replace("₱ ", "")}
                  </div>
                </div>
              )}

              {/* Expense section */}
              {items.some(i => i.transaction_type === "Expense") && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 700, color: C.expense,
                      background: "hsl(0 72% 51% / 0.12)", border: `1px solid ${C.expense}40`,
                      borderRadius: "999px", padding: "0.1rem 0.5rem",
                    }}>
                      EXPENSE · {items.filter((i: any) => i.transaction_type === "Expense").length} entries
                    </span>
                  </div>
                  {items.filter((i: any) => i.transaction_type === "Expense").map((i: any, ii: number) => (
                    <div key={ii} style={{
                      display:        "flex",
                      justifyContent: "space-between",
                      padding:        "0.3rem 0",
                      borderBottom:   `1px solid ${C.border}`,
                      fontSize:       "0.8rem",
                    }}>
                      <span style={{ color: C.fg }}>
                        {i.category_name}
                        {i.entry_count > 1 && <span style={{ color: C.fgMuted }}> ×{i.entry_count}</span>}
                      </span>
                      <span style={{ color: C.expense, fontWeight: 600 }}>
                        -₱{formatCurrency(i.total_amount).replace("₱ ", "")}
                      </span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "0.4rem", fontSize: "0.8rem", fontWeight: 700, color: C.expense }}>
                    Total: -₱{formatCurrency(groupExpense).replace("₱ ", "")}
                  </div>
                </div>
              )}
            </div>
          </div>
          );
        })}

        {/* Net result */}
        <div style={{
          background:   overallTotal >= 0 ? "hsl(160 60% 45% / 0.08)" : "hsl(0 72% 51% / 0.08)",
          border:       `1px solid ${overallTotal >= 0 ? C.income : C.expense}40`,
          borderRadius: "0.75rem",
          padding:      "0.75rem 1rem",
          display:      "flex",
          justifyContent:"space-between",
          alignItems:   "center",
        }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Net Result
          </span>
          <span style={{ fontSize: "1rem", fontWeight: 800, color: overallTotal >= 0 ? C.income : C.expense }}>
            {overallTotal >= 0
              ? `+₱${formatCurrency(overallTotal).replace("₱ ", "")}`
              : `-₱${formatCurrency(Math.abs(overallTotal)).replace("₱ ", "")}`
            }
          </span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: "1rem 1.5rem", borderTop: `1px solid ${C.border}`, display: "flex", gap: "0.75rem", flexShrink: 0 }}>
        <button
          onClick={handleCloseSummary}
          style={{
            flex: 1, padding: "0.6rem", borderRadius: "0.5rem",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.fgMuted, fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
          }}
        >
          Close
        </button>
        <button
          onClick={() => reportResult && generateReportPDF({ reportResult, reportMode, viewMode })}
          style={{
            flex: 2, padding: "0.6rem", borderRadius: "0.5rem",
            border: "none", background: modeColor,
            color: "hsl(0,0%,100%)", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
          }}
        >
          <Download style={{ width: "0.9rem", height: "0.9rem" }} />
          Download PDF
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Shell>
  );

  return null;
}