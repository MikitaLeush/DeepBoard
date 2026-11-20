/**
 * Account page. Reached at /settings — no auth logic lives here
 * because (protected)/_layout.tsx already wraps the subtree in <AuthGate>.
 */

import { signOut, useUser } from 'deepspace'
import { Button } from '@/components/ui'

export default function SettingsPage() {
  const { user } = useUser()

  return (
    // No background on page wrappers — pages render into whatever the app's
    // (app)/_layout provides, so they stay transparent and inherit it.
    <div className="min-h-full text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold leading-none tracking-tight">Account</h1>

        <dl className="mt-10 max-w-3xl divide-y divide-border border-y border-border text-sm">
          <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user?.name || 'Not set'}</dd>
          </div>
          <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{user?.email ?? 'Not set'}</dd>
          </div>
        </dl>

        <Button variant="outline" className="mt-6" onClick={() => signOut()}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
