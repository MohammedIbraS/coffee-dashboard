import { useState } from "react";
import { DynamicChart } from "../Charts/DynamicChart";
import styles from "./ChatMessage.module.css";

export function ChatMessage({ role, text, chart_spec, suggestions = [], onSuggestionClick, isLoading }) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  if (isLoading) {
    return (
      <div className={`${styles.msg} ${styles.assistant}`}>
        <div className={styles.bubble}>
          <span className={styles.typing}>
            <span /><span /><span />
          </span>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`${styles.msg} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && <div className={styles.avatar}>☕</div>}
      <div className={styles.bubbleWrap}>
        <div className={styles.bubble}>
          <p className={styles.text}>{text}</p>
          {chart_spec && <DynamicChart spec={chart_spec} />}
          {!isUser && (
            <button
              className={`${styles.copyBtn} ${copied ? styles.copied : ""}`}
              onClick={handleCopy}
              title="Copy response"
            >
              {copied ? "✓" : "⎘"}
            </button>
          )}
        </div>
        {!isUser && suggestions.length > 0 && (
          <div className={styles.chips}>
            {suggestions.map((s) => (
              <button key={s} className={styles.chip} onClick={() => onSuggestionClick?.(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
