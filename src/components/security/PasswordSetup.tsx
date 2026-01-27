import { ReactElement, useState, useMemo } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  TextField,
  Typography
} from '@material-ui/core'
import { hashPassword, verifyPasswordHash } from 'ustaxes/crypto'
import useStyles from './styles'

interface PasswordSetupProps {
  open: boolean
  onSuccess: (passwordHash: string) => void
  onCancel: () => void
  isChange?: boolean
  currentPasswordHash?: string | null
}

const getPasswordStrength = (
  password: string
): { score: number; label: string } => {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) return { score, label: 'Weak' }
  if (score <= 3) return { score, label: 'Medium' }
  return { score, label: 'Strong' }
}

export const PasswordSetup = ({
  open,
  onSuccess,
  onCancel,
  isChange = false,
  currentPasswordHash
}: PasswordSetupProps): ReactElement => {
  const classes = useStyles()

  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => getPasswordStrength(password), [password])

  const passwordsMatch = password === confirmPassword
  const isValid =
    password.length >= 8 && passwordsMatch && (!isChange || currentPassword)

  const handleSubmit = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      if (isChange && currentPasswordHash) {
        const isCurrentValid = await verifyPasswordHash(
          currentPassword,
          currentPasswordHash
        )
        if (!isCurrentValid) {
          setError('Current password is incorrect')
          setLoading(false)
          return
        }
      }

      const hash = await hashPassword(password)
      onSuccess(hash)
      setPassword('')
      setConfirmPassword('')
      setCurrentPassword('')
    } catch {
      setError('Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  const getStrengthClass = (): string => {
    if (strength.score <= 2) return classes.strengthWeak
    if (strength.score <= 3) return classes.strengthMedium
    return classes.strengthStrong
  }

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{isChange ? 'Change Password' : 'Set Password'}</DialogTitle>
      <DialogContent className={classes.dialogContent}>
        <DialogContentText>
          {isChange
            ? 'Enter your current password and choose a new one.'
            : 'Choose a password to protect your tax data. You will need this password each time you access the app.'}
        </DialogContentText>

        {isChange && (
          <TextField
            margin="dense"
            label="Current Password"
            type="password"
            fullWidth
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={loading}
          />
        )}

        <TextField
          margin="dense"
          label="New Password"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          helperText="Minimum 8 characters"
        />

        {password.length > 0 && (
          <div className={classes.passwordStrength}>
            <LinearProgress
              variant="determinate"
              value={(strength.score / 5) * 100}
            />
            <Typography variant="caption" className={getStrengthClass()}>
              Password strength: {strength.label}
            </Typography>
          </div>
        )}

        <TextField
          margin="dense"
          label="Confirm Password"
          type="password"
          fullWidth
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={loading}
          error={confirmPassword.length > 0 && !passwordsMatch}
          helperText={
            confirmPassword.length > 0 && !passwordsMatch
              ? 'Passwords do not match'
              : ''
          }
        />

        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleSubmit()}
          color="primary"
          disabled={!isValid || loading}
        >
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
