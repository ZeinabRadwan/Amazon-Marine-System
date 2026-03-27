import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

/**
 * Grouped bar chart for two series (e.g. receivables vs payables).
 */
export default function GroupedBarChart({
  data = [],
  xKey = 'label',
  series = [
    { key: 'a', color: '#10b981', name: 'A' },
    { key: 'b', color: '#ef4444', name: 'B' },
  ],
  xLabel = '',
  yLabel = '',
  title = '',
  height = 260,
  allowDecimals = true,
  className = '',
}) {
  if (!data.length) return null

  return (
    <div className={`chart-wrap chart-bar ${className}`.trim()}>
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 40 }}>
          <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            label={undefined}
          />
          <YAxis
            tick={{ fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            allowDecimals={allowDecimals}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } } : undefined}
          />
          <Tooltip
            labelFormatter={(label) => label}
            formatter={(value, name) => [value, name]}
          />
          <Legend
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={s.color}
              name={s.name}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
