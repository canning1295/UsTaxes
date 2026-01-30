import { ReactElement, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  TextField,
  Divider
} from '@material-ui/core'
import {
  LockOpen as UnencryptedIcon,
  Lock as EncryptedIcon,
  Warning as WarningIcon
} from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minWidth: 400
  },
  exportOption: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.action.hover
    }
  },
  exportOptionSelected: {
    borderColor: theme.palette.primary.main,
    backgroundColor: theme.palette.action.selected
  },
  optionIcon: {
    fontSize: 40,
    marginRight: theme.spacing(2)
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
    border: '1px solid #ffcc80'
  },
  passwordField: {
    marginTop: theme.spacing(2)
  }
}))

interface ExportOptionsDialogProps {
  open: boolean
  onClose: () => void
  onExportPlain: () => void
  onExportEncrypted: (password: string) => void
  isPasswordProtectionEnabled: boolean
}

export const ExportOptionsDialog = ({
  open,
  onClose,
  onExportPlain,
  onExportEncrypted,
  isPasswordProtectionEnabled
}: ExportOptionsDialogProps): ReactElement => {
  const classes = useStyles()
  const [selectedOption, setSelectedOption] = useState<
    'plain' | 'encrypted' | null
  >(isPasswordProtectionEnabled ? 'encrypted' : 'plain')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acknowledgedPasswordRequired, setAcknowledgedPasswordRequired] =
    useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleExport = (): void => {
    if (selectedOption === 'plain') {
      onExportPlain()
      onClose()
    } else if (selectedOption === 'encrypted') {
      // Validate password
      if (password.length < 8) {
        setPasswordError('Password must be at least 8 characters')
        return
      }
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match')
        return
      }
      if (!acknowledgedPasswordRequired) {
        setPasswordError(
          'Please acknowledge that you must remember your password'
        )
        return
      }
      setPasswordError(null)
      onExportEncrypted(password)
      onClose()
    }
  }

  const handleClose = (): void => {
    setPassword('')
    setConfirmPassword('')
    setAcknowledgedPasswordRequired(false)
    setPasswordError(null)
    onClose()
  }

  const canExport =
    selectedOption === 'plain' ||
    (selectedOption === 'encrypted' &&
      password.length >= 8 &&
      password === confirmPassword &&
      acknowledgedPasswordRequired)

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="export-options-title"
    >
      <DialogTitle id="export-options-title">Export Data</DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <Typography variant="body2" color="textSecondary" paragraph>
          Choose how you want to export your tax data.
        </Typography>

        {/* Plain Export Option */}
        <Box
          className={`${classes.exportOption} ${
            selectedOption === 'plain' ? classes.exportOptionSelected : ''
          }`}
          onClick={() => setSelectedOption('plain')}
        >
          <Box display="flex" alignItems="center">
            <UnencryptedIcon
              className={classes.optionIcon}
              style={{
                color: selectedOption === 'plain' ? '#4caf50' : '#9e9e9e'
              }}
            />
            <Box>
              <Typography variant="h6">Export Unencrypted</Typography>
              <Typography variant="body2" color="textSecondary">
                Your data will be saved as a readable JSON file. Anyone with
                access to the file can view your information.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider style={{ margin: '16px 0' }} />

        {/* Encrypted Export Option */}
        <Box
          className={`${classes.exportOption} ${
            selectedOption === 'encrypted' ? classes.exportOptionSelected : ''
          }`}
          onClick={() => setSelectedOption('encrypted')}
        >
          <Box display="flex" alignItems="center">
            <EncryptedIcon
              className={classes.optionIcon}
              style={{
                color: selectedOption === 'encrypted' ? '#1976d2' : '#9e9e9e'
              }}
            />
            <Box>
              <Typography variant="h6">Export Encrypted</Typography>
              <Typography variant="body2" color="textSecondary">
                Your data will be encrypted with a password. Only you can open
                it with the correct password.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Encrypted Export Settings */}
        {selectedOption === 'encrypted' && (
          <>
            <Box className={classes.warningBox}>
              <Box display="flex" alignItems="flex-start">
                <WarningIcon style={{ color: '#f57c00', marginRight: 8 }} />
                <Box>
                  <Typography variant="body2" style={{ fontWeight: 'bold' }}>
                    Important: Remember your password!
                  </Typography>
                  <Typography variant="body2">
                    Without your password, you will NOT be able to recover your
                    data. UsTaxes cannot reset or recover your password.
                  </Typography>
                </Box>
              </Box>
            </Box>

            <TextField
              className={classes.passwordField}
              label="Password"
              type="password"
              fullWidth
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Must be at least 8 characters"
              error={passwordError !== null && password.length < 8}
            />

            <TextField
              className={classes.passwordField}
              label="Confirm Password"
              type="password"
              fullWidth
              variant="outlined"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={confirmPassword.length > 0 && password !== confirmPassword}
              helperText={
                confirmPassword.length > 0 && password !== confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={acknowledgedPasswordRequired}
                  onChange={(e) =>
                    setAcknowledgedPasswordRequired(e.target.checked)
                  }
                  color="primary"
                />
              }
              label="I understand that I must remember my password to access this file"
              style={{ marginTop: 16 }}
            />

            {passwordError && (
              <Alert severity="error" style={{ marginTop: 16 }}>
                {passwordError}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="default">
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          color="primary"
          variant="contained"
          disabled={!canExport}
        >
          {selectedOption === 'encrypted' ? 'Export Encrypted' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ExportOptionsDialog
