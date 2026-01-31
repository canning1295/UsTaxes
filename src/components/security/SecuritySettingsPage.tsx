import { ReactElement, useState, useEffect, useRef } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography
} from '@material-ui/core'
import { Lock, Security, Timer, Fingerprint, Help } from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { useDispatch, useSelector } from 'react-redux'
import {
  enablePasswordProtection,
  setSessionTimeout,
  enableSessionTimeout,
  disableSessionTimeout,
  enableBiometric,
  disableBiometric,
  setBiometricCredential,
  setSecurityQuestions,
  enablePasswordRecovery,
  disablePasswordRecovery,
  SecurityState
} from 'ustaxes/redux/security'
import {
  SessionTimeoutMinutes,
  SecurityQuestion,
  SecuritySettings,
  hasExistingTaxData,
  setSessionPassword,
  clearSessionPassword,
  encryptAllStorage,
  atomicDisableEncryption,
  atomicEnableEncryption
} from 'ustaxes/crypto'
import { YearsTaxesState } from 'ustaxes/redux'
import { PasswordSetup } from './PasswordSetup'
import { PasswordPrompt } from './PasswordPrompt'
import { EncryptionWarningModal } from './EncryptionWarningModal'
import { DecryptionConfirmModal } from './DecryptionConfirmModal'
import useStyles from './styles'

// Typed selectors for use with useSelector
type StateWithSecurity = { security: SecurityState }
const selectSecuritySettings = (state: StateWithSecurity): SecuritySettings =>
  state.security.settings
const selectIsPasswordEnabled = (state: StateWithSecurity): boolean =>
  state.security.settings.passwordEnabled
const selectIsSessionTimeoutEnabled = (state: StateWithSecurity): boolean =>
  state.security.settings.sessionTimeoutEnabled
const selectIsBiometricEnabled = (state: StateWithSecurity): boolean =>
  state.security.settings.biometricEnabled
const selectBiometricCredentialId = (state: StateWithSecurity): string | null =>
  state.security.settings.biometricCredentialId
const selectIsPasswordRecoveryEnabled = (state: StateWithSecurity): boolean =>
  state.security.settings.passwordRecoveryEnabled

// Predefined security questions
const SECURITY_QUESTION_OPTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  "What is your mother's maiden name?",
  'What was the name of your elementary school?',
  'What was the make of your first car?',
  'What is your favorite movie?',
  'What street did you grow up on?',
  'What was your childhood nickname?',
  'What is the name of your favorite childhood friend?',
  'In what city did your parents meet?'
]

