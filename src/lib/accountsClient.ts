import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AccountRequest, AccountSummary } from './manageAccounts'

export type AccountCredential = { email: string; temporary_password: string }

const ERROR_MESSAGES: Record<string, string> = {
  unauthorized: 'Sign in again and retry.',
  forbidden: 'Only administrators can manage sign-in accounts.',
  invalid_email: 'Enter a valid email address.',
  not_digital_realty_email: 'Accounts must use an @digitalrealty.com email address.',
  already_exists: 'That person already has an account. Use Reset password instead.',
  not_found: 'No account exists for that email.',
  cannot_remove_self: 'You cannot remove your own account.',
  server_misconfigured: 'The account service is not configured. Ask whoever deploys the tracker.',
  account_action_failed: 'The account service failed. Try again, or check the function logs.',
}

async function readErrorCode(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as { error?: unknown }
      if (typeof body.error === 'string') return body.error
    } catch {
      // fall through to the generic message
    }
    return `http_${error.context.status}`
  }
  return 'network'
}

export function accountErrorMessage(code: string): string {
  if (code === 'network') return 'Could not reach the account service.'
  if (code.startsWith('http_')) return `The account service returned ${code.slice(5)}.`
  return ERROR_MESSAGES[code] ?? 'The account request failed.'
}

async function callAccounts<T>(request: AccountRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('manage-accounts', {
    body: request,
  })
  if (error) {
    throw new Error(accountErrorMessage(await readErrorCode(error)))
  }
  if (data == null) {
    throw new Error(accountErrorMessage('account_action_failed'))
  }
  return data
}

export async function listAccounts(): Promise<AccountSummary[]> {
  const result = await callAccounts<{ accounts: AccountSummary[] }>({ action: 'list' })
  return result.accounts
}

export function createAccount(email: string): Promise<AccountCredential> {
  return callAccounts<AccountCredential>({ action: 'create', email })
}

export function resetAccountPassword(email: string): Promise<AccountCredential> {
  return callAccounts<AccountCredential>({ action: 'reset_password', email })
}

export async function removeAccount(email: string): Promise<void> {
  await callAccounts<{ removed: boolean }>({ action: 'remove', email })
}
