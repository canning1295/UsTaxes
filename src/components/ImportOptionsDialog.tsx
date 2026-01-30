import { ReactElement, useState, useMemo } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
  Box,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip
} from '@material-ui/core'
import {
  CloudDownload as ImportIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  CalendarToday as YearIcon
} from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { makeStyles } from '@material-ui/core/styles'
import { TaxYear } from 'ustaxes/core/data'

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minWidth: 400,
    maxWidth: 500
  },
  section: {
    marginBottom: theme.spacing(3)
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
    fontWeight: 600
  },
  sectionIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main
  },
  sectionTitleLeft: {
    display: 'flex',
    alignItems: 'center'
  },
  sectionTitleRight: {
    display: 'flex',
    alignItems: 'center'
  },
  contentBox: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 420
  },
  yearList: {
    maxHeight: 200,
    overflow: 'auto',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1),
    marginLeft: 'auto',
    marginRight: 'auto',
    maxWidth: 420
  },
  yearItem: {
    paddingTop: 4,
    paddingBottom: 4
  },
  conflictChip: {
    marginLeft: theme.spacing(1),
    height: 22,
    fontSize: '0.75rem',
    fontWeight: 500,
    backgroundColor: '#ffcdd2',
    color: '#c62828'
  },
  passwordField: {
    marginTop: theme.spacing(2)
  }
}))

/**
 * Summary of data for a single tax year
 */
export interface YearDataSummary {
  year: TaxYear
  hasData: boolean
  primaryName?: string
  w2Count: number
  income1099Count: number
  hasLocalConflict: boolean // True if local data exists for this year
}

export interface ImportOptionsDialogProps {
  open: boolean
  onClose: () => void
  onImport: (options: ImportOptions) => Promise<void>
  yearSummaries: YearDataSummary[]
  isEncryptedFile: boolean
  filePassword?: string // If encrypted file, the password used to decrypt it
  isImporting?: boolean
  error?: string | null
}

export interface ImportOptions {
  encryptionChoice: 'keep' | 'enable' | 'disable'
  password?: string // Required if encryptionChoice is 'enable'
  yearsToImport: TaxYear[]
}

