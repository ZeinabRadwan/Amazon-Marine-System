import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#8b5cf6', '#ec4899']

/**
 * LineChart – reusable line chart. Supports multiple lines.
 * @param {Array<Object>} data - Chart data
 * @param {string} xKey - Key for x-axis
 * @param {Array<{ dataKey: string, name: string, stroke?: string }>} lines - Lines to plot (e.g. [{ dataKey: 'count', name: 'Count', stroke: '#3b82f6' }])
 * @param {string} [xLabel] - X-axis label
 * @param {string} [title] - Optional title above chart
 * @param {number} [height=260] - Chart height
 * @param {boolean} [allowDecimals=false] - Y-axis decimals
 * @param {string} [className] - Wrapper class
 */
export default function LineChart({
  data = [],
  xKey = 'x',
  lines = [{ dataKey: 'y', name: 'Value', stroke: DEFAULT_COLORS[0] }],
  xLabel = '',
  title = '',
  height = 260,
  allowDecimals = false,
  className = '',
}) {
  if (!data.length) return null

  return (
    <div className={`chart-wrap chart-line ${className}`.trim()}>
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 28 }}>
          <CartesianGrid strokeDasharray="4 4" className="chart-grid" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -16 } : undefined}
          />
          <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickMargin={10} allowDecimals={allowDecimals} />
          <Tooltip />
          <Legend layout="horizontal" align="center" verticalAlign="bottom" />
          {lines.map((line, i) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.stroke ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}
