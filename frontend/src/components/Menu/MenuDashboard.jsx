import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { ChartCard } from "../Dashboard/ChartCard";
import { KPISkeleton, ChartSkeleton } from "../Dashboard/Skeleton";
import { DynamicChart } from "../Charts/DynamicChart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from "recharts";
import styles from "./MenuDashboard.module.css";

const GOLD = "#D4AF37";
const CAT_COLORS = { Beverages: "#D4AF37", Desserts: "#E8C84A", Breakfast: "#B8960C" };

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

export function MenuDashboard({ pinnedCharts = [], onDismissChart, onClearAllCharts }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All");
  const [sortKey, setSortKey] = useState("annual_profit");

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
        {/* AI-Generated Charts — pinned by chatbot */}
        {pinnedCharts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
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

        <ChartCard title="Cost Breakdown" subtitle="Direct cost · App fee (23%) · Profit per unit — all items">
          {loading ? <ChartSkeleton /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Item</th><th>Category</th><th>Price (﷼)</th><th>Direct Cost</th>
                    <th>App Fee</th><th>Profit/Unit</th><th>Margin %</th><th>Units Sold</th><th>Annual Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a, b) => (b.annual_profit || 0) - (a.annual_profit || 0)).map((item) => (
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
