import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  ComposedChart,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const GOLD_PALETTE = ["#D4AF37", "#E8C84A", "#B8960C", "#F5D76E", "#8a6f1f", "#FFE680", "#A07810"];

const tooltipStyle = {
  backgroundColor: "#1e1e1e",
  border: "1px solid #2a2a2a",
  borderRadius: 8,
  color: "#f0f0f0",
  fontSize: 13,
};

const axisStyle = { fill: "#a0a0a0", fontSize: 12 };

function fmt(v) {
  if (typeof v === "number") {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return v % 1 === 0 ? v.toString() : v.toFixed(2);
  }
  return v;
}

function fmtRaw(v) {
  // Like fmt but no $ sign — for non-revenue axes (orders, counts)
  if (typeof v === "number") {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return v % 1 === 0 ? v.toString() : v.toFixed(2);
  }
  return v;
}

function shortLabel(label) {
  if (!label) return "";
  if (label.length > 10) return label.slice(0, 9) + "…";
  return label;
}

// Custom treemap cell with label
function TreemapCell({ x, y, width, height, name, value, fill }) {
  const showLabel = width > 50 && height > 30;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill}
        stroke="#161616" strokeWidth={2} rx={4} />
      {showLabel && (
        <>
          <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle"
            fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
          <text x={x + width / 2} y={y + height / 2 + 8} textAnchor="middle"
            fill="rgba(255,255,255,0.7)" fontSize={10}>{fmt(value)}</text>
        </>
      )}
    </g>
  );
}

