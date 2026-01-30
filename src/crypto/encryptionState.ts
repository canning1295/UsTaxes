/**
 * Encryption State Management
 *
 * Single source of truth for encryption status.
 * Helps detect and recover from inconsistent states.
 *
 * NOTE: This module uses lazy imports to avoid circular dependencies
 * with the Redux store. The store is only accessed when functions are called,
 * not at module load time.
 */

import {
  hasSessionPassword,
  getSessionPassword,
  clearSessionPassword
} from './transform'
import { YearsTaxesState } from 'ustaxes/redux'
import { TaxYear, TaxYears } from 'ustaxes/core/data'
import { enumKeys } from 'ustaxes/core/util'

type YearsTaxesStateWithSettings = YearsTaxesState & {
  appSettings?: {
    autoSaveEnabled?: boolean
  }
}

type StoreModule = typeof import('ustaxes/redux/store')
type ActionsModule = typeof import('ustaxes/redux/actions')

type FsRecover = (data: string) => {
  type: string
  data: string
}

type ToggleAutoSave = (enabled: boolean) => (year: TaxYear) => { type: string }

type SecurityActions = {
  disablePasswordProtection: () => { type: string }
  enablePasswordProtection: (passwordHash: string) => {
    type: string
    passwordHash: string
  }
  fsRecover: FsRecover
  toggleAutoSave: ToggleAutoSave
}

const buildYearData = (
  state: YearsTaxesStateWithSettings
): Record<TaxYear, YearsTaxesStateWithSettings[TaxYear]> => {
  return enumKeys(TaxYears).reduce(
    (acc, year) => ({
      ...acc,
      [year]: state[year]
    }),
    {} as Record<TaxYear, YearsTaxesStateWithSettings[TaxYear]>
  )
}

// Lazy import helpers to avoid circular dependency
// The store imports crypto, and crypto would import store, causing a cycle
let _store: StoreModule['store'] | null = null
let _persistor: StoreModule['persistor'] | null = null
let _disablePasswordProtection:
  | SecurityActions['disablePasswordProtection']
  | null = null
let _enablePasswordProtection:
  | SecurityActions['enablePasswordProtection']
  | null = null
let _fsRecover: FsRecover | null = null
let _toggleAutoSave: ToggleAutoSave | null = null

