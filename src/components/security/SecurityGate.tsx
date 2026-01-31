import {
  ReactElement,
  useState,
  useEffect,
  useRef,
  PropsWithChildren
} from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
  Box,
  Link
} from '@material-ui/core'
import { Fingerprint, Visibility, VisibilityOff } from '@material-ui/icons'
import { useDispatch, useSelector } from 'react-redux'
import {
  unlockApp,
  lockApp,
  recordFailedAttempt,
  resetFailedAttempts,
  setBiometricCredential,
  enablePasswordProtection,
  SecurityState
} from 'ustaxes/redux/security'
import {
  verifyPasswordHash,
  hashPassword,
  SecuritySettings,
  LockState,
  setSessionPassword,
  encryptAllStorage,
  hasEncryptedData
} from 'ustaxes/crypto'
import useStyles from './styles'

// Typed selectors
type StateWithSecurity = { security: SecurityState }
const selectSecuritySettings = (state: StateWithSecurity): SecuritySettings =>
  state.security.settings
const selectLockState = (state: StateWithSecurity): LockState =>
  state.security.lock
const selectIsLocked = (state: StateWithSecurity): boolean =>
  state.security.lock.isLocked

interface SecurityGateProps {
  children: React.ReactNode
}

/**
 * SecurityGate wraps the entire application and shows a password prompt
 * when the app starts if password protection is enabled.
 */
