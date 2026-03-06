// pages/DeactivatedPage.tsx
import { useContext } from "react";
import { AlertTriangle, Trash2, LogOut, Mail } from "lucide-react";
import { AuthContext } from "@/features/auth/AuthContext";

const C = {
  expense:   "hsl(0,72%,51%)",
  warning:   "hsl(45,85%,50%)",
  surface:   "hsl(0,0%,100%)",
  surfaceSub:"hsl(220,14%,97%)",
  border:    "hsl(220,13%,89%)",
  fg:        "hsl(220,14%,15%)",
  fgLight:   "hsl(220,10%,46%)",
  fgMuted:   "hsl(220,10%,62%)",
};

interface DeactivatedPageProps {
  onGoToSettings: () => void;
}

export default function DeactivatedPage({ onGoToSettings }: DeactivatedPageProps) {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{
      minHeight:       "100vh",
      backgroundColor: C.surfaceSub,
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      padding:         "1.5rem",
    }}>
      <div style={{
        background:    C.surface,
        border:        `1px solid hsl(0 72% 51% / 0.25)`,
        borderRadius:  "1rem",
        padding:       "2.5rem 2rem",
        maxWidth:      "480px",
        width:         "100%",
        boxShadow:     "0 8px 32px hsl(0 72% 51% / 0.08), 0 2px 8px rgba(0,0,0,0.06)",
        textAlign:     "center",
      }}>
        {/* Icon */}
        <div style={{
          width:           "4rem",
          height:          "4rem",
          borderRadius:    "50%",
          backgroundColor: "hsl(0 72% 51% / 0.1)",
          border:          "2px solid hsl(0 72% 51% / 0.2)",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          margin:          "0 auto 1.5rem",
        }}>
          <AlertTriangle style={{ width: "1.75rem", height: "1.75rem", color: C.expense }} />
        </div>

        {/* Heading */}
        <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: C.fg, margin: "0 0 0.5rem" }}>
          Account Deactivated
        </h1>
        <p style={{ fontSize: "0.85rem", color: C.fgLight, margin: "0 0 1.75rem", lineHeight: 1.6 }}>
          {user?.first_name ? `Hi ${user.first_name}, your` : "Your"} account has been deactivated
          by an administrator. You cannot access the dashboard or perform any actions.
        </p>

        {/* What you can still do */}
        <div style={{
          background:    C.surfaceSub,
          border:        `1px solid ${C.border}`,
          borderRadius:  "0.6rem",
          padding:       "1rem 1.25rem",
          marginBottom:  "1.5rem",
          textAlign:     "left",
        }}>
          <p style={{ fontSize: "0.72rem", fontWeight: 700, color: C.fgMuted, textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 0.75rem" }}>
            What you can still do
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {[
              { icon: "✅", text: "View your account settings and profile information." },
              { icon: "🗑️", text: "Permanently delete your own account and free your email." },
              { icon: "📊", text: "Your past transactions are preserved regardless." },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
                <span style={{ fontSize: "0.85rem", flexShrink: 0 }}>{item.icon}</span>
                <p style={{ fontSize: "0.78rem", color: C.fgLight, margin: 0, lineHeight: 1.5 }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact notice */}
        <div style={{
          display:      "flex",
          alignItems:   "flex-start",
          gap:          "0.6rem",
          padding:      "0.75rem 1rem",
          borderRadius: "0.5rem",
          background:   "hsl(45 85% 50% / 0.07)",
          border:       `1px solid hsl(45 85% 50% / 0.3)`,
          marginBottom: "1.75rem",
          textAlign:    "left",
        }}>
          <Mail style={{ width: "0.85rem", height: "0.85rem", color: C.warning, flexShrink: 0, marginTop: "0.15rem" }} />
          <p style={{ fontSize: "0.75rem", color: C.fgLight, margin: 0, lineHeight: 1.5 }}>
            To reactivate your account, contact your administrator. If you believe this is a mistake,
            reach out before deleting your account — deletion is permanent and irreversible.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <button
            onClick={onGoToSettings}
            style={{
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              gap:             "0.45rem",
              width:           "100%",
              padding:         "0.7rem",
              borderRadius:    "0.5rem",
              fontSize:        "0.85rem",
              fontWeight:      700,
              border:          `1px solid hsl(0 72% 51% / 0.4)`,
              background:      "hsl(0 72% 51% / 0.08)",
              color:           C.expense,
              cursor:          "pointer",
              transition:      "opacity 0.15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <Trash2 style={{ width: "0.9rem", height: "0.9rem" }} />
            Go to Settings / Delete Account
          </button>

          <button
            onClick={logout}
            style={{
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              gap:             "0.45rem",
              width:           "100%",
              padding:         "0.7rem",
              borderRadius:    "0.5rem",
              fontSize:        "0.85rem",
              fontWeight:      600,
              border:          `1px solid ${C.border}`,
              background:      C.surface,
              color:           C.fgLight,
              cursor:          "pointer",
              transition:      "border-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.fgLight;
              (e.currentTarget as HTMLButtonElement).style.color = C.fg;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
              (e.currentTarget as HTMLButtonElement).style.color = C.fgLight;
            }}
          >
            <LogOut style={{ width: "0.9rem", height: "0.9rem" }} />
            Log Out
          </button>
        </div>

      </div>
    </div>
  );
}