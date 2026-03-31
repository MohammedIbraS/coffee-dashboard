import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

export function PeakHoursChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="hour" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
        <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} width={36} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [v, "Avg Orders"]}
        />
        <Bar
          dataKey="avg_orders"
          fill="#D4AF37"
          radius={[3, 3, 0, 0]}
          opacity={0.85}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
