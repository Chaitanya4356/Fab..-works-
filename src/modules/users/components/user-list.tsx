import type { UserRow } from '../queries'
import { UserRowActions } from './user-row-actions'

export function UserList({ users }: { users: UserRow[] }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="bg-ground text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t border-line align-top">
              <td className="px-3 py-3">
                <div className="font-medium">
                  {user.fullName}
                  {user.isYou && <span className="ml-2 rounded bg-ground px-1.5 py-0.5 text-xs text-muted">You</span>}
                </div>
                <div className="text-muted">{user.loginEmail}</div>
                {user.phone && <div className="text-muted">{user.phone}</div>}
              </td>
              <td className="px-3 py-3">
                <span
                  className={
                    user.isActive
                      ? 'rounded border border-ok/40 bg-ok/10 px-2 py-0.5 text-xs text-ok'
                      : 'rounded border border-line px-2 py-0.5 text-xs text-muted'
                  }
                >
                  {user.isActive ? 'Active' : 'Switched off'}
                </span>
              </td>
              <td className="px-3 py-3">
                <UserRowActions user={user} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
