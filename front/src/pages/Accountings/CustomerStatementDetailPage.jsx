import { useParams } from 'react-router-dom'
import CustomerStatementInteractive from './CustomerStatementInteractive'

export default function CustomerStatementDetailPage() {
  const { customerId } = useParams()
  return <CustomerStatementInteractive customerId={customerId} variant="page" />
}
