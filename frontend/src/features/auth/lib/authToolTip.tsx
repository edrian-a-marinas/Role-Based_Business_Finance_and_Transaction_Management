import { useState } from "react";

export default function PrototypeBadge() {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center" }}>
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           "5px",
          background:    "hsl(45 85% 50% / 0.08)",
          border:        "1px solid hsl(45 85% 50% / 0.30)",
          borderRadius:  "20px",
          padding:       "3px 10px 3px 7px",
          fontSize:      "10.5px",
          fontWeight:    "600",
          color:         "hsl(45,85%,62%)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor:        "help",
          fontFamily:    "'DM Mono', monospace",
          transition:    "border-color 0.2s",
        }}
      >
        <span style={{ fontSize: "9px" }}>⬡</span>
        Prototype
        <span style={{
          fontSize:   "10px",
          opacity:    0.7,
          marginLeft: "1px",
          fontFamily: "sans-serif",
          fontWeight: 400,
        }}>ⓘ</span>
      </button>

      {show && (
        <div
          style={{
            position:        "absolute",
            top:             "0",               // anchored to top of badge, grows downward
            left:            "calc(100% + 14px)",
            backgroundColor: "hsl(220,22%,13%)",
            border:          "1px solid hsl(220,20%,24%)",
            borderRadius:    "12px",
            padding:         "14px 16px",
            width:           "300px",
            zIndex:          200,
            boxShadow:       "0 12px 40px hsl(220 28% 4% / 0.75), 0 0 0 1px hsl(220 20% 20% / 0.5)",
            pointerEvents:   "none",
            textAlign:       "left",
          }}
        >
          {/* Left-pointing arrow — aligned to badge center */}
          <span style={{
            position:     "absolute",
            top:          "10px",
            right:        "100%",
            width:        0,
            height:       0,
            borderTop:    "6px solid transparent",
            borderBottom: "6px solid transparent",
            borderRight:  "7px solid hsl(220,20%,24%)",
          }} />

          {/* Title */}
          <p style={{
            fontSize:      "11px",
            fontWeight:    "700",
            color:         "hsl(45,85%,65%)",
            marginBottom:  "10px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily:    "'DM Mono', monospace",
            display:       "flex",
            alignItems:    "center",
            gap:           "5px",
          }}>
            <span>⚠</span> Prototype / Demo Build
          </p>

          {/* What it is */}
          <p style={{
            fontSize:     "12.5px",
            color:        "hsl(220,14%,82%)",
            lineHeight:   "1.75",
            marginBottom: "10px",
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            <strong style={{ color: "hsl(220,14%,96%)", fontWeight: 700 }}>TransacScope</strong> is
            a role-based finance and transaction management system — designed to
            record, track, categorize, and report income and expenses, with
            full user role control and audit trail support.
          </p>

          {/* Divider */}
          <div style={{ margin: "10px 0", height: "1px", background: "hsl(220,20%,22%)" }} />

          {/* Academic note */}
          <p style={{
            fontSize:     "12.5px",
            color:        "hsl(220,14%,72%)",
            lineHeight:   "1.75",
            marginBottom: "10px",
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            This deployment is for{" "}
            <strong style={{ color: "hsl(45,85%,70%)", fontWeight: 600 }}>
              academic and technical demonstration purposes only.
            </strong>{" "}
            Data shown is simulated. No real financial records are stored.
          </p>

          {/* Divider */}
          <div style={{ margin: "10px 0", height: "1px", background: "hsl(220,20%,22%)" }} />

          {/* Real-world deployment note */}
          <p style={{
            fontSize:     "12.5px",
            color:        "hsl(220,14%,62%)",
            lineHeight:   "1.75",
            marginBottom: "10px",
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            In a real production scenario, this system is intended to run exclusively on a{" "}
            <strong style={{ color: "hsl(220,14%,88%)", fontWeight: 600 }}>
              secured internal network (LAN)
            </strong>{" "}
            — accessible only within the business premises or its own private network —
            to keep all financial data private and protected.
          </p>

          {/* Divider */}
          <div style={{ margin: "10px 0", height: "1px", background: "hsl(220,20%,22%)" }} />

          {/* Registration note */}
          <p style={{
            fontSize:   "12px",
            color:      "hsl(220,10%,52%)",
            lineHeight: "1.7",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <strong style={{ color: "hsl(220,10%,68%)", fontWeight: 600 }}>Registration is open in this prototype</strong>{" "}
            so anyone can explore the system freely (but as Standard User only —
              to avoid trolling of data simulations). In a real deployment, account
            creation is restricted — only the owner's designated machine or IP
            within the network is permitted to register new accounts.{" "}
          </p>
        </div>
      )}
    </div>
  );
}