import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import styles from "./ChartCard.module.css";

function exportCSV(data, filename) {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename || "data"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ChartCard({ title, subtitle, controls, children, csvData }) {
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!cardRef.current || exporting) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: "var(--bg-card)", scale: 2 });
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
          {csvData?.length > 0 && (
            <button
              className={styles.exportBtn}
              onClick={() => exportCSV(csvData, title)}
              title="Download CSV"
            >
              CSV
            </button>
          )}
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