export const ImportOptionsDialog = ({
  open,
  onClose,
  onImport,
  yearSummaries,
  isEncryptedFile,
  filePassword,
  isImporting = false,
  error
}: ImportOptionsDialogProps): ReactElement => {
  const classes = useStyles()

  // Encryption choice
  const [encryptionChoice, setEncryptionChoice] = useState<
    'keep' | 'enable' | 'disable'
  >('keep')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // Year selection - default all checked
  const [selectedYears, setSelectedYears] = useState<Set<TaxYear>>(
    new Set(yearSummaries.filter((y) => y.hasData).map((y) => y.year))
  )

  // Determine if there are any conflicts (local data that would be overwritten)
  const hasConflicts = useMemo(
    () =>
      yearSummaries.some(
        (y) => y.hasLocalConflict && selectedYears.has(y.year)
      ),
    [yearSummaries, selectedYears]
  )

  const handleYearToggle = (year: TaxYear) => {
    const newSelection = new Set(selectedYears)
    if (newSelection.has(year)) {
      newSelection.delete(year)
    } else {
      newSelection.add(year)
    }
    setSelectedYears(newSelection)
  }

  const handleSelectAll = () => {
    setSelectedYears(
      new Set(yearSummaries.filter((y) => y.hasData).map((y) => y.year))
    )
  }

  const handleSelectNone = () => {
    setSelectedYears(new Set())
  }

  const handleImport = async (): Promise<void> => {
    setPasswordError(null)

    // Validate password if enabling encryption
    if (encryptionChoice === 'enable') {
      if (!newPassword) {
        setPasswordError('Please enter a password')
        return
      }
      if (newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters')
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match')
        return
      }
    }

    const options: ImportOptions = {
      encryptionChoice,
      yearsToImport: Array.from(selectedYears),
      password:
        encryptionChoice === 'enable'
          ? newPassword
          : encryptionChoice === 'keep' && isEncryptedFile
          ? filePassword
          : undefined
    }

    await onImport(options)
  }

  const handleClose = (): void => {
    if (!isImporting) {
      setEncryptionChoice('keep')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError(null)
      onClose()
    }
  }

  const yearsWithData = yearSummaries.filter((y) => y.hasData)

  return (
    <Dialog
      open={open}
      onClose={isImporting ? undefined : handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="import-options-title"
    >
      <DialogTitle id="import-options-title">
        <Box display="flex" alignItems="center">
          <ImportIcon style={{ marginRight: 8 }} />
          Import Options
        </Box>
      </DialogTitle>

      <DialogContent className={classes.dialogContent}>
        {/* Encryption Settings Section */}
        <Box className={classes.section}>
          <Typography className={classes.sectionTitle} variant="subtitle1">
            <Box className={classes.sectionTitleLeft}>
              <LockIcon className={classes.sectionIcon} fontSize="small" />
              Password Protection
            </Box>
          </Typography>

          {/* Bordered box for encryption options - matches the year list style */}
          <Box className={classes.contentBox}>
            <FormControl component="fieldset" fullWidth>
              <RadioGroup
                value={encryptionChoice}
                onChange={(e) =>
                  setEncryptionChoice(
                    e.target.value as 'keep' | 'enable' | 'disable'
                  )
                }
              >
                <FormControlLabel
                  value="keep"
                  control={<Radio color="primary" size="small" />}
                  label="Keep current settings"
                  disabled={isImporting}
                />
                <FormControlLabel
                  value="enable"
                  control={<Radio color="primary" size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">
                        Enable password protection
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Your data will be encrypted with a password
                      </Typography>
                    </Box>
                  }
                  disabled={isImporting}
                />
                <FormControlLabel
                  value="disable"
                  control={<Radio color="primary" size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">
                        Disable password protection
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Data will be stored without encryption
                      </Typography>
                    </Box>
                  }
                  disabled={isImporting}
                />
              </RadioGroup>
            </FormControl>
          </Box>

          {/* Password fields when enabling encryption */}
          {encryptionChoice === 'enable' && (
            <Box mt={2}>
              <TextField
                label="New Password"
                type="password"
                fullWidth
                variant="outlined"
                size="small"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isImporting}
                error={!!passwordError}
              />
              <TextField
                label="Confirm Password"
                type="password"
                fullWidth
                variant="outlined"
                size="small"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isImporting}
                style={{ marginTop: 8 }}
                error={!!passwordError}
                helperText={passwordError}
              />
            </Box>
          )}

          {encryptionChoice === 'disable' && (
            <Alert severity="warning" style={{ marginTop: 8 }}>
              <Typography variant="body2">
                Your tax data will be stored without encryption. Anyone with
                access to your browser can view it.
              </Typography>
            </Alert>
          )}
        </Box>

        <Divider />

        {/* Year Selection Section */}
        <Box className={classes.section} mt={2}>
          <Typography
            className={classes.sectionTitle}
            variant="subtitle1"
            component="div"
          >
            <Box className={classes.sectionTitleLeft}>
              <YearIcon className={classes.sectionIcon} fontSize="small" />
              Select Years to Import
            </Box>
            <Box className={classes.sectionTitleRight}>
              <Button
                size="small"
                onClick={handleSelectAll}
                disabled={isImporting}
              >
                Select All
              </Button>
              <Typography variant="body2" style={{ margin: '0 4px' }}>
                /
              </Typography>
              <Button
                size="small"
                onClick={handleSelectNone}
                disabled={isImporting}
              >
                Select None
              </Button>
            </Box>
          </Typography>

          {yearsWithData.length === 0 ? (
            <Alert severity="info">No tax data found in this file.</Alert>
          ) : (
            <List className={classes.yearList} dense>
              {yearsWithData.map((yearData) => (
                <ListItem
                  key={yearData.year}
                  className={classes.yearItem}
                  button
                  onClick={() => handleYearToggle(yearData.year)}
                  disabled={isImporting}
                >
                  <ListItemIcon style={{ minWidth: 40 }}>
                    <Checkbox
                      edge="start"
                      checked={selectedYears.has(yearData.year)}
                      tabIndex={-1}
                      disableRipple
                      color="primary"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center">
                        <Typography variant="body2">
                          {yearData.year}
                          {yearData.primaryName && ` - ${yearData.primaryName}`}
                        </Typography>
                        {yearData.hasLocalConflict && (
                          <Chip
                            label={`${yearData.year} has existing data`}
                            size="small"
                            className={classes.conflictChip}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="textSecondary">
                        {yearData.w2Count > 0 &&
                          `${yearData.w2Count} W-2${
                            yearData.w2Count > 1 ? 's' : ''
                          }`}
                        {yearData.w2Count > 0 &&
                          yearData.income1099Count > 0 &&
                          ', '}
                        {yearData.income1099Count > 0 &&
                          `${yearData.income1099Count} 1099${
                            yearData.income1099Count > 1 ? 's' : ''
                          }`}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}

          {hasConflicts && (
            <Alert
              severity="warning"
              icon={<WarningIcon />}
              style={{ marginTop: 8 }}
            >
              <Typography variant="body2">
                Years marked with existing data will be overwritten with the
                imported data.
              </Typography>
            </Alert>
          )}
        </Box>

        {error && (
          <Alert severity="error" style={{ marginTop: 16 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions style={{ padding: 16 }}>
        <Button onClick={handleClose} color="default" disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            void handleImport()
          }}
          color="primary"
          variant="contained"
          disabled={selectedYears.size === 0 || isImporting}
          startIcon={<ImportIcon />}
        >
          {isImporting
            ? 'Importing...'
            : `Import ${selectedYears.size} Year${
                selectedYears.size !== 1 ? 's' : ''
              }`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportOptionsDialog
