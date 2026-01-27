import { ReactElement, useState, useRef } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography
} from '@material-ui/core'
import {
  Lock,
  Security,
  Timer,
  CloudDownload,
  CloudUpload
} from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { useDispatch, useSelector } from 'react-redux'
import {
  enablePasswordProtection,
  disablePasswordProtection,
  setSessionTimeout,
  enableSessionTimeout,
  disableSessionTimeout,
  selectSecuritySettings,
  selectIsPasswordEnabled,
  selectIsSessionTimeoutEnabled
} from 'ustaxes/redux/security'
import { SessionTimeoutMinutes } from 'ustaxes/crypto'
import { PasswordSetup } from './PasswordSetup'
import { PasswordPrompt } from './PasswordPrompt'
import useStyles from './styles'

export const SecuritySettingsPage = (): ReactElement => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const securitySettings = useSelector(selectSecuritySettings)
  const isPasswordEnabled = useSelector(selectIsPasswordEnabled)
  const isSessionTimeoutEnabled = useSelector(selectIsSessionTimeoutEnabled)

  const [showPasswordSetup, setShowPasswordSetup] = useState(false)
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [pendingDisable, setPendingDisable] = useState(false)

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
      setPendingDisable(true)
      setShowPasswordPrompt(true)
    } else {
      setShowPasswordSetup(true)
    }
  }

  const handlePasswordSetupSuccess = (passwordHash: string): void => {
    dispatch(enablePasswordProtection(passwordHash))
    setShowPasswordSetup(false)
  }

  const handlePasswordVerified = (): void => {
    setShowPasswordPrompt(false)
    if (pendingDisable) {
      dispatch(disablePasswordProtection())
      setPendingDisable(false)
    }
  }

  const handlePasswordPromptCancel = (): void => {
    setShowPasswordPrompt(false)
    setPendingDisable(false)
  }

  const handleChangePasswordSuccess = (passwordHash: string): void => {
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

  const handleExport = (): void => {
    // TODO: Implement export with crypto module
    alert('Export functionality will be integrated with the crypto module')
  }

  const handleImport = (): void => {
    fileInputRef.current?.click()
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

      {/* Export/Import Section */}
      <Card className={classes.section}>
        <CardContent>
          <Box className={classes.sectionTitle}>
            <CloudDownload color="primary" />
            <Typography variant="h6">Export & Import</Typography>
          </Box>

          <Typography variant="body2" color="textSecondary" paragraph>
            Export your tax data to a file for backup, or import previously
            exported data.
          </Typography>

          <Box className={classes.buttonGroup}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CloudDownload />}
              onClick={handleExport}
            >
              Export Data
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={handleImport}
            >
              Import Data
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PasswordSetup
        open={showPasswordSetup}
        onSuccess={handlePasswordSetupSuccess}
        onCancel={() => setShowPasswordSetup(false)}
      />

      <PasswordSetup
        open={showPasswordChange}
        onSuccess={handleChangePasswordSuccess}
        onCancel={() => setShowPasswordChange(false)}
        isChange
        currentPasswordHash={securitySettings.passwordHash}
      />

      <PasswordPrompt
        open={showPasswordPrompt}
        onSuccess={handlePasswordVerified}
        onClearData={handlePasswordPromptCancel}
      />
    </div>
  )
}
