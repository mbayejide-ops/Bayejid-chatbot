import { useState, useEffect, useRef } from "react";
import { Send, Settings, X, Terminal, Trash2, Loader2, ChevronDown } from "lucide-react";

const MONO = "'JetBrains Mono', 'Fira Code', monospace";
const SANS = "'Inter', system-ui, sans-serif";

const DEFAULT_SETTINGS = {
  provider: "openrouter",
  openrouterKey: "",
  openrouterModel: "openai/gpt-4o-mini",
  customEndpoint: "",
  customKey: "",
  customModel: "",
};

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
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...loadJSON("settings", {}),
  }));
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const isConfigured =
    settings.provider === "openrouter"
      ? !!settings.openrouterKey
      : !!(settings.customEndpoint && settings.customModel);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    if (!isConfigured) {
      setError("Add your API details in settings before sending a message.");
      setShowSettings(true);
      return;
    }
    setError(null);
    const nextMessages = [...messages, { role: "user", content: text, ts: Date.now() }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const payload = {
        model: settings.provider === "openrouter" ? settings.openrouterModel : settings.customModel,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      };
      const endpoint =
        settings.provider === "openrouter"
          ? "https://openrouter.ai/api/v1/chat/completions"
          : settings.customEndpoint;
      const key = settings.provider === "openrouter" ? settings.openrouterKey : settings.customKey;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(key ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Request failed (${res.status}). ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const reply =
        data?.choices?.[0]?.message?.content ??
        data?.content?.[0]?.text ??
        "No reply content found in response.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply, ts: Date.now() }]);
    } catch (e) {
      setError(e.message || "Something went wrong reaching the API.");
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
        textarea:focus, input:focus, select:focus, button:focus-visible {
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
          <span style={styles.brandText}>own-api-chat</span>
          <span style={styles.statusDot(isConfigured)} />
          <span style={styles.statusText}>
            {isConfigured ? settings.provider : "not configured"}
          </span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} onClick={clearChat} aria-label="Clear chat">
            <Trash2 size={15} />
          </button>
          <button style={styles.iconBtn} onClick={() => setShowSettings(true)} aria-label="Open settings">
            <Settings size={15} />
          </button>
        </div>
      </header>

      <div style={styles.log} ref={scrollRef}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyTitle}>log is empty</p>
            <p style={styles.emptyBody}>
              Connect your API in settings, then send a message to start the transcript.
            </p>
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
          <button style={styles.errorClose} onClick={() => setError(null)}>
            <X size={13} />
          </button>
        </div>
      )}

      <div style={styles.inputBar}>
        <textarea
          style={styles.textarea}
          placeholder={isConfigured ? "Type a message…" : "Set up your API in settings first…"}
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

      {showSettings && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsPanel({ settings, setSettings, onClose }) {
  const [draft, setDraft] = useState(settings);

  function save() {
    setSettings(draft);
    onClose();
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.panelHeader}>
          <span style={styles.panelTitle}>api settings</span>
          <button style={styles.iconBtn} onClick={onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>provider</label>
          <div style={styles.selectWrap}>
            <select
              style={styles.select}
              value={draft.provider}
              onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="custom">Custom endpoint</option>
            </select>
            <ChevronDown size={14} style={styles.selectChevron} />
          </div>
        </div>

        {draft.provider === "openrouter" ? (
          <>
            <div style={styles.field}>
              <label style={styles.label}>openrouter api key</label>
              <input
                style={styles.input}
                type="password"
                placeholder="sk-or-…"
                value={draft.openrouterKey}
                onChange={(e) => setDraft({ ...draft, openrouterKey: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>model</label>
              <input
                style={styles.input}
                type="text"
                placeholder="openai/gpt-4o-mini"
                value={draft.openrouterModel}
                onChange={(e) => setDraft({ ...draft, openrouterModel: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            <div style={styles.field}>
              <label style={styles.label}>endpoint url</label>
              <input
                style={styles.input}
                type="text"
                placeholder="https://your-api.example.com/v1/chat/completions"
                value={draft.customEndpoint}
                onChange={(e) => setDraft({ ...draft, customEndpoint: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>api key</label>
              <input
                style={styles.input}
                type="password"
                placeholder="optional"
                value={draft.customKey}
                onChange={(e) => setDraft({ ...draft, customKey: e.target.value })}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>model</label>
              <input
                style={styles.input}
                type="text"
                placeholder="model name expected by your api"
                value={draft.customModel}
                onChange={(e) => setDraft({ ...draft, customModel: e.target.value })}
              />
            </div>
          </>
        )}

        <p style={styles.panelNote}>
          Keys are stored only in this browser's local storage, never sent anywhere but the
          provider you selected.
        </p>

        <button style={styles.saveBtn} onClick={save}>
          Save settings
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
  statusDot: (ok) => ({
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: ok ? "#4CD97B" : "#E8A33D",
    marginLeft: 6,
  }),
  statusText: { fontFamily: MONO, fontSize: 11, color: "#8892A0" },
  headerActions: { display: "flex", gap: 6 },
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
  empty: {
    margin: "auto",
    textAlign: "center",
    maxWidth: 280,
  },
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
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#2A1616",
    color: "#F0A0A0",
    fontSize: 12.5,
    padding: "8px 14px",
    borderTop: "1px solid #4A2323",
  },
  errorClose: { background: "none", border: "none", color: "#F0A0A0", cursor: "pointer" },
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
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(6,8,10,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 10,
  },
  panel: {
    background: "#12171D",
    border: "1px solid #1E252E",
    borderRadius: 10,
    width: "100%",
    maxWidth: 380,
    padding: 18,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  panelTitle: { fontFamily: MONO, fontSize: 13, fontWeight: 600, letterSpacing: 0.3 },
  field: { marginBottom: 14 },
  label: {
    display: "block",
    fontFamily: MONO,
    fontSize: 10.5,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#5A6472",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    background: "#0F1419",
    border: "1px solid #1E252E",
    borderRadius: 6,
    color: "#EDEFF2",
    fontFamily: MONO,
    fontSize: 13,
    padding: "9px 10px",
  },
  selectWrap: { position: "relative" },
  select: {
    width: "100%",
    background: "#0F1419",
    border: "1px solid #1E252E",
    borderRadius: 6,
    color: "#EDEFF2",
    fontFamily: MONO,
    fontSize: 13,
    padding: "9px 10px",
    appearance: "none",
  },
  selectChevron: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    color: "#5A6472",
    pointerEvents: "none",
  },
  panelNote: { fontSize: 11.5, color: "#5A6472", lineHeight: 1.5, margin: "4px 0 16px" },
  saveBtn: {
    width: "100%",
    background: "#5B8DEF",
    color: "#0F1419",
    border: "none",
    borderRadius: 8,
    padding: "10px 0",
    fontFamily: SANS,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: "pointer",
  },
};
