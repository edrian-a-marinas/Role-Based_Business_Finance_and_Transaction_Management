// SettingsPage.tsx
import { useState, useContext, useEffect, useRef } from "react";
import {
  User, Phone, Mail, Shield, Calendar, Edit3,
  Check, X, AlertTriangle, Trash2, Lock, Clock,
} from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import { validateProfileUpdate } from "@/features/dashboard/schemas/user";
import DeleteAccountModal from "@/features/dashboard/components/modals/DeleteAccountModal";

// ── Domain/accent colors only — layout uses CSS variables ─────────────────────
const C = {
  primary: "hsl(var(--primary))",
  income:  "hsl(var(--income))",
  expense: "hsl(var(--expense))",
  warning: "hsl(var(--warning))",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.trim()[0] ?? "";
  const l = lastName?.trim()[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function getAvatarColor(id: number): string {
  const palette = [
    "hsl(199,89%,38%)", "hsl(160,60%,45%)", "hsl(280,60%,55%)",
    "hsl(30,90%,56%)",  "hsl(340,65%,55%)", "hsl(45,85%,50%)",
  ];
  return palette[id % palette.length];
}

function RoleBadge({ roleId, userId }: { roleId: number; userId: number }) {
  const isSA  = userId === 1 && roleId === 1;
  const isAdm = roleId === 1;
  const label = isSA ? "Super Admin" : isAdm ? "Admin" : "Standard User";
  const color = isSA ? C.warning : isAdm ? C.income : C.primary;
  return (
    <span style={{
      display:         "inline-flex",
      alignItems:      "center",
      gap:             "0.3rem",
      padding:         "0.2rem 0.6rem",
      borderRadius:    "999px",
      fontSize:        "0.7rem",
      fontWeight:      700,
      backgroundColor: `${color}18`,
      color,
      border:          `1px solid ${color}40`,
    }}>
      <Shield style={{ width: "0.65rem", height: "0.65rem" }} />
      {label}
    </span>
  );
}

// ── Read-only info row ────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: {
  icon:  typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="ts-info-row" style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "0.875rem",
      padding:      "0.75rem 1rem",
      borderRadius: "0.5rem",
    }}>
      <div style={{
        width:           "2rem",
        height:          "2rem",
        borderRadius:    "0.375rem",
        backgroundColor: "hsl(var(--primary) / 0.08)",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        flexShrink:      0,
      }}>
        <Icon style={{ width: "0.875rem", height: "0.875rem", color: C.primary }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p className="ts-page-fg-muted" style={{ fontSize: "0.68rem", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </p>
        <p className="ts-page-fg" style={{ fontSize: "0.85rem", margin: "0.1rem 0 0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────────────────────
function EditableField({
  label, value, onChange, placeholder, type = "text",
}: {
  label:        string;
  value:        string;
  onChange:     (v: string) => void;
  placeholder?: string;
  type?:        string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label className="ts-page-fg-light" style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="ts-surface ts-page-fg"
        style={{
          width:        "100%",
          padding:      "0.55rem 0.75rem",
          borderRadius: "0.45rem",
          border:       "1px solid hsl(var(--page-border))",
          fontSize:     "0.85rem",
          outline:      "none",
          transition:   "border-color 0.15s",
          boxSizing:    "border-box",
        }}
        onFocus={e  => (e.target.style.borderColor = "hsl(var(--primary))")}
        onBlur={e   => (e.target.style.borderColor = "hsl(var(--page-border))")}
      />
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="ts-section-title">{children}</p>;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, setUser } = useContext(AuthContext);

  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  type Tab = "profile" | "account";
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [isEditing,   setIsEditing]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const [firstName,  setFirstName]  = useState(user?.first_name   ?? "");
  const [middleName, setMiddleName] = useState(user?.middle_name  ?? "");
  const [lastName,   setLastName]   = useState(user?.last_name    ?? "");
  const [phone,      setPhone]      = useState(user?.phone_number ?? "");

  const [dangerCountdown, setDangerCountdown] = useState(10);
  const [dangerUnlocked,  setDangerUnlocked]  = useState(false);
  const [showDeleteModal, setShowDeleteModal]  = useState(false);
  const dangerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  if (!user) return null;

  const fullName    = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
  const avatarColor = getAvatarColor(user.id);
  const initials    = getInitials(user.first_name, user.last_name);
  const isDeactivated = !user.is_active;
  const isSuperAdmin  = user.id === 1 && user.role_id === 1;
  const roleLabel =
    user.id === 1 && user.role_id === 1 ? "Super Admin"
    : user.role_id === 1               ? "Admin"
    :                                    "Standard User";

  const resetForm = () => {
    setFirstName(user.first_name   ?? "");
    setMiddleName(user.middle_name ?? "");
    setLastName(user.last_name     ?? "");
    setPhone(user.phone_number     ?? "");
    setSaveError(null);
    setSaveSuccess(false);
    setFieldErrors([]);
  };

  const handleCancelEdit = () => { resetForm(); setIsEditing(false); };

  const handleSave = async () => {
    if (!token || !tokenType) return;
    const errors = validateProfileUpdate({ firstName, lastName, middleName, phone });
    if (errors.length > 0) { setFieldErrors(errors); return; }
    setFieldErrors([]);

    const trimmed = {
      first_name:   firstName.trim()  || null,
      middle_name:  middleName.trim() || null,
      last_name:    lastName.trim()   || null,
      phone_number: phone.trim()      || null,
    };
    const unchanged =
      trimmed.first_name   === (user.first_name   ?? null) &&
      trimmed.middle_name  === (user.middle_name  ?? null) &&
      trimmed.last_name    === (user.last_name    ?? null) &&
      trimmed.phone_number === (user.phone_number ?? null);

    if (unchanged) { setIsEditing(false); return; }

    setSaving(true); setSaveError(null); setSaveSuccess(false);
    try {
      const res = await api.patch(
        "api/users/me",
        { email: user.email, ...trimmed },
        { headers: { Authorization: `${tokenType} ${token}` } }
      );
      setUser({ ...user, ...res.data });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (activeTab !== "account") return;
    setDangerUnlocked(false);
    setDangerCountdown(10);
    dangerTimerRef.current = setInterval(() => {
      setDangerCountdown(prev => {
        if (prev <= 1) { clearInterval(dangerTimerRef.current!); setDangerUnlocked(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (dangerTimerRef.current) clearInterval(dangerTimerRef.current); };
  }, [activeTab]);

  const TabBtn = ({ tab, label }: { tab: Tab; label: string }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={active ? "ts-surface ts-page-fg" : "ts-page-fg-light"}
        style={{
          padding:      "0.5rem 1.25rem",
          borderRadius: "0.375rem",
          fontSize:     "0.82rem",
          fontWeight:   600,
          border:       "none",
          cursor:       "pointer",
          transition:   "background-color 0.15s, color 0.15s",
          background:   active ? "hsl(var(--page-surface))" : "transparent",
          boxShadow:    active ? "0 1px 4px hsl(220 13% 80% / 0.6)" : "none",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6" style={{ maxWidth: "680px" }}>
      <title>Settings</title>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight ts-page-fg">Settings</h1>
        <p className="text-sm ts-page-fg-light">Manage your profile and account preferences</p>
      </div>

      {/* Deactivated banner */}
      {isDeactivated && (
        <div style={{
          display:      "flex",
          alignItems:   "flex-start",
          gap:          "0.75rem",
          padding:      "1rem 1.25rem",
          borderRadius: "0.6rem",
          background:   "hsl(var(--expense) / 0.07)",
          border:       "1px solid hsl(var(--expense) / 0.3)",
        }}>
          <AlertTriangle style={{ width: "1.1rem", height: "1.1rem", color: C.expense, flexShrink: 0, marginTop: "0.05rem" }} />
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 700, color: C.expense, margin: 0 }}>
              Your account is deactivated
            </p>
            <p className="ts-page-fg-light" style={{ fontSize: "0.78rem", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
              You can only access Settings. To reactivate your account, please contact an administrator.
            </p>
          </div>
        </div>
      )}

      {/* Avatar + name card */}
      <div className="ts-card ts-card-shadow" style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "1.25rem",
        padding:      "1.25rem 1.5rem",
      }}>
        <div style={{
          width:           "3.5rem",
          height:          "3.5rem",
          borderRadius:    "50%",
          backgroundColor: avatarColor,
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          flexShrink:      0,
          fontWeight:      800,
          fontSize:        "1.1rem",
          color:           "hsl(0,0%,100%)",
          letterSpacing:   "-0.02em",
          boxShadow:       `0 0 0 3px ${avatarColor}30`,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p className="ts-page-fg" style={{ fontSize: "1rem", fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {fullName || user.email}
          </p>
          <p className="ts-page-fg-light" style={{ fontSize: "0.78rem", margin: "0.15rem 0 0.35rem" }}>
            {user.email}
          </p>
          <RoleBadge roleId={user.role_id} userId={user.id} />
        </div>
        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
          <span style={{
            display:         "inline-block",
            padding:         "0.2rem 0.6rem",
            borderRadius:    "999px",
            fontSize:        "0.7rem",
            fontWeight:      600,
            backgroundColor: user.is_active ? "hsl(var(--income) / 0.12)" : "hsl(220 10% 46% / 0.12)",
            color:           user.is_active ? C.income : "hsl(var(--page-fg-muted))",
            border:          `1px solid ${user.is_active ? C.income : "hsl(var(--page-fg-muted))"}40`,
          }}>
            {user.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="ts-toggle-bar" style={{ display: "inline-flex", gap: "0.25rem" }}>
        <TabBtn tab="profile" label="Profile" />
        <TabBtn tab="account" label="Account" />
      </div>

      {/* ── PROFILE TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="ts-card ts-card-shadow" style={{ overflow: "hidden" }}>

          {/* Header */}
          <div style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "1rem 1.5rem",
            borderBottom:   "1px solid hsl(var(--page-border))",
          }}>
            <div>
              <p className="ts-page-fg" style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0 }}>
                Profile Information
              </p>
              <p className="ts-page-fg-light" style={{ fontSize: "0.75rem", margin: "0.15rem 0 0" }}>
                Update your name and contact details
              </p>
            </div>

            {!isEditing && !isDeactivated ? (
              <button
                onClick={() => { resetForm(); setIsEditing(true); }}
                className="ts-page-fg ts-surface"
                style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "0.4rem",
                  padding:      "0.45rem 0.9rem",
                  borderRadius: "0.45rem",
                  fontSize:     "0.78rem",
                  fontWeight:   600,
                  border:       "1px solid hsl(var(--page-border))",
                  cursor:       "pointer",
                  transition:   "border-color 0.15s, color 0.15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "hsl(var(--primary))";
                  e.currentTarget.style.color = "hsl(var(--primary))";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "hsl(var(--page-border))";
                  e.currentTarget.style.color = "hsl(var(--page-fg))";
                }}
              >
                <Edit3 style={{ width: "0.8rem", height: "0.8rem" }} /> Edit
              </button>
            ) : isEditing ? (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleCancelEdit}
                  className="ts-page-fg-light ts-surface"
                  style={{
                    display: "flex", alignItems: "center", gap: "0.35rem",
                    padding: "0.45rem 0.9rem", borderRadius: "0.45rem",
                    fontSize: "0.78rem", fontWeight: 600,
                    border: "1px solid hsl(var(--page-border))", cursor: "pointer",
                  }}
                >
                  <X style={{ width: "0.8rem", height: "0.8rem" }} /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display:      "flex",
                    alignItems:   "center",
                    gap:          "0.35rem",
                    padding:      "0.45rem 0.9rem",
                    borderRadius: "0.45rem",
                    fontSize:     "0.78rem",
                    fontWeight:   600,
                    border:       "none",
                    background:   saving ? "hsl(var(--primary) / 0.5)" : "hsl(var(--primary))",
                    color:        "hsl(0,0%,100%)",
                    cursor:       saving ? "not-allowed" : "pointer",
                  }}
                >
                  <Check style={{ width: "0.8rem", height: "0.8rem" }} />
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            ) : null}
          </div>

          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Banners */}
            {saveSuccess && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.65rem 1rem", borderRadius: "0.45rem",
                background: "hsl(var(--income) / 0.09)",
                border: "1px solid hsl(var(--income) / 0.3)",
                fontSize: "0.8rem", color: C.income, fontWeight: 600,
              }}>
                <Check style={{ width: "0.85rem", height: "0.85rem" }} />
                Profile updated successfully.
              </div>
            )}
            {saveError && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                padding: "0.65rem 1rem", borderRadius: "0.45rem",
                background: "hsl(var(--expense) / 0.09)",
                border: "1px solid hsl(var(--expense) / 0.3)",
                fontSize: "0.8rem", color: C.expense, fontWeight: 600,
              }}>
                <AlertTriangle style={{ width: "0.85rem", height: "0.85rem" }} />
                {saveError}
              </div>
            )}
            {fieldErrors.length > 0 && (
              <div style={{
                padding: "0.65rem 1rem", borderRadius: "0.45rem",
                background: "hsl(var(--expense) / 0.07)",
                border: "1px solid hsl(var(--expense) / 0.25)",
                fontSize: "0.78rem", color: C.expense,
                display: "flex", flexDirection: "column", gap: "0.3rem",
              }}>
                {fieldErrors.map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                    <AlertTriangle style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }} />
                    {e}
                  </div>
                ))}
              </div>
            )}

            {/* Account details (read-only) */}
            <div>
              <SectionTitle>Account Details</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <InfoRow icon={Mail}     label="Email Address" value={user.email} />
                <InfoRow icon={Shield}   label="Role"          value={<RoleBadge roleId={user.role_id} userId={user.id} />} />
                <InfoRow icon={Calendar} label="Member Since"  value={new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
              </div>
            </div>

            {/* Personal info */}
            <div>
              <SectionTitle>Personal Information</SectionTitle>
              {isEditing ? (
                <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "1fr 1fr" }}>
                  <EditableField label="First Name"  value={firstName}  onChange={setFirstName}  placeholder="First name" />
                  <EditableField label="Last Name"   value={lastName}   onChange={setLastName}   placeholder="Last name" />
                  <div style={{ gridColumn: "1 / -1" }}>
                    <EditableField label="Middle Name"   value={middleName} onChange={setMiddleName} placeholder="Middle name (optional)" />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <EditableField label="Phone Number"  value={phone}      onChange={setPhone}      placeholder="e.g. 09123456789" type="tel" />
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <InfoRow icon={User}  label="Full Name"    value={fullName || "—"} />
                  <InfoRow icon={Phone} label="Phone Number" value={user.phone_number || "—"} />
                </div>
              )}
            </div>

            {/* Locked email notice */}
            <div className="ts-surface-sub" style={{
              display:      "flex",
              alignItems:   "center",
              gap:          "0.5rem",
              padding:      "0.6rem 0.875rem",
              borderRadius: "0.4rem",
              border:       "1px solid hsl(var(--page-border))",
              fontSize:     "0.75rem",
            }}>
              <Lock className="ts-page-fg-muted" style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }} />
              <span className="ts-page-fg-muted">
                Email address cannot be changed. Contact an administrator if needed.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNT TAB ─────────────────────────────────────────────────────── */}
      {activeTab === "account" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Account summary */}
          <div className="ts-card ts-card-shadow" style={{ padding: "1.25rem 1.5rem" }}>
            <p className="ts-page-fg" style={{ fontSize: "0.9rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
              Account Summary
            </p>
            <p className="ts-page-fg-light" style={{ fontSize: "0.75rem", margin: "0 0 1rem" }}>
              Your account information at a glance
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <InfoRow icon={Mail}     label="Email"   value={user.email} />
              <InfoRow icon={Shield}   label="Role"    value={<>{roleLabel} <RoleBadge roleId={user.role_id} userId={user.id} /></>} />
              <InfoRow icon={Calendar} label="Joined"  value={new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} />
              <InfoRow icon={User}     label="User ID" value={`#${user.id}`} />
            </div>
          </div>

          {/* Danger zone */}
          <div style={{
            background:   "hsl(var(--page-surface))",
            border:       "1px solid hsl(var(--expense) / 0.25)",
            borderRadius: "0.75rem",
            overflow:     "hidden",
            boxShadow:    "0 1px 4px hsl(var(--expense) / 0.06)",
            opacity:      isSuperAdmin ? 0.6 : 1,
          }}>
            <div style={{
              padding:        "0.875rem 1.5rem",
              borderBottom:   "1px solid hsl(var(--expense) / 0.2)",
              background:     "hsl(var(--expense) / 0.04)",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: C.expense, margin: 0 }}>
                  Danger Zone
                </p>
                <p className="ts-page-fg-light" style={{ fontSize: "0.73rem", margin: "0.15rem 0 0" }}>
                  Permanent and irreversible actions
                </p>
              </div>
              {isSuperAdmin && (
                <span style={{
                  display:         "inline-flex",
                  alignItems:      "center",
                  gap:             "0.3rem",
                  padding:         "0.2rem 0.6rem",
                  borderRadius:    "999px",
                  fontSize:        "0.68rem",
                  fontWeight:      700,
                  backgroundColor: "hsl(var(--warning) / 0.12)",
                  color:           C.warning,
                  border:          `1px solid ${C.warning}40`,
                }}>
                  <Lock style={{ width: "0.6rem", height: "0.6rem" }} />
                  Super Admin Protected
                </span>
              )}
            </div>

            <div style={{ padding: "1.25rem 1.5rem" }}>
              {isSuperAdmin && (
                <div style={{
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "0.5rem",
                  padding:      "0.6rem 0.875rem",
                  borderRadius: "0.4rem",
                  background:   "hsl(var(--warning) / 0.07)",
                  border:       `1px solid ${C.warning}30`,
                  fontSize:     "0.75rem",
                  color:        C.warning,
                  marginBottom: "1rem",
                }}>
                  <Lock style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }} />
                  The Super Admin account cannot be deleted. This section is shown for reference only.
                </div>
              )}

              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "space-between",
                gap:            "1rem",
                flexWrap:       "wrap",
              }}>
                <div>
                  <p className="ts-page-fg" style={{ fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
                    Delete My Account
                  </p>
                  <p className="ts-page-fg-light" style={{ fontSize: "0.75rem", margin: "0.25rem 0 0", lineHeight: 1.5 }}>
                    Permanently deletes your account. Your past transactions will be retained for record-keeping.
                    This action <strong>cannot be undone</strong>.
                  </p>
                </div>

                {isSuperAdmin ? (
                  <button
                    disabled
                    title="Super Admin accounts cannot be deleted"
                    style={{
                      display: "flex", alignItems: "center", gap: "0.4rem",
                      padding: "0.5rem 1rem", borderRadius: "0.45rem",
                      fontSize: "0.78rem", fontWeight: 600,
                      border: "1px solid hsl(var(--expense) / 0.2)",
                      background: "hsl(var(--expense) / 0.04)",
                      color: "hsl(var(--expense) / 0.35)",
                      cursor: "not-allowed", flexShrink: 0,
                    }}
                  >
                    <Lock style={{ width: "0.8rem", height: "0.8rem" }} />
                    Delete Account
                    <span style={{
                      fontSize: "0.6rem", fontWeight: 700,
                      padding: "0.1rem 0.35rem", borderRadius: "0.25rem",
                      backgroundColor: "hsl(var(--warning) / 0.12)",
                      color: C.warning, border: `1px solid ${C.warning}40`,
                      marginLeft: "0.2rem",
                    }}>N/A</span>
                  </button>
                ) : (
                  <button
                    onClick={() => dangerUnlocked && setShowDeleteModal(true)}
                    disabled={!dangerUnlocked}
                    title={dangerUnlocked ? "Delete your account permanently" : `Available in ${dangerCountdown}s`}
                    style={{
                      display:        "flex",
                      alignItems:     "center",
                      gap:            "0.4rem",
                      padding:        "0.5rem 1rem",
                      borderRadius:   "0.45rem",
                      fontSize:       "0.78rem",
                      fontWeight:     600,
                      border:         dangerUnlocked
                        ? "1px solid hsl(var(--expense) / 0.5)"
                        : "1px solid hsl(var(--page-border))",
                      background:     dangerUnlocked
                        ? "hsl(var(--expense) / 0.08)"
                        : "hsl(var(--page-surface-sub))",
                      color:          dangerUnlocked ? C.expense : "hsl(var(--page-fg-muted))",
                      cursor:         dangerUnlocked ? "pointer" : "not-allowed",
                      flexShrink:     0,
                      transition:     "all 0.3s",
                      position:       "relative",
                      overflow:       "hidden",
                      minWidth:       "148px",
                      justifyContent: "center",
                    }}
                  >
                    {!dangerUnlocked && (
                      <div style={{
                        position:   "absolute",
                        left: 0, top: 0, bottom: 0,
                        width:      `${((10 - dangerCountdown) / 10) * 100}%`,
                        background: "hsl(var(--expense) / 0.07)",
                        transition: "width 1s linear",
                      }} />
                    )}
                    <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      {dangerUnlocked
                        ? <><Trash2 style={{ width: "0.8rem", height: "0.8rem" }} /> Delete Account</>
                        : <><Clock  style={{ width: "0.8rem", height: "0.8rem" }} /> Wait {dangerCountdown}s</>
                      }
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          isAdmin={user.role_id === 1}
        />
      )}
    </div>
  );
}