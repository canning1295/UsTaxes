/**
 * Security action types and creators
 *
 * Follows the same pattern as the main actions.ts
 */

import { SessionTimeoutMinutes } from 'ustaxes/crypto'

export enum SecurityActionName {
  ENABLE_PASSWORD_PROTECTION = 'SECURITY/ENABLE_PASSWORD',
  DISABLE_PASSWORD_PROTECTION = 'SECURITY/DISABLE_PASSWORD',
  SET_SESSION_TIMEOUT = 'SECURITY/SET_TIMEOUT',
  ENABLE_SESSION_TIMEOUT = 'SECURITY/ENABLE_TIMEOUT',
  DISABLE_SESSION_TIMEOUT = 'SECURITY/DISABLE_TIMEOUT',
  LOCK_APP = 'SECURITY/LOCK',
  UNLOCK_APP = 'SECURITY/UNLOCK',
  RECORD_FAILED_ATTEMPT = 'SECURITY/FAILED_ATTEMPT',
  RESET_FAILED_ATTEMPTS = 'SECURITY/RESET_ATTEMPTS',
  UPDATE_LAST_ACTIVITY = 'SECURITY/UPDATE_ACTIVITY'
}

interface EnablePasswordProtection {
  type: SecurityActionName.ENABLE_PASSWORD_PROTECTION
  passwordHash: string
}

interface DisablePasswordProtection {
  type: SecurityActionName.DISABLE_PASSWORD_PROTECTION
}

interface SetSessionTimeout {
  type: SecurityActionName.SET_SESSION_TIMEOUT
  minutes: SessionTimeoutMinutes
}

interface EnableSessionTimeout {
  type: SecurityActionName.ENABLE_SESSION_TIMEOUT
}

interface DisableSessionTimeout {
  type: SecurityActionName.DISABLE_SESSION_TIMEOUT
}

interface LockApp {
  type: SecurityActionName.LOCK_APP
}

interface UnlockApp {
  type: SecurityActionName.UNLOCK_APP
}

interface RecordFailedAttempt {
  type: SecurityActionName.RECORD_FAILED_ATTEMPT
}

interface ResetFailedAttempts {
  type: SecurityActionName.RESET_FAILED_ATTEMPTS
}

interface UpdateLastActivity {
  type: SecurityActionName.UPDATE_LAST_ACTIVITY
  timestamp: number
}

export type SecurityActions =
  | EnablePasswordProtection
  | DisablePasswordProtection
  | SetSessionTimeout
  | EnableSessionTimeout
  | DisableSessionTimeout
  | LockApp
  | UnlockApp
  | RecordFailedAttempt
  | ResetFailedAttempts
  | UpdateLastActivity

export const enablePasswordProtection = (
  passwordHash: string
): EnablePasswordProtection => ({
  type: SecurityActionName.ENABLE_PASSWORD_PROTECTION,
  passwordHash
})

export const disablePasswordProtection = (): DisablePasswordProtection => ({
  type: SecurityActionName.DISABLE_PASSWORD_PROTECTION
})

export const setSessionTimeout = (
  minutes: SessionTimeoutMinutes
): SetSessionTimeout => ({
  type: SecurityActionName.SET_SESSION_TIMEOUT,
  minutes
})

export const enableSessionTimeout = (): EnableSessionTimeout => ({
  type: SecurityActionName.ENABLE_SESSION_TIMEOUT
})

export const disableSessionTimeout = (): DisableSessionTimeout => ({
  type: SecurityActionName.DISABLE_SESSION_TIMEOUT
})

export const lockApp = (): LockApp => ({
  type: SecurityActionName.LOCK_APP
})

export const unlockApp = (): UnlockApp => ({
  type: SecurityActionName.UNLOCK_APP
})

export const recordFailedAttempt = (): RecordFailedAttempt => ({
  type: SecurityActionName.RECORD_FAILED_ATTEMPT
})

export const resetFailedAttempts = (): ResetFailedAttempts => ({
  type: SecurityActionName.RESET_FAILED_ATTEMPTS
})

export const updateLastActivity = (timestamp: number): UpdateLastActivity => ({
  type: SecurityActionName.UPDATE_LAST_ACTIVITY,
  timestamp
})
