import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#f0f0f0",
  fontSize: 13,
};

export function PeakHoursChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="hour" tick={{ fill: "#a0a0a0", fontSize: 11 }} />
        <YAxis tick={{ fill: "#a0a0a0", fontSize: 11 }} width={36} />
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
