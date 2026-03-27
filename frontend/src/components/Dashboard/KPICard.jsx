import styles from "./KPICard.module.css";

export function KPICard({ label, value, sub, change, icon }) {
  const positive = change > 0;
  const hasChange = change !== undefined && change !== null;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        {icon && <span className={styles.icon}>{icon}</span>}
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.bottom}>
        {sub && <span className={styles.sub}>{sub}</span>}
        {hasChange && (
          <span className={`${styles.change} ${positive ? styles.positive : styles.negative}`}>
            {positive ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        )}
      </div>
    </div>
  );
}
