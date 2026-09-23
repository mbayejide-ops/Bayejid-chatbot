import { useState, useEffect, useRef } from "react";
import { Send, Trash2, Loader2, ChevronDown, Radio } from "lucide-react";

const MONO = "'JetBrains Mono', 'Fira Code', monospace";
const SANS = "'Inter', system-ui, sans-serif";

// Paste your Google Drive direct-video link here, e.g.
// "https://drive.google.com/uc?export=download&id=FILE_ID"
const BG_VIDEO_URL = "https://drive.google.com/uc?export=download&id=1CKYlFYd5zg-JjiSYEhHNYIF_gQhtrbEl";

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
  const [provider, setProvider] = useState(() => loadJSON("provider", "1"));
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("provider", JSON.stringify(provider));
  }, [provider]);

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
          provider,
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        ::placeholder { color: #4B5563; }
        textarea:focus, button:focus-visible, select:focus-visible {
          outline: 2px solid #22D3C9;
          outline-offset: 2px;
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #1C222B; border-radius: 4px; }
        @keyframes simpleGlitch {
          0%, 100% { transform: translate(0, 0); text-shadow: none; }
          92% { transform: translate(0, 0); text-shadow: none; }
          93% { transform: translate(-2px, 1px); text-shadow: 2px 0 #FF0033, -2px 0 #22D3C9; }
          94% { transform: translate(2px, -1px); text-shadow: -2px 0 #FF0033, 2px 0 #22D3C9; }
          95% { transform: translate(-1px, 0); text-shadow: 1px 0 #FF0033, -1px 0 #22D3C9; }
          96%, 100% { transform: translate(0, 0); text-shadow: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; transition: none !important; }
        }
      `}</style>

      {/* background video */}
      {BG_VIDEO_URL && (
        <video
          key={BG_VIDEO_URL}
          style={styles.bgVideo}
          src={BG_VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
        />
      )}
      <div style={styles.bgOverlay} aria-hidden="true" />

      {/* signature watermark - simple centered glitch */}
      <div aria-hidden="true" style={styles.watermarkWrap}>
        <span style={styles.glitchText}>BAYEJID</span>
      </div>

      <header style={styles.header}>
        <div style={styles.brand}>
          <span style={styles.pulseDot} />
          <span style={styles.brandText}>bayejid://chat</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={styles.selectWrap}>
            <select
              style={styles.select}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              aria-label="Choose model"
            >
              <option value="1">model.01</option>
              <option value="2">model.02</option>
            </select>
            <ChevronDown size={13} style={styles.selectChevron} />
          </div>
          <button style={styles.iconBtn} onClick={clearChat} aria-label="Clear chat">
            <Trash2 size={15} />
          </button>
        </div>
      </header>

      <div style={styles.log} ref={scrollRef}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <Radio size={20} color="#2C3542" />
            <p style={styles.emptyTitle}>no signal yet</p>
            <p style={styles.emptyBody}>Send something below to open the line.</p>
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
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite", color: "#22D3C9" }} />
              <span style={{ marginLeft: 8, color: "#5B6472" }}>thinking…</span>
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
    position: "relative",
    height: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    background: "#080A0D",
    color: "#E4E7EB",
    fontFamily: SANS,
    overflow: "hidden",
  },
  bgVideo: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    zIndex: 0,
    filter: "brightness(0.4) saturate(1.1)",
  },
  bgOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 0,
    background:
      "radial-gradient(ellipse at center, rgba(8,10,13,0.35) 0%, rgba(8,10,13,0.85) 100%)",
  },
  watermarkWrap: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
    pointerEvents: "none",
    userSelect: "none",
    fontFamily: MONO,
    fontWeight: 700,
    fontSize: "min(14vw, 120px)",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  glitchText: {
    color: "#E4E7EB",
    opacity: 0.5,
    animation: "simpleGlitch 3.2s infinite steps(1)",
  },
  header: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "13px 16px",
    borderBottom: "1px solid #161B22",
    flexShrink: 0,
    backdropFilter: "blur(6px)",
  },
  brand: { display: "flex", alignItems: "center", gap: 9 },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "#22D3C9",
    boxShadow: "0 0 8px #22D3C9",
    animation: "pulseDot 2s ease-in-out infinite",
  },
  brandText: { fontFamily: MONO, fontSize: 13, fontWeight: 600, letterSpacing: 0.2, color: "#C7CCD3" },
  iconBtn: {
    background: "transparent",
    border: "1px solid #1C222B",
    borderRadius: 6,
    color: "#6B7280",
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  selectWrap: { position: "relative" },
  select: {
    background: "#10141A",
    border: "1px solid #1C222B",
    borderRadius: 6,
    color: "#E4E7EB",
    fontFamily: MONO,
    fontSize: 12,
    padding: "7px 26px 7px 10px",
    appearance: "none",
    cursor: "pointer",
  },
  selectChevron: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#4B5563",
    pointerEvents: "none",
  },
  log: {
    position: "relative",
    zIndex: 1,
    flex: 1,
    overflowY: "auto",
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  empty: {
    margin: "auto",
    textAlign: "center",
    maxWidth: 260,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontFamily: MONO, fontSize: 13, color: "#4B5563", margin: 0 },
  emptyBody: { fontSize: 13, color: "#3E4650", lineHeight: 1.5, margin: 0 },
  row: (role) => ({
    display: "flex",
    flexDirection: "column",
    alignItems: role === "user" ? "flex-end" : "flex-start",
  }),
  rowMeta: { display: "flex", gap: 8, alignItems: "baseline", marginBottom: 4, padding: "0 4px" },
  rowRole: (role) => ({
    fontFamily: MONO,
    fontSize: 10,
    letterSpacing: 0.6,
    color: role === "user" ? "#FFB020" : "#22D3C9",
  }),
  rowTime: { fontFamily: MONO, fontSize: 10, color: "#3E4650" },
  bubble: (role) => ({
    maxWidth: "78%",
    padding: "10px 13px",
    fontSize: 14,
    lineHeight: 1.55,
    borderRadius: 4,
    background: role === "user" ? "rgba(22,26,33,0.92)" : "rgba(16,20,26,0.92)",
    borderLeft: `2px solid ${role === "user" ? "#FFB020" : "#22D3C9"}`,
    whiteSpace: "pre-wrap",
    display: "flex",
    alignItems: "center",
    backdropFilter: "blur(4px)",
  }),
  errorBar: {
    position: "relative",
    zIndex: 1,
    background: "#241416",
    color: "#F0A0A0",
    fontSize: 12.5,
    padding: "8px 14px",
    borderTop: "1px solid #3D1E20",
  },
  inputBar: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #161B22",
    flexShrink: 0,
    background: "rgba(8,10,13,0.7)",
    backdropFilter: "blur(6px)",
  },
  textarea: {
    flex: 1,
    resize: "none",
    background: "#10141A",
    border: "1px solid #1C222B",
    borderRadius: 8,
    color: "#E4E7EB",
    fontFamily: SANS,
    fontSize: 14,
    padding: "10px 12px",
    maxHeight: 120,
  },
  sendBtn: (disabled) => ({
    background: disabled ? "#141920" : "#22D3C9",
    color: disabled ? "#3E4650" : "#04100F",
    border: "none",
    borderRadius: 8,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
  }),
};