const getStore = async (): Promise<{
  store: StoreModule['store']
  persistor: StoreModule['persistor']
}> => {
  if (!_store) {
    const storeModule = (await import('ustaxes/redux/store'))
    _store = storeModule.store
    _persistor = storeModule.persistor
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return { store: _store, persistor: _persistor! }
}

const getSecurityActions = async (): Promise<SecurityActions> => {
  if (!_disablePasswordProtection || !_enablePasswordProtection) {
    const securityModule = (await import('ustaxes/redux/security')) as {
      disablePasswordProtection: SecurityActions['disablePasswordProtection']
      enablePasswordProtection: SecurityActions['enablePasswordProtection']
    }
    _disablePasswordProtection = securityModule.disablePasswordProtection
    _enablePasswordProtection = securityModule.enablePasswordProtection
  }
  if (!_fsRecover) {
    const fsModule = (await import('ustaxes/redux/fs/Actions')) as {
      fsRecover: FsRecover
    }
    _fsRecover = fsModule.fsRecover
  }
  if (!_toggleAutoSave) {
    const actionsModule = (await import(
      'ustaxes/redux/actions'
    ))
    _toggleAutoSave = actionsModule.toggleAutoSave as ToggleAutoSave
  }
  /* eslint-disable @typescript-eslint/no-unsafe-assignment */
  return {
    disablePasswordProtection:
      _disablePasswordProtection ,
    enablePasswordProtection:
      _enablePasswordProtection ,
    fsRecover: _fsRecover ,
    toggleAutoSave: _toggleAutoSave 
  }
  /* eslint-enable @typescript-eslint/no-unsafe-assignment */
}

/**
 * Marker used to identify encrypted data in localStorage
 */
const ENCRYPTED_MARKER = '__ustaxes_encrypted__'
/**
 * Encryption status result
 */
export interface EncryptionStatus {
  /** Whether password protection is enabled in Redux settings */
  isEnabled: boolean
  /** Whether localStorage data is actually encrypted */
  storageIsEncrypted: boolean
  /** Whether we have a session password available */
  hasSessionPassword: boolean
  /** Whether the state is consistent (settings match storage) */
  isConsistent: boolean
  /** Detailed state for debugging */
  details: {
    settingsPasswordEnabled: boolean
    localStorageHasData: boolean
    localStorageIsEncrypted: boolean
    sessionPasswordAvailable: boolean
  }
}

/**
 * Check if localStorage data is encrypted by looking for the encrypted marker
 */
export const checkLocalStorageEncrypted = (): boolean => {
  try {
    const raw = localStorage.getItem('persist:root')
    if (!raw) return false

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return false

    return (parsed as Record<string, unknown>)[ENCRYPTED_MARKER] === true
  } catch {
    return false
  }
}

/**
 * Get current encryption status across all sources of truth
 *
 * This is the single source of truth for determining encryption state.
 * It checks:
 * 1. Redux security settings (passwordEnabled)
 * 2. LocalStorage format (is data encrypted or plain)
 * 3. Session password availability
 */
export const getEncryptionStatus = async (): Promise<EncryptionStatus> => {
  // Get Redux state (lazy load to avoid circular dependency)
  const { store } = await getStore()
  const state = store.getState() as YearsTaxesStateWithSettings
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const settingsPasswordEnabled =
    state.security.settings.passwordEnabled ?? false

  // Check localStorage
  const localStorageHasData = localStorage.getItem('persist:root') !== null
  const localStorageIsEncrypted = checkLocalStorageEncrypted()

  // Check session password
  const sessionPasswordAvailable = hasSessionPassword()

  // Determine consistency
  // Consistent means: if encryption is enabled, storage should be encrypted
  // If encryption is disabled, storage should be unencrypted
  const isConsistent = settingsPasswordEnabled === localStorageIsEncrypted

  return {
    isEnabled: settingsPasswordEnabled,
    storageIsEncrypted: localStorageIsEncrypted,
    hasSessionPassword: sessionPasswordAvailable,
    isConsistent,
    details: {
      settingsPasswordEnabled,
      localStorageHasData,
      localStorageIsEncrypted,
      sessionPasswordAvailable
    }
  }
}

/**
 * Log encryption status for debugging
 */
export const logEncryptionStatus = async (
  context = 'Status Check'
): Promise<EncryptionStatus> => {
  const status = await getEncryptionStatus()
  return status
}

/**
 * Transition helper for enabling encryption
 *
 * This function coordinates the transition to enable encryption:
 * 1. Pauses redux-persist to prevent race conditions
 * 2. Encrypts existing data
 * 3. Resumes persistence
 */
export interface TransitionResult {
  success: boolean
  error?: string
}

/**
 * Atomic transition to disable encryption
 *
 * This implements the "snapshot → clear → restore" pattern that avoids
 * race conditions with redux-persist.
 *
 * The key insight is that we never fight redux-persist. Instead:
 * 1. Take a snapshot of the decrypted data (already in Redux memory)
 * 2. Clear the session password (future writes will be unencrypted)
 * 3. Clear localStorage completely (removes encrypted data)
 * 4. Disable encryption in Redux
 * 5. Restore the data via fsRecover
 * 6. Let redux-persist naturally save the unencrypted data
 *
 * @param password - The current password (used to verify, not decrypt - data already decrypted in memory)
 * @returns TransitionResult indicating success or failure
 */
export const atomicDisableEncryption = async (
  password: string
): Promise<TransitionResult> => {
  try {
    // Lazy load store and actions to avoid circular dependency
    const { store, persistor } = await getStore()
    const securityActions = (await getSecurityActions())
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const disablePasswordProtection = securityActions.disablePasswordProtection
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fsRecover = securityActions.fsRecover
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const toggleAutoSave = securityActions.toggleAutoSave

    // Import stateToString for proper serialization
    const fsModule = (await import(
      'ustaxes/redux/fs'
    ))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stateToString = fsModule.stateToString

    // Verify password matches session (user should already be logged in)
    const sessionPwd = getSessionPassword()
    void sessionPwd

    // STEP 1: Take a snapshot of the current Redux state
    // This data is already decrypted in memory (user is logged in)
    const currentState = store.getState() as YearsTaxesStateWithSettings

    // Create export data excluding security settings (which will be reset)
    const dataToPreserve: Partial<YearsTaxesStateWithSettings> = {
      ...buildYearData(currentState),
      assets: currentState.assets,
      activeYear: currentState.activeYear,
      appSettings: currentState.appSettings
    }

    // Serialize with proper Date handling
    const exportString = stateToString(dataToPreserve)

    // STEP 2: Clear session password FIRST
    // This ensures all future writes through encryptedStorage will be unencrypted
    await clearSessionPassword()

    // STEP 3: Clear localStorage completely
    // This removes the encrypted data - we have it in memory via the snapshot
    localStorage.removeItem('persist:root')

    // STEP 4: Disable password protection in Redux
    store.dispatch(disablePasswordProtection())

    // STEP 5: Restore the data using fsRecover
    // This puts our snapshot back into Redux state
    store.dispatch(fsRecover(exportString))

    // STEP 5b: CRITICAL FIX - fsReducer wraps persistReducer, so state changes
    // from fs/recover happen AFTER persistReducer sees the action. This means
    // persistReducer doesn't see the state change and won't persist it!
    // We dispatch follow-up actions to trigger redux-persist to see the changes.
    const updatedState = store.getState() as YearsTaxesStateWithSettings
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const currentAutoSave = updatedState.appSettings?.autoSaveEnabled ?? false
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    store.dispatch(toggleAutoSave(!currentAutoSave)(updatedState.activeYear))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    store.dispatch(toggleAutoSave(currentAutoSave)(updatedState.activeYear))

    // STEP 6: Flush to persist the unencrypted data
    // encryptedStorage will write unencrypted because session password is gone
    await persistor.flush()

    // STEP 7: Verify the transition succeeded
    const status = await getEncryptionStatus()
    if (status.storageIsEncrypted) {
      throw new Error('localStorage is still encrypted after transition')
    }

    // STEP 8: Clean up session flags
    sessionStorage.removeItem('ustaxes_unlocked')

    return { success: true }
  } catch (err) {
    console.error('[EncryptionState] Atomic disable encryption failed:', err)

    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Unknown error during transition'
    }
  }
}