export const SecuritySettingsPage = (): ReactElement => {
  const classes = useStyles()
  const dispatch = useDispatch()

  // Get full state to check for existing data
  const fullState = useSelector((state: YearsTaxesState) => state)
  const hasData = hasExistingTaxData(fullState)

  const securitySettings = useSelector(selectSecuritySettings)
  const isPasswordEnabled = useSelector(selectIsPasswordEnabled)
  const isSessionTimeoutEnabled = useSelector(selectIsSessionTimeoutEnabled)
  const isBiometricEnabled = useSelector(selectIsBiometricEnabled)
  const biometricCredentialId = useSelector(selectBiometricCredentialId)
  const isPasswordRecoveryEnabled = useSelector(selectIsPasswordRecoveryEnabled)

  // Track if we've already tried to auto-setup biometrics
  const hasTriedBiometricSetup = useRef(false)

  // Auto-setup biometric credential if enabled but missing
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (
      isBiometricEnabled &&
      !biometricCredentialId &&
      !hasTriedBiometricSetup.current
    ) {
      hasTriedBiometricSetup.current = true
      // Disable and show error - user needs to re-enable
      setBiometricError(
        'Biometric credential missing. Please toggle biometrics off and on again to set up.'
      )
    }
  }, [isBiometricEnabled, biometricCredentialId])

  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [pendingDisable, setPendingDisable] = useState(false)
  const [showSecurityQuestionsDialog, setShowSecurityQuestionsDialog] =
    useState(false)
  const [biometricError, setBiometricError] = useState<string | null>(null)

  // New encryption workflow modals
  const [showEncryptionWarning, setShowEncryptionWarning] = useState(false)
  const [showDecryptionConfirm, setShowDecryptionConfirm] = useState(false)
  const [encryptionError, setEncryptionError] = useState<string | null>(null)

  // Security questions state - get existing questions from settings
  const existingQuestions = securitySettings.securityQuestions
  const [question1, setQuestion1] = useState<string>(
    existingQuestions?.[0]?.question ?? ''
  )
  const [answer1, setAnswer1] = useState('')
  const [question2, setQuestion2] = useState<string>(
    existingQuestions?.[1]?.question ?? ''
  )
  const [answer2, setAnswer2] = useState('')
  const [question3, setQuestion3] = useState<string>(
    existingQuestions?.[2]?.question ?? ''
  )
  const [answer3, setAnswer3] = useState('')

  const timeoutOptions: { value: number | string; label: string }[] = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 'never', label: 'Never' }
  ]

  const handleTogglePasswordProtection = (): void => {
    if (isPasswordEnabled) {
      // Disabling encryption - show decryption confirmation
      setShowDecryptionConfirm(true)
    } else {
      // Enabling encryption - check if user has existing data
      if (hasData) {
        // Show warning modal first
        setShowEncryptionWarning(true)
      } else {
        // No data, go directly to password setup
        setShowPasswordSetup(true)
      }
    }
  }

  // Handler when user confirms they want to proceed with encryption (from warning modal)
  const handleEncryptionWarningConfirm = (): void => {
    setShowEncryptionWarning(false)
    setShowPasswordSetup(true)
  }

  // Handler when user cancels encryption warning
  const handleEncryptionWarningCancel = (): void => {
    setShowEncryptionWarning(false)
  }

  // Handler when user confirms decryption
  const handleDecryptionConfirm = (): void => {
    setShowDecryptionConfirm(false)
    // Now require password verification before disabling
    setPendingDisable(true)
    setShowPasswordPrompt(true)
  }

  // Handler when user cancels decryption
  const handleDecryptionCancel = (): void => {
    setShowDecryptionConfirm(false)
  }

  const handlePasswordSetupSuccess = async (
    passwordHash: string,
    plainPassword: string
  ): Promise<void> => {
    // Clear any previous errors
    setEncryptionError(null)

    // Use atomic enable encryption to avoid race conditions with redux-persist
    try {
      const result = await atomicEnableEncryption(plainPassword, passwordHash)

      if (result.success) {
        setShowPasswordSetup(false)
      } else {
        throw new Error(result.error ?? 'Unknown error during transition')
      }
    } catch (err) {
      console.error('[SecuritySettingsPage] Failed to enable encryption:', err)
      // Clear the session password since encryption failed
      await clearSessionPassword()
      setEncryptionError(
        'Failed to encrypt data. Password protection was not enabled. Please try again.'
      )
      setShowPasswordSetup(false)
    }
  }

  const handlePasswordVerified = async (
    plainPassword: string
  ): Promise<void> => {
    setShowPasswordPrompt(false)
    if (pendingDisable) {
      // Clear any previous errors
      setEncryptionError(null)

      try {
        // Use the atomic transition helper for reliability
        const result = await atomicDisableEncryption(plainPassword)

        if (result.success) {
          // Success - reload to ensure clean state
          setPendingDisable(false)
          window.location.reload()
        } else {
          throw new Error(result.error ?? 'Unknown error during transition')
        }
      } catch (err) {
        console.error('[SecuritySettingsPage] Disable encryption failed:', err)
        setEncryptionError(
          'Failed to disable encryption. Your data is safe. Please try exporting your data first, then clear browser storage and re-import.'
        )
        setPendingDisable(false)
      }
    }
  }

  const handlePasswordPromptCancel = (): void => {
    setShowPasswordPrompt(false)
    setPendingDisable(false)
  }

  const handleChangePasswordSuccess = async (
    passwordHash: string,
    plainPassword: string
  ): Promise<void> => {
    // Update session password
    await setSessionPassword(plainPassword)

    // Re-encrypt data with new password
    try {
      await encryptAllStorage(['persist:root'], plainPassword)
    } catch (err) {
      console.error('[SecuritySettingsPage] Failed to re-encrypt data:', err)
    }

    dispatch(enablePasswordProtection(passwordHash))
    setShowPasswordChange(false)
  }

  const handleToggleSessionTimeout = (): void => {
    if (isSessionTimeoutEnabled) {
      dispatch(disableSessionTimeout())
    } else {
      dispatch(enableSessionTimeout())
    }
  }

  const handleTimeoutChange = (
    event: React.ChangeEvent<{ value: unknown }>
  ): void => {
    const value = event.target.value
    const minutes = value === 'never' ? null : (value as number)
    dispatch(setSessionTimeout(minutes as SessionTimeoutMinutes))
  }

  const handleToggleBiometric = async (): Promise<void> => {
    setBiometricError(null)

    if (isBiometricEnabled) {
      dispatch(disableBiometric())
      return
    }

    // Check if WebAuthn is available
    if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) {
      setBiometricError(
        'Biometric authentication is not supported in this browser.'
      )
      return
    }

    try {
      // Check if platform authenticator is available (fingerprint, face ID, etc.)
      const available =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()

      if (!available) {
        setBiometricError('No biometric authenticator found on this device.')
        return
      }

      // Create a credential for biometric authentication
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
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform', // Force local authenticator (Touch ID/Face ID)
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 60000
        }
      })) as PublicKeyCredential | null

      if (credential) {
        // Store the credential ID for future authentication
        const rawIdArray = Array.from(new Uint8Array(credential.rawId))
        const credentialId = btoa(String.fromCharCode.apply(null, rawIdArray))
        dispatch(setBiometricCredential(credentialId))
        dispatch(enableBiometric())
      } else {
        setBiometricError('Failed to create biometric credential.')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'NotAllowedError') {
        setBiometricError('Biometric setup was cancelled.')
      } else {
        setBiometricError(
          'Failed to enable biometric authentication. Please try again.'
        )
      }
    }
  }

  const handleTogglePasswordRecovery = (): void => {
    if (isPasswordRecoveryEnabled) {
      dispatch(disablePasswordRecovery())
    } else {
      // Show dialog to set up security questions first
      setShowSecurityQuestionsDialog(true)
    }
  }

  const handleSaveSecurityQuestions = (): void => {
    if (
      !question1 ||
      !answer1 ||
      !question2 ||
      !answer2 ||
      !question3 ||
      !answer3
    ) {
      return // All fields required
    }

    // Ensure all questions are different
    if (
      question1 === question2 ||
      question2 === question3 ||
      question1 === question3
    ) {
      return
    }

    const questions: SecurityQuestion[] = [
      { question: question1, answerHash: answer1.toLowerCase().trim() },
      { question: question2, answerHash: answer2.toLowerCase().trim() },
      { question: question3, answerHash: answer3.toLowerCase().trim() }
    ]

    dispatch(setSecurityQuestions(questions))
    dispatch(enablePasswordRecovery())
    setShowSecurityQuestionsDialog(false)

    // Clear the answers from state for security
    setAnswer1('')
    setAnswer2('')
    setAnswer3('')
  }

  const getAvailableQuestions = (
    currentQuestion: string,
    excludeQuestions: string[]
  ): string[] => {
    return SECURITY_QUESTION_OPTIONS.filter(
      (q) => q === currentQuestion || !excludeQuestions.includes(q)
    )
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        <Security style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Security Settings
      </Typography>

      <Alert severity="info" style={{ marginBottom: 24 }}>
        Your tax data is stored locally on this device and is never sent to
        external servers. These settings add additional protection for your
        data.
      </Alert>

      {/* Password Protection Section */}
      <Card className={classes.section}>
        <CardContent>
          <Box className={classes.sectionTitle}>
            <Lock color="primary" />
            <Typography variant="h6">Password Protection</Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" paragraph>
            Encrypt your tax data with a password. You will need to enter this
            password each time you access the app.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={isPasswordEnabled}
                onChange={handleTogglePasswordProtection}
                color="primary"
              />
            }
            label={isPasswordEnabled ? 'Enabled' : 'Disabled'}
          />

          {encryptionError && (
            <Alert severity="error" style={{ marginTop: 8, marginBottom: 8 }}>
              {encryptionError}
            </Alert>
          )}

          {isPasswordEnabled && (
            <Box className={classes.buttonGroup}>
              <Button
                variant="outlined"
                onClick={() => setShowPasswordChange(true)}
              >
                Change Password
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Biometric Authentication Section */}
      <Card className={classes.section}>
        <CardContent>
          <Box className={classes.sectionTitle}>
            <Fingerprint color="primary" />
            <Typography variant="h6">Biometric Authentication</Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" paragraph>
            Use fingerprint, Face ID, or other biometric authentication instead
            of entering your password each time.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={isBiometricEnabled}
                onChange={() => void handleToggleBiometric()}
                color="primary"
                disabled={!isPasswordEnabled}
              />
            }
            label={isBiometricEnabled ? 'Enabled' : 'Disabled'}
          />

          {!isPasswordEnabled && (
            <Typography
              variant="caption"
              color="textSecondary"
              className={classes.infoText}
              display="block"
            >
              Enable password protection first to use biometric authentication.
            </Typography>
          )}

          {biometricError && (
            <Alert severity="warning" style={{ marginTop: 8 }}>
              {biometricError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Session Timeout Section */}
      <Card className={classes.section}>
        <CardContent>
          <Box className={classes.sectionTitle}>
            <Timer color="primary" />
            <Typography variant="h6">Session Timeout</Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" paragraph>
            Automatically lock the app after a period of inactivity.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={isSessionTimeoutEnabled}
                onChange={handleToggleSessionTimeout}
                color="primary"
                disabled={!isPasswordEnabled}
              />
            }
            label={isSessionTimeoutEnabled ? 'Enabled' : 'Disabled'}
          />

          {isSessionTimeoutEnabled && (
            <FormControl variant="outlined" className={classes.formControl}>
              <InputLabel>Lock after</InputLabel>
              <Select
                value={
                  securitySettings.sessionTimeoutMinutes === null
                    ? 'never'
                    : securitySettings.sessionTimeoutMinutes
                }
                onChange={handleTimeoutChange}
                label="Lock after"
              >
                {timeoutOptions.map((option) => (
                  <MenuItem key={String(option.value)} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {!isPasswordEnabled && (
            <Typography
              variant="caption"
              color="textSecondary"
              className={classes.infoText}
              display="block"
            >
              Enable password protection to use session timeout.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Password Recovery Section */}
      <Card className={classes.section}>
        <CardContent>
          <Box className={classes.sectionTitle}>
            <Help color="primary" />
            <Typography variant="h6">Password Recovery</Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" paragraph>
            Set up security questions to recover your account if you forget your
            password. You&apos;ll need to answer all three questions correctly.
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={isPasswordRecoveryEnabled}
                onChange={handleTogglePasswordRecovery}
                color="primary"
                disabled={!isPasswordEnabled}
              />
            }
            label={isPasswordRecoveryEnabled ? 'Enabled' : 'Disabled'}
          />

          {!isPasswordEnabled && (
            <Typography
              variant="caption"
              color="textSecondary"
              className={classes.infoText}
              display="block"
            >
              Enable password protection first to set up password recovery.
            </Typography>
          )}

          {isPasswordRecoveryEnabled && (
            <Box className={classes.buttonGroup}>
              <Button
                variant="outlined"
                onClick={() => setShowSecurityQuestionsDialog(true)}
              >
                Update Security Questions
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Encryption Workflow Dialogs */}
      <EncryptionWarningModal
        open={showEncryptionWarning}
        onConfirm={handleEncryptionWarningConfirm}
        onCancel={handleEncryptionWarningCancel}
      />

      <DecryptionConfirmModal
        open={showDecryptionConfirm}
        onConfirm={handleDecryptionConfirm}
        onCancel={handleDecryptionCancel}
      />

      {/* Password Dialogs */}
      <PasswordSetup
        open={showPasswordSetup}
        onSuccess={(hash, password) =>
          void handlePasswordSetupSuccess(hash, password)
        }
        onCancel={() => setShowPasswordSetup(false)}
      />

      <PasswordSetup
        open={showPasswordChange}
        onSuccess={(hash, password) =>
          void handleChangePasswordSuccess(hash, password)
        }
        onCancel={() => setShowPasswordChange(false)}
        isChange
        currentPasswordHash={securitySettings.passwordHash}
      />

      <PasswordPrompt
        open={showPasswordPrompt}
        onSuccess={(password) => void handlePasswordVerified(password)}
        onClearData={handlePasswordPromptCancel}
      />

      {/* Security Questions Dialog */}
      <Dialog
        open={showSecurityQuestionsDialog}
        onClose={() => setShowSecurityQuestionsDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Set Up Security Questions</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Choose three different security questions and provide answers.
            You&apos;ll need to answer all three correctly to recover your
            password.
          </Typography>

          {/* Question 1 */}
          <FormControl fullWidth variant="outlined" style={{ marginTop: 16 }}>
            <InputLabel>Security Question 1</InputLabel>
            <Select
              value={question1}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                setQuestion1(String(e.target.value))
              }
              label="Security Question 1"
            >
              {getAvailableQuestions(question1, [question2, question3]).map(
                (q: string) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Answer 1"
            value={answer1}
            onChange={(e) => setAnswer1(e.target.value)}
            variant="outlined"
            style={{ marginTop: 8, marginBottom: 16 }}
          />

          {/* Question 2 */}
          <FormControl fullWidth variant="outlined">
            <InputLabel>Security Question 2</InputLabel>
            <Select
              value={question2}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                setQuestion2(String(e.target.value))
              }
              label="Security Question 2"
            >
              {getAvailableQuestions(question2, [question1, question3]).map(
                (q: string) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Answer 2"
            value={answer2}
            onChange={(e) => setAnswer2(e.target.value)}
            variant="outlined"
            style={{ marginTop: 8, marginBottom: 16 }}
          />

          {/* Question 3 */}
          <FormControl fullWidth variant="outlined">
            <InputLabel>Security Question 3</InputLabel>
            <Select
              value={question3}
              onChange={(e: React.ChangeEvent<{ value: unknown }>) =>
                setQuestion3(String(e.target.value))
              }
              label="Security Question 3"
            >
              {getAvailableQuestions(question3, [question1, question2]).map(
                (q: string) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                )
              )}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Answer 3"
            value={answer3}
            onChange={(e) => setAnswer3(e.target.value)}
            variant="outlined"
            style={{ marginTop: 8 }}
          />

          <Alert severity="info" style={{ marginTop: 16 }}>
            Answers are case-insensitive. Make sure to remember your answers
            exactly.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSecurityQuestionsDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSecurityQuestions}
            color="primary"
            variant="contained"
            disabled={
              !question1 ||
              !answer1 ||
              !question2 ||
              !answer2 ||
              !question3 ||
              !answer3 ||
              question1 === question2 ||
              question2 === question3 ||
              question1 === question3
            }
          >
            Save Questions
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
