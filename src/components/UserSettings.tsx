import {
  Check,
  GetApp as ExportIcon,
  Save as SaveIcon,
  CloudDownload as ImportIcon,
  Storage as StorageIcon,
  Warning as WarningIcon,
  Delete as DeleteIcon
} from '@material-ui/icons'
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
  makeStyles
} from '@material-ui/core'
import Alert from '@material-ui/lab/Alert'
import { ReactElement, forwardRef, useState } from 'react'
import { TransitionProps } from '@material-ui/core/transitions'
import { useDispatch, useSelector } from 'react-redux'
import { fsRecover } from 'ustaxes/redux/fs/Actions'
import { LoadRaw } from 'ustaxes/redux/fs/Load'
import { setInfo, toggleAutoSave } from 'ustaxes/redux/actions'
import { YearsTaxesState } from 'ustaxes/redux'
import { store, persistor } from 'ustaxes/redux/store'
import {
  enablePasswordProtection,
  disablePasswordProtection
} from 'ustaxes/redux/security'
import ClearLocalStorage from './ClearLocalStorage'
import ExportOptionsDialog from './ExportOptionsDialog'
import ImportPasswordDialog from './ImportPasswordDialog'
import ImportOptionsDialog, {
  ImportOptions,
  YearDataSummary
} from './ImportOptionsDialog'
import {
  getSessionPassword,
  setSessionPassword,
  clearSessionPassword,
  exportPlain,
  exportEncrypted,
  downloadAsFile,
  generateExportFilename,
  importData,
  getYearDataSummaries,
  ExportedData
} from 'ustaxes/crypto'
import { hashPassword } from 'ustaxes/crypto'
import { TaxYear, TaxYears } from 'ustaxes/core/data'
import { enumKeys } from 'ustaxes/core/util'
import { hasYearData, pickPrepopulateFields } from 'ustaxes/data/prepopulate'

type YearsTaxesStateWithSettings = YearsTaxesState

