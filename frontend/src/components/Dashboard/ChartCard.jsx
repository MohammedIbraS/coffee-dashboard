import styles from "./ChartCard.module.css";

export function ChartCard({ title, subtitle, controls, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {controls && <div className={styles.controls}>{controls}</div>}
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
