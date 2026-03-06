import { useEffect, useState, useContext } from "react";
import { X, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown } from "lucide-react";
import api from "../../../../services/apiClient";
import { AuthContext } from "../../../auth/AuthContext";
import type { OnCloseProps } from "../../lib/utility";
import { useOutsideClickStrict } from "../../lib/utilityHooks";
import type { ReadUserWithCount, ViewMode } from "../../schemas/user";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  primary:    "hsl(199,89%,38%)",
  income:     "hsl(160,60%,45%)",
  expense:    "hsl(0,72%,51%)",
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  overlay:    "rgba(0,0,0,0.55)",
};

// ── Base TD ───────────────────────────────────────────────────────────────────
const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type SortField = "id" | "email" | "name" | "role" | "active" | "tx_count" | "created_at";
type SortDir   = "asc" | "desc";

// ── HOISTED: RoleDropdown ─────────────────────────────────────────────────────
interface RoleDropdownProps {
  value:    ViewMode;
  onChange: (v: ViewMode) => void;
}
function RoleDropdown({ value, onChange }: RoleDropdownProps) {
  const [open, setOpen] = useState(false);
  const options: { value: ViewMode; label: string }[] = [
    { value: "all",      label: "All Roles"     },
    { value: "admin",    label: "Admin Only"    },
    { value: "standard", label: "Standard Only" },
  ];
  const current = options.find(o => o.value === value)!;
  const activeColor = value === "admin" ? C.income : value === "standard" ? C.primary : C.fgMuted;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          "0.3rem",
          background:   C.surfaceEl,
          border:       `1px solid ${C.border}`,
          borderRadius: "0.4rem",
          color:        activeColor,
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
      {open && (
        <div style={{
          position:     "absolute",
          top:          "calc(100% + 4px)",
          left:         0,
          background:   C.surfaceEl,
          border:       `1px solid ${C.border}`,
          borderRadius: "0.4rem",
          zIndex:       200,
          minWidth:     "130px",
          boxShadow:    "0 8px 24px rgba(0,0,0,0.4)",
          overflow:     "hidden",
        }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                display:    "block",
                width:      "100%",
                textAlign:  "left",
                padding:    "0.4rem 0.75rem",
                background: o.value === value ? C.surfaceHov : "transparent",
                border:     "none",
                color:      o.value === "admin" ? C.income : o.value === "standard" ? C.primary : C.fg,
                fontSize:   "0.75rem",
                cursor:     "pointer",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── HOISTED: SortIcon ─────────────────────────────────────────────────────────
function SortIcon({ field, active, dir }: { field: SortField; active: SortField; dir: SortDir }) {
  const s = { width: "0.7rem", height: "0.7rem" };
  if (active !== field) return <ArrowUpDown style={{ ...s, opacity: 0.35 }} />;
  return dir === "asc"
    ? <ArrowUp   style={{ ...s, color: C.primary }} />
    : <ArrowDown style={{ ...s, color: C.primary }} />;
}

// ── HOISTED: Shell ────────────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ReadUserModal({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [users,     setUsers]     = useState<ReadUserWithCount[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [viewMode,  setViewMode]  = useState<ViewMode>("all");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir,   setSortDir]   = useState<SortDir>("asc");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token || !tokenType || !user) return;
        const res = await api.get("api/users/", {
          headers: { Authorization: `${tokenType} ${token}` },
        });
        setUsers(res.data);
      } catch (err) {
        console.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [token, tokenType]);

  const getRoleName = (roleId: number) =>
    roleId === 1 ? "Admin" : "Standard";

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const processed = (() => {
    let rows = [...users];

    // Filter by role
    if (viewMode === "admin")    rows = rows.filter(u => u.role_id === 1);
    if (viewMode === "standard") rows = rows.filter(u => u.role_id === 2);

    // Sort
    rows.sort((a, b) => {
      let cmp = 0;
      const nameA = `${a.first_name} ${a.last_name}`;
      const nameB = `${b.first_name} ${b.last_name}`;
      switch (sortField) {
        case "id":         cmp = a.id - b.id; break;
        case "email":      cmp = a.email.localeCompare(b.email); break;
        case "name":       cmp = nameA.localeCompare(nameB); break;
        case "role":       cmp = a.role_id - b.role_id; break;
        case "active":     cmp = Number(b.is_active) - Number(a.is_active); break;
        case "tx_count":   cmp = (a.transaction_count ?? 0) - (b.transaction_count ?? 0); break;
        case "created_at": cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  })();

  // ── Th (sortable header) ──────────────────────────────────────────────────
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
        whiteSpace:    "nowrap",
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

  // summary counts
  const adminCount    = users.filter(u => u.role_id === 1).length;
  const standardCount = users.filter(u => u.role_id === 2).length;
  const activeCount   = users.filter(u => u.is_active).length;

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
            View Users
          </h2>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
            {processed.length} user{processed.length !== 1 ? "s" : ""}
            {viewMode !== "all" ? ` · ${viewMode === "admin" ? "Admin" : "Standard"} only` : ""}
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

      {/* ── Summary pills ────────────────────────────────────────────────────── */}
      {!loading && users.length > 0 && (
        <div style={{
          display:      "flex",
          gap:          "0.75rem",
          padding:      "0.75rem 1.5rem",
          borderBottom: `1px solid ${C.border}`,
          flexShrink:   0,
        }}>
          {[
            { label: "Admins",    value: adminCount,    color: C.income  },
            { label: "Standard",  value: standardCount, color: C.primary },
            { label: "Active",    value: activeCount,   color: "hsl(160,60%,45%)" },
          ].map(p => (
            <div key={p.label} style={{
              background:   `${p.color}18`,
              border:       `1px solid ${p.color}40`,
              borderRadius: "0.4rem",
              padding:      "0.3rem 0.75rem",
              fontSize:     "0.75rem",
            }}>
              <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
              <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
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
              <col style={{ width: "4%"  }} /> {/* ID */}
              <col style={{ width: "20%" }} /> {/* Email */}
              <col style={{ width: "16%" }} /> {/* Name */}
              <col style={{ width: "10%" }} /> {/* Phone */}
              <col style={{ width: "9%"  }} /> {/* Role */}
              <col style={{ width: "7%"  }} /> {/* Active */}
              <col style={{ width: "10%" }} /> {/* Tx Count */}
              <col style={{ width: "14%" }} /> {/* Created */}
            </colgroup>

            <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
              <tr>
                <Th field="id">ID</Th>
                <Th field="email">Email</Th>
                <Th field="name">Full Name</Th>
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
                }}>Phone</th>
                {/* Role column header has the filter dropdown */}
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
                  <RoleDropdown value={viewMode} onChange={setViewMode} />
                </th>
                <Th field="active">Active</Th>
                <Th field="tx_count">Tx Count</Th>
                <Th field="created_at">Created At</Th>
              </tr>
            </thead>

            <tbody>
              {processed.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: C.fgMuted }}>
                    No users found.
                  </td>
                </tr>
              ) : processed.map((u, idx) => {
                const isEven   = idx % 2 === 0;
                const isAdmin  = u.role_id === 1;
                const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");

                return (
                  <tr
                    key={u.id}
                    style={{
                      backgroundColor: isEven ? "transparent" : "hsl(220,14%,14%)",
                      transition:      "background-color 0.1s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = C.surfaceHov)}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = isEven ? "transparent" : "hsl(220,14%,14%)")}
                  >
                    <td style={td}>{u.id}</td>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{fullName}</td>
                    <td style={{ ...td, color: C.fgMuted }}>{u.phone_number || "—"}</td>

                    {/* Role badge */}
                    <td style={td}>
                      <span style={{
                        display:         "inline-block",
                        padding:         "0.15rem 0.55rem",
                        borderRadius:    "999px",
                        fontSize:        "0.68rem",
                        fontWeight:      700,
                        backgroundColor: isAdmin ? "hsl(160 60% 45% / 0.12)" : "hsl(199 89% 38% / 0.12)",
                        color:           isAdmin ? C.income : C.primary,
                        border:          `1px solid ${isAdmin ? C.income : C.primary}40`,
                      }}>
                        {getRoleName(u.role_id)}
                      </span>
                    </td>

                    {/* Active badge */}
                    <td style={td}>
                      <span style={{
                        display:         "inline-block",
                        padding:         "0.15rem 0.5rem",
                        borderRadius:    "999px",
                        fontSize:        "0.68rem",
                        fontWeight:      600,
                        backgroundColor: u.is_active ? "hsl(160 60% 45% / 0.12)" : "hsl(220 10% 46% / 0.12)",
                        color:           u.is_active ? C.income : C.fgMuted,
                        border:          `1px solid ${u.is_active ? C.income : C.fgMuted}40`,
                      }}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td style={{ ...td, textAlign: "center" }}>{u.transaction_count ?? 0}</td>
                    <td style={{ ...td, color: C.fgMuted }}>
                      {new Date(u.created_at).toLocaleString()}
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
          Showing {processed.length} user{processed.length !== 1 ? "s" : ""}
          {processed.length > 15 ? " · scroll to see more" : ""}
        </div>
      )}
    </Shell>
  );
}