import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#8b5cf6', '#ec4899']

/**
 * PieChart – reusable pie chart.
 * @param {Array<Object>} data - Chart data
 * @param {string} nameKey - Key for slice label (e.g. 'displayName')
 * @param {string} valueKey - Key for value (e.g. 'count')
 * @param {string} [valueLabel] - Tooltip/legend value name
 * @param {string} [title] - Optional title above chart
 * @param {number} [height=260] - Chart height
 * @param {Array<string>} [colors] - Slice colors
 * @param {boolean} [showLabel=true] - Show label on slices (name: value)
 * @param {string} [className] - Wrapper class
 */
export default function PieChart({
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  valueLabel = '',
  title = '',
  height = 260,
  colors = DEFAULT_COLORS,
  showLabel = true,
  className = '',
}) {
  if (!data.length) return null

  return (
    <div className={`chart-wrap chart-pie ${className}`.trim()}>
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={88}
            paddingAngle={2}
            label={showLabel ? { offset: 14, formatter: (value, name) => `${name}: ${value}` } : false}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={colors[i % colors.length]}
                stroke="var(--chart-bg, #fff)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [value, valueLabel]} />
          <Legend layout="horizontal" align="center" verticalAlign="bottom" />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
