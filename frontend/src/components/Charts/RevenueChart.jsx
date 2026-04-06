import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

export function RevenueChart({ data = [], prevData = [] }) {
  const hasPrev = prevData.length > 0;

  // Merge current + previous by positional index so both series share x-axis slots
  const maxLen = Math.max(data.length, prevData.length);
  const formatted = Array.from({ length: maxLen }, (_, i) => {
    const cur = data[i];
    const prv = prevData[i];
    return {
      label: cur ? (cur.date ? cur.date.slice(5) : cur.month) : (prv?.date ? prv.date.slice(5) : prv?.month),
      revenue: cur?.revenue ?? null,
      prev_revenue: prv?.revenue ?? null,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={formatted} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7080a0" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#7080a0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} interval="preserveStartEnd" />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          width={52}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => [
            `$${(v || 0).toLocaleString()}`,
            name === "prev_revenue" ? "Previous period" : "This period",
          ]}
        />
        {hasPrev && <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => v === "prev_revenue" ? "Previous period" : "This period"} />}
        {hasPrev && (
          <Area
            type="monotone"
            dataKey="prev_revenue"
            stroke="#7080a0"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            fill="url(#prevGrad)"
            connectNulls
          />
        )}
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#D4AF37"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
