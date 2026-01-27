/**
 * Security reducer
 *
 * Follows the same pattern as the main reducer.ts
 */

import {
  SecuritySettings,
  LockState,
  defaultSecuritySettings,
  defaultLockState
} from 'ustaxes/crypto'
import { SecurityActionName, SecurityActions } from './actions'

export interface SecurityState {
  settings: SecuritySettings
  lock: LockState
}

const initialState: SecurityState = {
  settings: defaultSecuritySettings,
  lock: defaultLockState
}

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 5 * 60 * 1000 // 5 minutes

export const securityReducer = (
  state: SecurityState = initialState,
  action: SecurityActions
): SecurityState => {
  switch (action.type) {
    case SecurityActionName.ENABLE_PASSWORD_PROTECTION: {
      return {
        ...state,
        settings: {
          ...state.settings,
          passwordEnabled: true,
          passwordHash: action.passwordHash
        }
      }
    }

    case SecurityActionName.DISABLE_PASSWORD_PROTECTION: {
      return {
        ...state,
        settings: {
          ...state.settings,
          passwordEnabled: false,
          passwordHash: null
        },
        lock: defaultLockState
      }
    }

    case SecurityActionName.SET_SESSION_TIMEOUT: {
      return {
        ...state,
        settings: {
          ...state.settings,
          sessionTimeoutMinutes: action.minutes
        }
      }
    }

    case SecurityActionName.ENABLE_SESSION_TIMEOUT: {
      return {
        ...state,
        settings: {
          ...state.settings,
          sessionTimeoutEnabled: true
        }
      }
    }

    case SecurityActionName.DISABLE_SESSION_TIMEOUT: {
      return {
        ...state,
        settings: {
          ...state.settings,
          sessionTimeoutEnabled: false
        }
      }
    }

    case SecurityActionName.LOCK_APP: {
      return {
        ...state,
        lock: {
          ...state.lock,
          isLocked: true
        }
      }
    }

    case SecurityActionName.UNLOCK_APP: {
      return {
        ...state,
        lock: {
          isLocked: false,
          failedAttempts: 0,
          lockoutUntil: null
        }
      }
    }

    case SecurityActionName.RECORD_FAILED_ATTEMPT: {
      const failedAttempts = state.lock.failedAttempts + 1
      const lockoutUntil =
        failedAttempts >= MAX_FAILED_ATTEMPTS
          ? Date.now() + LOCKOUT_DURATION_MS
          : null

      return {
        ...state,
        lock: {
          ...state.lock,
          failedAttempts,
          lockoutUntil
        }
      }
    }

    case SecurityActionName.RESET_FAILED_ATTEMPTS: {
      return {
        ...state,
        lock: {
          ...state.lock,
          failedAttempts: 0,
          lockoutUntil: null
        }
      }
    }

    case SecurityActionName.UPDATE_LAST_ACTIVITY: {
      return {
        ...state,
        settings: {
          ...state.settings,
          lastActivity: action.timestamp
        }
      }
    }

    default:
      return state
  }
}

// Selectors
export const selectSecuritySettings = (state: {
  security: SecurityState
}): SecuritySettings => state.security.settings

export const selectLockState = (state: {
  security: SecurityState
}): LockState => state.security.lock

export const selectIsLocked = (state: { security: SecurityState }): boolean =>
  state.security.lock.isLocked

export const selectIsPasswordEnabled = (state: {
  security: SecurityState
}): boolean => state.security.settings.passwordEnabled

export const selectIsSessionTimeoutEnabled = (state: {
  security: SecurityState
}): boolean => state.security.settings.sessionTimeoutEnabled
