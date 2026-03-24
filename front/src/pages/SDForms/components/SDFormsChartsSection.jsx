import { useTranslation } from 'react-i18next'
import { BarChart } from '../../../components/Charts'

/**
 * SD Forms charts block – same shell as Clients (`clients-extra-panel`, `clients-charts-grid`, `clients-chart-wrap`).
 */
export default function SDFormsChartsSection({ charts, monthFormat }) {
  const { t } = useTranslation()
  if (!charts) return null

  const monthly = charts.monthly ?? []
  const hasData = monthly.length > 0

  return (
    <div className="clients-extra-panel clients-charts-panel mb-4">
      {hasData ? (
        <div className="clients-charts-grid">
          <div className="clients-chart-wrap">
            <BarChart
              data={monthly.map((d) => ({
                ...d,
                monthLabel: d.month ? monthFormat.format(new Date(d.month)) : d.month,
              }))}
              xKey="monthLabel"
              yKey="count"
              xLabel={t('sdForms.chartMonth')}
              yLabel={t('sdForms.chartCount')}
              valueLabel={t('sdForms.chartCount')}
              title={t('sdForms.chartTitle')}
              height={260}
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('sdForms.chartsNoData')}</p>
      )}
    </div>
  )
}
