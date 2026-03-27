import { DynamicChart } from "../Charts/DynamicChart";
import styles from "./ChatMessage.module.css";

export function ChatMessage({ role, text, chart_spec, isLoading }) {
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

  return (
    <div className={`${styles.msg} ${isUser ? styles.user : styles.assistant}`}>
      {!isUser && <div className={styles.avatar}>☕</div>}
      <div className={styles.bubble}>
        <p className={styles.text}>{text}</p>
        {chart_spec && <DynamicChart spec={chart_spec} />}
      </div>
    </div>
  );
}