function ChartInner({ type, xKey, yKey, angleKey, barKeys, lineKeys,
                      nameKey, valueKey, zKey, data, colors }) {
  const yKeys = Array.isArray(yKey) ? yKey : yKey ? [yKey] : [];
  const bKeys = barKeys || (type === "composed" ? [yKeys[0]].filter(Boolean) : []);
  const lKeys = lineKeys || (type === "composed" ? yKeys.slice(1) : []);

  // ── bar ──────────────────────────────────────────────────────────────────
  if (type === "bar") return (
    <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
      <XAxis dataKey={xKey} tick={axisStyle} tickFormatter={shortLabel} />
      <YAxis tick={axisStyle} tickFormatter={fmt} width={55} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
      {yKeys.length > 1 && <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />}
      {yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[3, 3, 0, 0]} />
      ))}
    </BarChart>
  );

  // ── hbar ─────────────────────────────────────────────────────────────────
  if (type === "hbar") return (
    <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
      <XAxis type="number" tick={axisStyle} tickFormatter={fmt} />
      <YAxis type="category" dataKey={xKey} tick={axisStyle} width={100} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
      {yKeys.length > 1 && <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />}
      {yKeys.map((k, i) => (
        <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[0, 4, 4, 0]} />
      ))}
    </BarChart>
  );

  // ── line ─────────────────────────────────────────────────────────────────
  if (type === "line") return (
    <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
      <XAxis dataKey={xKey} tick={axisStyle} tickFormatter={shortLabel} />
      <YAxis tick={axisStyle} tickFormatter={fmt} width={55} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
      {yKeys.length > 1 && <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />}
      {yKeys.map((k, i) => (
        <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]}
          strokeWidth={2} dot={false} />
      ))}
    </LineChart>
  );

  // ── area ─────────────────────────────────────────────────────────────────
  if (type === "area") return (
    <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
      <defs>
        {yKeys.map((k, i) => (
          <linearGradient key={k} id={`grad_${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
            <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
      <XAxis dataKey={xKey} tick={axisStyle} tickFormatter={shortLabel} />
      <YAxis tick={axisStyle} tickFormatter={fmt} width={55} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
      {yKeys.length > 1 && <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />}
      {yKeys.map((k, i) => (
        <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]}
          fill={`url(#grad_${i})`} strokeWidth={2} />
      ))}
    </AreaChart>
  );

  // ── pie ──────────────────────────────────────────────────────────────────
  if (type === "pie") return (
    <PieChart>
      <Pie data={data} dataKey={valueKey} nameKey={nameKey}
        cx="50%" cy="50%" outerRadius={85}
        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        labelLine={{ stroke: "#555" }}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
    </PieChart>
  );

  // ── composed (bar + line overlay) ────────────────────────────────────────
  if (type === "composed") return (
    <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
      <XAxis dataKey={xKey} tick={axisStyle} tickFormatter={shortLabel} />
      <YAxis yAxisId="left" tick={axisStyle} tickFormatter={fmt} width={55} />
      <YAxis yAxisId="right" orientation="right" tick={axisStyle} tickFormatter={fmtRaw} width={45} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v, name) =>
        name === lKeys[0] ? [fmtRaw(v), name] : [fmt(v), name]
      } />
      <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />
      {bKeys.map((k, i) => (
        <Bar key={k} yAxisId="left" dataKey={k} fill={colors[i % colors.length]}
          radius={[3, 3, 0, 0]} opacity={0.85} />
      ))}
      {lKeys.map((k, i) => (
        <Line key={k} yAxisId="right" type="monotone" dataKey={k}
          stroke={colors[(bKeys.length + i) % colors.length]}
          strokeWidth={2.5} dot={false} />
      ))}
    </ComposedChart>
  );

  // ── radar ────────────────────────────────────────────────────────────────
  if (type === "radar") return (
    <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%"
      margin={{ top: 8, right: 24, left: 24, bottom: 8 }}>
      <PolarGrid stroke="#2a2a2a" />
      <PolarAngleAxis dataKey={angleKey || xKey}
        tick={{ fill: "#a0a0a0", fontSize: 11 }} />
      <PolarRadiusAxis tick={{ fill: "#606060", fontSize: 10 }} tickFormatter={fmtRaw} />
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmtRaw(v)} />
      {yKeys.length > 1 && <Legend wrapperStyle={{ color: "#a0a0a0", fontSize: 12 }} />}
      {yKeys.map((k, i) => (
        <Radar key={k} name={k} dataKey={k}
          stroke={colors[i % colors.length]}
          fill={colors[i % colors.length]}
          fillOpacity={0.15} strokeWidth={2} />
      ))}
      {yKeys.length === 0 && (
        <Radar dataKey={valueKey || "value"}
          stroke={colors[0]} fill={colors[0]} fillOpacity={0.2} strokeWidth={2} />
      )}
    </RadarChart>
  );

  // ── scatter ──────────────────────────────────────────────────────────────
  if (type === "scatter") return (
    <ScatterChart margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
      <XAxis dataKey={xKey} type="number" name={xKey} tick={axisStyle}
        tickFormatter={fmtRaw} label={{ value: xKey, position: "insideBottom", offset: -4, fill: "#606060", fontSize: 11 }} />
      <YAxis dataKey={yKeys[0]} type="number" name={yKeys[0]} tick={axisStyle}
        tickFormatter={fmt} width={55} />
      {zKey && <ZAxis dataKey={zKey} range={[40, 400]} name={zKey} />}
      <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }}
        content={({ payload }) => {
          if (!payload?.length) return null;
          const d = payload[0].payload;
          return (
            <div style={tooltipStyle}>
              {nameKey && <p style={{ color: "#D4AF37", fontWeight: 600, marginBottom: 4 }}>{d[nameKey]}</p>}
              {Object.entries(d).filter(([k]) => k !== nameKey).map(([k, v]) => (
                <p key={k} style={{ margin: "2px 0" }}><span style={{ color: "#a0a0a0" }}>{k}: </span>{fmt(v)}</p>
              ))}
            </div>
          );
        }}
      />
      <Scatter data={data} fill={colors[0]} fillOpacity={0.8}>
        {data.map((_, i) => (
          <Cell key={i} fill={colors[i % colors.length]} />
        ))}
      </Scatter>
    </ScatterChart>
  );

  // ── treemap ──────────────────────────────────────────────────────────────
  if (type === "treemap") return (
    <Treemap
      data={data}
      dataKey={valueKey || "value"}
      nameKey={nameKey || "name"}
      aspectRatio={4 / 3}
      content={(props) => {
        const { x, y, width, height, name, root } = props;
        const val = props[valueKey || "value"];
        const total = root?.[valueKey || "value"] || 1;
        const idx = data.findIndex(d => d[nameKey || "name"] === name);
        const fill = colors[idx % colors.length] || colors[0];
        return <TreemapCell x={x} y={y} width={width} height={height}
          name={name} value={val} fill={fill} />;
      }}
    >
      <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
    </Treemap>
  );

  return null;
}

export function DynamicChart({ spec, height = 220 }) {
  if (!spec || !spec.data || spec.data.length === 0) return null;

  const {
    type, title, xKey, yKey, angleKey, barKeys, lineKeys,
    nameKey, valueKey, zKey, data, colors = GOLD_PALETTE,
  } = spec;

  return (
    <div style={{ marginTop: 8 }}>
      {title && (
        <p style={{ color: "#D4AF37", fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
          {title}
        </p>
      )}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartInner
            type={type} xKey={xKey} yKey={yKey} angleKey={angleKey}
            barKeys={barKeys} lineKeys={lineKeys}
            nameKey={nameKey} valueKey={valueKey} zKey={zKey}
            data={data} colors={colors}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
}