const useStyles = makeStyles((theme) => ({
  autoSaveSection: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`
  },
  sectionIcon: {
    verticalAlign: 'middle',
    marginRight: theme.spacing(1),
    color: theme.palette.success.main
  }
}))

const NoopTransition = forwardRef<
  HTMLDivElement,
  TransitionProps & { children?: ReactElement }
>(function NoopTransition(props, ref) {
  const { in: open, children } = props

  return open ? <div ref={ref}>{children}</div> : null
})

const UserSettings = (): ReactElement => {
  const classes = useStyles()
  const dispatch = useDispatch()
  const [done, setDone] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // Prepopulate forms state
  const [prepopulateDialogOpen, setPrepopulateDialogOpen] = useState(false)
  const [prepopulateSourceLabel, setPrepopulateSourceLabel] =
    useState<string>('')
  const [prepopulateData, setPrepopulateData] =
    useState<Partial<YearsTaxesStateWithSettings> | null>(null)
  const [prepopulateAvailableYears, setPrepopulateAvailableYears] = useState<
    TaxYear[]
  >([])
  const [prepopulateSelectedYear, setPrepopulateSelectedYear] = useState<
    TaxYear | ''
  >('')
  const [prepopulateError, setPrepopulateError] = useState<string | null>(null)
  const [prepopulateLoadError, setPrepopulateLoadError] = useState<
    string | null
  >(null)
  const [prepopulateAcknowledge, setPrepopulateAcknowledge] = useState(false)
  const [isPrepopulating, setIsPrepopulating] = useState(false)

  // Encrypted prepopulate state (for password prompt before options)
  const [prepopulatePasswordDialogOpen, setPrepopulatePasswordDialogOpen] =
    useState(false)
  const [pendingEncryptedPrepopulate, setPendingEncryptedPrepopulate] =
    useState<ExportedData | null>(null)
  const [prepopulatePassword, setPrepopulatePassword] = useState('')
  const [prepopulateDecryptError, setPrepopulateDecryptError] = useState<
    string | null
  >(null)
  const [isPrepopulateDecrypting, setIsPrepopulateDecrypting] = useState(false)

  // Encrypted import state (for password prompt before options)
  const [importPasswordDialogOpen, setImportPasswordDialogOpen] =
    useState(false)
  const [pendingEncryptedImport, setPendingEncryptedImport] =
    useState<ExportedData | null>(null)
  const [importDecryptError, setImportDecryptError] = useState<string | null>(
    null
  )
  const [isDecrypting, setIsDecrypting] = useState(false)

  // Import options dialog state
  const [importOptionsDialogOpen, setImportOptionsDialogOpen] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [yearSummaries, setYearSummaries] = useState<YearDataSummary[]>([])
  const [isEncryptedFile, setIsEncryptedFile] = useState(false)
  const [filePassword, setFilePassword] = useState<string | undefined>(
    undefined
  )
  const [importError, setImportError] = useState<string | null>(null)

  const activeYear = useSelector(
    (state: YearsTaxesStateWithSettings) => state.activeYear
  )
  const autoSaveEnabled = useSelector(
    (state: YearsTaxesStateWithSettings) => state.appSettings.autoSaveEnabled
  )
  const isPasswordEnabled = useSelector(
    (state: YearsTaxesStateWithSettings) =>
      state.security.settings.passwordEnabled
  )
  const activeYearHasData = useSelector((state: YearsTaxesStateWithSettings) =>
    hasYearData(state[state.activeYear])
  )

  // Handle plain export (no encryption)
  const handleExportPlain = (): void => {
    setIsExporting(true)
    try {
      // Get the current Redux state (excluding security settings)
      const state = store.getState()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { security, ...dataToExport } = state

      const exported = exportPlain(dataToExport)
      const filename = generateExportFilename(activeYear)
      downloadAsFile(exported, filename)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle encrypted export
  const handleExportEncrypted = async (password: string): Promise<void> => {
    setIsExporting(true)
    try {
      // Get the current Redux state (excluding security settings)
      const state = store.getState()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { security, ...dataToExport } = state

      const exported = await exportEncrypted(dataToExport, password)
      const filename = generateExportFilename(activeYear).replace(
        '.json',
        '-encrypted.json'
      )
      downloadAsFile(exported, filename)
    } catch (error) {
      console.error('Encrypted export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Handle file load - shows import options dialog
  const handleLoadData = (rawContent: string): void => {
    if (done) return

    setLoadError(null)

    try {
      // Validate it's valid JSON
      const parsed = JSON.parse(rawContent) as unknown

      // Check if this is an encrypted export file (from our new export format)
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'encrypted' in parsed &&
        (parsed as { encrypted: boolean }).encrypted === true
      ) {
        // This is an encrypted export - need password to decrypt first
        setPendingEncryptedImport(parsed as ExportedData)
        setImportPasswordDialogOpen(true)
        return
      }

      // Extract data from export file format or use raw data
      let dataToImport: Record<string, unknown>
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        'data' in parsed &&
        'encrypted' in parsed &&
        (parsed as { encrypted: boolean }).encrypted === false
      ) {
        // This is a plain export file - extract the data portion
        dataToImport = (parsed as { data: Record<string, unknown> }).data
      } else {
        // Raw data format
        dataToImport = parsed as Record<string, unknown>
      }

      // Show import options dialog
      showImportOptionsDialog(dataToImport, false, undefined)
    } catch (error) {
      console.error('Failed to load file:', error)
      setLoadError(
        error instanceof Error ? error.message : 'Failed to load file'
      )
    }
  }

  // Handle password submission for encrypted import
  const handleImportPasswordSubmit = async (
    password: string
  ): Promise<void> => {
    if (!pendingEncryptedImport) return

    setIsDecrypting(true)
    setImportDecryptError(null)

    try {
      const decrypted = await importData(pendingEncryptedImport, password)

      // Close password dialog
      setImportPasswordDialogOpen(false)
      setPendingEncryptedImport(null)

      // Show import options dialog with the decrypted data
      showImportOptionsDialog(
        decrypted as Record<string, unknown>,
        true,
        password
      )
    } catch (error) {
      console.error('Decryption failed:', error)
      setImportDecryptError(
        error instanceof Error
          ? error.message
          : 'Decryption failed - incorrect password?'
      )
    } finally {
      setIsDecrypting(false)
    }
  }

  // Show the import options dialog with year summaries
  const showImportOptionsDialog = (
    data: Record<string, unknown>,
    isEncrypted: boolean,
    password: string | undefined
  ): void => {
    const localState = store.getState()
    const summaries = getYearDataSummaries(
      data as Partial<YearsTaxesState>,
      localState
    )

    setPendingImportData(data)
    setYearSummaries(summaries)
    setIsEncryptedFile(isEncrypted)
    setFilePassword(password)
    setImportError(null)
    setImportOptionsDialogOpen(true)
  }

  // Handle import with user-selected options
  const handleImportWithOptions = async (
    options: ImportOptions
  ): Promise<void> => {
    if (!pendingImportData) return

    setIsImporting(true)
    setImportError(null)

    try {
      const localState = store.getState() as YearsTaxesStateWithSettings
      const importedData =
        pendingImportData as Partial<YearsTaxesStateWithSettings>

      // Build merged state: start with current state, overlay selected years
      const mergedState: Partial<YearsTaxesStateWithSettings> = {
        assets: importedData.assets ?? localState.assets,
        activeYear: importedData.activeYear ?? localState.activeYear,
        appSettings: importedData.appSettings ?? localState.appSettings
      }

      const yearKeys = enumKeys(TaxYears)
      for (const year of yearKeys) {
        mergedState[year] = localState[year]
      }

      // Overlay only the selected years
      for (const year of options.yearsToImport) {
        if (importedData[year]) {
          mergedState[year] = importedData[year]
        }
      }

      // Handle encryption choice BEFORE dispatching the import
      // This ensures the session password is set correctly for persistence
      if (options.encryptionChoice === 'enable' && options.password) {
        // Enable encryption with new password
        await setSessionPassword(options.password, true)
        const passwordHash = await hashPassword(options.password)
        dispatch(enablePasswordProtection(passwordHash))
      } else if (options.encryptionChoice === 'disable') {
        // Disable encryption - clear session password so data is stored unencrypted
        await clearSessionPassword()
        dispatch(disablePasswordProtection())
      } else if (options.encryptionChoice === 'keep') {
        // Keep current settings - but ensure session password is set if encryption is on
        if (isPasswordEnabled) {
          // If we imported an encrypted file, use that password
          if (isEncryptedFile && filePassword) {
            await setSessionPassword(filePassword, true)
          } else {
            // Current session password should already be set (user passed SecurityGate)
            const currentPassword = getSessionPassword()
            if (!currentPassword) {
              // This shouldn't happen in normal flow, but if it does, we have a problem
              console.warn(
                '[UserSettings] Encryption enabled but no session password! Data may not persist correctly.'
              )
              throw new Error(
                'Session password missing. Please try again or disable encryption first.'
              )
            }
          }
        } else {
          // Encryption not enabled, ensure session password is cleared
          await clearSessionPassword()
        }
      }

      // Import the merged data
      // Note: Use JSON.stringify instead of stateToString because the imported data
      // has dates as strings (from JSON parsing), not Date objects. fsRecover's
      // stringToState will handle the date deserialization properly.
      const dataString = JSON.stringify(mergedState)

      // Dispatch the import
      dispatch(fsRecover(dataString))

      // Trigger redux-persist to see the updated state.
      const updatedState = store.getState() as YearsTaxesStateWithSettings
      dispatch(
        setInfo(updatedState[updatedState.activeYear])(updatedState.activeYear)
      )

      // Wait for redux-persist to process the state changes
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Flush to persist
      await persistor.flush()

      // Verify the data was persisted correctly (with retry)
      let persistedData = localStorage.getItem('persist:root')
      if (!persistedData) {
        // One more retry
        await new Promise((resolve) => setTimeout(resolve, 300))
        persistedData = localStorage.getItem('persist:root')
      }

      if (!persistedData) {
        console.error('[UserSettings] Persistence failed - localStorage empty')
        throw new Error('Failed to persist imported data. Please try again.')
      }

      // Close dialog and show success
      setImportOptionsDialogOpen(false)
      setPendingImportData(null)
      setDone(true)
    } catch (error) {
      console.error('Import failed:', error)
      setImportError(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleAutoSaveToggle = (): void => {
    dispatch(toggleAutoSave(!autoSaveEnabled)(activeYear))
  }

  const getPrepopulateYears = (
    data: Partial<YearsTaxesStateWithSettings>
  ): TaxYear[] => {
    const localState = store.getState() as YearsTaxesStateWithSettings
    const yearKeys = enumKeys(TaxYears)
    const yearsWithData = yearKeys.filter((year) => {
      if (year === localState.activeYear) return false
      const info = data[year]
      return info ? hasYearData(info) : false
    })

    return yearsWithData.sort(
      (a, b) => Number(TaxYears[b]) - Number(TaxYears[a])
    )
  }

  const openPrepopulateDialog = (
    data: Partial<YearsTaxesStateWithSettings>,
    sourceLabel: string
  ): void => {
    const yearsWithData = getPrepopulateYears(data)

    if (yearsWithData.length === 0) {
      setPrepopulateLoadError('No prior years with profile data were found.')
      return
    }

    setPrepopulateLoadError(null)
    setPrepopulateError(null)
    setPrepopulateAcknowledge(false)
    setPrepopulateSourceLabel(sourceLabel)
    setPrepopulateAvailableYears(yearsWithData)
    setPrepopulateSelectedYear(yearsWithData[0])
    setPrepopulateData(data)
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
      activeElement.blur()
    }
    setPrepopulateDialogOpen(true)
  }

  const handlePrepopulateFromLocal = (): void => {
    const localState = store.getState() as YearsTaxesStateWithSettings
    openPrepopulateDialog(localState, 'Local Storage')
  }

  const handlePrepopulateFileLoad = (rawContent: string): void => {
    setPrepopulateLoadError(null)

    try {
      const parsed = JSON.parse(rawContent) as unknown

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'encrypted' in parsed &&
        (parsed as { encrypted: boolean }).encrypted === true
      ) {
        setPendingEncryptedPrepopulate(parsed as ExportedData)
        setPrepopulatePassword('')
        setPrepopulateDecryptError(null)
        setPrepopulatePasswordDialogOpen(true)
        return
      }

      let dataToPrepopulate: Record<string, unknown>
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        'data' in parsed &&
        'encrypted' in parsed &&
        (parsed as { encrypted: boolean }).encrypted === false
      ) {
        dataToPrepopulate = (parsed as { data: Record<string, unknown> }).data
      } else {
        dataToPrepopulate = parsed as Record<string, unknown>
      }

      openPrepopulateDialog(
        dataToPrepopulate as Partial<YearsTaxesStateWithSettings>,
        'Export File'
      )
    } catch (error) {
      console.error('Failed to load prepopulate file:', error)
      setPrepopulateLoadError(
        error instanceof Error ? error.message : 'Failed to load file'
      )
    }
  }

  const handlePrepopulatePasswordSubmit = async (): Promise<void> => {
    if (!pendingEncryptedPrepopulate) return

    if (!prepopulatePassword) {
      setPrepopulateDecryptError('Please enter a password')
      return
    }

    setIsPrepopulateDecrypting(true)
    setPrepopulateDecryptError(null)

    try {
      const decrypted = await importData(
        pendingEncryptedPrepopulate,
        prepopulatePassword
      )

      setPrepopulatePasswordDialogOpen(false)
      setPendingEncryptedPrepopulate(null)
      setPrepopulatePassword('')

      openPrepopulateDialog(
        decrypted as Partial<YearsTaxesStateWithSettings>,
        'Export File'
      )
    } catch (error) {
      console.error('Prepopulate decryption failed:', error)
      setPrepopulateDecryptError(
        error instanceof Error
          ? error.message
          : 'Decryption failed - incorrect password?'
      )
    } finally {
      setIsPrepopulateDecrypting(false)
    }
  }

  const handleApplyPrepopulate = async (): Promise<void> => {
    if (!prepopulateData || !prepopulateSelectedYear) return

    setIsPrepopulating(true)
    setPrepopulateError(null)

    try {
      const localState = store.getState() as YearsTaxesStateWithSettings
      const sourceInfo = prepopulateData[prepopulateSelectedYear]

      if (!sourceInfo || !hasYearData(sourceInfo)) {
        throw new Error('Selected year has no data to prepopulate.')
      }

      const prepopulatedInfo = pickPrepopulateFields(sourceInfo)

      const mergedState: Partial<YearsTaxesStateWithSettings> = {
        assets: localState.assets,
        activeYear: localState.activeYear,
        appSettings: localState.appSettings
      }

      const yearKeys = enumKeys(TaxYears)
      for (const year of yearKeys) {
        mergedState[year] = localState[year]
      }

      mergedState[localState.activeYear] = prepopulatedInfo

      const dataString = JSON.stringify(mergedState)
      dispatch(fsRecover(dataString))

      const updatedState = store.getState() as YearsTaxesStateWithSettings
      dispatch(
        setInfo(updatedState[updatedState.activeYear])(updatedState.activeYear)
      )

      await new Promise((resolve) => setTimeout(resolve, 100))
      await persistor.flush()

      setPrepopulateDialogOpen(false)
      setPrepopulateData(null)
      setPrepopulateSelectedYear('')
      setDone(true)
    } catch (error) {
      console.error('Prepopulate failed:', error)
      setPrepopulateError(
        error instanceof Error ? error.message : 'Prepopulate failed'
      )
    } finally {
      setIsPrepopulating(false)
    }
  }

  return (
    <>
      <h2>User Settings</h2>

      <Box className={classes.autoSaveSection}>
        <Typography variant="h6" gutterBottom>
          <SaveIcon className={classes.sectionIcon} />
          Auto Save
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          When enabled, your data is automatically saved as you make changes. No
          need to press the Save button on each form.
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={autoSaveEnabled}
              onChange={handleAutoSaveToggle}
              color="primary"
              name="autoSave"
            />
          }
          label={autoSaveEnabled ? 'Enabled' : 'Disabled'}
        />
      </Box>

      <h3>Save data</h3>
      <p>Save your data for backup or to import into desktop application</p>
      <Button
        variant="contained"
        color="primary"
        startIcon={<ExportIcon />}
        onClick={() => setExportDialogOpen(true)}
        disabled={isExporting}
      >
        {isExporting ? 'Exporting...' : 'Export Data'}
      </Button>

      <ExportOptionsDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExportPlain={handleExportPlain}
        onExportEncrypted={(password) => {
          void handleExportEncrypted(password)
        }}
        isPasswordProtectionEnabled={isPasswordEnabled}
      />
      <h3>Load data</h3>
      <p>
        Load your saved data from a file. You can choose which years to import
        and whether to enable password protection.
      </p>
      {loadError && (
        <Alert severity="error" style={{ marginBottom: 16 }}>
          {loadError}
        </Alert>
      )}
      {isImporting && (
        <Alert severity="info" style={{ marginBottom: 16 }}>
          Importing data...
        </Alert>
      )}
      <LoadRaw
        startIcon={done ? <Check /> : <ImportIcon />}
        accept="*.json"
        handleData={(state) => {
          void handleLoadData(state)
        }}
        variant="contained"
        color="primary"
        disabled={isImporting || isDecrypting}
      >
        {isImporting ? 'Importing...' : isDecrypting ? 'Decrypting...' : 'Load'}
      </LoadRaw>

      <Box marginTop={3} marginBottom={2}>
        <Typography variant="h5" component="h4">
          Prepopulate Forms
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Copy profile details from a previous year to save time filling out the
          current year.
        </Typography>
        {prepopulateLoadError && (
          <Alert severity="error" style={{ marginBottom: 16 }}>
            {prepopulateLoadError}
          </Alert>
        )}
        <Box display="flex" flexWrap="wrap" style={{ gap: 12 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<StorageIcon />}
            onClick={handlePrepopulateFromLocal}
            disabled={isPrepopulating || isPrepopulateDecrypting}
          >
            Prepopulate from Local Storage
          </Button>
          <LoadRaw
            startIcon={<ImportIcon />}
            accept="*.json"
            handleData={(state) => {
              void handlePrepopulateFileLoad(state)
            }}
            variant="contained"
            color="primary"
            disabled={isPrepopulating || isPrepopulateDecrypting}
          >
            {isPrepopulateDecrypting
              ? 'Decrypting...'
              : 'Prepopulate from Export File'}
          </LoadRaw>
        </Box>
      </Box>

      <Dialog
        open={prepopulatePasswordDialogOpen}
        TransitionComponent={NoopTransition}
        onClose={() => {
          if (!isPrepopulateDecrypting) {
            setPrepopulatePasswordDialogOpen(false)
            setPendingEncryptedPrepopulate(null)
            setPrepopulatePassword('')
            setPrepopulateDecryptError(null)
          }
        }}
        maxWidth="xs"
        fullWidth
        aria-labelledby="prepopulate-password-title"
      >
        <DialogTitle id="prepopulate-password-title">
          Enter export password
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            This export file is encrypted. Enter the password to decrypt it.
          </Typography>
          <TextField
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={prepopulatePassword}
            onChange={(event) => setPrepopulatePassword(event.target.value)}
          />
          {prepopulateDecryptError && (
            <Alert severity="error" style={{ marginTop: 16 }}>
              {prepopulateDecryptError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!isPrepopulateDecrypting) {
                setPrepopulatePasswordDialogOpen(false)
                setPendingEncryptedPrepopulate(null)
                setPrepopulatePassword('')
                setPrepopulateDecryptError(null)
              }
            }}
            disabled={isPrepopulateDecrypting}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => void handlePrepopulatePasswordSubmit()}
            disabled={isPrepopulateDecrypting || !prepopulatePassword}
          >
            {isPrepopulateDecrypting ? 'Decrypting...' : 'Decrypt'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={prepopulateDialogOpen}
        TransitionComponent={NoopTransition}
        onClose={() => {
          if (!isPrepopulating) {
            setPrepopulateDialogOpen(false)
            setPrepopulateData(null)
            setPrepopulateSelectedYear('')
            setPrepopulateError(null)
            setPrepopulateAcknowledge(false)
          }
        }}
        maxWidth="sm"
        fullWidth
        aria-labelledby="prepopulate-forms-title"
      >
        <DialogTitle id="prepopulate-forms-title">
          <Box display="flex" alignItems="center">
            <WarningIcon style={{ marginRight: 8, color: '#f57c00' }} />
            Prepopulate Forms
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" paragraph>
            Copy profile details from {prepopulateSourceLabel} into the current
            active year.
          </Typography>
          <TextField
            select
            fullWidth
            label="Source year"
            value={prepopulateSelectedYear}
            onChange={(event) =>
              setPrepopulateSelectedYear(event.target.value as TaxYear)
            }
            variant="outlined"
            margin="normal"
          >
            {prepopulateAvailableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {TaxYears[year]}
              </MenuItem>
            ))}
          </TextField>

          <Alert severity="warning" style={{ marginTop: 16 }}>
            This will overwrite the current active year’s data. You can export a
            backup first.
          </Alert>

          <FormControlLabel
            style={{ marginTop: 8 }}
            control={
              <Checkbox
                color="primary"
                checked={prepopulateAcknowledge}
                onChange={(event) =>
                  setPrepopulateAcknowledge(event.target.checked)
                }
                disabled={!activeYearHasData}
              />
            }
            label={
              activeYearHasData
                ? 'I understand this will overwrite the active year’s data.'
                : 'Active year is currently empty.'
            }
          />

          {prepopulateError && (
            <Alert severity="error" style={{ marginTop: 16 }}>
              {prepopulateError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!isPrepopulating) {
                setPrepopulateDialogOpen(false)
                setPrepopulateData(null)
                setPrepopulateSelectedYear('')
                setPrepopulateError(null)
                setPrepopulateAcknowledge(false)
              }
            }}
            disabled={isPrepopulating}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => void handleApplyPrepopulate()}
            disabled={
              !prepopulateSelectedYear ||
              isPrepopulating ||
              (activeYearHasData && !prepopulateAcknowledge)
            }
          >
            {isPrepopulating ? 'Prepopulating...' : 'Prepopulate'}
          </Button>
        </DialogActions>
      </Dialog>

      <ImportPasswordDialog
        open={importPasswordDialogOpen}
        onClose={() => {
          setImportPasswordDialogOpen(false)
          setPendingEncryptedImport(null)
          setImportDecryptError(null)
        }}
        onPasswordSubmit={handleImportPasswordSubmit}
        error={importDecryptError}
        isDecrypting={isDecrypting}
      />

      <ImportOptionsDialog
        open={importOptionsDialogOpen}
        onClose={() => {
          setImportOptionsDialogOpen(false)
          setPendingImportData(null)
          setImportError(null)
        }}
        onImport={handleImportWithOptions}
        yearSummaries={yearSummaries}
        isEncryptedFile={isEncryptedFile}
        filePassword={filePassword}
        isImporting={isImporting}
        error={importError}
      />

      <h3>Delete data</h3>
      <ClearLocalStorage
        variant="contained"
        color="primary"
        startIcon={<DeleteIcon />}
      >
        Clear Local Storage
      </ClearLocalStorage>
    </>
  )
}

export default UserSettings