export const SecurityGate = ({
  children
}: PropsWithChildren<SecurityGateProps>): ReactElement => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const securitySettings = useSelector(selectSecuritySettings)
  const lockState = useSelector(selectLockState)
  const isLocked = useSelector(selectIsLocked)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRecovery, setShowRecovery] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [recoveryAnswers, setRecoveryAnswers] = useState<string[]>(['', '', ''])
  const [recoveryError, setRecoveryError] = useState<string | null>(null)

  // Ref to track if we've already checked for initial lock
  const hasInitialized = useRef(false)

  // Lock the app on startup if password protection is enabled OR if data is encrypted
  // The encrypted data check is important because redux state might not be correct
  // if the data couldn't be decrypted (user hasn't logged in yet)
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    // Check if localStorage has encrypted data - this is the source of truth
    const dataIsEncrypted = hasEncryptedData('persist:root')

    if (dataIsEncrypted || securitySettings.passwordEnabled) {
      // Check if this is a fresh page load (not already unlocked)
      const wasUnlocked = sessionStorage.getItem('ustaxes_unlocked')
      if (!wasUnlocked) {
        dispatch(lockApp())
      }
    }
  }, [securitySettings.passwordEnabled, dispatch])

  const isLockedOut =
    lockState.lockoutUntil !== null && lockState.lockoutUntil > Date.now()

  // Track if we've attempted biometric setup this session
  const hasAttemptedBiometricSetup = useRef(false)

  // Auto-setup biometric credential when enabled but missing
  useEffect(() => {
    const setupBiometric = async (): Promise<void> => {
      if (
        !isLocked ||
        !securitySettings.biometricEnabled ||
        securitySettings.biometricCredentialId ||
        hasAttemptedBiometricSetup.current ||
        !('PublicKeyCredential' in window)
      ) {
        return
      }

      hasAttemptedBiometricSetup.current = true

      try {
        const available =
          await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        if (!available) return

        // Create credential automatically
        const userId = new Uint8Array(16)
        crypto.getRandomValues(userId)

        const credential = (await navigator.credentials.create({
          publicKey: {
            challenge: crypto.getRandomValues(new Uint8Array(32)),
            rp: {
              name: 'UsTaxes',
              id: window.location.hostname
            },
            user: {
              id: userId,
              name: 'ustaxes-user',
              displayName: 'UsTaxes User'
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },
              { alg: -257, type: 'public-key' }
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
              residentKey: 'preferred'
            },
            timeout: 60000
          }
        })) as PublicKeyCredential | null

        if (credential) {
          const rawIdArray = Array.from(new Uint8Array(credential.rawId))
          const credentialId = btoa(String.fromCharCode.apply(null, rawIdArray))
          dispatch(setBiometricCredential(credentialId))
          // Also unlock since user just verified with Touch ID
          dispatch(unlockApp())
          dispatch(resetFailedAttempts())
          sessionStorage.setItem('ustaxes_unlocked', 'true')
        }
      } catch {
        // Silently fail - user can still use password
      }
    }

    void setupBiometric()
  }, [
    isLocked,
    securitySettings.biometricEnabled,
    securitySettings.biometricCredentialId,
    dispatch
  ])

  // Check if biometric authentication is available (must have credential stored)
  const biometricAvailable =
    securitySettings.biometricEnabled &&
    !!securitySettings.biometricCredentialId &&
    typeof window !== 'undefined' &&
    'PublicKeyCredential' in window

  const handleBiometricAuth = async (): Promise<void> => {
    if (!securitySettings.biometricCredentialId) {
      setError(
        'Biometric credential not found. Please re-enable biometrics in settings.'
      )
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Convert stored credential ID back to ArrayBuffer
      const credentialIdArray = Uint8Array.from(
        atob(securitySettings.biometricCredentialId),
        (c) => c.charCodeAt(0)
      )

      // Request authentication with the stored credential
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
          allowCredentials: [
            {
              id: credentialIdArray,
              type: 'public-key',
              transports: ['internal'] // Force internal authenticator (Touch ID)
            }
          ]
        }
      })

      if (credential) {
        // Biometric verification successful
        dispatch(unlockApp())
        dispatch(resetFailedAttempts())
        sessionStorage.setItem('ustaxes_unlocked', 'true')
      } else {
        setError('Biometric authentication failed')
      }
    } catch (err) {
      // User cancelled or authentication failed
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          // User cancelled - don't show error
        } else if (err.name === 'InvalidStateError') {
          setError(
            'Biometric credential expired. Please re-enable in settings.'
          )
        } else {
          setError('Biometric authentication failed')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (): Promise<void> => {
    if (!securitySettings.passwordHash) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const isValid = await verifyPasswordHash(
        password,
        securitySettings.passwordHash
      )

      if (isValid) {
        // Check if data is encrypted - if so, we need to reload to rehydrate
        const dataIsEncrypted = hasEncryptedData('persist:root')

        if (dataIsEncrypted) {
          // Set session password with persistence for reload
          await setSessionPassword(password, true)
          // Mark as unlocked before reload
          sessionStorage.setItem('ustaxes_unlocked', 'true')
          // Reload the page to trigger proper rehydration with the session password
          window.location.reload()
          return
        }

        // Set session password for encrypted storage
        await setSessionPassword(password)

        // If data isn't encrypted yet, encrypt it now
        try {
          await encryptAllStorage(['persist:root'], password)
        } catch (err) {
          console.error('[SecurityGate] Failed to encrypt existing data:', err)
        }

        dispatch(unlockApp())
        dispatch(resetFailedAttempts())
        sessionStorage.setItem('ustaxes_unlocked', 'true')
        setPassword('')
      } else {
        dispatch(recordFailedAttempt())
        setError('Incorrect password')
        setPassword('')
      }
    } catch {
      setError('Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleRecoverySubmit = (): void => {
    const questions = securitySettings.securityQuestions
    if (!questions || questions.length !== 3) {
      setRecoveryError('Password recovery is not set up')
      return
    }

    setLoading(true)
    setRecoveryError(null)

    // Check all answers (they are stored as lowercase trimmed strings)
    let allCorrect = true
    for (let i = 0; i < 3; i++) {
      const answer = recoveryAnswers[i].toLowerCase().trim()
      if (answer !== questions[i].answerHash) {
        allCorrect = false
        break
      }
    }

    if (allCorrect) {
      dispatch(unlockApp())
      dispatch(resetFailedAttempts())
      sessionStorage.setItem('ustaxes_unlocked', 'true')
      setShowRecovery(false)
      setShowPasswordChange(true)
      setRecoveryAnswers(['', '', ''])
    } else {
      dispatch(recordFailedAttempt())
      setRecoveryError('One or more answers are incorrect')
    }

    setLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !isLockedOut) {
      void handleSubmit()
    }
  }

  const remainingAttempts = 5 - lockState.failedAttempts

  const handleRecoveryAnswerChange = (index: number, value: string): void => {
    const newAnswers = [...recoveryAnswers]
    newAnswers[index] = value
    setRecoveryAnswers(newAnswers)
  }

  // If password protection is not enabled, or user is unlocked, show the app
  // Also show password change prompt if needed
  if (!securitySettings.passwordEnabled || !isLocked) {
    if (showPasswordChange) {
      const handlePasswordChange = async (): Promise<void> => {
        setPasswordError(null)

        if (newPassword.length < 8) {
          setPasswordError('Password must be at least 8 characters')
          return
        }

        if (newPassword !== confirmPassword) {
          setPasswordError('Passwords do not match')
          return
        }

        setLoading(true)
        try {
          const passwordHash = await hashPassword(newPassword)

          // Set session password for encrypted storage
          await setSessionPassword(newPassword)

          // Encrypt existing data
          try {
            await encryptAllStorage(['persist:root'], newPassword)
          } catch (err) {
            console.error('[SecurityGate] Failed to encrypt data:', err)
          }

          dispatch(enablePasswordProtection(passwordHash))
          setShowPasswordChange(false)
          setNewPassword('')
          setConfirmPassword('')
        } catch {
          setPasswordError('Failed to set password')
        } finally {
          setLoading(false)
        }
      }

      return (
        <>
          <Dialog open maxWidth="sm" fullWidth disableEscapeKeyDown>
            <DialogTitle>Set New Password</DialogTitle>
            <DialogContent className={classes.dialogContent}>
              <DialogContentText>
                You used password recovery to unlock your data. Please set a new
                password now.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle new password visibility"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        edge="end"
                        size="small"
                        disabled={loading}
                      >
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                margin="dense"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordError !== null}
                helperText={passwordError}
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        edge="end"
                        size="small"
                        disabled={loading}
                      >
                        {showConfirmPassword ? (
                          <VisibilityOff />
                        ) : (
                          <Visibility />
                        )}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => {
                  setShowPasswordChange(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                color="secondary"
                disabled={loading}
              >
                Skip for Now
              </Button>
              <Button
                onClick={() => void handlePasswordChange()}
                color="primary"
                disabled={loading || newPassword.length === 0}
              >
                {loading ? 'Saving...' : 'Set Password'}
              </Button>
            </DialogActions>
          </Dialog>
          {children}
        </>
      )
    }
    return <>{children}</>
  }

  // Show password recovery dialog
  if (showRecovery) {
    const questions = securitySettings.securityQuestions

    return (
      <Dialog open disableEscapeKeyDown maxWidth="sm" fullWidth>
        <DialogTitle>Password Recovery</DialogTitle>
        <DialogContent className={classes.dialogContent}>
          <DialogContentText>
            Answer all three security questions correctly to unlock your data.
          </DialogContentText>

          {!questions || questions.length < 3 ? (
            <Typography color="error">
              Password recovery is not set up. Please contact support.
            </Typography>
          ) : (
            <>
              {questions.map((q, index) => (
                <Box key={index} mb={2}>
                  <Typography variant="body2" gutterBottom>
                    {q.question}
                  </Typography>
                  <TextField
                    fullWidth
                    label={`Answer ${index + 1}`}
                    value={recoveryAnswers[index]}
                    onChange={(e) =>
                      handleRecoveryAnswerChange(index, e.target.value)
                    }
                    variant="outlined"
                    size="small"
                    disabled={loading || isLockedOut}
                  />
                </Box>
              ))}

              {recoveryError && (
                <Typography color="error" variant="body2">
                  {recoveryError}
                </Typography>
              )}

              {isLockedOut && (
                <Typography color="error">
                  Too many failed attempts. Please try again later.
                </Typography>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowRecovery(false)} color="secondary">
            Back to Password
          </Button>
          <Button
            onClick={handleRecoverySubmit}
            color="primary"
            disabled={
              isLockedOut ||
              loading ||
              recoveryAnswers.some((a) => !a.trim()) ||
              !questions ||
              questions.length < 3
            }
          >
            {loading ? 'Verifying...' : 'Unlock'}
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

  // Show password entry dialog
  return (
    <Dialog open disableEscapeKeyDown>
      <DialogTitle>Enter Password</DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <DialogContentText>
          Your tax data is password protected. Please enter your password to
          continue.
        </DialogContentText>

        {isLockedOut ? (
          <Typography color="error">
            Too many failed attempts. Please try again later.
          </Typography>
        ) : (
          <>
            <TextField
              autoFocus
              margin="dense"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              error={error !== null}
              helperText={error}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      disabled={loading}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            {lockState.failedAttempts > 0 && (
              <Typography variant="caption" color="textSecondary">
                {remainingAttempts} attempts remaining
              </Typography>
            )}

            {securitySettings.passwordRecoveryEnabled && (
              <Box mt={2}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setShowRecovery(true)}
                  className={classes.successLink}
                >
                  Forgot password? Use security questions
                </Link>
              </Box>
            )}

            {biometricAvailable && (
              <Box mt={2} textAlign="center">
                <Button
                  variant="outlined"
                  className={classes.successButton}
                  startIcon={<Fingerprint />}
                  onClick={() => void handleBiometricAuth()}
                  disabled={loading}
                  fullWidth
                >
                  Use Biometric Authentication
                </Button>
              </Box>
            )}

            {/* Show message if biometric is enabled but credential is missing */}
            {securitySettings.biometricEnabled &&
              !securitySettings.biometricCredentialId && (
                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary">
                    Biometric setup required. After logging in, go to Security
                    Settings to re-enable biometric authentication.
                  </Typography>
                </Box>
              )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button
          onClick={() => void handleSubmit()}
          color="primary"
          disabled={isLockedOut || loading || password.length === 0}
        >
          {loading ? 'Verifying...' : 'Unlock'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
