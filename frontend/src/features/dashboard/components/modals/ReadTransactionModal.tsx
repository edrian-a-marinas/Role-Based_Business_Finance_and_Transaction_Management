import { useState, useContext, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { formatDate, formatCurrency } from "@/features/dashboard/lib/utility";
import type { OnCloseProps } from "@/features/dashboard/lib/utility";
import type { Category, ReadTransaction } from "@/features/dashboard/schemas/transaction";
import type { CategoryRead } from "@/features/dashboard/schemas/category";
import { useOutsideClickStrict } from "@/features/dashboard/lib/utilityHooks";
import { ShellTable } from "./shared/Shell";
import { C } from "./shared";
import TransactionDetailModal from "./SpecificTransactionModal";

// ── Types ─────────────────────────────────────────────────────────────────────
type SortField  = "id" | "user_id" | "category" | "amount" | "transaction_date" | "created_at";
type SortDir    = "asc" | "desc";
type TypeFilter = "all" | "Income" | "Expense";

// ── Base TD style ─────────────────────────────────────────────────────────────
const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  whiteSpace:   "nowrap",
};

// ── PortalDropdown ────────────────────────────────────────────────────────────
interface PortalDropdownProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open:      boolean;
  onClose:   () => void;
  children:  React.ReactNode;
}
function PortalDropdown({ anchorRef, open, onClose, children }: PortalDropdownProps) {
  const [pos, setPos] = useState({ top: 0, left: 0, minWidth: 0 });
  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, minWidth: rect.width });
  }, [open, anchorRef]);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return createPortal(
    <div style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: Math.max(pos.minWidth, 130), background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", zIndex: 99999, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", overflow: "hidden", maxHeight: "220px", overflowY: "auto" }}>
      {children}
    </div>,
    document.body
  );
}

