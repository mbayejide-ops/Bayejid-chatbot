import { useState, useEffect, useRef } from "react";
import { Send, Terminal, Trash2, Loader2 } from "lucide-react";

const MONO = "'JetBrains Mono', 'Fira Code', monospace";
const SANS = "'Inter', system-ui, sans-serif";

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

export default function ChatApp() {
  const [messages, setMessages] = useState(() => loadJSON("messages", []));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    const nextMessages = [...messages, { role: "user", content: text, ts: Date.now() }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status}).`);
      }
      const reply = data?.choices?.[0]?.message?.content ?? "No reply content found in response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e) {
      setError(e.message || "Something went wrong reaching the AI.");
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    setMessages([]);
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        ::placeholder { color: #5A6472; }
        textarea:focus, button:focus-visible {
          outline: 2px solid #5B8DEF;
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      <header style={styles.header}>
        <div style={styles.brand}>
          <Terminal size={16} color="#5B8DEF" />
          <span style={styles.brandText}>chatbot</span>
        </div>
        <button style={styles.iconBtn} onClick={clearChat} aria-label="Clear chat">
          <Trash2 size={15} />
        </button>
      </header>

      <div style={styles.log} ref={scrollRef}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>log is empty</p>
            <p style={styles.emptyBody}>Send a message to start the conversation.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={styles.row(m.role)}>
            <div style={styles.rowMeta}>
              <span style={styles.rowRole(m.role)}>{m.role === "user" ? "you" : "model"}</span>
              <span style={styles.rowTime}>
                {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div style={styles.bubble(m.role)}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={styles.row("assistant")}>
            <div style={styles.rowMeta}>
              <span style={styles.rowRole("assistant")}>model</span>
            </div>
            <div style={styles.bubble("assistant")}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <span style={{ marginLeft: 8, color: "#8892A0" }}>generating…</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={styles.errorBar}>
          <span>{error}</span>
        </div>
      )}

      <div style={styles.inputBar}>
        <textarea
          style={styles.textarea}
          placeholder="Type a message…"
          value={input}
          rows={1}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <button
          style={styles.sendBtn(!input.trim() || loading)}
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#0F1419",
    color: "#EDEFF2",
    fontFamily: SANS,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #1E252E",
    flexShrink: 0,
  },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandText: { fontFamily: MONO, fontSize: 13, fontWeight: 600, letterSpacing: 0.2 },
  iconBtn: {
    background: "transparent",
    border: "1px solid #1E252E",
    borderRadius: 6,
    color: "#8892A0",
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  log: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  empty: { margin: "auto", textAlign: "center", maxWidth: 280 },
  emptyTitle: { fontFamily: MONO, fontSize: 13, color: "#5A6472", margin: "0 0 6px" },
  emptyBody: { fontSize: 13, color: "#5A6472", lineHeight: 1.5, margin: 0 },
  row: (role) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: role === "user" ? "flex-end" : "flex-start",
  }),
  rowMeta: { display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4, padding: "0 4px" },
  rowRole: (role) => ({
    fontFamily: MONO,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: role === "user" ? "#E8A33D" : "#5B8DEF",
  }),
  rowTime: { fontFamily: MONO, fontSize: 10, color: "#3E4650" },
  bubble: (role) => ({
    maxWidth: "78%",
    padding: "10px 13px",
    fontSize: 14,
    lineHeight: 1.55,
    borderRadius: 4,
    background: role === "user" ? "#161B22" : "#12171D",
    borderLeft: `2px solid ${role === "user" ? "#E8A33D" : "#5B8DEF"}`,
    whiteSpace: "pre-wrap",
    display: "flex",
    alignItems: "center",
  }),
  errorBar: {
    background: "#2A1616",
    color: "#F0A0A0",
    fontSize: 12.5,
    padding: "8px 14px",
    borderTop: "1px solid #4A2323",
  },
  inputBar: {
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #1E252E",
    flexShrink: 0,
  },
  textarea: {
    flex: 1,
    resize: "none",
    background: "#12171D",
    border: "1px solid #1E252E",
    borderRadius: 8,
    color: "#EDEFF2",
    fontFamily: SANS,
    fontSize: 14,
    padding: "10px 12px",
    maxHeight: 120,
  },
  sendBtn: (disabled) => ({
    background: disabled ? "#161B22" : "#5B8DEF",
    color: disabled ? "#3E4650" : "#0F1419",
    border: "none",
    borderRadius: 8,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
  }),
};
