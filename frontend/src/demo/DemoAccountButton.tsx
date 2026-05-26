import { useState } from "react";
interface Props {
  onDemoClick?: () => void;
}
export default function DemoAccountTooltip({ onDemoClick }: Props) {
  const [show, setShow] = useState(false);
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex", justifyContent: "center" }}>
      <button
        type="button"
        onClick={onDemoClick}
        onMouseEnter={() => { setShow(true); setHovered(true); }}
        onMouseLeave={() => { setShow(false); setHovered(false); }}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        style={{
          display:         "inline-flex",
          alignItems:      "center",
          gap:             "7px",
          background:      hovered
                             ? "hsl(199 89% 48% / 0.18)"
                             : "hsl(199 89% 48% / 0.10)",
          border:          "1px solid hsl(199 89% 48% / 0.55)",
          borderRadius:    "10px",               // rectangular button, not pill
          padding:         "8px 16px",           // taller + wider than the badge
          fontSize:        "13px",               // bigger than the badge's 10.5px
          fontWeight:      600,
          color:           "hsl(199,89%,72%)",
          letterSpacing:   "0.01em",
          cursor:          "pointer",
          fontFamily:      "'DM Sans', sans-serif",
          transition:      "background 0.15s, border-color 0.15s, transform 0.12s, box-shadow 0.15s",
          transform:       hovered ? "translateY(-1px)" : "translateY(0)",
          boxShadow:       hovered
                             ? "0 4px 16px hsl(199 89% 48% / 0.20), 0 0 0 1px hsl(199 89% 48% / 0.15)"
                             : "0 2px 8px hsl(199 89% 48% / 0.08)",
        }}
      >
        🎯 Try a Demo Account
      </button>
      {show && (
        <div style={{
          position:        "absolute",
          bottom:          "calc(100% + 10px)",
          left:            "50%",
          transform:       "translateX(-50%)",
          backgroundColor: "hsl(220,22%,13%)",
          border:          "1px solid hsl(220,20%,24%)",
          borderRadius:    "12px",
          padding:         "14px 16px",
          width:           "300px",
          zIndex:          200,
          boxShadow:       "0 12px 40px hsl(220 28% 4% / 0.75), 0 0 0 1px hsl(220 20% 20% / 0.5)",
          pointerEvents:   "none",
          textAlign:       "left",
        }}>
          <span style={{
            position:    "absolute",
            top:         "100%",
            left:        "50%",
            transform:   "translateX(-50%)",
            width:       0,
            height:      0,
            borderLeft:  "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop:   "7px solid hsl(220,20%,24%)",
          }} />
          <p style={{
            fontSize:      "10px",
            fontWeight:    700,
            color:         "hsl(199,89%,62%)",
            marginBottom:  "10px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily:    "'DM Mono', monospace",
          }}>
            Demo Account
          </p>
          <div style={{ height: "1px", background: "hsl(220,20%,22%)", marginBottom: "10px" }} />
          <p style={{ fontSize: "11.5px", color: "hsl(199,89%,62%)", lineHeight: "1.6", fontFamily: "'DM Sans', sans-serif", marginBottom: "8px" }}>
            Click to instantly log in as a demo user — no registration needed.
          </p>
          <div style={{ height: "1px", background: "hsl(220,20%,22%)", marginBottom: "10px" }} />
          <p style={{ fontSize: "11.5px", color: "hsl(220,10%,52%)", lineHeight: "1.6", fontFamily: "'DM Sans', sans-serif" }}>
            Standard User only — can view, add, and request transaction deletions. Admin features are restricted.
          </p>
          <p style={{ fontSize: "11px", color: "hsl(220,10%,40%)", lineHeight: "1.6", fontFamily: "'DM Sans', sans-serif", marginTop: "6px" }}>
            All data is simulated — no real records. The system isn't limited to gaming cafés;
            it's a general-purpose finance & transaction tracker built for any business.
            The café is just the example business I used for this demo.
          </p>
        </div>
      )}
    </div>
  );
}