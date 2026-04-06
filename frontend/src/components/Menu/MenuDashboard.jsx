import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { ChartCard } from "../Dashboard/ChartCard";
import { KPISkeleton, ChartSkeleton } from "../Dashboard/Skeleton";
import { PinnedCharts } from "../Dashboard/PinnedCharts";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from "recharts";
import styles from "./MenuDashboard.module.css";

const GOLD = "#D4AF37";
const CAT_COLORS = { Beverages: "#D4AF37", Desserts: "#E8C84A", Breakfast: "#B8960C" };

// Seeded pseudo-random for consistent sparklines per item
function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function makeSparkline(name, annualProfit) {
  const rand = seededRand(name.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const weights = Array.from({ length: 12 }, () => 0.5 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.round((w / sum) * annualProfit));
}

function Sparkline({ values }) {
  if (!values?.length) return null;
  const w = 80, h = 24, pad = 2;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (w - pad * 2),
    h - pad - ((v - min) / range) * (h - pad * 2),
  ]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline
        points={pts.map((p) => p.join(",")).join(" ")}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.7"
      />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill="var(--gold)" />
    </svg>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 12,
};

const fmtSAR = (v) => {
  if (v == null) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M ﷼`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k ﷼`;
  return `${v} ﷼`;
};

const fmtNum = (v) => (v == null ? "—" : v.toLocaleString());

function KPICard({ label, value, sub, icon }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        {icon && <span className={styles.kpiIcon}>{icon}</span>}
      </div>
      <div className={styles.kpiValue}>{value}</div>
      {sub && <div className={styles.kpiSub}>{sub}</div>}
    </div>
  );
}

function PillButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`${styles.pill} ${active ? styles.pillActive : ""}`}>
      {children}
    </button>
  );
}

const CATEGORIES = ["All", "Beverages", "Desserts", "Breakfast"];
const SORT_OPTIONS = [
  { label: "Annual Profit", key: "annual_profit" },
  { label: "Sales Volume", key: "sales_count" },
  { label: "Revenue", key: "revenue" },
  { label: "Margin %", key: "profit_margin_pct" },
];

