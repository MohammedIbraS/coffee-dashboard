import styles from "./Skeleton.module.css";

export function KPISkeleton() {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <div className={`${styles.shimmer} ${styles.kpiLabel}`} />
        <div className={`${styles.shimmer} ${styles.kpiIcon}`} />
      </div>
      <div className={`${styles.shimmer} ${styles.kpiValue}`} />
      <div className={`${styles.shimmer} ${styles.kpiSub}`} />
    </div>
  );
}

const BAR_WIDTHS = ["85%", "60%", "75%", "50%", "90%", "65%", "40%"];

export function ChartSkeleton() {
  return (
    <div className={styles.chartBody}>
      {BAR_WIDTHS.map((w, i) => (
        <div
          key={i}
          className={`${styles.shimmer} ${styles.chartBar}`}
          style={{ width: w }}
        />
      ))}
    </div>
  );
}
