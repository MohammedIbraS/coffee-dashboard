import { useState, useRef, useEffect } from "react";
import { api } from "../../services/api";
import { ChatMessage } from "./ChatMessage";
import styles from "./ChatPanel.module.css";

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

export function ChatPanel({ onChartGenerated }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const newMessages = [...messages, { role: "user", text: userText, chart_spec: null, suggestions: [] }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.text }));
      const result = await api.chat(apiMessages);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.text,
          chart_spec: result.chart_spec,
          suggestions: result.suggestions || [],
        },
      ]);
      if (result.chart_spec) {
        onChartGenerated(result.chart_spec);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I encountered an error. Please try again.", chart_spec: null, suggestions: [] },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([WELCOME]);
    setInput("");
  };

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} />
          <span className={styles.title}>AI Assistant</span>
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
            suggestions={i === messages.length - 1 ? m.suggestions : []}
            onSuggestionClick={send}
          />
        ))}
        {loading && <ChatMessage isLoading />}
        <div ref={bottomRef} />
      </div>

      {/* Initial suggestions */}
      {messages.length === 1 && !loading && (
        <div className={styles.suggestions}>
          {INITIAL_SUGGESTIONS.map((s) => (
            <button key={s} className={styles.suggestion} onClick={() => send(s)}>
              {s}
            </button>
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
          placeholder="Ask about sales, products, stores…"
          rows={1}
          disabled={loading}
        />
        <button className={styles.sendBtn} onClick={() => send()} disabled={loading || !input.trim()}>
          {loading ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}
