import { AddUserForm } from '@/modules/users/components/add-user-form'
import { UserList } from '@/modules/users/components/user-list'
import { listUsers } from '@/modules/users/queries'

export default async function UsersPage() {
  const users = await listUsers()
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-muted">Everyone listed here can log in and use every part of SteelFlow.</p>
      </div>
      <AddUserForm />
      <UserList users={users} />
    </section>
  )
}
