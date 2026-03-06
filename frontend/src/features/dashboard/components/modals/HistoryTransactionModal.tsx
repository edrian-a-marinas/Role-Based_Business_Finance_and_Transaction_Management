import { useEffect, useState, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { ReadTransactionHistory, Category } from "@/features/dashboard/schemas/transaction";
import { formatDate } from "@/features/dashboard/lib/utilsFormatFetch";
import type { OnCloseProps } from "@/features/dashboard/lib/utilsFormatFetch";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilsHooks";
// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(30,90%,56%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  overlay:    "rgba(0,0,0,0.55)",
};
const ACTION_COLOR: Record<string, string> = {
  UPDATE: C.warning,
  DELETE: C.expense,
};
// ── Types ─────────────────────────────────────────────────────────────────────
type SortField    = "entity_id" | "user_id" | "category" | "action" | "action_taken_at";
type SortDir      = "asc" | "desc";
type ActionFilter = "all" | "UPDATE" | "DELETE";
// ── Base TD style ─────────────────────────────────────────────────────────────
const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};
// ── Portal Dropdown ───────────────────────────────────────────────────────────
interface PortalDropdownProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}
function PortalDropdown({ anchorRef, open, onClose, children }: PortalDropdownProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top:      rect.bottom + window.scrollY + 4,
      left:     rect.left   + window.scrollX,
      minWidth: rect.width,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position:     "fixed",
        top:          pos.top,
        left:         pos.left,
        minWidth:     Math.max(pos.minWidth, 130),
        background:   C.surfaceEl,
        border:       `1px solid ${C.border}`,
        borderRadius: "0.4rem",
        zIndex:       99999,
        boxShadow:    "0 8px 24px rgba(0,0,0,0.5)",
        overflow:     "hidden",
        maxHeight:    "220px",
        overflowY:    "auto",
      }}
    >
      {children}
    </div>,
    document.body
  );
}
// ── ActionDropdown ────────────────────────────────────────────────────────────
interface ActionDropdownProps {
  value:    ActionFilter;
  onChange: (v: ActionFilter) => void;
}
function ActionDropdown({ value, onChange }: ActionDropdownProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const options: { value: ActionFilter; label: string }[] = [
    { value: "all",    label: "All Actions" },
    { value: "UPDATE", label: "Updated"     },
    { value: "DELETE", label: "Deleted"     },
  ];
  const current = options.find(o => o.value === value)!;
  return (
    <div style={{ position: "relative" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen(p => !p)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "0.3rem",
          background:   C.surfaceEl,
          border:       `1px solid ${C.border}`,
          borderRadius: "0.4rem",
          color:        value === "all" ? C.fgMuted : ACTION_COLOR[value] ?? C.fgMuted,
          fontSize:     "0.72rem",
          fontWeight:   600,
          padding:      "0.25rem 0.5rem",
          cursor:       "pointer",
          whiteSpace:   "nowrap",
        }}
      >
        {current.label}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      <PortalDropdown
        anchorRef={btnRef}
        open={open}
        onClose={() => setOpen(false)}
      >
        {options.map(o => (
          <button
            key={o.value}
            onMouseDown={e => e.stopPropagation()}
            onClick={() => { onChange(o.value); setOpen(false); }}
            style={{
              display:    "block",
              width:      "100%",
              textAlign:  "left",
              padding:    "0.4rem 0.75rem",
              background: o.value === value ? C.surfaceHov : "transparent",
              border:     "none",
              color:      o.value === "all" ? C.fg : ACTION_COLOR[o.value] ?? C.fg,
              fontSize:   "0.75rem",
              cursor:     "pointer",
            }}
          >
            {o.label}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}
// ── HOISTED: SortIcon ────────────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  const s = { width: "0.7rem", height: "0.7rem" };
  if (active !== field) return <ArrowUpDown style={{ ...s, opacity: 0.35 }} />;
  return dir === "asc"
    ? <ArrowUp   style={{ ...s, color: C.primary }} />
    : <ArrowDown style={{ ...s, color: C.primary }} />;
}
// ── HOISTED: Shell ────────────────────────────────────────────────────────────
interface ShellProps {
  children:        React.ReactNode;
  onBackdropDown?: React.MouseEventHandler;
  onBackdropUp?:   React.MouseEventHandler;
}
function Shell({ children, onBackdropDown, onBackdropUp }: ShellProps) {
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
          maxWidth:      "1400px",
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
// ── Main ──────────────────────────────────────────────────────────────────────
export default function HistoryTransaction({ onClose }: OnCloseProps) {
  const { user }  = useContext(AuthContext);
  const userRole  = user!.role_id;
  const isAdmin   = userRole === 1;
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");
  const [history,      setHistory]      = useState<ReadTransactionHistory[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [viewMode,     setViewMode]     = useState<"all" | "own">("all");
  const [sortField,    setSortField]    = useState<SortField>("action_taken_at");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!token || !tokenType) return;
        const [transRes, catRes] = await Promise.all([
          api.get("api/transactions/history", {
            headers: { Authorization: `${tokenType} ${token}` },
          }),
          api.get("api/categories/"),
        ]);
        setHistory(transRes.data);
        setCategories(catRes.data);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, tokenType]);
  const getCategoryName = (id: number) =>
    categories.find(c => c.id === id)?.name ?? "Unknown";
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };
  // ── Filter + sort ─────────────────────────────────────────────────────────
  const processed = (() => {
    let rows = [...history];
    if (viewMode === "own") rows = rows.filter(r => r.user_id === user?.id);
    if (actionFilter !== "all") {
      rows = rows.filter(r => {
        const a = (r.action ?? "").toLowerCase();
        if (actionFilter === "UPDATE") return a === "update" || a === "updated";
        if (actionFilter === "DELETE") return a === "delete" || a === "deleted";
        return true;
      });
    }
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "entity_id":       cmp = a.entity_id - b.entity_id; break;
        case "user_id":         cmp = a.user_id - b.user_id; break;
        case "category":        cmp = getCategoryName(a.category_id).localeCompare(getCategoryName(b.category_id)); break;
        case "action":          cmp = (a.action ?? "").localeCompare(b.action ?? ""); break;
        case "action_taken_at": cmp = new Date(a.action_taken_at).getTime() - new Date(b.action_taken_at).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  })();
  const Th = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const active = sortField === field;
    return (
      <th style={{
        padding:       "0.6rem 0.75rem",
        fontSize:      "0.7rem",
        fontWeight:    600,
        color:         active ? C.primary : C.fgMuted,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        borderBottom:  `1px solid ${C.border}`,
        background:    C.surfaceEl,
        userSelect:    "none",
      }}>
        <button
          onClick={() => handleSort(field)}
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "0.25rem",
            background: "none",
            border:     "none",
            color:      "inherit",
            fontSize:   "inherit",
            fontWeight: "inherit",
            cursor:     "pointer",
            padding:    0,
            whiteSpace: "nowrap",
          }}
        >
          {children}
          <SortIcon field={field} active={sortField} dir={sortDir} />
        </button>
      </th>
    );
  };
  const ThPlain = ({ children }: { children: React.ReactNode }) => (
    <th style={{
      padding:       "0.6rem 0.75rem",
      fontSize:      "0.7rem",
      fontWeight:    600,
      color:         C.fgMuted,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      borderBottom:  `1px solid ${C.border}`,
      background:    C.surfaceEl,
      whiteSpace:    "nowrap",
    }}>
      {children}
    </th>
  );
  const updateCount = history.filter(r => (r.action ?? "").toLowerCase() === "updated" || (r.action ?? "").toLowerCase() === "update").length;
  const deleteCount = history.filter(r => (r.action ?? "").toLowerCase() === "deleted" || (r.action ?? "").toLowerCase() === "delete").length;
  return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "1.25rem 1.5rem",
        borderBottom:   `1px solid ${C.border}`,
        flexShrink:     0,
      }}>
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>
            Transaction History
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            {processed.length} record{processed.length !== 1 ? "s" : ""}
            {actionFilter !== "all" ? ` · ${actionFilter === "UPDATE" ? "Updated" : "Deleted"} only` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isAdmin && (
            <select
              value={viewMode}
              onChange={e => setViewMode(e.target.value as "all" | "own")}
              style={{
                background:   C.surfaceEl,
                border:       `1px solid ${C.border}`,
                borderRadius: "0.4rem",
                color:        C.fg,
                fontSize:     "0.75rem",
                padding:      "0.3rem 0.5rem",
                cursor:       "pointer",
                outline:      "none",
              }}
            >
              <option value="all">All Users</option>
              <option value="own">My History</option>
            </select>
          )}
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
      </div>
      {/* ── Summary pills ────────────────────────────────────────────────────── */}
      {!loading && history.length > 0 && (
        <div style={{
          display:      "flex",
          gap:          "0.75rem",
          padding:      "0.75rem 1.5rem",
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
        }}>
          {([["UPDATE", updateCount], ["DELETE", deleteCount]] as const).map(([action, count]) => (
            <div key={action} style={{
              background:   `${ACTION_COLOR[action]}18`,
              border:       `1px solid ${ACTION_COLOR[action]}40`,
              borderRadius: "0.4rem",
              padding:      "0.3rem 0.75rem",
              fontSize:     "0.75rem",
            }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>
                {action === "UPDATE" ? "Updated" : "Deleted"}
              </span>
              <span style={{ color: ACTION_COLOR[action], fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      )}
      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
        {loading && (
          <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>
        )}
        {!loading && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "5%" }}  />
              {isAdmin && <col style={{ width: "5%" }} />}
              <col style={{ width: "13%" }} />
              <col style={{ width: "8%" }}  />
              <col style={{ width: "9%" }}  />
              <col style={{ width: "12%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "8%" }}  />
              <col style={{ width: "8%" }}  />
            </colgroup>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <Th field="entity_id">Tx ID</Th>
                {isAdmin && <Th field="user_id">User ID</Th>}
                <Th field="category">Category</Th>
                <ThPlain>Type</ThPlain>
                <th style={{
                  padding:       "0.6rem 0.75rem",
                  fontSize:      "0.7rem",
                  fontWeight:    600,
                  color:         C.fgMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom:  `1px solid ${C.border}`,
                  background:    C.surfaceEl,
                }}>
                  <ActionDropdown value={actionFilter} onChange={setActionFilter} />
                </th>
                <Th field="action_taken_at">Action At</Th>
                <ThPlain>Old Description</ThPlain>
                <ThPlain>New Description</ThPlain>
                <ThPlain>Old Date</ThPlain>
                <ThPlain>New Date</ThPlain>
              </tr>
            </thead>
            <tbody>
              {processed.length === 0 ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 10 : 9}
                    style={{ padding: "2rem", textAlign: "center", color: C.fgMuted, fontSize: "0.85rem" }}
                  >
                    {actionFilter !== "all"
                      ? `No ${actionFilter === "UPDATE" ? "update" : "delete"} records found.`
                      : "No history records found."}
                  </td>
                </tr>
              ) : processed.map((tx, idx) => {
                const isEven      = idx % 2 === 0;
                const actionLower = (tx.action ?? "").toLowerCase();
                const isUpdate    = actionLower === "update" || actionLower === "updated";
                const actionColor = isUpdate ? ACTION_COLOR["UPDATE"] : ACTION_COLOR["DELETE"];
                const isIncome    = tx.transaction_type === "Income";
                const descChanged = tx.old_description !== tx.new_description;
                const dateChanged = tx.old_transaction_date !== tx.new_transaction_date;
                return (
                  <tr
                    key={tx.id}
                    style={{
                      backgroundColor: isEven ? "transparent" : "hsl(220,14%,14%)",
                      transition:      "background-color 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHov)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isEven ? "transparent" : "hsl(220,14%,14%)")}
                  >
                    <td style={td}>{tx.entity_id}</td>
                    {isAdmin && <td style={td}>{tx.user_id}</td>}
                    <td style={td}>{getCategoryName(tx.category_id)}</td>
                    <td style={td}>
                      <span style={{
                        display:         "inline-block",
                        padding:         "0.15rem 0.5rem",
                        borderRadius:    "999px",
                        fontSize:        "0.68rem",
                        fontWeight:      600,
                        backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)",
                        color:           isIncome ? C.income : C.expense,
                        border:          `1px solid ${isIncome ? C.income : C.expense}40`,
                      }}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td style={td}>
                      <span style={{
                        display:         "inline-block",
                        padding:         "0.15rem 0.5rem",
                        borderRadius:    "999px",
                        fontSize:        "0.68rem",
                        fontWeight:      600,
                        backgroundColor: `${actionColor}18`,
                        color:           actionColor,
                        border:          `1px solid ${actionColor}40`,
                      }}>
                        {tx.action}
                      </span>
                    </td>
                    <td style={{ ...td, color: C.fgMuted }}>{formatDate(tx.action_taken_at)}</td>
                    <td style={{ ...td, color: descChanged ? C.expense : C.fgMuted, whiteSpace: "normal", wordBreak: "break-word" }}>
                      {tx.old_description || "—"}
                    </td>
                    <td style={{ ...td, color: descChanged ? C.income : C.fgMuted, whiteSpace: "normal", wordBreak: "break-word" }}>
                      {tx.new_description || "—"}
                    </td>
                    <td style={{ ...td, color: dateChanged ? C.expense : C.fgMuted }}>
                      {tx.old_transaction_date || "—"}
                    </td>
                    <td style={{ ...td, color: dateChanged ? C.income : C.fgMuted }}>
                      {tx.new_transaction_date || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      {!loading && processed.length > 0 && (
        <div style={{
          padding:    "0.6rem 1.5rem",
          borderTop:  `1px solid ${C.border}`,
          fontSize:   "0.72rem",
          color:      C.fgMuted,
          flexShrink: 0,
        }}>
          Showing {processed.length} record{processed.length !== 1 ? "s" : ""}
          {processed.length > 15 ? " · scroll to see more" : ""}
        </div>
      )}
    </Shell>
  );
}