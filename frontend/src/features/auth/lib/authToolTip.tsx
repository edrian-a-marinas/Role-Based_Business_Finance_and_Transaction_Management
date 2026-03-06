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
          display:         "inline-flex",
          alignItems:      "center",
          gap:             "5px",
          background:      "hsl(45,85%,50% / 0.08)",
          border:          "1px solid hsl(45,85%,50% / 0.30)",
          borderRadius:    "20px",
          padding:         "3px 10px 3px 7px",
          fontSize:        "10.5px",
          fontWeight:      "600",
          color:           "hsl(45,85%,62%)",
          letterSpacing:   "0.06em",
          textTransform:   "uppercase",
          cursor:          "help",
          fontFamily:      "'DM Mono', monospace",
          transition:      "border-color 0.2s",
        }}
      >
        <span style={{ fontSize: "9px" }}>⬡</span>
        Prototype
        <span style={{
          fontSize:      "10px",
          opacity:       0.7,
          marginLeft:    "1px",
          fontFamily:    "sans-serif",
          fontWeight:    400,
        }}>ⓘ</span>
      </button>

      {show && (
        <div
          style={{
            position:        "absolute",
            bottom:          "calc(100% + 10px)",
            left:            "50%",
            transform:       "translateX(-50%)",
            backgroundColor: "hsl(220,25%,11%)",
            border:          "1px solid hsl(220,20%,22%)",
            borderRadius:    "10px",
            padding:         "12px 14px",
            width:           "260px",
            zIndex:          100,
            boxShadow:       "0 8px 32px hsla(220,28%,4%,0.7)",
            pointerEvents:   "none",
            textAlign:       "left",
          }}
        >
          {/* Title */}
          <p style={{
            fontSize:     "11px",
            fontWeight:   "700",
            color:        "hsl(45,85%,62%)",
            marginBottom: "6px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontFamily:   "'DM Mono', monospace",
          }}>
            ⚠ Prototype / Demo Build
          </p>

          {/* Body */}
          <p style={{
            fontSize:    "11.5px",
            color:       "hsl(220,14%,72%)",
            lineHeight:  "1.65",
            marginBottom: "8px",
          }}>
            <strong style={{ color: "hsl(220,14%,88%)" }}>TransacScope</strong> is a
            role-based business finance system built for a computer café scenario.
            This deployment is for <strong style={{ color: "hsl(220,14%,88%)" }}>
            academic and technical demonstration</strong> purposes only.
          </p>

          <p style={{
            fontSize:   "11px",
            color:      "hsl(220,10%,50%)",
            lineHeight: "1.55",
          }}>
            Intended production use is on a <strong style={{ color: "hsl(220,10%,65%)" }}>
            secured local business network (LAN)</strong>. Data shown is simulated.
            No real financial data is stored.
          </p>

          {/* Divider */}
          <div style={{
            margin:     "9px 0",
            height:     "1px",
            background: "hsl(220,20%,20%)",
          }} />

          {/* Demo credentials hint */}
          <p style={{
            fontSize:      "10.5px",
            color:         "hsl(220,10%,46%)",
            fontFamily:    "'DM Mono', monospace",
            letterSpacing: "0.02em",
          }}>
            Roles: Super Admin · Admin · Standard User
          </p>

          {/* Arrow */}
          <span style={{
            position:     "absolute",
            top:          "100%",
            left:         "50%",
            transform:    "translateX(-50%)",
            width:        0,
            height:       0,
            borderLeft:   "6px solid transparent",
            borderRight:  "6px solid transparent",
            borderTop:    "6px solid hsl(220,20%,22%)",
          }} />
        </div>
      )}
    </div>
  );
}