// components/ui/AIChatPanel.tsx
import { useState, useContext, useEffect, useRef, useCallback } from "react";
import {
  Bot, Send, Loader2, Sparkles, RefreshCw, User,
  AlertTriangle, Users, UserRound,
} from "lucide-react";
import { AuthContext } from "@/features/auth/AuthContext";
import api from "@/services/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// ── Typing animation ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 18, active = true) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(text); setDone(true); return; }
    setDisplayed("");
    setDone(false);
    if (!text) { setDone(true); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, active]);

  return { displayed, done };
}

// ── Message bubbles ───────────────────────────────────────────────────────────
function AssistantBubble({
  content, animate, onDone,
}: {
  content: string; animate: boolean; onDone?: () => void;
}) {
  const { displayed, done } = useTypewriter(content, 14, animate);
  useEffect(() => { if (done && onDone) onDone(); }, [done]);

  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
      <div style={{
        width: "1.85rem", height: "1.85rem", borderRadius: "50%",
        background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: "0.1rem",
      }}>
        <Bot style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--primary))" }} />
      </div>
      <div style={{
        background: "hsl(var(--page-surface))", border: "1px solid hsl(var(--page-border))",
        borderRadius: "0.15rem 0.75rem 0.75rem 0.75rem", padding: "0.65rem 0.875rem",
        maxWidth: "82%", fontSize: "0.8rem", lineHeight: 1.65, color: "hsl(var(--page-fg))",
        whiteSpace: "pre-wrap", wordBreak: "break-word", boxShadow: "0 1px 3px hsl(0 0% 0% / 0.05)",
      }}>
        {animate ? displayed : content}
        {animate && !done && (
          <span style={{
            display: "inline-block", width: "2px", height: "0.85em",
            background: "hsl(var(--primary))", marginLeft: "2px",
            verticalAlign: "text-bottom", animation: "ts-pulse 0.9s ease-in-out infinite",
          }} />
        )}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{
        background: "hsl(var(--primary))", borderRadius: "0.75rem 0.15rem 0.75rem 0.75rem",
        padding: "0.65rem 0.875rem", maxWidth: "82%", fontSize: "0.8rem", lineHeight: 1.65,
        color: "hsl(0 0% 100%)", whiteSpace: "pre-wrap", wordBreak: "break-word",
        boxShadow: "0 1px 3px hsl(0 0% 0% / 0.12)",
      }}>
        {content}
      </div>
      <div style={{
        width: "1.85rem", height: "1.85rem", borderRadius: "50%",
        background: "hsl(var(--page-surface-sub))", border: "1px solid hsl(var(--page-border))",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, marginTop: "0.1rem",
      }}>
        <User style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--page-fg-muted))" }} />
      </div>
    </div>
  );
}

function ScopeNoticePill({ content }: { content: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.35rem",
        padding: "0.2rem 0.65rem", borderRadius: "2rem",
        background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.18)",
        fontSize: "0.68rem", color: "hsl(var(--page-fg-muted))",
      }}>
        <Users style={{ width: "0.65rem", height: "0.65rem", color: "hsl(var(--primary))" }} />
        {content}
      </div>
    </div>
  );
}

// ── Slow reply hint ───────────────────────────────────────────────────────────
function SlowReplyHint({ elapsed }: { elapsed: "slow" | "very_slow" | null }) {
  if (!elapsed) return null;
  const isVery = elapsed === "very_slow";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.45rem",
      padding: "0.4rem 0.75rem", borderRadius: "0.5rem",
      background: isVery ? "hsl(35 90% 55% / 0.1)" : "hsl(45 95% 55% / 0.08)",
      border: `1px solid ${isVery ? "hsl(35 90% 55% / 0.3)" : "hsl(45 95% 55% / 0.25)"}`,
      animation: "ts-fadein 0.4s ease", alignSelf: "flex-start", maxWidth: "90%",
    }}>
      <AlertTriangle style={{
        width: "0.75rem", height: "0.75rem",
        color: isVery ? "hsl(35 90% 55%)" : "hsl(45 90% 48%)", flexShrink: 0,
      }} />
      <p style={{
        fontSize: "0.71rem", color: isVery ? "hsl(35 90% 45%)" : "hsl(40 80% 38%)",
        margin: 0, lineHeight: 1.4,
      }}>
        {isVery
          ? "This is taking longer than usual. You can reset the chat and try again, or wait a little longer."
          : "Thinking... this might take a moment. Groq can be slow sometimes."}
      </p>
    </div>
  );
}

