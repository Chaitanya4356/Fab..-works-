import { Placeholder } from '@/components/placeholder'
import { requireActiveUser } from '@/lib/auth'

export default async function QuotesPage() {
  await requireActiveUser()
  return <Placeholder title="Quotes" />
}