// ── TypeDropdown ──────────────────────────────────────────────────────────────
function TypeDropdown({ value, onChange }: { value: TypeFilter; onChange: (v: TypeFilter) => void }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const options: { value: TypeFilter; label: string }[] = [
    { value: "all",     label: "All Types"    },
    { value: "Income",  label: "Income Only"  },
    { value: "Expense", label: "Expense Only" },
  ];
  const current = options.find(o => o.value === value)!;
  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} onClick={() => setOpen(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: value === "Income" ? C.income : value === "Expense" ? C.expense : C.fgMuted, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
        {current.label}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      <PortalDropdown anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        {options.map(o => (
          <button key={o.value} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(o.value); setOpen(false); }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "0.4rem 0.75rem", background: o.value === value ? C.surfaceHov : "transparent", border: "none", color: o.value === "Income" ? C.income : o.value === "Expense" ? C.expense : C.fg, fontSize: "0.75rem", cursor: "pointer" }}>
            {o.label}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ── MonthDropdown ─────────────────────────────────────────────────────────────
function MonthDropdown({ value, options, onChange }: { value: string; options: { key: string; label: string }[]; onChange: (v: string) => void }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const btnRef   = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const current  = options.find(o => o.key === value) ?? options[0];
  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()) || o.key.includes(search))
    : options;
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setSearch("");
  }, [open]);
  return (
    <div style={{ position: "relative" }}>
      <button ref={btnRef} onClick={() => setOpen(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: value === "all" ? C.fgMuted : C.primary, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}>
        {current?.label ?? "All Months"}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      <PortalDropdown anchorRef={btnRef} open={open} onClose={() => setOpen(false)}>
        <div style={{ padding: "0.35rem 0.5rem", borderBottom: `1px solid ${C.border}` }}>
          <input ref={inputRef} value={search} onChange={e => setSearch(e.target.value)} onMouseDown={e => e.stopPropagation()}
            placeholder="Search month…"
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "0.3rem", color: C.fg, fontSize: "0.72rem", padding: "0.25rem 0.45rem", outline: "none", boxSizing: "border-box" }} />
        </div>
        {filtered.length === 0 && <p style={{ color: C.fgMuted, fontSize: "0.72rem", padding: "0.5rem 0.75rem", margin: 0 }}>No match</p>}
        {filtered.map(o => (
          <button key={o.key} onMouseDown={e => e.stopPropagation()} onClick={() => { onChange(o.key); setOpen(false); }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "0.4rem 0.75rem", background: o.key === value ? C.surfaceHov : "transparent", border: "none", color: o.key === "all" ? C.fg : C.primary, fontSize: "0.75rem", cursor: "pointer" }}>
            {o.label}
          </button>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ── SortIcon ──────────────────────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  const size = { width: "0.7rem", height: "0.7rem" };
  if (active !== field) return <ArrowUpDown style={{ ...size, opacity: 0.35 }} />;
  return dir === "asc" ? <ArrowUp style={{ ...size, color: C.primary }} /> : <ArrowDown style={{ ...size, color: C.primary }} />;
}

const thBase: React.CSSProperties = {
  padding:       "0.6rem 0.75rem",
  fontSize:      "0.7rem",
  fontWeight:    600,
  color:         C.fgMuted,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom:  `1px solid ${C.border}`,
  background:    C.surfaceEl,
};

// ── Main ──────────────────────────────────────────────────────────────────────
interface ReadTransactionsProps extends OnCloseProps {
  initialTypeFilter?:  TypeFilter;
  initialMonthFilter?: string;
  initialViewMode?:    "all" | "own";
}
export default function ReadTransactions({ onClose, initialTypeFilter = "all", initialMonthFilter = "all", initialViewMode }: ReadTransactionsProps) {
  const { user }  = useContext(AuthContext);
  const isAdmin   = user!.role_id === 1;
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  // ── Read from React Query cache (same keys as DashboardPage prefetch) ─────
  // No new network requests — data is already in cache from DashboardPage.
  const { data: transactions = [], isLoading: txLoading } = useQuery<ReadTransaction[]>({
    queryKey: ["transactions"],
    queryFn:  () => api.get<ReadTransaction[]>("api/transactions/").then(r =>
      r.data.filter(t => !t.deleted_at).map(t => ({ ...t, amount: parseFloat(String(t.amount)) }))
    ),
    staleTime: Infinity,
  });
  const { data: categories = [], isLoading: catLoading } = useQuery<CategoryRead[]>({
    queryKey: ["categories"],
    queryFn:  () => api.get<CategoryRead[]>("api/categories/").then(r => r.data),
    staleTime: Infinity,
  });
  const loading = txLoading || catLoading;

  // ── Build a lookup map once — O(1) per lookup instead of O(n) per sort ───
  const categoryMap = useMemo(
    () => new Map(categories.map(c => [c.id, c.name])),
    [categories]
  );
  const getCategoryName = (id: number) => categoryMap.get(id) ?? "Unknown";

  const [viewMode,     setViewMode]     = useState<"all" | "own">(initialViewMode ?? (isAdmin ? "all" : "own"));
  const [sortField,    setSortField]    = useState<SortField>("transaction_date");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");
  const [typeFilter,   setTypeFilter]   = useState<TypeFilter>(initialTypeFilter);
  const [monthFilter,  setMonthFilter]  = useState<string>(initialMonthFilter);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [selectedTx,   setSelectedTx]  = useState<ReadTransaction | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortField(field); setSortDir(field === "id" ? "desc" : "asc"); }
  };

  const availableMonths = useMemo(() => {
    let txs = [...transactions];
    if (viewMode === "own") txs = txs.filter(t => t.user_id === user?.id);
    const monthSet = new Set<string>();
    txs.forEach(t => { const ym = t.transaction_date?.slice(0, 7); if (ym) monthSet.add(ym); });
    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    return [
      { key: "all", label: "All Months" },
      ...sorted.map(ym => {
        const [year, month] = ym.split("-");
        const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
        return { key: ym, label };
      }),
    ];
  }, [transactions, viewMode, user]);

  // ── categoryNames pre-resolved per transaction — computed once per filter ─
  // Avoids calling getCategoryName inside the sort comparator on every swap.
  const processed = useMemo(() => {
    let txs = [...transactions];
    if (viewMode    === "own") txs = txs.filter(t => t.user_id === user?.id);
    if (monthFilter !== "all") txs = txs.filter(t => t.transaction_date?.startsWith(monthFilter));
    if (typeFilter  !== "all") txs = txs.filter(t => t.transaction_type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      txs = txs.filter(t =>
        String(t.id).includes(q) ||
        getCategoryName(t.category_id).toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }
    // Attach resolved category name once per row so sort never calls getCategoryName
    const withName = txs.map(t => ({ ...t, _catName: getCategoryName(t.category_id) }));
    withName.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "id":               cmp = a.id - b.id; break;
        case "user_id":          cmp = a.user_id - b.user_id; break;
        case "category":         cmp = a._catName.localeCompare(b._catName); break;
        case "amount":           cmp = parseFloat(String(a.amount)) - parseFloat(String(b.amount)); break;
        case "transaction_date": cmp = a.transaction_date.localeCompare(b.transaction_date); break;
        case "created_at":       cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return withName;
  }, [transactions, viewMode, monthFilter, typeFilter, searchQuery, sortField, sortDir, categoryMap, user]);

  const Th = ({ field, children }: { field: SortField; children: React.ReactNode }) => {
    const active = sortField === field;
    return (
      <th style={{ ...thBase, color: active ? C.primary : C.fgMuted, userSelect: "none", whiteSpace: "nowrap" }}>
        <button onClick={() => handleSort(field)}
          style={{ display: "flex", alignItems: "center", gap: "0.25rem", background: "none", border: "none", color: "inherit", fontSize: "inherit", fontWeight: "inherit", cursor: "pointer", padding: 0 }}>
          {children}
          <SortIcon field={field} active={sortField} dir={sortDir} />
        </button>
      </th>
    );
  };

  const totalIncome  = processed.filter(t => t.transaction_type === "Income") .reduce((s, t) => s + parseFloat(String(t.amount)), 0);
  const totalExpense = processed.filter(t => t.transaction_type === "Expense").reduce((s, t) => s + parseFloat(String(t.amount)), 0);
  const net = totalIncome - totalExpense;

  return (
    <ShellTable onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search…"
          style={{ background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: C.fg, fontSize: "0.78rem", padding: "0.3rem 0.65rem", outline: "none", width: "180px" }}
          onFocus={e => (e.target.style.borderColor = C.primary)}
          onBlur={e  => (e.target.style.borderColor = C.border)} />
        <div>
          <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>View Transactions</h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            {processed.length} record{processed.length !== 1 ? "s" : ""}
            {typeFilter  !== "all" ? ` · ${typeFilter} only` : ""}
            {monthFilter !== "all" ? ` · ${availableMonths.find(m => m.key === monthFilter)?.label ?? monthFilter}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {isAdmin && (
            <select value={viewMode} onChange={e => setViewMode(e.target.value as "all" | "own")}
              style={{ background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: C.fg, fontSize: "0.75rem", padding: "0.3rem 0.5rem", cursor: "pointer", outline: "none" }}>
              <option value="all">All Users</option>
              <option value="own">My Transactions</option>
            </select>
          )}
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer", padding: "0.3rem", display: "flex", alignItems: "center" }}>
            <X style={{ width: "1rem", height: "1rem" }} />
          </button>
        </div>
      </div>

      {/* Summary pills */}
      {!loading && processed.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {[
            { label: "Income",  value: `+₱${totalIncome.toLocaleString()}`,  color: C.income,  bg: "hsl(160 60% 45% / 0.1)" },
            { label: "Expense", value: `-₱${totalExpense.toLocaleString()}`, color: C.expense, bg: "hsl(0 72% 51% / 0.1)"   },
            { label: "Net",     value: `₱${net.toLocaleString()}`,           color: net >= 0 ? C.income : C.expense, bg: net >= 0 ? "hsl(160 60% 45% / 0.1)" : "hsl(0 72% 51% / 0.1)" },
          ].map(p => (
            <div key={p.label} style={{ background: p.bg, border: `1px solid ${p.color}40`, borderRadius: "0.4rem", padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowY: "auto", flex: 1 }}>
        {loading && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>}
        {!loading && processed.length === 0 && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>No transactions found.</p>}
        {!loading && processed.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <Th field="id">ID</Th>
                {isAdmin && <Th field="user_id">User ID</Th>}
                <Th field="category">Category</Th>
                <Th field="amount">Amount</Th>
                <th style={thBase}><TypeDropdown value={typeFilter} onChange={setTypeFilter} /></th>
                <th style={thBase}>Description</th>
                <th style={thBase}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <MonthDropdown value={monthFilter} options={availableMonths} onChange={setMonthFilter} />
                    <button onClick={() => handleSort("transaction_date")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
                      <SortIcon field="transaction_date" active={sortField} dir={sortDir} />
                    </button>
                  </div>
                </th>
                <Th field="created_at">Created At</Th>
              </tr>
            </thead>
            <tbody>
              {processed.map((tx, idx) => {
                const isIncome = tx.transaction_type === "Income";
                const isEven   = idx % 2 === 0;
                return (
                  <tr key={tx.id} onClick={() => setSelectedTx(tx)}
                    style={{ backgroundColor: isEven ? "transparent" : "hsl(220,14%,14%)", transition: "background-color 0.1s", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHov)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isEven ? "transparent" : "hsl(220,14%,14%)")}>
                    <td style={td}>{tx.id}</td>
                    {isAdmin && <td style={td}>{tx.user_id}</td>}
                    <td style={td}>{tx._catName}</td>
                    <td style={{ ...td, fontWeight: 600, color: isIncome ? C.income : C.expense }}>
                      {isIncome ? `+₱${formatCurrency(tx.amount).replace("₱ ", "")}` : `-₱${formatCurrency(tx.amount).replace("₱ ", "")}`}
                    </td>
                    <td style={td}>
                      <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600, backgroundColor: isIncome ? "hsl(160 60% 45% / 0.12)" : "hsl(0 72% 51% / 0.12)", color: isIncome ? C.income : C.expense, border: `1px solid ${isIncome ? C.income : C.expense}40` }}>
                        {tx.transaction_type}
                      </span>
                    </td>
                    <td style={{ ...td, color: C.fgMuted, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description || "—"}</td>
                    <td style={td}>{tx.transaction_date}</td>
                    <td style={{ ...td, color: C.fgMuted }}>{formatDate(tx.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {!loading && processed.length > 0 && (
        <div style={{ padding: "0.6rem 1.5rem", borderTop: `1px solid ${C.border}`, fontSize: "0.72rem", color: C.fgMuted, flexShrink: 0 }}>
          Showing {processed.length} transaction{processed.length !== 1 ? "s" : ""}
          {processed.length > 15 ? " · scroll to see more" : ""}
        </div>
      )}

      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          getCategoryName={(id) => categoryMap.get(id) ?? "Unknown"}
          onClose={() => setSelectedTx(null)}
        />
      )}
    </ShellTable>
  );
}