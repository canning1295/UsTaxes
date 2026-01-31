/**
 * Security Integration Tests
 *
 * These tests verify that the security module is properly integrated
 * with the main app store, routes, and UI components.
 */

import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { createWholeStoreUnpersisted } from 'ustaxes/redux/store'
import { blankYearTaxesState } from 'ustaxes/redux'
import { SecuritySettingsPage } from 'ustaxes/components/security'
import {
  enablePasswordProtection,
  disablePasswordProtection,
  lockApp,
  unlockApp,
  setSessionTimeout,
  enableSessionTimeout,
  disableSessionTimeout,
  recordFailedAttempt,
  resetFailedAttempts,
  updateLastActivity,
  enableBiometric,
  disableBiometric,
  enablePasswordRecovery,
  disablePasswordRecovery,
  setSecurityQuestions
} from 'ustaxes/redux/security/actions'
import {
  selectSecuritySettings,
  selectLockState,
  selectIsLocked,
  selectIsPasswordEnabled,
  selectIsSessionTimeoutEnabled,
  selectIsBiometricEnabled,
  selectIsPasswordRecoveryEnabled
} from 'ustaxes/redux/security/reducer'

describe('Security Integration', () => {
  describe('Redux Store Integration', () => {
    it('should have security state in the store', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const state = store.getState()

      expect(state.security).toBeDefined()
      expect(state.security.settings).toBeDefined()
      expect(state.security.lock).toBeDefined()
    })

    it('should have default security settings', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const state = store.getState()

      expect(state.security.settings.passwordEnabled).toBe(false)
      expect(state.security.settings.passwordHash).toBeNull()
      expect(state.security.settings.sessionTimeoutEnabled).toBe(false)
      expect(state.security.settings.sessionTimeoutMinutes).toBe(15)
    })

    it('should have default lock state', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const state = store.getState()

      expect(state.security.lock.isLocked).toBe(false)
      expect(state.security.lock.failedAttempts).toBe(0)
      expect(state.security.lock.lockoutUntil).toBeNull()
    })
  })

  describe('Security Actions', () => {
    it('should enable password protection', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const passwordHash = 'test-hash-123'

      store.dispatch(enablePasswordProtection(passwordHash))

      const state = store.getState()
      expect(state.security.settings.passwordEnabled).toBe(true)
      expect(state.security.settings.passwordHash).toBe(passwordHash)
    })

    it('should disable password protection', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(enablePasswordProtection('test-hash'))
      store.dispatch(disablePasswordProtection())

      const state = store.getState()
      expect(state.security.settings.passwordEnabled).toBe(false)
      expect(state.security.settings.passwordHash).toBeNull()
    })

    it('should lock and unlock the app', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(lockApp())
      expect(store.getState().security.lock.isLocked).toBe(true)

      store.dispatch(unlockApp())
      expect(store.getState().security.lock.isLocked).toBe(false)
    })

    it('should set session timeout', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(setSessionTimeout(30))

      const state = store.getState()
      expect(state.security.settings.sessionTimeoutMinutes).toBe(30)
    })

    it('should enable and disable session timeout', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(enableSessionTimeout())
      expect(store.getState().security.settings.sessionTimeoutEnabled).toBe(
        true
      )

      store.dispatch(disableSessionTimeout())
      expect(store.getState().security.settings.sessionTimeoutEnabled).toBe(
        false
      )
    })

    it('should record and reset failed attempts', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(recordFailedAttempt())
      expect(store.getState().security.lock.failedAttempts).toBe(1)

      store.dispatch(recordFailedAttempt())
      expect(store.getState().security.lock.failedAttempts).toBe(2)

      store.dispatch(resetFailedAttempts())
      expect(store.getState().security.lock.failedAttempts).toBe(0)
    })

    it('should update last activity timestamp', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const timestamp = Date.now()

      store.dispatch(updateLastActivity(timestamp))

      const state = store.getState()
      expect(state.security.settings.lastActivity).toBe(timestamp)
    })

    it('should lockout after 5 failed attempts', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        store.dispatch(recordFailedAttempt())
      }

      const state = store.getState()
      expect(state.security.lock.failedAttempts).toBe(5)
      expect(state.security.lock.lockoutUntil).not.toBeNull()
    })
  })

  describe('Security Selectors', () => {
    it('selectSecuritySettings should return security settings', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const settings = selectSecuritySettings(store.getState())

      expect(settings).toBeDefined()
      expect(settings.passwordEnabled).toBe(false)
    })

    it('selectLockState should return lock state', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const lockState = selectLockState(store.getState())

      expect(lockState).toBeDefined()
      expect(lockState.isLocked).toBe(false)
    })

    it('selectIsLocked should return correct value', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(selectIsLocked(store.getState())).toBe(false)

      store.dispatch(lockApp())
      expect(selectIsLocked(store.getState())).toBe(true)
    })

    it('selectIsPasswordEnabled should return correct value', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(selectIsPasswordEnabled(store.getState())).toBe(false)

      store.dispatch(enablePasswordProtection('hash'))
      expect(selectIsPasswordEnabled(store.getState())).toBe(true)
    })

    it('selectIsSessionTimeoutEnabled should return correct value', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(selectIsSessionTimeoutEnabled(store.getState())).toBe(false)

      store.dispatch(enableSessionTimeout())
      expect(selectIsSessionTimeoutEnabled(store.getState())).toBe(true)
    })
  })

  describe('SecuritySettingsPage Component', () => {
    it('should render security settings page', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      render(
        <Provider store={store}>
          <MemoryRouter>
            <SecuritySettingsPage />
          </MemoryRouter>
        </Provider>
      )

      expect(screen.getByText('Security Settings')).toBeInTheDocument()
      expect(screen.getByText('Password Protection')).toBeInTheDocument()
      expect(screen.getByText('Session Timeout')).toBeInTheDocument()
    })

    it('should show password protection toggle', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      render(
        <Provider store={store}>
          <MemoryRouter>
            <SecuritySettingsPage />
          </MemoryRouter>
        </Provider>
      )

      const toggles = screen.getAllByRole('checkbox')
      expect(toggles.length).toBeGreaterThan(0)
    })

    it('should show disabled toggle initially', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      render(
        <Provider store={store}>
          <MemoryRouter>
            <SecuritySettingsPage />
          </MemoryRouter>
        </Provider>
      )

      // All four toggles (password, biometric, session timeout, recovery) should show as disabled initially
      const disabledLabels = screen.getAllByText('Disabled')
      expect(disabledLabels.length).toBe(4)
    })
  })

  describe('Biometric Authentication', () => {
    it('should enable biometric authentication', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(store.getState().security.settings.biometricEnabled).toBe(false)

      store.dispatch(enableBiometric())
      expect(store.getState().security.settings.biometricEnabled).toBe(true)
    })

    it('should disable biometric authentication', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(enableBiometric())
      store.dispatch(disableBiometric())

      expect(store.getState().security.settings.biometricEnabled).toBe(false)
    })

    it('selectIsBiometricEnabled should return correct value', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(selectIsBiometricEnabled(store.getState())).toBe(false)

      store.dispatch(enableBiometric())
      expect(selectIsBiometricEnabled(store.getState())).toBe(true)
    })
  })

  describe('Password Recovery', () => {
    it('should enable password recovery', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(store.getState().security.settings.passwordRecoveryEnabled).toBe(
        false
      )

      store.dispatch(enablePasswordRecovery())
      expect(store.getState().security.settings.passwordRecoveryEnabled).toBe(
        true
      )
    })

    it('should disable password recovery and clear questions', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      store.dispatch(
        setSecurityQuestions([
          { question: 'Q1', answerHash: 'a1' },
          { question: 'Q2', answerHash: 'a2' },
          { question: 'Q3', answerHash: 'a3' }
        ])
      )
      store.dispatch(enablePasswordRecovery())
      store.dispatch(disablePasswordRecovery())

      expect(store.getState().security.settings.passwordRecoveryEnabled).toBe(
        false
      )
      expect(store.getState().security.settings.securityQuestions).toBeNull()
    })

    it('should set security questions', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)
      const questions = [
        { question: 'What is your pet name?', answerHash: 'fluffy' },
        { question: 'What city were you born in?', answerHash: 'new york' },
        { question: 'What is your favorite movie?', answerHash: 'star wars' }
      ]

      store.dispatch(setSecurityQuestions(questions))

      const state = store.getState()
      expect(state.security.settings.securityQuestions).toHaveLength(3)
      expect(state.security.settings.securityQuestions?.[0].question).toBe(
        'What is your pet name?'
      )
    })

    it('selectIsPasswordRecoveryEnabled should return correct value', () => {
      const store = createWholeStoreUnpersisted(blankYearTaxesState)

      expect(selectIsPasswordRecoveryEnabled(store.getState())).toBe(false)

      store.dispatch(enablePasswordRecovery())
      expect(selectIsPasswordRecoveryEnabled(store.getState())).toBe(true)
    })
  })
})
