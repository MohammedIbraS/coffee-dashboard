import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#f0f0f0",
  fontSize: 13,
};

const COLORS = ["#D4AF37", "#C9A020", "#B8900C", "#E8C84A", "#F5D76E"];

export function StoreComparisonChart({ data = [], metric = "revenue" }) {
  const labelMap = { revenue: "Revenue", order_count: "Orders", avg_order_value: "Avg Order Value" };
  const fmtVal = (v) =>
    metric === "revenue" || metric === "avg_order_value"
      ? `$${v.toLocaleString()}`
      : v.toLocaleString();

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="store" tick={{ fill: "#a0a0a0", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "#a0a0a0", fontSize: 11 }}
          tickFormatter={(v) =>
            metric === "revenue" ? `$${(v / 1000).toFixed(0)}k` : v
          }
          width={52}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtVal(v), labelMap[metric]]}
        />
        <Bar dataKey={metric} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
