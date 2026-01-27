/**
 * Redux Persist security transform
 *
 * Provides obfuscation for sensitive fields in localStorage.
 * Full encryption is available via import/export functionality.
 */

import { createTransform, Transform } from 'redux-persist'
import { SecuritySettings } from './types'

/**
 * Keys containing sensitive data
 */
const SENSITIVE_KEYS = new Set([
  'ssid',
  'accountNumber',
  'routingNumber',
  'EIN'
])

/**
 * Session password holder (in-memory only)
 */
let sessionPassword: string | null = null

/**
 * Set session password
 */
export const setSessionPassword = (password: string): void => {
  sessionPassword = password
}

/**
 * Clear session password
 */
export const clearSessionPassword = (): void => {
  sessionPassword = null
}

/**
 * Check if session password is set
 */
export const hasSessionPassword = (): boolean => {
  return sessionPassword !== null
}

/**
 * Get current session password
 */
export const getSessionPassword = (): string | null => {
  return sessionPassword
}

interface SecurityTransformConfig {
  getSecuritySettings: () => SecuritySettings | undefined
}

/**
 * Create security metadata transform
 */
export const createSecurityTransform = (
  config: SecurityTransformConfig
): Transform<unknown, unknown> => {
  return createTransform(
    (inboundState: unknown): unknown => {
      const settings = config.getSecuritySettings()

      if (settings?.passwordEnabled) {
        return {
          __security: {
            protected: true,
            timestamp: Date.now()
          },
          data: inboundState
        }
      }

      return inboundState
    },

    (outboundState: unknown): unknown => {
      if (
        typeof outboundState === 'object' &&
        outboundState !== null &&
        '__security' in outboundState &&
        'data' in outboundState
      ) {
        return (outboundState as unknown as { data: unknown }).data
      }

      return outboundState
    },

    {
      whitelist: ['Y2020', 'Y2021', 'Y2022', 'Y2023', 'Y2024', 'information']
    }
  )
}

/**
 * Create sensitive fields obfuscation transform
 */
export const createSensitiveFieldsTransform = (): Transform<
  unknown,
  unknown
> => {
  const obfuscate = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(obfuscate)
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key) && typeof value === 'string') {
        result[key] = btoa(value)
        result[`${key}_obfuscated`] = true
      } else if (typeof value === 'object') {
        result[key] = obfuscate(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  const deobfuscate = (obj: unknown): unknown => {
    if (typeof obj !== 'object' || obj === null) {
      return obj
    }

    if (Array.isArray(obj)) {
      return obj.map(deobfuscate)
    }

    const result: Record<string, unknown> = {}
    const objRecord = obj as Record<string, unknown>

    for (const [key, value] of Object.entries(objRecord)) {
      if (key.endsWith('_obfuscated')) {
        continue
      }

      if (objRecord[`${key}_obfuscated`] && typeof value === 'string') {
        try {
          result[key] = atob(value)
        } catch {
          result[key] = value
        }
      } else if (typeof value === 'object') {
        result[key] = deobfuscate(value)
      } else {
        result[key] = value
      }
    }
    return result
  }

  return createTransform(
    (inboundState) => obfuscate(inboundState),
    (outboundState) => deobfuscate(outboundState)
  )
}
