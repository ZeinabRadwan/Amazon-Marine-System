import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

/**
 * BarChart – reusable bar chart.
 * @param {Array<Object>} data - Chart data
 * @param {string} xKey - Key for x-axis (e.g. 'monthLabel')
 * @param {string} yKey - Key for bar values (e.g. 'count')
 * @param {string} [xLabel] - X-axis label
 * @param {string} [yLabel] - Y-axis label
 * @param {string} [valueLabel] - Tooltip/bar name (defaults to yLabel)
 * @param {string} [title] - Optional title above chart
 * @param {number} [height=260] - Chart height
 * @param {string} [barColor='#3b82f6'] - Bar fill color
 * @param {boolean} [allowDecimals=false] - Y-axis decimals
 * @param {string} [className] - Wrapper class
 */
export default function BarChart({
  data = [],
  xKey = 'x',
  yKey = 'y',
  xLabel = '',
  yLabel = '',
  valueLabel,
  title = '',
  height = 260,
  barColor = '#3b82f6',
  allowDecimals = false,
  className = '',
}) {
  const valueName = valueLabel ?? yLabel
  if (!data.length) return null

  return (
    <div className={`chart-wrap chart-bar ${className}`.trim()}>
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 12, right: 12, left: 12, bottom: 28 }}>
          <CartesianGrid strokeDasharray="3 3" className="chart-grid" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -16 } : undefined}
          />
          <YAxis
            tick={{ fontSize: 11, fontWeight: 500 }}
            tickMargin={10}
            allowDecimals={allowDecimals}
            label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } } : undefined}
          />
          <Tooltip
            labelFormatter={(label) => label}
            formatter={(value) => [value, valueName]}
          />
          <Bar
            dataKey={yKey}
            fill={barColor}
            radius={[6, 6, 0, 0]}
            name={valueName}
            maxBarSize={48}
            cursor="pointer"
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}
