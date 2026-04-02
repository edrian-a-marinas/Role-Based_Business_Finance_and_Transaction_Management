// src/features/dashboard/components/ui/NotificationPanel.tsx
import { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Trash2, CheckCheck, X } from "lucide-react";
import api from "@/services/apiClient";

const N = {
  surface:    "hsl(220,20%,12%)",
  surfaceEl:  "hsl(220,18%,16%)",
  surfaceHov: "hsl(220,16%,20%)",
  border:     "hsl(220,16%,22%)",
  fg:         "hsl(220,14%,90%)",
  fgMuted:    "hsl(220,10%,55%)",
  expense:    "hsl(0,72%,51%)",
  primary:    "hsl(199,89%,38%)",
};

export interface Notification {
  id:                number;
  recipient_user_id: number;
  type:              string;
  payload:           Record<string, any>;
  is_read:           boolean;
  created_at:        string;
}

interface NotificationPanelProps {
  isAdmin:    boolean;
  authHeader: Record<string, string>;
  onDeepLink: (requestId: number) => void;
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function notifMessage(notif: Notification): { title: string; body: string } {
  const p      = notif.payload;
  const amt    = p.amount ? ` ₱${parseFloat(p.amount).toLocaleString()}` : "";
  const txType = (p.transaction_type ?? "transaction").toLowerCase();
  if (notif.type === "deletion_request") {
    const name = p.requester_name ?? "A user";
    return { title: "Deletion Request", body: `${name} requested to delete a ${txType}${amt}` };
  }
  if (notif.type === "deletion_approved") {
    return { title: "Request Approved ✓", body: `Your deletion request for a ${txType}${amt} was approved and the transaction has been removed.` };
  }
  if (notif.type === "deletion_rejected") {
    return { title: "Request Rejected", body: `Your deletion request for a ${txType}${amt} was rejected by an admin.` };
  }
  return { title: "Notification", body: "You have a new notification" };
}

function NotifIcon({ type }: { type: string }) {
  if (type === "deletion_request") return (
    <div style={{ width:"2rem",height:"2rem",borderRadius:"0.5rem",flexShrink:0,backgroundColor:"hsl(0 72% 51% / 0.12)",border:`1px solid ${N.expense}40`,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <Trash2 style={{ width:"0.85rem",height:"0.85rem",color:N.expense }} />
    </div>
  );
  if (type === "deletion_approved") return (
    <div style={{ width:"2rem",height:"2rem",borderRadius:"0.5rem",flexShrink:0,backgroundColor:"hsl(160 60% 45% / 0.12)",border:"1px solid hsl(160 60% 45% / 0.4)",display:"flex",alignItems:"center",justifyContent:"center" }}>
      <CheckCheck style={{ width:"0.85rem",height:"0.85rem",color:"hsl(160,60%,45%)" }} />
    </div>
  );
  if (type === "deletion_rejected") return (
    <div style={{ width:"2rem",height:"2rem",borderRadius:"0.5rem",flexShrink:0,backgroundColor:"hsl(220 10% 46% / 0.12)",border:`1px solid ${N.fgMuted}40`,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <X style={{ width:"0.85rem",height:"0.85rem",color:N.fgMuted }} />
    </div>
  );
  return (
    <div style={{ width:"2rem",height:"2rem",borderRadius:"0.5rem",flexShrink:0,backgroundColor:"hsl(199 89% 38% / 0.12)",border:`1px solid ${N.primary}40`,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <Bell style={{ width:"0.85rem",height:"0.85rem",color:N.primary }} />
    </div>
  );
}

export default function NotificationPanel({ isAdmin, authHeader, onDeepLink }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [panelOpen,     setPanelOpen]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef  = useRef<HTMLButtonElement>(null);
  const esRef    = useRef<EventSource | null>(null);

  // ── Extract token for SSE URL (EventSource can't set headers) ────────────
  const token     = localStorage.getItem("access_token");
  const tokenType = localStorage.getItem("token_type");

  // ── SSE connection — opens once on mount, auto-reconnects on error ───────
  useEffect(() => {
    if (!token || !tokenType) return;

    const baseUrl = (import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/").replace(/\/$/, "");
    const sseUrl = `${baseUrl}/api/notifications/stream?token=${encodeURIComponent(token)}&token_type=${encodeURIComponent(tokenType)}`;

    function connect() {
      const es = new EventSource(sseUrl);
      esRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "new_notification") {
            setUnreadCount(prev => prev + (data.unread_count ?? 1));
          }
        } catch { /* ignore malformed frames */ }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setTimeout(connect, 5_000);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [token, tokenType]);

  // ── Fetch the real unread count once on mount (SSE only sends deltas) ────
  useEffect(() => {
    if (!token || !tokenType) return;
    api.get("api/notifications/unread-count", { headers: authHeader })
      .then(res => setUnreadCount(res.data.unread_count ?? 0))
      .catch(() => { /* silent */ });
  }, []);

  // ── Close panel on outside click ─────────────────────────────────────────
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current  && !bellRef.current.contains(e.target as Node)
      ) setPanelOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [panelOpen]);

  // ── Open panel: fetch list then mark all read ─────────────────────────────
  const openPanel = async () => {
    if (panelOpen) { setPanelOpen(false); return; }
    setPanelOpen(true);
    setLoading(true);
    try {
      const res = await api.get("api/notifications/", { headers: authHeader });
      setNotifications(res.data ?? []);
      if (unreadCount > 0) {
        await api.patch("api/notifications/read-all", {}, { headers: authHeader });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) {
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      try { await api.patch(`api/notifications/${notif.id}/read`, {}, { headers: authHeader }); }
      catch { /* silent */ }
    }
    if (notif.type === "deletion_request" && isAdmin) {
      setPanelOpen(false);
      onDeepLink(notif.payload.request_id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notifId: number) => {
    e.stopPropagation();
    setDeletingId(notifId);
    try {
      await api.delete(`api/notifications/${notifId}`, { headers: authHeader });
      const wasUnread = notifications.find(n => n.id === notifId)?.is_read === false;
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* silent */ }
    finally { setDeletingId(null); }
  };

  const markAllRead = async () => {
    try {
      await api.patch("api/notifications/read-all", {}, { headers: authHeader });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const clearAll = async () => {
    const ids = notifications.map(n => n.id);
    setNotifications([]);
    setUnreadCount(0);
    await Promise.allSettled(ids.map(id => api.delete(`api/notifications/${id}`, { headers: authHeader })));
  };

  const hasUnread = notifications.some(n => !n.is_read);

  // ── JSX (identical to original, no changes needed below) ─────────────────
  return (
    <div style={{ position: "relative" }}>
      <button
        ref={bellRef}
        onClick={openPanel}
        title={panelOpen ? "Close notifications" : "Open notifications"}

        onMouseEnter={(e) => {
          if (!panelOpen) {
            e.currentTarget.style.borderColor = N.primary;
            e.currentTarget.style.color = N.primary;
          }
        }}
        onMouseLeave={(e) => {
          if (!panelOpen) {
            e.currentTarget.style.borderColor = "hsl(var(--topbar-border))";
            e.currentTarget.style.color = "hsl(var(--page-fg-light))";
          }
        }}

        style={{
          position: "relative",
          background: panelOpen ? "#ffffff" : "hsl(var(--page-surface))",
          border: `1px solid ${panelOpen ? N.primary : "hsl(var(--topbar-border))"}`,
          borderRadius: "0.5rem",
          padding: "0.4rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          color: panelOpen ? N.primary : "hsl(var(--page-fg-light))",

          // 🔥 GLOW EFFECT (your old behavior but cleaner)
          boxShadow: panelOpen
            ? "0 0 0 2px rgba(0,0,0,0.05), 0 0 12px rgba(0,0,0,0.15)"
            : "none",

          transition: "all 0.15s ease"
        }}
      >
        <Bell style={{ width:"1.1rem",height:"1.1rem" }} />
        {unreadCount > 0 && (
          <span style={{ position:"absolute",top:"-4px",right:"-4px",minWidth:"1rem",height:"1rem",borderRadius:"999px",backgroundColor:N.expense,color:"#fff",fontSize:"0.6rem",fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 0.25rem",lineHeight:1 }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {panelOpen && (
        <div ref={panelRef} style={{ position:"absolute",top:"calc(100% + 8px)",right:0,width:"360px",background:N.surface,border:`1px solid ${N.border}`,borderRadius:"0.75rem",boxShadow:"0 16px 40px rgba(0,0,0,0.35)",overflow:"hidden",zIndex:100 }}>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.85rem 1rem",borderBottom:`1px solid ${N.border}` }}>
            <div style={{ display:"flex",alignItems:"center",gap:"0.4rem" }}>
              <Bell style={{ width:"0.85rem",height:"0.85rem",color:N.fgMuted }} />
              <span style={{ fontSize:"0.82rem",fontWeight:700,color:N.fg }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ background:`${N.expense}20`,border:`1px solid ${N.expense}40`,borderRadius:"999px",padding:"0.05rem 0.4rem",fontSize:"0.65rem",fontWeight:700,color:N.expense }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {hasUnread && (
              <button onClick={markAllRead} style={{ display:"flex",alignItems:"center",gap:"0.25rem",background:"transparent",border:"none",color:N.fgMuted,fontSize:"0.7rem",cursor:"pointer",padding:"0.2rem 0.4rem",borderRadius:"0.35rem" }}>
                <CheckCheck style={{ width:"0.75rem",height:"0.75rem" }} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight:"420px",overflowY:"auto" }}>
            {loading && <p style={{ color:N.fgMuted,fontSize:"0.78rem",padding:"1.5rem",textAlign:"center" }}>Loading…</p>}
            {!loading && notifications.length === 0 && (
              <div style={{ padding:"2.5rem 1rem",textAlign:"center" }}>
                <Bell style={{ width:"1.5rem",height:"1.5rem",color:N.fgMuted,margin:"0 auto 0.5rem",opacity:0.4 }} />
                <p style={{ color:N.fgMuted,fontSize:"0.78rem",margin:0 }}>No notifications yet</p>
              </div>
            )}
            {!loading && notifications.map((notif, idx) => {
              const { title, body } = notifMessage(notif);
              const isClickable = notif.type === "deletion_request" && isAdmin;
              const isDeleting  = deletingId === notif.id;
              return (
                <div
                  key={notif.id}
                  onClick={() => isClickable && handleNotifClick(notif)}
                  style={{ display:"flex",gap:"0.65rem",padding:"0.75rem 1rem",borderBottom:idx < notifications.length-1 ? `1px solid ${N.border}` : "none",cursor:isClickable?"pointer":"default",backgroundColor:notif.is_read?"transparent":"hsl(199 89% 38% / 0.05)",transition:"background 0.1s",opacity:isDeleting?0.4:1,position:"relative" }}
                  onMouseEnter={e => {
                    if (isClickable) e.currentTarget.style.backgroundColor = N.surfaceHov;
                    const btn = e.currentTarget.querySelector<HTMLElement>(".notif-delete-btn");
                    if (btn) btn.style.opacity = "1";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = notif.is_read ? "transparent" : "hsl(199 89% 38% / 0.05)";
                    const btn = e.currentTarget.querySelector<HTMLElement>(".notif-delete-btn");
                    if (btn) btn.style.opacity = "0";
                  }}
                >
                  <NotifIcon type={notif.type} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:"0.5rem" }}>
                      <span style={{ fontSize:"0.78rem",fontWeight:600,color:N.fg }}>{title}</span>
                      <span style={{ fontSize:"0.67rem",color:N.fgMuted,whiteSpace:"nowrap",flexShrink:0 }}>{relativeTime(notif.created_at)}</span>
                    </div>
                    <p style={{ fontSize:"0.73rem",color:N.fgMuted,margin:"0.15rem 0 0",lineHeight:1.4 }}>{body}</p>
                    {isClickable && <p style={{ fontSize:"0.67rem",color:N.primary,margin:"0.25rem 0 0",fontWeight:500 }}>Click to review →</p>}
                  </div>
                  <div style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:"0.4rem",flexShrink:0 }}>
                    {!notif.is_read && <div style={{ width:"6px",height:"6px",borderRadius:"999px",backgroundColor:N.primary,marginTop:"0.35rem" }} />}
                    <button
                      className="notif-delete-btn"
                      onClick={e => handleDelete(e, notif.id)}
                      disabled={isDeleting}
                      style={{ opacity:0,transition:"opacity 0.15s",background:"transparent",border:`1px solid ${N.border}`,borderRadius:"0.35rem",padding:"0.2rem",cursor:isDeleting?"not-allowed":"pointer",display:"flex",alignItems:"center",color:N.fgMuted }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = N.expense; e.currentTarget.style.color = N.expense; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = N.border;  e.currentTarget.style.color = N.fgMuted; }}
                    >
                      <X style={{ width:"0.65rem",height:"0.65rem" }} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {notifications.length > 0 && (
            <div style={{ padding:"0.5rem 1rem",borderTop:`1px solid ${N.border}`,textAlign:"center",fontSize:"0.7rem",color:N.fgMuted }}>
              {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              {" · "}
              <button onClick={clearAll} style={{ background:"none",border:"none",color:N.expense,fontSize:"0.7rem",cursor:"pointer",padding:0 }}>Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}