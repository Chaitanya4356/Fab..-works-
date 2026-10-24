import { signOut } from '@/app/(auth)/login/actions'

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="button-secondary">
        Log out
      </button>
    </form>
  )
}
