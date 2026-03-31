import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { KPICard } from "./KPICard";
import { ChartCard } from "./ChartCard";
import { RevenueChart } from "../Charts/RevenueChart";
import { TopProductsChart } from "../Charts/TopProductsChart";
import { PeakHoursChart } from "../Charts/PeakHoursChart";
import { StoreComparisonChart } from "../Charts/StoreComparisonChart";
import { DayOfWeekChart } from "../Charts/DayOfWeekChart";
import { ForecastChart } from "../Charts/ForecastChart";
import { DynamicChart } from "../Charts/DynamicChart";
import { KPISkeleton, ChartSkeleton } from "./Skeleton";
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
        border: active ? "1px solid var(--gold)" : "1px solid var(--border)",
        background: active ? "var(--gold-bg)" : "transparent",
        color: active ? "var(--gold)" : "var(--text-muted)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

export function Dashboard({ pinnedCharts = [], onDismissChart, onClearAllCharts }) {
  const [period, setPeriod] = useState("last_30_days");
  const [kpi, setKpi] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [products, setProducts] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [storeComp, setStoreComp] = useState([]);
  const [storeMetric, setStoreMetric] = useState("revenue");
  const [dayType, setDayType] = useState("weekday");
  const [dowData, setDowData] = useState([]);
  const [dowMetric, setDowMetric] = useState("revenue");
  const [forecast, setForecast] = useState({ data: [], rollingAvg: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.getKpiSummary(period),
      api.getRevenue({ period, group_by: period === "this_year" ? "month" : "day" }),
      api.getTopProducts({ period, limit: 7 }),
      api.getPeakHours({ day_type: dayType }),
      api.getStoreComparison({ metric: storeMetric, period }),
      api.getDayOfWeek({ period }),
      api.getRevenueForecast(),
    ])
      .then(([k, rev, prod, hours, stores, dow, fc]) => {
        if (k.status === "fulfilled") setKpi(k.value);
        if (rev.status === "fulfilled") setRevenue(rev.value.data);
        if (prod.status === "fulfilled") setProducts(prod.value.data);
        if (hours.status === "fulfilled") setPeakHours(hours.value.data);
        if (stores.status === "fulfilled") setStoreComp(stores.value.data);
        if (dow.status === "fulfilled") setDowData(dow.value.data);
        if (fc.status === "fulfilled") setForecast({ data: fc.value.data, rollingAvg: fc.value.rolling_avg });
      })
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
        {/* AI-Generated Charts — pinned by chatbot */}
        {pinnedCharts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                ✦ AI Charts ({pinnedCharts.length})
              </span>
              <button
                onClick={onClearAllCharts}
                style={{ background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 11, cursor: "pointer", padding: "3px 10px", borderRadius: 20 }}
              >
                Clear all
              </button>
            </div>
            {pinnedCharts.map(({ id, spec }) => (
              <div key={id} style={{ border: "1px solid var(--gold-dim)", borderRadius: 14, background: "var(--gold-bg)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid var(--gold-dim)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: "var(--gold)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      AI Generated
                    </span>
                    {spec.title && <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>— {spec.title}</span>}
                  </div>
                  <button onClick={() => onDismissChart(id)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", padding: "2px 6px" }}>✕</button>
                </div>
                <div style={{ padding: "16px 20px 20px", width: "100%", boxSizing: "border-box" }}>
                  <DynamicChart spec={spec} height={260} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          {loading ? (
            <><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></>
          ) : (
            <>
              <KPICard label="Total Revenue" value={fmtRevenue(kpi?.total_revenue)} sub="All stores combined" change={kpi?.revenue_change_pct} />
              <KPICard label="Total Orders" value={kpi ? kpi.total_orders.toLocaleString() : "—"} sub="Across all locations" change={kpi?.orders_change_pct} />
              <KPICard label="Avg Order Value" value={kpi ? `$${kpi.avg_order_value}` : "—"} sub="Revenue per transaction" />
              <KPICard label="Top Store" value={kpi?.best_store ?? "—"} sub={kpi ? fmtRevenue(kpi.best_store_revenue) : ""} />
            </>
          )}
        </div>

        <ChartCard title="Revenue Over Time" subtitle={`Period: ${PERIODS.find(p => p.value === period)?.label}`}>
          {loading ? <ChartSkeleton /> : <RevenueChart data={revenue} />}
        </ChartCard>

        <div className={styles.twoCol}>
          <ChartCard title="Top Products" subtitle="By revenue">
            {loading ? <ChartSkeleton /> : <TopProductsChart data={products} />}
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
            {loading ? <ChartSkeleton /> : <PeakHoursChart data={peakHours} />}
          </ChartCard>
        </div>

        <div className={styles.twoCol}>
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
            {loading ? <ChartSkeleton /> : <StoreComparisonChart data={storeComp} metric={storeMetric} />}
          </ChartCard>
          <ChartCard
            title="Day of Week"
            subtitle="Average performance by weekday"
            controls={
              <>
                <PillButton active={dowMetric === "revenue"} onClick={() => setDowMetric("revenue")}>Revenue</PillButton>
                <PillButton active={dowMetric === "order_count"} onClick={() => setDowMetric("order_count")}>Orders</PillButton>
              </>
            }
          >
            {loading ? <ChartSkeleton /> : <DayOfWeekChart data={dowData} metric={dowMetric} />}
          </ChartCard>
        </div>

        <ChartCard title="Revenue Forecast" subtitle="Last 30 days + 7-day rolling average projection">
          {loading ? <ChartSkeleton /> : <ForecastChart data={forecast.data} rollingAvg={forecast.rollingAvg} />}
        </ChartCard>
      </div>
    </div>
  );
}
