import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAccountIfMissing,
  listAccounts,
  removeAccount,
  resetAccountPassword,
  type AccountCredential,
} from '../lib/accountsClient'
import type { AccountSummary } from '../lib/manageAccounts'

export function useSignInAccounts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [credential, setCredential] = useState<AccountCredential | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setAccounts(await listAccounts())
    } catch (loadError) {
      setError((loadError as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const emails = useMemo(
    () => new Set(accounts.map((account) => account.email.toLowerCase())),
    [accounts],
  )

  async function run(task: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await task()
    } catch (taskError) {
      setError((taskError as Error).message)
    } finally {
      setBusy(false)
    }
  }

  /** Creates a working password only when this email cannot already sign in. */
  function createPasswordIfMissing(email: string) {
    return run(async () => {
      const result = await createAccountIfMissing(email)
      if (result.created) {
        setCredential(result.credential)
        await reload()
      } else {
        setNotice(`${email} already has a sign-in. Reset the password if they need a new one.`)
      }
    })
  }

  function resetPassword(email: string) {
    if (
      !window.confirm(
        `Reset the password for ${email}? The current password stops working immediately.`,
      )
    ) {
      return
    }
    void run(async () => {
      setCredential(await resetAccountPassword(email))
    })
  }

  function removeSignIn(email: string) {
    if (
      !window.confirm(
        `Remove the sign-in for ${email}? They will no longer be able to open the tracker.`,
      )
    ) {
      return
    }
    void run(async () => {
      await removeAccount(email)
      await reload()
    })
  }

  return {
    accounts,
    loading,
    busy,
    error,
    setError,
    notice,
    dismissMessage: () => {
      setNotice(null)
      setError(null)
    },
    credential,
    dismissCredential: () => setCredential(null),
    emails,
    createPasswordIfMissing,
    resetPassword,
    removeSignIn,
  }
}
