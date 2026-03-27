import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import styles from "./ChartCard.module.css";

export function ChartCard({ title, subtitle, controls, children }) {
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#1e1e1e",
        scale: 2,
      });
      const link = document.createElement("a");
      link.download = `${title || "chart"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.card} ref={cardRef}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <div className={styles.controls}>
          {controls}
          <button
            className={styles.exportBtn}
            onClick={handleExport}
            title="Export as image"
            disabled={exporting}
          >
            {exporting ? "…" : "⬇"}
          </button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
