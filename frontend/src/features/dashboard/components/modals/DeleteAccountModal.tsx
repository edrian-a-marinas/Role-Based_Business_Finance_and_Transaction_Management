import { useState, useEffect, useRef, useContext } from "react";
import { X, Trash2, AlertTriangle, Clock, ShieldAlert, ArrowLeft } from "lucide-react";
import api from "@/services/apiClient";
import { AuthContext } from "@/features/auth/AuthContext";
import type { OnCloseProps } from "../../lib/utility";
import { useOutsideClickStrict } from "../../lib/utilityHooks";

// ── Design tokens — light surface, matches SettingsPage ──────────────────────
// NOTE: intentionally NOT using shared/tokens.ts — this modal lives on the
// light-background Settings page and has its own distinct palette.
const C = {
  primary:    "hsl(199,89%,38%)",
  expense:    "hsl(0,72%,51%)",
  warning:    "hsl(45,85%,50%)",
  income:     "hsl(160,60%,45%)",
  surface:    "hsl(0,0%,100%)",
  surfaceSub: "hsl(220,14%,97%)",
  border:     "hsl(220,13%,89%)",
  fg:         "hsl(220,14%,15%)",
  fgLight:    "hsl(220,10%,46%)",
  fgMuted:    "hsl(220,10%,62%)",
  overlay:    "rgba(0,0,0,0.45)",
};

type Step = "warn" | "admin_warn";

interface DeleteAccountModalProps extends OnCloseProps {
  isAdmin: boolean;
}

