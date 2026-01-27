import { ReactElement, useState } from 'react'
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
  Typography
} from '@material-ui/core'
import { Visibility, VisibilityOff } from '@material-ui/icons'
import { useDispatch, useSelector } from 'react-redux'
import {
  unlockApp,
  recordFailedAttempt,
  selectLockState
} from 'ustaxes/redux/security'
import { verifyPasswordHash } from 'ustaxes/crypto'
import { selectSecuritySettings } from 'ustaxes/redux/security'
import useStyles from './styles'

interface PasswordPromptProps {
  open: boolean
  onSuccess: () => void
  onClearData?: () => void
}

export const PasswordPrompt = ({
  open,
  onSuccess,
  onClearData
}: PasswordPromptProps): ReactElement => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const lockState = useSelector(selectLockState)
  const securitySettings = useSelector(selectSecuritySettings)

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isLockedOut =
    lockState.lockoutUntil !== null && lockState.lockoutUntil > Date.now()

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
        dispatch(unlockApp())
        setPassword('')
        onSuccess()
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

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !isLockedOut) {
      void handleSubmit()
    }
  }

  const remainingAttempts = 5 - lockState.failedAttempts

  return (
    <Dialog open={open} disableEscapeKeyDown>
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
          </>
        )}
      </DialogContent>

      <DialogActions>
        {onClearData && (
          <Button onClick={onClearData} color="secondary">
            Clear Data
          </Button>
        )}
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
