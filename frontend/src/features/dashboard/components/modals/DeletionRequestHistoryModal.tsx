import { useState, useEffect, useContext } from "react";
import {
  X, History, Clock, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Receipt,
} from "lucide-react";
import api from "../../../../services/apiClient";
import { AuthContext } from "../../../auth/AuthContext";
import type { OnCloseProps } from "../../lib/utility";
import { formatCurrency } from "../../lib/utility";
import { useOutsideClickStrict } from "../../lib/utilityHooks";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  overlay:    "rgba(0,0,0,0.55)",
};

const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface TransactionSnapshot {
  id:               number;
  amount:           number;
  transaction_type: string;
  category_id:      number;
  category_name:    string;
  description?:     string;
  transaction_date: string;
}

interface PersonInfo {
  first_name: string;
  last_name:  string;
}

interface DeletionRequestHistory {
  id:             number;
  transaction_id: number;
  requested_by:   number;
  status:         "pending" | "approved" | "rejected";
  requested_at:   string;
  reviewed_by?:   number;
  reviewed_at?:   string;
  requester?:     PersonInfo;
  reviewer?:      PersonInfo;
  transaction?:   TransactionSnapshot;
}

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({ children, onBackdropDown, onBackdropUp }: {
  children:       React.ReactNode;
  onBackdropDown: React.MouseEventHandler;
  onBackdropUp:   React.MouseEventHandler;
}) {
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
          maxWidth:      "1100px",
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

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
    pending: {
      color: C.warning,
      bg:    "hsl(45 85% 50% / 0.12)",
      icon:  <Clock style={{ width: "0.6rem", height: "0.6rem" }} />,
    },
    approved: {
      color: C.income,
      bg:    "hsl(160 60% 45% / 0.12)",
      icon:  <CheckCircle2 style={{ width: "0.6rem", height: "0.6rem" }} />,
    },
    rejected: {
      color: C.expense,
      bg:    "hsl(0 72% 51% / 0.12)",
      icon:  <XCircle style={{ width: "0.6rem", height: "0.6rem" }} />,
    },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      display:         "inline-flex",
      alignItems:      "center",
      gap:             "0.25rem",
      padding:         "0.15rem 0.55rem",
      borderRadius:    "999px",
      fontSize:        "0.68rem",
      fontWeight:      700,
      backgroundColor: s.bg,
      color:           s.color,
      border:          `1px solid ${s.color}40`,
      textTransform:   "capitalize",
    }}>
      {s.icon}
      {status}
    </span>
  );
}

// ── Expandable detail row ─────────────────────────────────────────────────────
function ExpandedRow({ entry, isAdmin }: { entry: DeletionRequestHistory; isAdmin: boolean }) {
  const tx     = entry.transaction;
  const isInc  = tx?.transaction_type !== "Expense";
  const amtClr = isInc ? C.income : C.expense;

  const fmt = (amount: number, type?: string) => {
    const n = formatCurrency(amount).replace("₱ ", "");
    return type === "Expense" ? `₱ -${n}` : `₱ +${n}`;
  };

  return (
    <tr>
      <td
        colSpan={isAdmin ? 7 : 6}
        style={{
          padding:    0,
          borderBottom: `1px solid ${C.border}`,
          background: "hsl(220,20%,10%)",
        }}
      >
        <div style={{
          display:             "grid",
          gridTemplateColumns: tx ? "1fr 1fr" : "1fr",
          gap:                 "1.25rem",
          padding:             "1rem 1.5rem",
        }}>
          {/* Request details */}
          <div>
            <p style={{
              fontSize:      "0.68rem",
              fontWeight:    700,
              color:         C.fgMuted,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              margin:        "0 0 0.6rem",
            }}>
              Request Details
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              <Row label="Request ID"   value={`#${entry.id}`} />
              <Row label="Requested At" value={new Date(entry.requested_at).toLocaleString()} />
              {entry.reviewer && (
                <Row
                  label={isAdmin ? "Reviewed By (you)" : "Reviewed By"}
                  value={`${entry.reviewer.first_name} ${entry.reviewer.last_name}`}
                />
              )}
              {entry.reviewed_at && (
                <Row label="Reviewed At" value={new Date(entry.reviewed_at).toLocaleString()} />
              )}
              {isAdmin && entry.requester && (
                <Row
                  label="Requested By"
                  value={`${entry.requester.first_name} ${entry.requester.last_name}`}
                />
              )}
            </div>
          </div>

          {/* Transaction snapshot */}
          {tx ? (
            <div>
              <p style={{
                fontSize:      "0.68rem",
                fontWeight:    700,
                color:         C.fgMuted,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                margin:        "0 0 0.6rem",
              }}>
                Transaction Snapshot
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                <Row label="Tx ID"       value={`#${tx.id}`} />
                <Row label="Type"        value={tx.transaction_type} accent={amtClr} />
                <Row label="Amount"      value={fmt(tx.amount, tx.transaction_type)} accent={amtClr} />
                <Row label="Category"    value={tx.category_name} />
                <Row label="Date"        value={tx.transaction_date} />
                <Row label="Description" value={tx.description || "—"} />
              </div>
            </div>
          ) : (
            <div style={{
              display:        "flex",
              alignItems:     "center",
              gap:            "0.5rem",
              background:     "hsl(45 85% 50% / 0.07)",
              border:         `1px solid hsl(45 85% 50% / 0.2)`,
              borderRadius:   "0.5rem",
              padding:        "0.75rem",
              alignSelf:      "start",
            }}>
              <AlertTriangle style={{ width: "0.85rem", height: "0.85rem", color: C.warning, flexShrink: 0 }} />
              <p style={{ color: "hsl(45,85%,70%)", fontSize: "0.75rem", margin: 0 }}>
                Transaction record no longer available.
              </p>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function Row({ label, value, accent }: { label: string; value: React.ReactNode; accent?: string }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", alignItems: "baseline" }}>
      <span style={{
        fontSize:      "0.68rem",
        fontWeight:    600,
        color:         C.fgMuted,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        minWidth:      "100px",
        flexShrink:    0,
      }}>
        {label}
      </span>
      <span style={{ fontSize: "0.78rem", color: accent ?? C.fg }}>{value}</span>
    </div>
  );
}

// ── Filter pill button ────────────────────────────────────────────────────────
type FilterStatus = "all" | "pending" | "approved" | "rejected";

function FilterPill({ value, active, count, onClick }: {
  value:   FilterStatus;
  active:  boolean;
  count:   number;
  onClick: () => void;
}) {
  const colorMap: Record<FilterStatus, string> = {
    all:      C.primary,
    pending:  C.warning,
    approved: C.income,
    rejected: C.expense,
  };
  const color = colorMap[value];
  return (
    <button
      onClick={onClick}
      style={{
        display:         "flex",
        alignItems:      "center",
        gap:             "0.35rem",
        padding:         "0.3rem 0.75rem",
        borderRadius:    "999px",
        fontSize:        "0.72rem",
        fontWeight:      600,
        cursor:          "pointer",
        border:          `1px solid ${active ? color : C.border}`,
        background:      active ? `${color}18` : "transparent",
        color:           active ? color : C.fgMuted,
        transition:      "all 0.15s",
        textTransform:   "capitalize",
      }}
    >
      {value === "all" ? "All" : value}
      <span style={{
        background:   active ? `${color}30` : C.surfaceEl,
        color:        active ? color : C.fgMuted,
        borderRadius: "999px",
        padding:      "0 0.35rem",
        fontSize:     "0.65rem",
        fontWeight:   700,
      }}>
        {count}
      </span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeletionRequestHistoryModal({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const isAdmin = user?.role_id === 1;

  const [history,    setHistory]    = useState<DeletionRequestHistory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [filter,     setFilter]     = useState<FilterStatus>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      if (!token || !tokenType) return;
      try {
        const res = await api.get("api/transactions/deletion-requests/my-history", {
          headers: { Authorization: `${tokenType} ${token}` },
        });
        setHistory(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        setError(err.response?.data?.detail || "Failed to load history.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [token, tokenType]);

  // Counts per status
  const counts = {
    all:      history.length,
    pending:  history.filter(h => h.status === "pending").length,
    approved: history.filter(h => h.status === "approved").length,
    rejected: history.filter(h => h.status === "rejected").length,
  };

  const filtered = filter === "all" ? history : history.filter(h => h.status === filter);

  const fmt = (amount: number, type?: string) => {
    const n = formatCurrency(amount).replace("₱ ", "");
    return type === "Expense" ? `₱ -${n}` : `₱ +${n}`;
  };

  const toggleExpand = (id: number) =>
    setExpandedId(prev => (prev === id ? null : id));

  return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "1.25rem 1.5rem",
        borderBottom:   `1px solid ${C.border}`,
        flexShrink:     0,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <History style={{ width: "1rem", height: "1rem", color: C.primary }} />
            <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
              Deletion Request History
            </h2>
          </div>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            {isAdmin
              ? "Requests you reviewed (approved & rejected) - Pendings are in Users Section"
              : "Your deletion requests — all statuses"}
          </p>
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
          }}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────────────── */}
      {!loading && history.length > 0 && (
        <div style={{
          display:      "flex",
          gap:          "0.5rem",
          padding:      "0.75rem 1.5rem",
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
          flexWrap:     "wrap",
        }}>
          {(["all", "pending", "approved", "rejected"] as FilterStatus[])
            // Admins don't see the "pending" filter — they have no pending rows
            .filter(f => !(isAdmin && f === "pending"))
            .map(f => (
              <FilterPill
                key={f}
                value={f}
                active={filter === f}
                count={counts[f]}
                onClick={() => setFilter(f)}
              />
            ))}
        </div>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>

        {loading && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>
        )}

        {error && (
          <div style={{
            margin:       "1rem 1.5rem",
            display:      "flex",
            alignItems:   "center",
            gap:          "0.5rem",
            background:   "hsl(0 72% 51% / 0.08)",
            border:       `1px solid ${C.expense}40`,
            borderRadius: "0.5rem",
            padding:      "0.6rem 0.75rem",
          }}>
            <AlertTriangle style={{ width: "0.85rem", height: "0.85rem", color: C.expense, flexShrink: 0 }} />
            <p style={{ color: "hsl(0,72%,70%)", fontSize: "0.78rem", margin: 0 }}>{error}</p>
          </div>
        )}

        {!loading && history.length === 0 && !error && (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <Receipt style={{ width: "2rem", height: "2rem", color: C.fgMuted, margin: "0 auto 0.75rem" }} />
            <p style={{ color: C.fgMuted, fontSize: "0.85rem", margin: 0 }}>
              {isAdmin
                ? "You haven't reviewed any deletion requests yet."
                : "You haven't submitted any deletion requests yet."}
            </p>
          </div>
        )}

        {!loading && filtered.length === 0 && history.length > 0 && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center", fontSize: "0.82rem" }}>
            No {filter} requests.
          </p>
        )}

        {!loading && filtered.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "4%"  }} /> {/* expand */}
              <col style={{ width: "6%"  }} /> {/* ID */}
              <col style={{ width: "8%"  }} /> {/* Tx ID */}
              {isAdmin && <col style={{ width: "15%" }} />} {/* Requested By */}
              <col style={{ width: "11%" }} /> {/* Type */}
              <col style={{ width: "12%" }} /> {/* Amount */}
              <col style={{ width: "10%" }} /> {/* Status */}
              <col style={{ width: isAdmin ? "17%" : "22%" }} /> {/* Requested At */}
              <col style={{ width: isAdmin ? "17%" : "22%" }} /> {/* Reviewed At */}
            </colgroup>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <th style={{ ...thStyle, width: "4%" }} />
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Tx ID</th>
                {isAdmin && <th style={thStyle}>Requested By</th>}
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Requested At</th>
                <th style={thStyle}>{isAdmin ? "Reviewed At" : "Reviewed At"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => {
                const isEven    = idx % 2 === 0;
                const hovered   = hoveredRow === idx;
                const expanded  = expandedId === entry.id;
                const tx        = entry.transaction;
                const isInc     = tx?.transaction_type !== "Expense";
                const amtColor  = isInc ? C.income : C.expense;

                return (
                  <>
                    <tr
                      key={entry.id}
                      style={{
                        backgroundColor: expanded
                          ? C.surfaceEl
                          : hovered
                          ? C.surfaceHov
                          : isEven ? "transparent" : "hsl(220,14%,14%)",
                        cursor:     "pointer",
                        transition: "background-color 0.1s",
                      }}
                      onClick={() => toggleExpand(entry.id)}
                      onMouseEnter={() => setHoveredRow(idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      {/* Expand toggle */}
                      <td style={{ ...td, textAlign: "center", color: C.fgMuted }}>
                        {expanded
                          ? <ChevronUp   style={{ width: "0.75rem", height: "0.75rem" }} />
                          : <ChevronDown style={{ width: "0.75rem", height: "0.75rem" }} />
                        }
                      </td>

                      <td style={td}>{entry.id}</td>
                      <td style={td}>{entry.transaction_id}</td>

                      {isAdmin && (
                        <td style={td}>
                          {entry.requester
                            ? `${entry.requester.first_name} ${entry.requester.last_name}`
                            : `User #${entry.requested_by}`}
                        </td>
                      )}

                      {/* Type badge */}
                      <td style={td}>
                        {tx ? (
                          <span style={{
                            display:         "inline-block",
                            padding:         "0.12rem 0.5rem",
                            borderRadius:    "999px",
                            fontSize:        "0.68rem",
                            fontWeight:      700,
                            backgroundColor: isInc ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)",
                            color:           amtColor,
                            border:          `1px solid ${amtColor}40`,
                          }}>
                            {tx.transaction_type}
                          </span>
                        ) : <span style={{ color: C.fgMuted }}>—</span>}
                      </td>

                      {/* Amount */}
                      <td style={{ ...td, color: tx ? amtColor : C.fgMuted, fontWeight: tx ? 600 : 400 }}>
                        {tx ? fmt(tx.amount, tx.transaction_type) : "—"}
                      </td>

                      {/* Status */}
                      <td style={td}>
                        <StatusBadge status={entry.status} />
                      </td>

                      {/* Requested At */}
                      <td style={{ ...td, color: C.fgMuted }}>
                        {new Date(entry.requested_at).toLocaleString()}
                      </td>

                      {/* Reviewed At */}
                      <td style={{ ...td, color: C.fgMuted }}>
                        {entry.reviewed_at
                          ? new Date(entry.reviewed_at).toLocaleString()
                          : <span style={{ color: C.fgMuted, fontStyle: "italic" }}>Pending review</span>
                        }
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {expanded && (
                      <ExpandedRow key={`exp-${entry.id}`} entry={entry} isAdmin={isAdmin} />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{
          padding:    "0.6rem 1.5rem",
          borderTop:  `1px solid ${C.border}`,
          fontSize:   "0.72rem",
          color:      C.fgMuted,
          flexShrink: 0,
        }}>
          Showing {filtered.length} of {history.length} request{history.length !== 1 ? "s" : ""}
          {filtered.length > 15 ? " · scroll to see more" : ""}
          {" · Click any row to expand details"}
        </div>
      )}
    </Shell>
  );
}

// ── Th style helper ───────────────────────────────────────────────────────────
const thStyle: React.CSSProperties = {
  padding:       "0.6rem 0.75rem",
  fontSize:      "0.7rem",
  fontWeight:    600,
  color:         "hsl(220,10%,55%)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom:  "1px solid hsl(220,16%,22%)",
  background:    "hsl(220,18%,16%)",
  textAlign:     "left",
  whiteSpace:    "nowrap",
};