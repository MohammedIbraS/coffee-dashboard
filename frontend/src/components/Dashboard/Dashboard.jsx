import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { KPICard } from "./KPICard";
import { ChartCard } from "./ChartCard";
import { RevenueChart } from "../Charts/RevenueChart";
import { TopProductsChart } from "../Charts/TopProductsChart";
import { PeakHoursChart } from "../Charts/PeakHoursChart";
import { StoreComparisonChart } from "../Charts/StoreComparisonChart";
import { DynamicChart } from "../Charts/DynamicChart";
import styles from "./Dashboard.module.css";

const PERIODS = [
  { label: "7D", value: "last_7_days" },
  { label: "30D", value: "last_30_days" },
  { label: "90D", value: "last_90_days" },
  { label: "YTD", value: "this_year" },
];

function PillButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px",
        fontSize: 12,
        fontWeight: 500,
        borderRadius: 20,
        border: active ? "1px solid #D4AF37" : "1px solid #2a2a2a",
        background: active ? "rgba(212,175,55,0.12)" : "transparent",
        color: active ? "#D4AF37" : "#a0a0a0",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function Dashboard({ aiChart, onClearAiChart }) {
  const [period, setPeriod] = useState("last_30_days");
  const [kpi, setKpi] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [products, setProducts] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [storeComp, setStoreComp] = useState([]);
  const [storeMetric, setStoreMetric] = useState("revenue");
  const [dayType, setDayType] = useState("weekday");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getKpiSummary(period),
      api.getRevenue({ period, group_by: period === "this_year" ? "month" : "day" }),
      api.getTopProducts({ period, limit: 7 }),
      api.getPeakHours({ day_type: dayType }),
      api.getStoreComparison({ metric: storeMetric, period }),
    ])
      .then(([k, rev, prod, hours, stores]) => {
        setKpi(k);
        setRevenue(rev.data);
        setProducts(prod.data);
        setPeakHours(hours.data);
        setStoreComp(stores.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period, storeMetric, dayType]);

  const fmtRevenue = (v) => {
    if (!v) return "—";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`;
    return `$${v}`;
  };

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}>☕</span>
          <span className={styles.brandName}>Coffee Co.</span>
          <span className={styles.brandTag}>Analytics</span>
        </div>
        <div className={styles.periodPicker}>
          {PERIODS.map((p) => (
            <PillButton key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
              {p.label}
            </PillButton>
          ))}
        </div>
      </header>

      <div className={styles.content}>
        {/* AI-Generated Chart — injected by chatbot */}
        {aiChart && (
          <div style={{
            border: "1px solid #8a6f1f",
            borderRadius: 14,
            background: "rgba(212,175,55,0.06)",
            animation: "none",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 16px",
              borderBottom: "1px solid #8a6f1f",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: "#D4AF37", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  ✦ AI Generated
                </span>
                {aiChart.title && (
                  <span style={{ color: "#a0a0a0", fontSize: 12 }}>— {aiChart.title}</span>
                )}
              </div>
              <button
                onClick={onClearAiChart}
                style={{ background: "none", border: "none", color: "#606060", fontSize: 14, cursor: "pointer", padding: "2px 6px" }}
              >✕</button>
            </div>
            <div style={{ padding: "16px 20px 20px", width: "100%", boxSizing: "border-box" }}>
              <DynamicChart spec={aiChart} height={260} />
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <KPICard
            label="Total Revenue"
            value={kpi ? fmtRevenue(kpi.total_revenue) : "—"}
            sub="All stores combined"
            change={kpi?.revenue_change_pct}
            icon="💰"
          />
          <KPICard
            label="Total Orders"
            value={kpi ? kpi.total_orders.toLocaleString() : "—"}
            sub="Across all locations"
            change={kpi?.orders_change_pct}
            icon="🧾"
          />
          <KPICard
            label="Avg Order Value"
            value={kpi ? `$${kpi.avg_order_value}` : "—"}
            sub="Revenue per transaction"
            icon="📊"
          />
          <KPICard
            label="Top Store"
            value={kpi?.best_store ?? "—"}
            sub={kpi ? fmtRevenue(kpi.best_store_revenue) : ""}
            icon="🏆"
          />
        </div>

        {/* Revenue Over Time */}
        <ChartCard
          title="Revenue Over Time"
          subtitle={`Period: ${period.replace(/_/g, " ")}`}
        >
          {loading ? <div className={styles.loading}>Loading…</div> : <RevenueChart data={revenue} />}
        </ChartCard>

        {/* 2-column row */}
        <div className={styles.twoCol}>
          <ChartCard title="Top Products" subtitle="By revenue">
            {loading ? <div className={styles.loading}>Loading…</div> : <TopProductsChart data={products} />}
          </ChartCard>

          <ChartCard
            title="Peak Hours"
            subtitle="Average orders by hour"
            controls={
              <>
                <PillButton active={dayType === "weekday"} onClick={() => setDayType("weekday")}>Weekday</PillButton>
                <PillButton active={dayType === "weekend"} onClick={() => setDayType("weekend")}>Weekend</PillButton>
              </>
            }
          >
            {loading ? <div className={styles.loading}>Loading…</div> : <PeakHoursChart data={peakHours} />}
          </ChartCard>
        </div>

        {/* Store Comparison */}
        <ChartCard
          title="Store Comparison"
          subtitle="Performance across all locations"
          controls={
            <>
              {["revenue", "order_count", "avg_order_value"].map((m) => (
                <PillButton key={m} active={storeMetric === m} onClick={() => setStoreMetric(m)}>
                  {m === "revenue" ? "Revenue" : m === "order_count" ? "Orders" : "AOV"}
                </PillButton>
              ))}
            </>
          }
        >
          {loading ? (
            <div className={styles.loading}>Loading…</div>
          ) : (
            <StoreComparisonChart data={storeComp} metric={storeMetric} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
