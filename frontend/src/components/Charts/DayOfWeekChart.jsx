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

const SHORT_DAYS = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

export function DayOfWeekChart({ data = [], metric = "revenue" }) {
  const dataKey = metric === "revenue" ? "avg_revenue" : "avg_orders";
  const label = metric === "revenue" ? "Avg Revenue" : "Avg Orders";
  const fmt = metric === "revenue" ? (v) => `$${v.toLocaleString()}` : (v) => v;

  const display = data.map((d) => ({ ...d, day: SHORT_DAYS[d.day] || d.day }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={display} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
        <YAxis
          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
          width={50}
          tickFormatter={metric === "revenue" ? (v) => `$${(v / 1000).toFixed(0)}k` : undefined}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmt(v), label]}
        />
        <Bar dataKey={dataKey} fill="#D4AF37" radius={[3, 3, 0, 0]} opacity={0.85} />
      </BarChart>
    </ResponsiveContainer>
  );
}
