import { useState, useRef, useEffect } from "react";
import { api } from "../../services/api";
import { ChatMessage } from "./ChatMessage";
import styles from "./ChatPanel.module.css";

const SUGGESTIONS = [
  "What are the top 5 products this month?",
  "Compare store revenue for Q4",
  "Show peak hours for Downtown",
  "Monthly revenue trend for 2025",
];

export function ChatPanel({ onChartGenerated }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! I'm your Coffee Co. analytics assistant. Ask me anything about sales, products, or store performance — I can also generate charts on demand.",
      chart_spec: null,
    },
  ]);
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

    const newMessages = [...messages, { role: "user", text: userText, chart_spec: null }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      // Build API message history (only user/assistant text for the API)
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.text,
      }));

      const result = await api.chat(apiMessages);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: result.text, chart_spec: result.chart_spec },
      ]);
      if (result.chart_spec) {
        onChartGenerated(result.chart_spec);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I encountered an error. Please try again.", chart_spec: null },
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

  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.dot} />
          <span className={styles.title}>AI Assistant</span>
        </div>
        <span className={styles.model}>Claude</span>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} text={m.text} chart_spec={m.chart_spec} />
        ))}
        {loading && <ChatMessage isLoading />}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && !loading && (
        <div className={styles.suggestions}>
          {SUGGESTIONS.map((s) => (
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
        <button
          className={styles.sendBtn}
          onClick={() => send()}
          disabled={loading || !input.trim()}
        >
          {loading ? "…" : "↑"}
        </button>
      </div>
    </div>
  );
}