export function MenuDashboard({ pinnedCharts = [], onDismissChart, onClearAllCharts, onReorderCharts, onRenameChart }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [sortKey, setSortKey] = useState("annual_profit");
  const [tableSort, setTableSort] = useState({ key: "annual_profit", dir: "desc" });
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [simPrices, setSimPrices] = useState({});

  useEffect(() => {
    api.getMenu()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = category === "All" ? items : items.filter((i) => i.category === category);
  const sorted = [...filtered].sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));
  const top15 = sorted.slice(0, 15);

  const totalRevenue = items.reduce((s, i) => s + (i.revenue || 0), 0);
  const totalProfit = items.reduce((s, i) => s + (i.annual_profit || 0), 0);
  const bestSeller = [...items].sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0))[0];
  const highestMargin = [...items].filter((i) => i.sales_count > 0).sort((a, b) => b.profit_margin_pct - a.profit_margin_pct)[0];

  const catBreakdown = Object.entries(
    items.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + (i.annual_profit || 0);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: Math.round(value) }));

  const scatterData = filtered
    .filter((i) => i.sales_count > 0)
    .map((i) => ({ name: i.name, x: i.sales_count, y: i.profit_margin_pct, z: i.revenue, cat: i.category }));

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label;

  const handleTableSort = (key) => {
    setTableSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  };

  const tableSorted = [...filtered].sort((a, b) => {
    const mul = tableSort.dir === "asc" ? 1 : -1;
    return ((a[tableSort.key] || 0) - (b[tableSort.key] || 0)) * mul;
  });

  const SortTh = ({ colKey, children }) => (
    <th
      className={`${styles.sortTh} ${tableSort.key === colKey ? styles.active : ""}`}
      onClick={() => handleTableSort(colKey)}
    >
      {children}
      <span className={styles.sortIcon}>
        {tableSort.key === colKey ? (tableSort.dir === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    </th>
  );

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.logo}>📋</span>
          <span className={styles.brandName}>Menu Profitability</span>
          <span className={styles.brandTag}>Sola Olas · 2024</span>
        </div>
        <div className={styles.filters}>
          {CATEGORIES.map((c) => (
            <PillButton key={c} active={category === c} onClick={() => setCategory(c)}>{c}</PillButton>
          ))}
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

        <div className={styles.kpiGrid}>
          {loading ? (
            <><KPISkeleton /><KPISkeleton /><KPISkeleton /><KPISkeleton /></>
          ) : (
            <>
              <KPICard label="Total Annual Revenue" value={fmtSAR(totalRevenue)} sub="All menu items" />
              <KPICard label="Total Annual Profit" value={fmtSAR(totalProfit)} sub="After costs & fees" />
              <KPICard label="Best Seller" value={bestSeller?.name ?? "—"} sub={`${fmtNum(bestSeller?.sales_count)} units sold`} />
              <KPICard label="Highest Margin" value={highestMargin?.name ?? "—"} sub={`${highestMargin?.profit_margin_pct}% margin`} />
            </>
          )}
        </div>

        <div className={styles.sortRow}>
          <span className={styles.sortLabel}>Sort charts by:</span>
          {SORT_OPTIONS.map((o) => (
            <PillButton key={o.key} active={sortKey === o.key} onClick={() => setSortKey(o.key)}>{o.label}</PillButton>
          ))}
        </div>

        <ChartCard
          title={`Top Items · ${category}`}
          subtitle={`Sorted by ${currentSortLabel} — top 15`}
        >
          {loading ? <ChartSkeleton /> : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={top15} layout="vertical" margin={{ top: 4, right: 60, left: 120, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#a0a0a0", fontSize: 11 }}
                  tickFormatter={sortKey === "annual_profit" || sortKey === "revenue"
                    ? (v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v
                    : sortKey === "profit_margin_pct" ? (v) => `${v}%` : fmtNum}
                />
                <YAxis type="category" dataKey="name" tick={{ fill: "#e0e0e0", fontSize: 11 }} width={116} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [
                    sortKey === "annual_profit" || sortKey === "revenue" ? `${v.toLocaleString()} ﷼`
                    : sortKey === "profit_margin_pct" ? `${v}%`
                    : v.toLocaleString(),
                    currentSortLabel,
                  ]}
                />
                <Bar dataKey={sortKey} fill={GOLD} radius={[0, 3, 3, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <div className={styles.twoCol}>
          <ChartCard title="Profit by Category" subtitle="Annual profit share">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={catBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {catBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={CAT_COLORS[entry.name] || GOLD} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v.toLocaleString()} ﷼`, "Annual Profit"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Margin % vs Sales Volume" subtitle="Bubble size = revenue · filtered category">
            {loading ? <ChartSkeleton /> : (
              <ResponsiveContainer width="100%" height={260}>
                <ScatterChart margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="x" name="Sales" type="number" tick={{ fill: "#a0a0a0", fontSize: 11 }}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                    label={{ value: "Units Sold", position: "insideBottom", offset: -4, fill: "#606060", fontSize: 11 }} />
                  <YAxis dataKey="y" name="Margin" type="number" tick={{ fill: "#a0a0a0", fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`} domain={[40, 100]} />
                  <ZAxis dataKey="z" range={[40, 400]} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ strokeDasharray: "3 3" }}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ ...tooltipStyle, padding: "8px 12px" }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
                          <div>Sales: {d.x.toLocaleString()}</div>
                          <div>Margin: {d.y}%</div>
                          <div>Revenue: {d.z.toLocaleString()} ﷼</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter data={scatterData} fill={GOLD} fillOpacity={0.75} />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        <ChartCard
          title="Cost Breakdown"
          subtitle="Direct cost · App fee (23%) · Profit per unit — all items"
          controls={
            <button
              onClick={() => setWhatIfMode((m) => !m)}
              style={{
                padding: "4px 10px", fontSize: 11, borderRadius: 20, cursor: "pointer", fontFamily: "inherit",
                border: whatIfMode ? "1px solid var(--gold)" : "1px solid var(--border)",
                background: whatIfMode ? "var(--gold-bg)" : "transparent",
                color: whatIfMode ? "var(--gold)" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >
              {whatIfMode ? "Exit Simulator" : "What-if Simulator"}
            </button>
          }
        >
          {loading ? <ChartSkeleton /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <SortTh colKey="selling_price">Price (﷼)</SortTh>
                    <SortTh colKey="direct_cost">Direct Cost</SortTh>
                    <SortTh colKey="app_fee">App Fee</SortTh>
                    <SortTh colKey="profit_margin">Profit/Unit</SortTh>
                    <SortTh colKey="profit_margin_pct">Margin %</SortTh>
                    <SortTh colKey="sales_count">Units Sold</SortTh>
                    <SortTh colKey="annual_profit">Annual Profit</SortTh>
                    <th>Trend</th>
                    {whatIfMode && <th style={{ color: "var(--gold)" }}>Sim Price</th>}
                    {whatIfMode && <th style={{ color: "var(--gold)" }}>Sim Profit</th>}
                  </tr>
                </thead>
                <tbody>
                  {tableSorted.map((item) => {
                    const simPrice = simPrices[item.name] ?? item.selling_price;
                    const simProfit = +(simPrice - item.direct_cost - item.app_fee).toFixed(2);
                    const simAnnual = Math.round(simProfit * (item.sales_count || 0));
                    const simMarginPct = simPrice > 0 ? +((simProfit / simPrice) * 100).toFixed(1) : 0;
                    const sparkData = makeSparkline(item.name, item.annual_profit || 0);
                    return (
                      <tr key={item.name}>
                        <td className={styles.nameCell}>{item.name}</td>
                        <td><span className={styles.catBadge} style={{ borderColor: CAT_COLORS[item.category] }}>{item.category}</span></td>
                        <td>{item.selling_price}</td>
                        <td className={styles.cost}>{item.direct_cost}</td>
                        <td className={styles.cost}>{item.app_fee}</td>
                        <td className={styles.profit}>{item.profit_margin}</td>
                        <td>
                          <div className={styles.marginBar}>
                            <div className={styles.marginFill} style={{ width: `${item.profit_margin_pct}%` }} />
                            <span>{item.profit_margin_pct}%</span>
                          </div>
                        </td>
                        <td>{(item.sales_count || 0).toLocaleString()}</td>
                        <td className={styles.profit}>{item.annual_profit ? item.annual_profit.toLocaleString() : "—"}</td>
                        <td><Sparkline values={sparkData} /></td>
                        {whatIfMode && (
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <input
                                type="range"
                                min={Math.max(1, item.selling_price * 0.5)}
                                max={item.selling_price * 2}
                                step={0.5}
                                value={simPrice}
                                onChange={(e) => setSimPrices((p) => ({ ...p, [item.name]: +e.target.value }))}
                                style={{ width: 80, accentColor: "var(--gold)" }}
                              />
                              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 32 }}>{simPrice} ﷼</span>
                            </div>
                          </td>
                        )}
                        {whatIfMode && (
                          <td className={simProfit >= item.profit_margin ? styles.profit : styles.cost}>
                            {simProfit.toFixed(2)} ﷼
                            <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>({simMarginPct}%)</span>
                            <br />
                            <span style={{ fontSize: 10, opacity: 0.7 }}>{simAnnual.toLocaleString()} ann.</span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