// ── Shell — light variant (border-radius 0.875rem, red tinted border) ─────────
// Defined outside the component to avoid remount-on-render focus loss.
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
        zIndex:          60,
        padding:         "1rem",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
        onMouseUp={e => e.stopPropagation()}
        style={{
          background:   C.surface,
          border:       "1px solid hsl(0 72% 51% / 0.35)",
          borderRadius: "0.875rem",
          width:        "100%",
          maxWidth:     "460px",
          boxShadow:    "0 20px 48px hsl(0 72% 51% / 0.12), 0 4px 16px rgba(0,0,0,0.1)",
          overflow:     "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function DeleteAccountModal({ onClose, isAdmin }: DeleteAccountModalProps) {
  const { logout, user } = useContext(AuthContext);
  const { handleMouseDown, handleMouseUp } = useOutsideClickStrict(onClose);
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  const [step,       setStep]       = useState<Step>("warn");
  const [countdown,  setCountdown]  = useState(10);
  const [canProceed, setCanProceed] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const duration = step === "warn" ? 10 : 5;
    setCountdown(duration);
    setCanProceed(false);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCanProceed(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  const handleFirstConfirm = () => {
    if (!canProceed) return;
    isAdmin ? setStep("admin_warn") : handleDelete();
  };

  const handleDelete = async () => {
    if (!token || !tokenType) return;
    setDeleting(true);
    setError(null);
    try {
      await api.delete("api/users/me", { headers: { Authorization: `${tokenType} ${token}` } });
      logout();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to delete account. Please try again.");
      setDeleting(false);
    }
  };

  const totalDuration = step === "warn" ? 10 : 5;
  const progress = ((totalDuration - countdown) / totalDuration) * 100;

  // ── Shared sub-components (light-palette, scoped here) ───────────────────

  // Progress bar at top of card
  const ProgressBar = (
    <div style={{ height: "3px", background: C.border, position: "relative" }}>
      <div style={{
        position:   "absolute",
        left: 0, top: 0, bottom: 0,
        width:      `${progress}%`,
        background: canProceed
          ? `linear-gradient(90deg, ${C.expense}, hsl(0,72%,65%))`
          : `linear-gradient(90deg, ${C.warning}, ${C.expense})`,
        transition: "width 1s linear, background 0.3s",
      }} />
    </div>
  );

  // Countdown notice banner
  const CountdownBanner = (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "0.5rem",
      padding:      "0.6rem 0.875rem",
      borderRadius: "0.4rem",
      background:   canProceed
        ? (step === "admin_warn" ? "hsl(0 72% 51% / 0.07)" : "hsl(160 60% 45% / 0.07)")
        : "hsl(45 85% 50% / 0.07)",
      border: `1px solid ${
        canProceed
          ? (step === "admin_warn" ? C.expense : C.income) + "40"
          : C.warning + "40"
      }`,
      fontSize:     "0.75rem",
      color:        canProceed ? (step === "admin_warn" ? C.expense : C.income) : C.warning,
      marginBottom: "1rem",
      transition:   "all 0.3s",
    }}>
      <Clock style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }} />
      {step === "warn"
        ? canProceed
          ? "You may now proceed. This is your last chance to cancel."
          : `Please read the above. You can proceed in ${countdown}s.`
        : canProceed
          ? "Final confirmation — this will permanently delete your admin account."
          : `Admin confirmation required. Proceeding in ${countdown}s.`
      }
    </div>
  );

  // Error banner (light variant — uses AlertTriangle icon)
  const ErrorBanner = error && (
    <div style={{
      display:      "flex",
      alignItems:   "center",
      gap:          "0.5rem",
      padding:      "0.6rem 0.75rem",
      borderRadius: "0.4rem",
      background:   "hsl(0 72% 51% / 0.08)",
      border:       "1px solid hsl(0 72% 51% / 0.3)",
      fontSize:     "0.78rem",
      color:        C.expense,
      marginBottom: "1rem",
    }}>
      <AlertTriangle style={{ width: "0.75rem", height: "0.75rem", flexShrink: 0 }} />
      {error}
    </div>
  );

  // Countdown-gated delete button (reused in both steps)
  const DeleteButton = (label: string) => (
    <button
      onClick={step === "warn" ? handleFirstConfirm : () => canProceed && !deleting && handleDelete()}
      disabled={!canProceed || deleting}
      style={{
        flex:           2,
        padding:        "0.6rem",
        borderRadius:   "0.45rem",
        border:         canProceed ? "1px solid hsl(0 72% 51% / 0.5)" : `1px solid ${C.border}`,
        background:     canProceed ? "hsl(0 72% 51% / 0.12)" : C.surfaceSub,
        color:          canProceed ? C.expense : C.fgMuted,
        fontSize:       "0.82rem",
        fontWeight:     700,
        cursor:         canProceed && !deleting ? "pointer" : "not-allowed",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        gap:            "0.4rem",
        transition:     "all 0.3s",
        position:       "relative",
        overflow:       "hidden",
      }}
    >
      {!canProceed && (
        <div style={{
          position:   "absolute",
          left: 0, top: 0, bottom: 0,
          width:      `${progress}%`,
          background: "hsl(0 72% 51% / 0.08)",
          transition: "width 1s linear",
        }} />
      )}
      <span style={{ position: "relative", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {!canProceed
          ? <><Clock style={{ width: "0.8rem", height: "0.8rem" }} /> Wait {countdown}s…</>
          : deleting
          ? `${label}…`
          : <><Trash2 style={{ width: "0.8rem", height: "0.8rem" }} /> {label}</>
        }
      </span>
    </button>
  );

  return (
    <Shell onBackdropDown={handleMouseDown} onBackdropUp={handleMouseUp}>
      {ProgressBar}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "1.1rem 1.4rem",
        borderBottom:   `1px solid ${C.border}`,
        background:     "hsl(0 72% 51% / 0.03)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {step === "admin_warn"
            ? <ShieldAlert style={{ width: "1rem", height: "1rem", color: C.warning }} />
            : <Trash2      style={{ width: "1rem", height: "1rem", color: C.expense }} />
          }
          <div>
            <p style={{ fontSize: "0.95rem", fontWeight: 700, color: C.fg, margin: 0 }}>
              {step === "admin_warn" ? "Admin Account Warning" : "Delete Your Account"}
            </p>
            <p style={{ fontSize: "0.72rem", color: C.fgLight, margin: "0.1rem 0 0" }}>
              {step === "admin_warn"
                ? "You are about to delete an admin account"
                : "This action is permanent and cannot be undone"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: `1px solid ${C.border}`,
            borderRadius: "0.4rem", color: C.fgMuted, cursor: "pointer",
            padding: "0.28rem", display: "flex", alignItems: "center",
          }}
        >
          <X style={{ width: "0.9rem", height: "0.9rem" }} />
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1.4rem" }}>

        {/* ── STEP: warn ─────────────────────────────────────────────────── */}
        {step === "warn" && (
          <>
            <div style={{
              width: "3rem", height: "3rem", borderRadius: "50%",
              backgroundColor: "hsl(0 72% 51% / 0.1)",
              border: "2px solid hsl(0 72% 51% / 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.1rem",
            }}>
              <Trash2 style={{ width: "1.3rem", height: "1.3rem", color: C.expense }} />
            </div>

            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: C.fg, margin: "0 0 0.6rem", textAlign: "center" }}>
              Before you delete — please read carefully:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.1rem" }}>
              {[
                { icon: "🗑️", text: "Your account will be permanently removed from our system.", strong: true },
                { icon: "📊", text: "Your transaction history will be retained for record-keeping purposes." },
                { icon: "🔐", text: "You will be immediately logged out and cannot log in again." },
                { icon: "⚠️", text: "This cannot be reversed. There is no recovery option.", strong: true },
                { icon: "📧", text: `Your email (${user?.email}) will be freed and cannot be reused.` },
                ...(isAdmin ? [{ icon: "🛡️", text: "You have Admin privileges. Deleting your account removes your admin access permanently.", strong: true }] : []),
              ].map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: "0.6rem",
                  padding: "0.55rem 0.75rem", borderRadius: "0.4rem",
                  background: item.strong ? "hsl(0 72% 51% / 0.05)" : C.surfaceSub,
                  border:    `1px solid ${item.strong ? "hsl(0 72% 51% / 0.2)" : C.border}`,
                }}>
                  <span style={{ fontSize: "0.85rem", flexShrink: 0, marginTop: "0.05rem" }}>{item.icon}</span>
                  <p style={{
                    fontSize: "0.78rem", margin: 0, lineHeight: 1.5,
                    color:      item.strong ? C.expense : C.fgLight,
                    fontWeight: item.strong ? 600 : 400,
                  }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            {CountdownBanner}
            {ErrorBanner}

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "0.6rem", borderRadius: "0.45rem",
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.fgLight, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              {DeleteButton(deleting ? "Deleting" : "Yes, Delete My Account")}
            </div>
          </>
        )}

        {/* ── STEP: admin_warn ───────────────────────────────────────────── */}
        {step === "admin_warn" && (
          <>
            <div style={{
              width: "3rem", height: "3rem", borderRadius: "50%",
              backgroundColor: "hsl(45 85% 50% / 0.12)",
              border: "2px solid hsl(45 85% 50% / 0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.1rem",
            }}>
              <ShieldAlert style={{ width: "1.3rem", height: "1.3rem", color: C.warning }} />
            </div>

            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: C.fg, textAlign: "center", margin: "0 0 0.35rem" }}>
              You have an Admin role
            </p>
            <p style={{ fontSize: "0.78rem", color: C.fgLight, textAlign: "center", margin: "0 0 1.1rem", lineHeight: 1.6 }}>
              Deleting an Admin account is a significant action. Your administrative privileges,
              access controls, and any associated responsibilities will be removed permanently.
            </p>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
              padding: "0.65rem 1rem", borderRadius: "0.5rem",
              background: "hsl(45 85% 50% / 0.07)", border: `1px solid ${C.warning}40`,
              marginBottom: "1rem",
            }}>
              <ShieldAlert style={{ width: "0.9rem", height: "0.9rem", color: C.warning }} />
              <p style={{ fontSize: "0.8rem", color: C.warning, fontWeight: 700, margin: 0 }}>
                ADMIN ACCOUNT — ARE YOU ABSOLUTELY SURE?
              </p>
            </div>

            {CountdownBanner}
            {ErrorBanner}

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button
                onClick={() => setStep("warn")}
                style={{
                  flex: 1, padding: "0.6rem", borderRadius: "0.45rem",
                  border: `1px solid ${C.border}`, background: C.surface,
                  color: C.fgLight, fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: "0.35rem",
                }}
              >
                <ArrowLeft style={{ width: "0.8rem", height: "0.8rem" }} /> Back
              </button>
              {DeleteButton(deleting ? "Deleting Admin Account" : "Delete Admin Account")}
            </div>
          </>
        )}

      </div>
    </Shell>
  );
}