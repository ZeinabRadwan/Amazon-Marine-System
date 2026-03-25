import { useTranslation } from 'react-i18next'
import {
  ClipboardList,
  FilePenLine,
  Send,
  Share2,
  ListChecks,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react'
import { StatsCard } from '../../../components/StatsCard'

/**
 * Map API status to StatsCard variant (matches sd-forms-badge* colors in SDForms.css).
 */
function getStatusStatsConfig(status) {
  const s = String(status || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
  switch (s) {
    case 'draft':
      return { variant: 'default', Icon: FilePenLine }
    case 'submitted':
      return { variant: 'blue', Icon: Send }
    case 'sent_to_operations':
      return { variant: 'amber', Icon: Share2 }
    case 'in_progress':
      return { variant: 'green', Icon: ListChecks }
    case 'completed':
      return { variant: 'blue', Icon: CheckCircle2 }
    case 'cancelled':
      return { variant: 'red', Icon: XCircle }
    default:
      return { variant: 'default', Icon: HelpCircle }
  }
}

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
        icon={<ClipboardList className="h-6 w-6" />}
        variant="blue"
      />
      {(stats.by_status ?? []).map((item) => {
        const { variant, Icon } = getStatusStatsConfig(item.status)
        return (
          <StatsCard
            key={item.status}
            title={t(`sdForms.status.${item.status}`, item.status)}
            value={item.count ?? 0}
            icon={<Icon className="h-6 w-6" />}
            variant={variant}
          />
        )
      })}
    </div>
  )
}
