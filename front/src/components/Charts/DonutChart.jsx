import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const DEFAULT_COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#8b5cf6', '#ec4899']

/**
 * DonutChart – reusable donut chart (pie with inner radius).
 * @param {Array<Object>} data - Chart data
 * @param {string} nameKey - Key for slice label
 * @param {string} valueKey - Key for value
 * @param {string} [valueLabel] - Tooltip/legend value name
 * @param {string} [title] - Optional title above chart
 * @param {number} [height=260] - Chart height
 * @param {number} [innerRadius=50] - Inner radius (0 = pie, >0 = donut)
 * @param {number} [outerRadius=80] - Outer radius
 * @param {Array<string>} [colors] - Slice colors
 * @param {boolean} [showLabel=true] - Show label on slices
 * @param {string} [className] - Wrapper class
 */
export default function DonutChart({
  data = [],
  nameKey = 'name',
  valueKey = 'value',
  valueLabel = '',
  title = '',
  height = 260,
  innerRadius = 50,
  outerRadius = 80,
  colors = DEFAULT_COLORS,
  showLabel = true,
  className = '',
}) {
  if (!data.length) return null

  return (
    <div className={`chart-wrap chart-donut ${className}`.trim()}>
      {title && <h4 className="chart-title">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            label={showLabel ? { offset: 14, formatter: (value, name) => `${name}: ${value}` } : false}
          >
            {data.map((entry, i) => {
              const c = entry?.color
              const fill =
                typeof c === 'string' && /^#?[0-9a-fA-F]{6}$/.test(c.trim())
                  ? (c.trim().startsWith('#') ? c.trim() : `#${c.trim()}`)
                  : colors[i % colors.length]
              return (
                <Cell key={i} fill={fill} stroke="var(--chart-bg, #fff)" strokeWidth={2} />
              )
            })}
          </Pie>
          <Tooltip formatter={(value) => [value, valueLabel]} />
          <Legend layout="horizontal" align="center" verticalAlign="bottom" />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
