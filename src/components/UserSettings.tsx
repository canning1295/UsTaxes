import { Check, GetApp as ExportIcon } from '@material-ui/icons'
import { Button } from '@material-ui/core'
import Alert from '@material-ui/lab/Alert'
import { ReactElement, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fsRecover } from 'ustaxes/redux/fs/Actions'
import { LoadRaw } from 'ustaxes/redux/fs/Load'
import { toggleAutoSave } from 'ustaxes/redux/actions'
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
import { TaxYears } from 'ustaxes/core/data'
import { enumKeys } from 'ustaxes/core/util'

type YearsTaxesStateWithSettings = YearsTaxesState & {
  appSettings?: {
    autoSaveEnabled?: boolean
  }
}

const UserSettings = (): ReactElement => {
  const dispatch = useDispatch()
  const [done, setDone] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (state: YearsTaxesStateWithSettings) =>
      state.appSettings?.autoSaveEnabled ?? false
  )
  const isPasswordEnabled = useSelector(
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    (state: YearsTaxesStateWithSettings) =>
      state.security.settings.passwordEnabled ?? false
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

      // CRITICAL: fsReducer wraps persistReducer, so state changes from fs/recover
      // happen AFTER persistReducer has already processed the action.
      // We need to dispatch a follow-up action to trigger redux-persist to see the changes.
      // Toggle autoSave twice (or dispatch any action) to force a state update that
      // persistReducer will see.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      dispatch(toggleAutoSave(!autoSaveEnabled)(activeYear))
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      dispatch(toggleAutoSave(autoSaveEnabled)(activeYear))

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

  return (
    <>
      <h2>User Settings</h2>
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
        startIcon={done ? <Check /> : undefined}
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
      <ClearLocalStorage variant="contained" color="primary">
        Clear Local Storage
      </ClearLocalStorage>
    </>
  )
}

export default UserSettings
