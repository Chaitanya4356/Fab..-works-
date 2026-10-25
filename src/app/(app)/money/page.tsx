import { Placeholder } from '@/components/placeholder'
import { requireActiveUser } from '@/lib/auth'

export default async function MoneyPage() {
  await requireActiveUser()
  return <Placeholder title="Money" />
}
