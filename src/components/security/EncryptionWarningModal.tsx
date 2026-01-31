import { ReactElement, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  FormControlLabel,
  Checkbox,
  Divider
} from '@material-ui/core'
import {
  Warning as WarningIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  VpnKey as KeyIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon
} from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { makeStyles } from '@material-ui/core/styles'
import { useSelector } from 'react-redux'
import { store } from 'ustaxes/redux/store'
import { YearsTaxesState } from 'ustaxes/redux'
import {
  getDataSummary,
  DataSummary,
  exportPlain,
  exportEncrypted,
  downloadAsFile,
  generateExportFilename
} from 'ustaxes/crypto'

const useStyles = makeStyles((theme) => ({
  backupSection: {
    border: '1px solid #000',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2)
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

interface EncryptionWarningModalProps {
  open: boolean
  onConfirm: () => void // Proceed to password setup
  onCancel: () => void
}

export const EncryptionWarningModal = ({
  open,
  onConfirm,
  onCancel
}: EncryptionWarningModalProps): ReactElement => {
  const classes = useStyles()
  const [selectedOption, setSelectedOption] = useState<
    'plain' | 'encrypted' | null
  >(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acknowledgedPasswordRequired, setAcknowledgedPasswordRequired] =
    useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [backupDownloaded, setBackupDownloaded] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Get full state to check what data exists
  const fullState = useSelector((state: YearsTaxesState) => state)
  const dataSummary: DataSummary = getDataSummary(fullState)

  const handleDownload = async (): Promise<void> => {
    if (selectedOption === 'plain') {
      try {
        const state = store.getState()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { security, ...dataToExport } = state

        const exported = exportPlain(dataToExport)
        const filename = generateExportFilename().replace(
          '.json',
          '-unencrypted.json'
        )
        downloadAsFile(exported, filename)
        setBackupDownloaded(true)
      } catch (error) {
        console.error('Plain backup export failed:', error)
      }
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
      setIsExporting(true)
      try {
        const state = store.getState()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { security, ...dataToExport } = state

        const exported = await exportEncrypted(dataToExport, password)
        const filename = generateExportFilename().replace(
          '.json',
          '-encrypted.json'
        )
        downloadAsFile(exported, filename)
        setBackupDownloaded(true)
      } catch (error) {
        console.error('Encrypted backup export failed:', error)
      } finally {
        setIsExporting(false)
      }
    }
  }

  const canDownload =
    selectedOption === 'plain' ||
    (selectedOption === 'encrypted' &&
      password.length >= 8 &&
      password === confirmPassword &&
      acknowledgedPasswordRequired)

  const resetState = (): void => {
    setSelectedOption(null)
    setPassword('')
    setConfirmPassword('')
    setAcknowledgedPasswordRequired(false)
    setPasswordError(null)
    setBackupDownloaded(false)
  }

  const handleProceed = (): void => {
    resetState()
    onConfirm()
  }

  const handleCancel = (): void => {
    resetState()
    onCancel()
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="encryption-warning-title"
    >
      <DialogTitle id="encryption-warning-title">
        <Box display="flex" alignItems="center">
          <SecurityIcon
            style={{ marginRight: 8, color: '#ff9800' }}
            fontSize="large"
          />
          <Typography variant="h6">Enable Data Encryption</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          <Typography variant="body2">
            <strong>Important:</strong> Once encryption is enabled, all your tax
            data will be encrypted with your password. You will need this
            password every time you access UsTaxes.
          </Typography>
        </Alert>

        <Typography variant="body1" paragraph>
          We detected existing tax data that will be encrypted:
        </Typography>

        <Box
          style={{
            backgroundColor: '#f5f5f5',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16
          }}
        >
          <List dense>
            {dataSummary.yearsWithData.length > 0 && (
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`Tax data for: ${dataSummary.yearsWithData.join(
                    ', '
                  )}`}
                />
              </ListItem>
            )}
            {dataSummary.hasPrimaryPerson && (
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary="Personal information (name, SSN, address)" />
              </ListItem>
            )}
            {dataSummary.w2Count > 0 && (
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={`${dataSummary.w2Count} W-2 form(s)`} />
              </ListItem>
            )}
            {dataSummary.f1099Count > 0 && (
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${dataSummary.f1099Count} 1099 form(s)`}
                />
              </ListItem>
            )}
            {dataSummary.assetCount > 0 && (
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${dataSummary.assetCount} investment asset(s)`}
                />
              </ListItem>
            )}
          </List>
        </Box>

        <Alert
          severity="info"
          icon={<WarningIcon />}
          style={{ marginBottom: 16 }}
        >
          <Typography variant="body2">
            <strong>We recommend downloading a backup</strong> of your data
            before enabling encryption. If you forget your password, encrypted
            data cannot be recovered.
          </Typography>
        </Alert>

        {/* Backup Download Section - bordered box matching ExportOptionsDialog */}
        <Box className={classes.backupSection}>
          <Typography variant="body2" color="textSecondary" paragraph>
            Choose how you want to export your backup.
          </Typography>

          {/* Plain Export Option */}
          <Box
            className={`${classes.exportOption} ${
              selectedOption === 'plain' ? classes.exportOptionSelected : ''
            }`}
            onClick={() => setSelectedOption('plain')}
          >
            <Box display="flex" alignItems="center">
              <UnlockIcon
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
              <LockIcon
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
                      Without your password, you will NOT be able to recover
                      your data. UsTaxes cannot reset or recover your password.
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
                error={
                  confirmPassword.length > 0 && password !== confirmPassword
                }
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

          {/* Download Button */}
          <Box display="flex" justifyContent="center" mt={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                void handleDownload()
              }}
              disabled={!canDownload || isExporting || backupDownloaded}
              startIcon={backupDownloaded ? <CheckIcon /> : undefined}
              style={
                backupDownloaded ? { backgroundColor: 'green' } : undefined
              }
            >
              {isExporting
                ? 'Exporting...'
                : backupDownloaded
                ? 'Backup Downloaded!'
                : selectedOption === 'encrypted'
                ? 'Download Encrypted Backup'
                : 'Download Backup'}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions style={{ padding: 16 }}>
        <Button onClick={handleCancel} color="default">
          Cancel
        </Button>
        <Button
          onClick={handleProceed}
          variant="contained"
          color="primary"
          startIcon={<KeyIcon />}
        >
          Proceed to Set Password
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default EncryptionWarningModal
