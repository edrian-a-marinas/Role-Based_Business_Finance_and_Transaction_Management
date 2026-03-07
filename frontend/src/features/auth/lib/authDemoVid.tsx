const DEMO_VIDEO_URL = "https://drive.google.com/drive/folders/1u7WnkaLEA_4eJaf3D4nfk8o-e--OSsNe?usp=sharing";

export default function WatchDemoLink() {
  return (
    <div style={{
      marginTop:      "18px",
      display:        "flex",
      justifyContent: "center",
      alignItems:     "center",
      gap:            "7px",
    }}>
      <a
        href={DEMO_VIDEO_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           "6px",
          fontSize:      "11.5px",
          color:         "hsl(220,10%,46%)",
          textDecoration: "none",
          fontFamily:    "'DM Mono', monospace",
          letterSpacing: "0.02em",
          transition:    "color 0.2s",
          padding:       "4px 0",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "hsl(199,89%,58%)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "hsl(220,10%,46%)")}
      >
        {/* Play icon */}
        <span style={{
          display:         "inline-flex",
          alignItems:      "center",
          justifyContent:  "center",
          width:           "20px",
          height:          "20px",
          borderRadius:    "50%",
          border:          "1px solid hsl(220,20%,24%)",
          fontSize:        "8px",
          color:           "hsl(199,89%,48%)",
          flexShrink:      0,
        }}>
          ▶
        </span>
        Watch demo walkthrough
      </a>
    </div>
  );
}