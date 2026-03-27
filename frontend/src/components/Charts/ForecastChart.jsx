import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#f0f0f0",
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
  // Find the boundary date between actuals and forecast
  const lastActual = [...data].reverse().find((d) => d.revenue != null)?.date;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis
          dataKey="date"
          tick={{ fill: "#a0a0a0", fontSize: 10 }}
          tickFormatter={fmtDate}
          interval={6}
        />
        <YAxis tick={{ fill: "#a0a0a0", fontSize: 11 }} width={52} tickFormatter={fmtRevenue} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={fmtDate}
          formatter={(v, name) => [fmtRevenue(v), name === "revenue" ? "Actual" : "Forecast"]}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#a0a0a0" }}
          formatter={(v) => (v === "revenue" ? "Actual Revenue" : "7-Day Forecast")}
        />
        {lastActual && (
          <ReferenceLine x={lastActual} stroke="#D4AF37" strokeDasharray="4 4" strokeOpacity={0.5} />
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
          stroke="#7a6f3a"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
