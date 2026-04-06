import { useState, useRef, useEffect } from "react";
import { api } from "../../services/api";
import { ChatMessage } from "./ChatMessage";
import styles from "./ChatPanel.module.css";

const STORAGE_KEY = "coffee_chat_history";

const WELCOME = {
  role: "assistant",
  text: "Hi! I'm your analytics assistant. I have two datasets:\n\n**☕ Multi-Store Analytics** — 5 stores, 2025 sales data, revenue trends, peak hours.\n\n**📋 Menu Profitability** — Sola Olas 2024 real data: margins, costs, app fees, profit per item across Beverages, Desserts & Breakfast.\n\nAsk me anything — I can also generate charts on demand.",
  chart_spec: null,
  suggestions: [],
};

const INITIAL_SUGGESTIONS = [
  "Which menu item has the highest margin?",
  "Top 5 beverages by annual profit",
  "Compare category profitability",
  "Monthly revenue trend for 2025",
];

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function ChatPanel({ onChartGenerated }) {
  const [messages, setMessages] = useState(() => loadHistory() ?? [WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Persist chat history
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!collapsed) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, collapsed]);

  // Global "/" shortcut to focus input
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "/") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (collapsed) setCollapsed(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [collapsed]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const newMessages = [...messages, { role: "user", text: userText, chart_spec: null, suggestions: [] }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    // Add a streaming placeholder for the assistant reply
    setMessages((prev) => [...prev, { role: "assistant", text: "", chart_spec: null, suggestions: [], streaming: true }]);

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.text }));
      const reader = await api.chatStream(apiMessages);
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // SSE lines: "data: <json>\n\n"
        chunk.split("\n").forEach((line) => {
          if (!line.startsWith("data: ")) return;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") return;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "text") {
              fullText += evt.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { ...updated[updated.length - 1], text: fullText };
                return updated;
              });
            } else if (evt.type === "done") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  text: evt.text,
                  chart_spec: evt.chart_spec ?? null,
                  suggestions: evt.suggestions ?? [],
                  streaming: false,
                };
                return updated;
              });
              if (evt.chart_spec) onChartGenerated(evt.chart_spec);
            }
          } catch { /* ignore malformed lines */ }
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          text: "Sorry, I encountered an error. Please try again.",
          chart_spec: null,
          suggestions: [],
          streaming: false,
        };
        return updated;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setInput("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className={`${styles.panel} ${collapsed ? styles.collapsed : ""}`}>
      {/* Collapse toggle */}
      <button
        className={styles.collapseBtn}
        onClick={() => setCollapsed((c) => !c)}
        title={collapsed ? "Expand chat (Press /)" : "Collapse chat"}
      >
        {collapsed ? "›" : "‹"}
      </button>

      {/* Panel body — hidden when collapsed */}
      <div className={styles.panelBody}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.dot} />
            <span className={styles.title}>AI Assistant</span>
            <span className={styles.shortcut} title="Press / to focus">⌨ /</span>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.model}>Claude</span>
            {messages.length > 1 && (
              <button className={styles.clearBtn} onClick={clearChat} title="Clear chat">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              text={m.text}
              chart_spec={m.chart_spec}
              suggestions={i === messages.length - 1 && !m.streaming ? m.suggestions : []}
              onSuggestionClick={send}
              streaming={m.streaming}
            />
          ))}
          {loading && !messages[messages.length - 1]?.streaming && <ChatMessage isLoading />}
          <div ref={bottomRef} />
        </div>

        {/* Initial suggestions */}
        {messages.length === 1 && !loading && (
          <div className={styles.suggestions}>
            {INITIAL_SUGGESTIONS.map((s) => (
              <button key={s} className={styles.suggestion} onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className={styles.inputArea}>
          <textarea
            ref={inputRef}
            className={styles.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about sales, products, stores… (press / from anywhere)"
            rows={1}
            disabled={loading}
          />
          <button className={styles.sendBtn} onClick={() => send()} disabled={loading || !input.trim()}>
            {loading ? "…" : "↑"}
          </button>
        </div>
      </div>
    </div>
  );
}