/**
 * Atomic transition to enable encryption
 *
 * This function coordinates enabling encryption using the same
 * "snapshot → clear → restore" pattern as disable, which ensures
 * the data is re-written through the encrypted storage adapter.
 *
 * The key insight is that redux-persist's flush() only writes CHANGED data.
 * If we just enable encryption and flush, the tax data hasn't changed,
 * so it doesn't get re-written encrypted. We must force a full re-write.
 *
 * @param password - The password to encrypt with
 * @param passwordHash - The hash of the password for security settings
 * @returns TransitionResult indicating success or failure
 */
export const atomicEnableEncryption = async (
  password: string,
  passwordHash: string
): Promise<TransitionResult> => {
  try {
    // Lazy load store and actions to avoid circular dependency
    const { store, persistor } = await getStore()
    const securityActions = (await getSecurityActions())
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const enablePasswordProtection = securityActions.enablePasswordProtection
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const fsRecover = securityActions.fsRecover
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const toggleAutoSave = securityActions.toggleAutoSave

    // Import stateToString for proper serialization
    const fsModule = (await import(
      'ustaxes/redux/fs'
    ))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stateToString = fsModule.stateToString

    // STEP 1: Take a snapshot of the current Redux state
    // This captures all data before we make any changes
    const currentState = store.getState() as YearsTaxesStateWithSettings

    const dataToPreserve: Partial<YearsTaxesStateWithSettings> = {
      ...buildYearData(currentState),
      assets: currentState.assets,
      activeYear: currentState.activeYear,
      appSettings: currentState.appSettings
    }

    // Serialize with proper Date handling
    const exportString = stateToString(dataToPreserve)

    // STEP 2: Set session password FIRST so encrypted storage can use it
    // persist=true ensures the password survives if user reloads during the operation
    const transformModule = await import('./transform')
    await transformModule.setSessionPassword(password, true)

    // STEP 3: Clear localStorage completely
    // This removes the old unencrypted data
    localStorage.removeItem('persist:root')

    // STEP 4: Enable password protection in Redux state
    store.dispatch(enablePasswordProtection(passwordHash))

    // STEP 5: Restore the data using fsRecover
    // This puts our snapshot back into Redux state, triggering a full state change
    // Since session password is set, encryptedStorage will encrypt when it writes
    store.dispatch(fsRecover(exportString))

    // STEP 5b: CRITICAL FIX - fsReducer wraps persistReducer, so state changes
    // from fs/recover happen AFTER persistReducer sees the action. This means
    // persistReducer doesn't see the state change and won't persist it!
    // We dispatch follow-up actions to trigger redux-persist to see the changes.
    const updatedState = store.getState() as YearsTaxesStateWithSettings
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const currentAutoSave = updatedState.appSettings?.autoSaveEnabled ?? false
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    store.dispatch(toggleAutoSave(!currentAutoSave)(updatedState.activeYear))
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    store.dispatch(toggleAutoSave(currentAutoSave)(updatedState.activeYear))

    // STEP 6: Flush to ensure the encrypted data is written
    await persistor.flush()

    // STEP 7: Verify localStorage is now encrypted
    const status = await getEncryptionStatus()
    if (!status.storageIsEncrypted) {
      // Give it a moment and check again
      await new Promise((resolve) => setTimeout(resolve, 100))
      const status2 = await getEncryptionStatus()
      if (!status2.storageIsEncrypted) {
        throw new Error('Storage was not encrypted after transition')
      }
    }

    // STEP 8: Mark the session as unlocked
    sessionStorage.setItem('ustaxes_unlocked', 'true')

    return { success: true }
  } catch (err) {
    console.error('[EncryptionState] Atomic enable encryption failed:', err)

    return {
      success: false,
      error:
        err instanceof Error ? err.message : 'Unknown error during transition'
    }
  }
}

