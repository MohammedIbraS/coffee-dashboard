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
import { KPISkeleton, ChartSkeleton } from "./Skeleton";
import { PinnedCharts } from "./PinnedCharts";
import styles from "./Dashboard.module.css";

const PERIODS = [
  { label: "7D", value: "last_7_days" },
  { label: "30D", value: "last_30_days" },
  { label: "90D", value: "last_90_days" },
  { label: "YTD", value: "this_year" },
  { label: "Custom", value: "custom" },
];

// Given a fetched daily revenue array, compute the previous equal-length period string
function prevPeriodFromData(data) {
  const dates = data.map((d) => d.date).filter(Boolean).sort();
  if (dates.length === 0) return null;
  const first = new Date(dates[0]);
  const last = new Date(dates[dates.length - 1]);
  const spanMs = last - first + 86_400_000;
  const prevEnd = new Date(first.getTime() - 86_400_000);
  const prevStart = new Date(prevEnd.getTime() - spanMs + 86_400_000);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return `${fmt(prevStart)} to ${fmt(prevEnd)}`;
}

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

export function Dashboard({ pinnedCharts = [], onDismissChart, onClearAllCharts, onReorderCharts, onRenameChart }) {
  const [period, setPeriod] = useState("last_30_days");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState("all");
  const [kpi, setKpi] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [prevRevenue, setPrevRevenue] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
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
    api.getStores().then(setStores).catch(() => {});
  }, []);

  const storeName = selectedStore === "all" ? undefined : selectedStore;

  // Resolve effective period (custom range takes priority when both dates set)
  const effectivePeriod = period === "custom" && customStart && customEnd
    ? `${customStart} to ${customEnd}`
    : period === "custom" ? "last_30_days" : period;

  const isMonthly = effectivePeriod === "this_year";

  useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) return;
    setLoading(true);
    setPrevRevenue([]);
    Promise.allSettled([
      api.getKpiSummary(effectivePeriod),
      api.getRevenue({ period: effectivePeriod, group_by: isMonthly ? "month" : "day", store_name: storeName }),
      api.getTopProducts({ period: effectivePeriod, limit: 7, store_name: storeName }),
      api.getPeakHours({ day_type: dayType, store_name: storeName }),
      api.getStoreComparison({ metric: storeMetric, period: effectivePeriod }),
      api.getDayOfWeek({ period: effectivePeriod, store_name: storeName }),
      api.getRevenueForecast({ store_name: storeName }),
    ])
      .then(([k, rev, prod, hours, storeC, dow, fc]) => {
        if (k.status === "fulfilled") setKpi(k.value);
        if (rev.status === "fulfilled") setRevenue(rev.value.data);
        if (prod.status === "fulfilled") setProducts(prod.value.data);
        if (hours.status === "fulfilled") setPeakHours(hours.value.data);
        if (storeC.status === "fulfilled") setStoreComp(storeC.value.data);
        if (dow.status === "fulfilled") setDowData(dow.value.data);
        if (fc.status === "fulfilled") setForecast({ data: fc.value.data, rollingAvg: fc.value.rolling_avg });
      })
      .finally(() => setLoading(false));
  }, [effectivePeriod, storeMetric, dayType, selectedStore]);

  // Fetch previous period when compare is toggled on
  useEffect(() => {
    if (!showCompare || !revenue.length) { setPrevRevenue([]); return; }
    const prev = prevPeriodFromData(revenue);
    if (!prev) { setPrevRevenue([]); return; }
    api.getRevenue({ period: prev, group_by: "day", store_name: storeName })
      .then((r) => setPrevRevenue(r.data || []))
      .catch(() => setPrevRevenue([]));
  }, [showCompare, revenue, storeName]);

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {stores.length > 0 && (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 12,
                cursor: "pointer",
                fontFamily: "inherit",
                outline: "none",
              }}
            >
              <option value="all">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          )}
          <div className={styles.periodPicker}>
            {PERIODS.map((p) => (
              <PillButton key={p.value} active={period === p.value} onClick={() => setPeriod(p.value)}>
                {p.label}
              </PillButton>
            ))}
            {period === "custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", borderRadius: 8, padding: "3px 8px",
                    fontSize: 12, fontFamily: "inherit", outline: "none",
                  }}
                />
                <span style={{ color: "var(--text-muted)", fontSize: 12 }}>to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", borderRadius: 8, padding: "3px 8px",
                    fontSize: 12, fontFamily: "inherit", outline: "none",
                  }}
                />
              </>
            )}
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <PinnedCharts
          charts={pinnedCharts}
          onDismiss={onDismissChart}
          onClearAll={onClearAllCharts}
          onReorder={onReorderCharts}
          onRename={onRenameChart}
        />

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

        <ChartCard
          title="Revenue Over Time"
          subtitle={period === "custom" && customStart && customEnd
            ? `${customStart} → ${customEnd}`
            : `Period: ${PERIODS.find(p => p.value === period)?.label ?? period}`}
          controls={
            !isMonthly && (
              <PillButton active={showCompare} onClick={() => setShowCompare((v) => !v)}>
                Compare
              </PillButton>
            )
          }
        >
          {loading ? <ChartSkeleton /> : <RevenueChart data={revenue} prevData={showCompare ? prevRevenue : []} />}
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
