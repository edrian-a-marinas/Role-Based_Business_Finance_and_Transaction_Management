import { useEffect, useState, useContext } from "react";
import { X, ShieldCheck, ChevronDown, ArrowLeft, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle } from "lucide-react";
import api from "../../../../services/apiClient";
import { AuthContext } from "../../../auth/AuthContext";
import type { OnCloseProps } from "../../lib/utility";
import { useOutsideClickStrict } from "../../lib/utilityHooks";
import type { ReadUserWithCount, PromoteUserPayload, PromoteViewMode } from "../../schemas/user";
import { ShellTable } from "./shared/Shell";
import { C } from "./shared";

const td: React.CSSProperties = {
  padding:      "0.55rem 0.75rem",
  color:        "hsl(220,14%,85%)",
  borderBottom: "1px solid hsl(220,16%,18%)",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  whiteSpace:   "nowrap",
};

// ── Filter dropdown — local (inline, no portal needed) ────────────────────────
function FilterDropdown({ value, onChange }: { value: PromoteViewMode; onChange: (v: PromoteViewMode) => void }) {
  const [open, setOpen] = useState(false);
  const options: { value: PromoteViewMode; label: string }[] = [
    { value: "all",      label: "All Roles"     },
    { value: "admin",    label: "Admin Only"    },
    { value: "standard", label: "Standard Only" },
  ];
  const current     = options.find(o => o.value === value)!;
  const activeColor = value === "admin" ? C.income : value === "standard" ? C.primary : C.fgMuted;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", color: activeColor, fontSize: "0.72rem", fontWeight: 600, padding: "0.25rem 0.5rem", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        {current.label}
        <ChevronDown style={{ width: "0.7rem", height: "0.7rem" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.4rem", zIndex: 200, minWidth: "140px", boxShadow: "0 8px 24px rgba(0,0,0,0.4)", overflow: "hidden" }}>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "0.4rem 0.75rem", background: o.value === value ? C.surfaceHov : "transparent", border: "none", color: o.value === "admin" ? C.income : o.value === "standard" ? C.primary : C.fg, fontSize: "0.75rem", cursor: "pointer" }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  target:    ReadUserWithCount;
  newRole:   1 | 2;
  countdown: number;
  onBack:    () => void;
  onConfirm: () => void;
}
function ConfirmDialog({ target, newRole, countdown, onBack, onConfirm }: ConfirmDialogProps) {
  const isPromoting = newRole === 1;
  const accentColor = isPromoting ? C.income : C.expense;
  const accentBg    = isPromoting ? "hsl(160 60% 45% / 0.15)" : "hsl(0 72% 51% / 0.15)";
  const fullName    = [target.first_name, target.middle_name, target.last_name].filter(Boolean).join(" ");
  const currentRole = target.role_id === 1 ? "Admin" : "Standard";
  const newRoleName = newRole === 1 ? "Admin" : "Standard";
  const canConfirm  = countdown === 0;
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}
    >
      <div style={{ background: C.surface, border: `1px solid ${accentColor}50`, borderRadius: "0.875rem", width: "100%", maxWidth: "420px", boxShadow: "0 24px 48px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)` }} />
        <div style={{ padding: "1.5rem 1.5rem 0", display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", backgroundColor: accentBg, border: `1px solid ${accentColor}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isPromoting
              ? <TrendingUp   style={{ width: "1.2rem", height: "1.2rem", color: accentColor }} />
              : <TrendingDown style={{ width: "1.2rem", height: "1.2rem", color: accentColor }} />}
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: C.fg, fontSize: "1rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
              {isPromoting ? "Promote to Admin?" : "Demote to Standard?"}
            </h3>
            <p style={{ color: C.fgMuted, fontSize: "0.78rem", margin: 0, lineHeight: 1.5 }}>You are about to change the role of this user.</p>
          </div>
        </div>

        {/* User info card */}
        <div style={{ margin: "1rem 1.5rem", background: C.surfaceEl, border: `1px solid ${C.border}`, borderRadius: "0.6rem", padding: "0.75rem 1rem" }}>
          <p style={{ color: C.fg, fontSize: "0.85rem", fontWeight: 600, margin: "0 0 0.2rem" }}>{fullName || "—"}</p>
          <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0 0 0.6rem" }}>{target.email}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ padding: "0.12rem 0.5rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, backgroundColor: target.role_id === 1 ? "hsl(160 60% 45% / 0.12)" : "hsl(199 89% 38% / 0.12)", color: target.role_id === 1 ? C.income : C.primary, border: `1px solid ${target.role_id === 1 ? C.income : C.primary}40` }}>
              {currentRole}
            </span>
            <span style={{ color: C.fgMuted, fontSize: "0.72rem" }}>→</span>
            <span style={{ padding: "0.12rem 0.5rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, backgroundColor: accentBg, color: accentColor, border: `1px solid ${accentColor}50` }}>
              {newRoleName}
            </span>
          </div>
        </div>

        {/* Warning */}
        <div style={{ margin: "0 1.5rem 1.25rem", display: "flex", alignItems: "flex-start", gap: "0.5rem", background: "hsl(45 85% 50% / 0.08)", border: "1px solid hsl(45 85% 50% / 0.25)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem" }}>
          <AlertTriangle style={{ width: "0.85rem", height: "0.85rem", color: C.warning, flexShrink: 0, marginTop: "0.05rem" }} />
          <p style={{ color: "hsl(45,85%,70%)", fontSize: "0.72rem", margin: 0, lineHeight: 1.5 }}>
            {isPromoting
              ? "Promoting this user grants them admin access to manage users and transactions."
              : "Demoting this user removes their admin privileges immediately."}
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", padding: "0 1.5rem 1.5rem", justifyContent: "flex-end" }}>
          <button
            onClick={onBack}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 1rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 600, background: C.surfaceEl, border: `1px solid ${C.border}`, color: C.fgMuted, cursor: "pointer", transition: "border-color 0.15s, color 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.primary; (e.currentTarget as HTMLButtonElement).style.color = C.fg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;  (e.currentTarget as HTMLButtonElement).style.color = C.fgMuted; }}
          >
            <ArrowLeft style={{ width: "0.75rem", height: "0.75rem" }} />Back
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1.1rem", borderRadius: "0.5rem", fontSize: "0.8rem", fontWeight: 600, background: canConfirm ? accentBg : "transparent", border: `1px solid ${canConfirm ? accentColor + "80" : C.border}`, color: canConfirm ? accentColor : C.fgMuted, cursor: canConfirm ? "pointer" : "not-allowed", transition: "all 0.2s", minWidth: "148px", justifyContent: "center" }}
          >
            {isPromoting ? <TrendingUp style={{ width: "0.8rem", height: "0.8rem" }} /> : <TrendingDown style={{ width: "0.8rem", height: "0.8rem" }} />}
            {canConfirm ? `Confirm ${isPromoting ? "Promote" : "Demote"}` : `Wait ${countdown}s…`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Success toast ─────────────────────────────────────────────────────────────
function SuccessToast({ message }: { message: string }) {
  return (
    <div style={{ position: "fixed", bottom: "2rem", left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", alignItems: "center", gap: "0.6rem", background: "hsl(160 60% 45% / 0.15)", border: `1px solid ${C.income}60`, borderRadius: "0.6rem", padding: "0.65rem 1.2rem", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>
      <CheckCircle2 style={{ width: "1rem", height: "1rem", color: C.income, flexShrink: 0 }} />
      <span style={{ color: C.income, fontSize: "0.82rem", fontWeight: 600 }}>{message}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function PromoteUserModal({ onClose }: OnCloseProps) {
  const { user } = useContext(AuthContext);
  if (!user || !(user.id === 1 && user.role_id === 1)) return null;

  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [users,         setUsers]         = useState<ReadUserWithCount[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [viewMode,      setViewMode]      = useState<PromoteViewMode>("all");
  const [updatingId,    setUpdatingId]    = useState<number | null>(null);
  const [hoveredRow,    setHoveredRow]    = useState<number | null>(null);
  const [confirmTarget,  setConfirmTarget]  = useState<ReadUserWithCount | null>(null);
  const [confirmNewRole, setConfirmNewRole] = useState<1 | 2 | null>(null);
  const [countdown,      setCountdown]      = useState(5);
  const [toastMsg,       setToastMsg]       = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token || !tokenType) return;
        const res = await api.get("api/users/", { headers: { Authorization: `${tokenType} ${token}` } });
        setUsers(res.data);
      } catch { console.error("Failed to fetch users"); }
      finally { setLoading(false); }
    };
    fetchUsers();
  }, [token, tokenType]);

  useEffect(() => { if (!confirmTarget) return; setCountdown(5); }, [confirmTarget]);
  useEffect(() => {
    if (!confirmTarget || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [confirmTarget, countdown]);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 3000);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const getRoleName = (u: ReadUserWithCount) => u.id === 1 ? "SUPER ADMIN" : u.role_id === 1 ? "Admin" : "Standard";

  const filteredUsers = users.filter(u => {
    if (viewMode === "admin")    return u.role_id === 1;
    if (viewMode === "standard") return u.role_id === 2;
    return true;
  });

  const requestRoleChange = (u: ReadUserWithCount, newRole: 1 | 2) => {
    if (u.id === 1) return;
    setConfirmTarget(u);
    setConfirmNewRole(newRole);
  };

  const handleRoleChange = async () => {
    if (!confirmTarget || confirmNewRole === null) return;
    const targetUserId = confirmTarget.id;
    const newRole      = confirmNewRole;
    const fullName     = [confirmTarget.first_name, confirmTarget.middle_name, confirmTarget.last_name].filter(Boolean).join(" ");
    const newRoleName  = newRole === 1 ? "Admin" : "Standard";
    setConfirmTarget(null);
    setConfirmNewRole(null);
    try {
      if (!token || !tokenType) return;
      setUpdatingId(targetUserId);
      const payload: PromoteUserPayload = { role_id: newRole };
      await api.put(`api/users/${targetUserId}/role`, payload, { headers: { Authorization: `${tokenType} ${token}` } });
      setUsers(prev => prev.map(u => u.id === targetUserId ? { ...u, role_id: newRole } : u));
      setToastMsg(`${fullName || "User"} has been ${newRole === 1 ? "promoted to" : "demoted to"} ${newRoleName}.`);
    } catch { console.error("Failed to update role"); }
    finally { setUpdatingId(null); }
  };

  const adminCount    = users.filter(u => u.role_id === 1).length;
  const standardCount = users.filter(u => u.role_id === 2).length;
  const thStyle: React.CSSProperties = { padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 600, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${C.border}`, background: C.surfaceEl, textAlign: "left", whiteSpace: "nowrap" };

  return (
    <>
      <ShellTable onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck style={{ width: "1rem", height: "1rem", color: C.income }} />
              <h2 style={{ color: C.fg, fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Promote / Demote User</h2>
            </div>
            <p style={{ color: C.fgMuted, fontSize: "0.75rem", margin: "0.2rem 0 0" }}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
              {viewMode !== "all" ? ` · ${viewMode === "admin" ? "Admin" : "Standard"} only` : ""}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "0.5rem", color: C.fgMuted, cursor: "pointer", padding: "0.3rem", display: "flex", alignItems: "center" }}>
            <X style={{ width: "1rem", height: "1rem" }} />
          </button>
        </div>

        {/* Summary pills */}
        {!loading && users.length > 0 && (
          <div style={{ display: "flex", gap: "0.75rem", padding: "0.75rem 1.5rem", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {[
              { label: "Admins",   value: adminCount,    color: C.income  },
              { label: "Standard", value: standardCount, color: C.primary },
            ].map(p => (
              <div key={p.label} style={{ background: `${p.color}18`, border: `1px solid ${p.color}40`, borderRadius: "0.4rem", padding: "0.3rem 0.75rem", fontSize: "0.75rem" }}>
                <span style={{ color: C.fgMuted, marginRight: "0.4rem" }}>{p.label}</span>
                <span style={{ color: p.color, fontWeight: 700 }}>{p.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div style={{ overflowY: "auto", overflowX: "hidden", flex: 1 }}>
          {loading && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>Loading…</p>}
          {!loading && filteredUsers.length === 0 && <p style={{ color: C.fgMuted, padding: "2rem", textAlign: "center" }}>No users found.</p>}
          {!loading && filteredUsers.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "5%"  }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "20%" }} />
              </colgroup>
              <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  {["ID", "Email", "Full Name", "Active"].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                  <th style={{ ...thStyle, padding: "0.6rem 0.75rem" }}>
                    <FilterDropdown value={viewMode} onChange={setViewMode} />
                  </th>
                  <th style={thStyle}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const isEven   = idx % 2 === 0;
                  const hovered  = hoveredRow === idx;
                  const isAdm    = u.role_id === 1;
                  const isSA     = u.id === 1;
                  const isUpd    = updatingId === u.id;
                  const fullName = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ");
                  return (
                    <tr
                      key={u.id}
                      style={{ backgroundColor: hovered ? C.surfaceHov : isEven ? "transparent" : "hsl(220,14%,14%)", transition: "background-color 0.1s" }}
                      onMouseEnter={() => setHoveredRow(idx)}
                      onMouseLeave={() => setHoveredRow(null)}
                    >
                      <td style={td}>{u.id}</td>
                      <td style={td}>{u.email}</td>
                      <td style={td}>{fullName}</td>
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 600, backgroundColor: u.is_active ? "hsl(160 60% 45% / 0.12)" : "hsl(220 10% 46% / 0.12)", color: u.is_active ? C.income : C.fgMuted, border: `1px solid ${u.is_active ? C.income : C.fgMuted}40` }}>
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={td}>
                        <span style={{ display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700, backgroundColor: isSA ? "hsl(45 85% 50% / 0.12)" : isAdm ? "hsl(160 60% 45% / 0.12)" : "hsl(199 89% 38% / 0.12)", color: isSA ? C.warning : isAdm ? C.income : C.primary, border: `1px solid ${isSA ? C.warning : isAdm ? C.income : C.primary}40` }}>
                          {getRoleName(u)}
                        </span>
                      </td>
                      <td style={td}>
                        {isSA ? (
                          <span style={{ color: C.fgMuted, fontSize: "0.72rem" }}>—</span>
                        ) : isUpd ? (
                          <span style={{ color: C.fgMuted, fontSize: "0.72rem", fontStyle: "italic" }}>Updating…</span>
                        ) : isAdm ? (
                          <button onClick={() => requestRoleChange(u, 2)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.22rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${C.expense}50`, background: "hsl(0 72% 51% / 0.1)", color: C.expense, transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                            <TrendingDown style={{ width: "0.7rem", height: "0.7rem" }} />Demote
                          </button>
                        ) : (
                          <button onClick={() => requestRoleChange(u, 1)} style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.22rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", border: `1px solid ${C.income}50`, background: "hsl(160 60% 45% / 0.1)", color: C.income, transition: "opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                            <TrendingUp style={{ width: "0.7rem", height: "0.7rem" }} />Promote
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        {!loading && filteredUsers.length > 0 && (
          <div style={{ padding: "0.6rem 1.5rem", borderTop: `1px solid ${C.border}`, fontSize: "0.72rem", color: C.fgMuted, flexShrink: 0 }}>
            Showing {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
            {filteredUsers.length > 15 ? " · scroll to see more" : ""}
          </div>
        )}
      </ShellTable>

      {confirmTarget && confirmNewRole !== null && (
        <ConfirmDialog
          target={confirmTarget} newRole={confirmNewRole} countdown={countdown}
          onBack={() => { setConfirmTarget(null); setConfirmNewRole(null); }}
          onConfirm={handleRoleChange}
        />
      )}
      {toastMsg && <SuccessToast message={toastMsg} />}
    </>
  );
}