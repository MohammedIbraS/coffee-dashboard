import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

const fmtDate = (d) => {
  if (!d) return "";
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
};

const fmtRevenue = (v) => {
  if (v == null) return "";
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v}`;
};

export function ForecastChart({ data = [], rollingAvg }) {
  const lastActual = [...data].reverse().find((d) => d.revenue != null)?.date;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tick={{ fill: "var(--text-muted)", fontSize: 10 }}
          tickFormatter={fmtDate}
          interval={6}
        />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={52} tickFormatter={fmtRevenue} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={fmtDate}
          formatter={(v, name) => [fmtRevenue(v), name === "revenue" ? "Actual" : "Forecast"]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(v) => (v === "revenue" ? "Actual Revenue" : "7-Day Forecast")}
        />
        {lastActual && (
          <ReferenceLine x={lastActual} stroke="var(--gold-dim)" strokeDasharray="4 4" strokeOpacity={0.6} />
        )}
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#D4AF37"
          strokeWidth={2}
          dot={false}
          connectNulls={false}
        />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="var(--text-muted)"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
