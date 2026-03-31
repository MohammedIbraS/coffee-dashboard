import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--text-primary)",
  fontSize: 13,
};

const COLORS = ["#D4AF37", "#C9A020", "#B8900C", "#E8C84A", "#F5D76E", "#8a6f1f", "#A07810"];

export function TopProductsChart({ data = [] }) {
  const top = data.slice(0, 7);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          dataKey="product"
          type="category"
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          width={88}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [`$${v.toLocaleString()}`, "Revenue"]}
        />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
          {top.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
