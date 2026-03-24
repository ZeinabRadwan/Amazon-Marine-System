import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { StatsCard } from '../../../components/StatsCard'

/**
 * SD Forms stats row – same grid pattern as Clients (`clients-stats-grid`).
 */
export default function SDFormsStatsSection({ stats }) {
  const { t } = useTranslation()
  if (!stats || typeof stats !== 'object') return null

  return (
    <div className="clients-stats-grid">
      <StatsCard
        title={t('sdForms.statsTotal')}
        value={stats.total_forms ?? 0}
        icon={<FileText className="h-6 w-6" />}
        variant="blue"
      />
      {(stats.by_status ?? []).map((item) => (
        <StatsCard
          key={item.status}
          title={t(`sdForms.status.${item.status}`, item.status)}
          value={item.count ?? 0}
          icon={<FileText className="h-6 w-6" />}
          variant="default"
        />
      ))}
    </div>
  )
}