// ── Scope toggle (admin only) ─────────────────────────────────────────────────
function ScopeToggle({
  scope, onChange, disabled,
}: {
  scope: "all" | "own"; onChange: (s: "all" | "own") => void; disabled: boolean;
}) {
  const opts: { value: "all" | "own"; label: string; icon: typeof Users }[] = [
    { value: "all", label: "All users", icon: Users     },
    { value: "own", label: "My data",   icon: UserRound },
  ];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.2rem",
      background: "hsl(var(--page-surface))", border: "1px solid hsl(var(--page-border))",
      borderRadius: "0.45rem", padding: "0.18rem",
    }}>
      {opts.map(({ value, label, icon: Icon }) => {
        const active = scope === value;
        return (
          <button
            key={value}
            onClick={() => !disabled && onChange(value)}
            disabled={disabled}
            title={label}
            style={{
              display: "flex", alignItems: "center", gap: "0.28rem",
              padding: "0.22rem 0.55rem", borderRadius: "0.3rem", border: "none",
              fontSize: "0.68rem", fontWeight: active ? 600 : 400,
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "background 0.15s, color 0.15s",
              background: active ? "hsl(var(--primary))" : "transparent",
              color: active ? "hsl(0 0% 100%)" : "hsl(var(--page-fg-muted))",
              opacity: disabled ? 0.5 : 1, whiteSpace: "nowrap",
            }}
          >
            <Icon style={{ width: "0.7rem", height: "0.7rem" }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Suggestion chips ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What are my top expenses this month?",
  "How is my income trending?",
  "What's my net profit for the last 30 days?",
  "Which category has the most spending?",
];

// ── Main component ────────────────────────────────────────────────────────────
export default function AIChatPanel() {
  const { user } = useContext(AuthContext);
  const isAdmin  = user?.role_id === 1;

  const [messages,       setMessages]       = useState<ChatMessage[]>([]);
  const [input,          setInput]          = useState("");
  const [loading,        setLoading]        = useState(false);
  const [contextLoading, setContextLoading] = useState(true);
  const [animatingIdx,   setAnimatingIdx]   = useState<number | null>(null);
  const [error,          setError]          = useState<string | null>(null);
  const [scope,          setScope]          = useState<"all" | "own">("all");
  const [slowHint,       setSlowHint]       = useState<"slow" | "very_slow" | null>(null);

  const bottomRef        = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLTextAreaElement>(null);
  const hasGreeted       = useRef(false);
  const slowTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const verySlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, animatingIdx, slowHint]);

  function clearSlowTimers() {
    if (slowTimerRef.current)     clearTimeout(slowTimerRef.current);
    if (verySlowTimerRef.current) clearTimeout(verySlowTimerRef.current);
    slowTimerRef.current = null;
    verySlowTimerRef.current = null;
    setSlowHint(null);
  }

  function startSlowTimers() {
    clearSlowTimers();
    slowTimerRef.current     = setTimeout(() => setSlowHint("slow"),      10_000);
    verySlowTimerRef.current = setTimeout(() => setSlowHint("very_slow"), 30_000);
  }

  function buildGreeting(context: string, activeScope: "all" | "own"): string {
    const firstName  = user?.first_name ?? "there";
    const roleSuffix = isAdmin ? " (Admin)" : "";
    const scopeNote  = isAdmin && activeScope === "all"
      ? " I'm currently looking at data across **all users**."
      : isAdmin && activeScope === "own"
      ? " I'm currently looking at **your own data** only."
      : "";

    const incomeMatch  = context.match(/Total Income:\s*₱([\d,]+\.\d{2})/);
    const expenseMatch = context.match(/Total Expenses:\s*₱([\d,]+\.\d{2})/);
    const netMatch     = context.match(/Net Profit\/Loss:\s*₱(-?[\d,]+\.\d{2})/);

    if (incomeMatch && expenseMatch && netMatch) {
      const netRaw = netMatch[1];
      const isNeg  = netRaw.startsWith("-");
      const net    = isNeg ? netRaw.slice(1) : netRaw;
      const label  = isNeg ? "loss" : "profit";
      return (
        `Hi, ${firstName}${roleSuffix}! 👋${scopeNote}\n\n` +
        `In the last 30 days, your net ${label} is **₱${net}** — ` +
        `with ₱${incomeMatch[1]} in income and ₱${expenseMatch[1]} in expenses.\n\n` +
        `Ask me anything about your finances — trends, category breakdowns, or specific transactions!`
      );
    }

    return (
      `Hi, ${firstName}${roleSuffix}! 👋${scopeNote}\n\n` +
      `I'm your TransacScope financial assistant. ` +
      `Ask me about your income, expenses, spending patterns, or anything else financial!`
    );
  }

  function fetchAndGreet(activeScope: "all" | "own" = scope) {
    setContextLoading(true);
    api.get<{ context: string }>("api/ai/context")
      .then(res => {
        const greeting = buildGreeting(res.data.context, activeScope);
        setMessages([{ role: "assistant", content: greeting }]);
        setAnimatingIdx(0);
      })
      .catch(() => {
        const firstName = user?.first_name ?? "there";
        setMessages([{
          role: "assistant",
          content: `Hi, ${firstName}! 👋\n\nI'm your financial assistant. Ask me anything about your transactions, income, expenses, or financial trends.`,
        }]);
        setAnimatingIdx(0);
      })
      .finally(() => setContextLoading(false));
  }

  useEffect(() => {
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    fetchAndGreet(scope);
  }, []);

  function handleScopeChange(newScope: "all" | "own") {
    if (newScope === scope || loading || contextLoading) return;
    setScope(newScope);
    const label = newScope === "all" ? "All users" : "My data only";
    setMessages(prev => [...prev, { role: "system", content: `Switched to: ${label}` }]);
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setError(null);

    const userMsg: ChatMessage = { role: "user", content: msg };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);
    startSlowTimers();

    const history = nextMessages.filter(m => m.role !== "system").slice(1).slice(-10);

    try {
      const res = await api.post<{ reply: string }>("api/ai/chat", {
        message: msg,
        history,
        ...(isAdmin ? { scope } : {}),
      });
      clearSlowTimers();
      const assistantMsg: ChatMessage = { role: "assistant", content: res.data.reply };
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        setAnimatingIdx(updated.length - 1);
        return updated;
      });
    } catch (err: any) {
      clearSlowTimers();
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail ?? "";
      if (status === 429) {
        setError(detail || "Rate limit reached. Please try again later.");
      } else if (status === 504 || detail === "timeout") {
        setError("The request timed out. Groq may be busy — please try again.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function handleReset() {
    clearSlowTimers();
    hasGreeted.current = false;
    setMessages([]);
    setAnimatingIdx(null);
    setError(null);
    setInput("");
    setLoading(false);
    fetchAndGreet(scope);
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "630px",
      background: "hsl(var(--page-surface))", border: "1px solid hsl(var(--page-border))",
      borderRadius: "0.875rem", overflow: "hidden",
      boxShadow: "0 1px 4px hsl(220 13% 80% / 0.18)",
    }}>

      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0.875rem 1.1rem", borderBottom: "1px solid hsl(var(--page-border))",
        background: "hsl(var(--page-surface-sub))", flexShrink: 0, gap: "0.75rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexShrink: 0 }}>
          <div style={{
            width: "1.85rem", height: "1.85rem", borderRadius: "0.45rem",
            background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--primary))" }} />
          </div>
          <div>
            <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "hsl(var(--page-fg))", margin: 0, lineHeight: 1.2 }}>
              AI Financial Assistant
            </p>
            <p style={{ fontSize: "0.68rem", color: "hsl(var(--page-fg-muted))", margin: 0, lineHeight: 1 }}>
              {isAdmin ? "Admin" : "Standard"} Account · Resets every refresh
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {isAdmin && (
            <ScopeToggle
              scope={scope}
              onChange={handleScopeChange}
              disabled={loading || contextLoading}
            />
          )}
          <button
            onClick={handleReset}
            title="Reset conversation"
            style={{
              display: "flex", alignItems: "center", gap: "0.3rem",
              background: "transparent", border: "1px solid hsl(var(--page-border))",
              borderRadius: "0.4rem", padding: "0.3rem 0.6rem", cursor: "pointer",
              color: "hsl(var(--page-fg-muted))", fontSize: "0.7rem",
              transition: "border-color 0.15s, color 0.15s", flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "hsl(var(--primary))";
              e.currentTarget.style.color       = "hsl(var(--primary))";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "hsl(var(--page-border))";
              e.currentTarget.style.color       = "hsl(var(--page-fg-muted))";
            }}
          >
            <RefreshCw style={{ width: "0.7rem", height: "0.7rem" }} />
            Reset
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "1rem",
        display: "flex", flexDirection: "column", gap: "0.875rem",
      }}>
        {contextLoading && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start" }}>
            <div className="ts-skeleton" style={{ width: "1.85rem", height: "1.85rem", borderRadius: "50%", flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flex: 1, maxWidth: "70%" }}>
              <div className="ts-skeleton" style={{ height: "0.75rem", borderRadius: "0.4rem", width: "80%" }} />
              <div className="ts-skeleton" style={{ height: "0.75rem", borderRadius: "0.4rem", width: "60%" }} />
              <div className="ts-skeleton" style={{ height: "0.75rem", borderRadius: "0.4rem", width: "70%" }} />
            </div>
          </div>
        )}

        {messages.map((msg, idx) =>
          msg.role === "system" ? (
            <ScopeNoticePill key={idx} content={msg.content} />
          ) : msg.role === "assistant" ? (
            <AssistantBubble
              key={idx}
              content={msg.content}
              animate={animatingIdx === idx}
              onDone={() => { if (animatingIdx === idx) setAnimatingIdx(null); }}
            />
          ) : (
            <UserBubble key={idx} content={msg.content} />
          )
        )}

        {loading && (
          <>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
              <div style={{
                width: "1.85rem", height: "1.85rem", borderRadius: "50%",
                background: "hsl(var(--primary) / 0.12)", border: "1px solid hsl(var(--primary) / 0.25)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Bot style={{ width: "0.9rem", height: "0.9rem", color: "hsl(var(--primary))" }} />
              </div>
              <div style={{
                display: "flex", gap: "0.3rem", alignItems: "center",
                padding: "0.6rem 0.875rem", background: "hsl(var(--page-surface))",
                border: "1px solid hsl(var(--page-border))",
                borderRadius: "0.15rem 0.75rem 0.75rem 0.75rem",
              }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: "0.35rem", height: "0.35rem", borderRadius: "50%",
                    background: "hsl(var(--primary))", display: "block",
                    animation: `ts-pulse 1.1s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
            <SlowReplyHint elapsed={slowHint} />
          </>
        )}

        {error && (
          <p style={{ fontSize: "0.74rem", color: "hsl(var(--expense))", textAlign: "center", margin: 0 }}>
            {error}
          </p>
        )}

        {!contextLoading && messages.length === 1 && messages[0].role === "assistant" && animatingIdx === null && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginTop: "0.25rem" }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                style={{
                  background: "hsl(var(--primary) / 0.07)", border: "1px solid hsl(var(--primary) / 0.2)",
                  borderRadius: "2rem", padding: "0.3rem 0.75rem", fontSize: "0.72rem",
                  color: "hsl(var(--primary))", cursor: "pointer",
                  transition: "background 0.15s, border-color 0.15s", whiteSpace: "nowrap",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background  = "hsl(var(--primary) / 0.15)";
                  e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.4)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background  = "hsl(var(--primary) / 0.07)";
                  e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.2)";
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        padding: "0.75rem 1rem", borderTop: "1px solid hsl(var(--page-border))",
        background: "hsl(var(--page-surface-sub))", flexShrink: 0,
      }}>
        <div
          style={{
            display: "flex", gap: "0.5rem", alignItems: "flex-end",
            background: "hsl(var(--page-surface))", border: "1px solid hsl(var(--page-border))",
            borderRadius: "0.65rem", padding: "0.4rem 0.5rem 0.4rem 0.75rem",
            transition: "border-color 0.15s",
          }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.5)")}
          onBlurCapture={e  => (e.currentTarget.style.borderColor = "hsl(var(--page-border))")}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            rows={1}
            disabled={loading || contextLoading}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              resize: "none", fontSize: "0.8rem", color: "hsl(var(--page-fg))",
              lineHeight: 1.5, fontFamily: "inherit", maxHeight: "6rem",
              overflowY: "auto", paddingTop: "0.2rem",
            }}
            onInput={e => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 96) + "px";
            }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || contextLoading}
            style={{
              width: "2rem", height: "2rem", borderRadius: "0.45rem", border: "none",
              background: (!input.trim() || loading || contextLoading)
                ? "hsl(var(--page-border))" : "hsl(var(--primary))",
              color: (!input.trim() || loading || contextLoading)
                ? "hsl(var(--page-fg-muted))" : "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: (!input.trim() || loading || contextLoading) ? "not-allowed" : "pointer",
              transition: "background 0.15s, color 0.15s", flexShrink: 0,
            }}
          >
            {loading
              ? <Loader2 style={{ width: "0.85rem", height: "0.85rem", animation: "spin 0.8s linear infinite" }} />
              : <Send style={{ width: "0.8rem", height: "0.8rem" }} />
            }
          </button>
        </div>
        <p style={{ fontSize: "0.65rem", color: "hsl(var(--page-fg-muted))", margin: "0.4rem 0 0", textAlign: "center" }}>
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}