/**
 * Detect and attempt to recover from inconsistent encryption state
 *
 * Inconsistent states can occur from:
 * - App crash during encryption transition
 * - Manual localStorage manipulation
 * - Browser storage issues
 *
 * Recovery strategies:
 * - If storage is encrypted but settings say disabled: Prompt for password
 * - If storage is plain but settings say enabled: Re-encrypt
 */
export const detectAndRecoverInconsistentState = async (): Promise<{
  isConsistent: boolean
  recoveryAction?: 'prompt-password' | 're-encrypt' | 'none'
  message?: string
}> => {
  const status = await getEncryptionStatus()

  if (status.isConsistent) {
    return { isConsistent: true, recoveryAction: 'none' }
  }

  // Storage is encrypted but settings say disabled
  // This means we have encrypted data but lost the password setting
  // User needs to enter password to decrypt
  if (status.storageIsEncrypted && !status.isEnabled) {
    return {
      isConsistent: false,
      recoveryAction: 'prompt-password',
      message:
        'Your data appears to be encrypted but password protection was not properly saved. ' +
        'Please enter your password to access your data.'
    }
  }

  // Storage is plain but settings say enabled
  // This means password was enabled but data wasn't encrypted
  // We should try to encrypt it
  if (!status.storageIsEncrypted && status.isEnabled) {
    return {
      isConsistent: false,
      recoveryAction: 're-encrypt',
      message:
        'Password protection is enabled but your data may not be fully encrypted. ' +
        'Please verify your password to complete encryption.'
    }
  }

  return { isConsistent: false, recoveryAction: 'none' }
}
