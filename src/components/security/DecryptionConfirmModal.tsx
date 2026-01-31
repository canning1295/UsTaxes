import { ReactElement, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@material-ui/core'
import {
  Warning as WarningIcon,
  LockOpen as UnlockIcon,
  CloudDownload as DownloadIcon,
  CheckCircle as CheckIcon,
  Lock as LockIcon,
  Description as PlainIcon
} from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { store } from 'ustaxes/redux/store'
import {
  exportPlain,
  exportEncrypted,
  downloadAsFile,
  generateExportFilename,
  getSessionPassword
} from 'ustaxes/crypto'

interface DecryptionConfirmModalProps {
  open: boolean
  onConfirm: () => void // Actually decrypt data
  onCancel: () => void
}

export const DecryptionConfirmModal = ({
  open,
  onConfirm,
  onCancel
}: DecryptionConfirmModalProps): ReactElement => {
  const [plainBackupDownloaded, setPlainBackupDownloaded] = useState(false)
  const [encryptedBackupDownloaded, setEncryptedBackupDownloaded] =
    useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const handleDownloadPlainBackup = (): void => {
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
      setPlainBackupDownloaded(true)
    } catch (error) {
      console.error('Plain backup export failed:', error)
    }
  }

  const handleDownloadEncryptedBackup = async (): Promise<void> => {
    setIsExporting(true)
    try {
      const state = store.getState()
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { security, ...dataToExport } = state

      // Use the current session password for encryption
      const password = getSessionPassword()
      if (!password) {
        console.error('No session password available for encrypted backup')
        return
      }

      const exported = await exportEncrypted(dataToExport, password)
      const filename = generateExportFilename().replace(
        '.json',
        '-encrypted.json'
      )
      downloadAsFile(exported, filename)
      setEncryptedBackupDownloaded(true)
    } catch (error) {
      console.error('Encrypted backup export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleConfirm = (): void => {
    setPlainBackupDownloaded(false)
    setEncryptedBackupDownloaded(false)
    onConfirm()
  }

  const handleCancel = (): void => {
    setPlainBackupDownloaded(false)
    setEncryptedBackupDownloaded(false)
    onCancel()
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      aria-labelledby="decryption-confirm-title"
    >
      <DialogTitle id="decryption-confirm-title">
        <Box display="flex" alignItems="center">
          <UnlockIcon
            style={{ marginRight: 8, color: '#f44336' }}
            fontSize="large"
          />
          <Typography variant="h6">Disable Data Encryption</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" style={{ marginBottom: 16 }}>
          <Typography variant="body2">
            <strong>Warning:</strong> Disabling encryption will remove password
            protection from your tax data. Your data will be stored in plain
            text in your browser.
          </Typography>
        </Alert>

        <Typography variant="body1" paragraph>
          When encryption is disabled:
        </Typography>

        <Box
          style={{
            backgroundColor: '#fff3e0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            border: '1px solid #ffcc80'
          }}
        >
          <Typography variant="body2" component="ul" style={{ margin: 0 }}>
            <li>
              Your tax data will be stored <strong>without encryption</strong>
            </li>
            <li>Anyone with access to your browser can view your data</li>
            <li>
              Your SSN, income, and personal information will be visible in
              browser storage
            </li>
            <li>You will no longer need a password to access UsTaxes</li>
          </Typography>
        </Box>

        <Alert
          severity="info"
          icon={<WarningIcon />}
          style={{ marginBottom: 16 }}
        >
          <Typography variant="body2">
            <strong>Recommended:</strong> Download a backup of your data before
            disabling encryption.
          </Typography>
        </Alert>

        <Box
          display="flex"
          flexDirection="column"
          alignItems="stretch"
          marginBottom={2}
          style={{ gap: 12 }}
        >
          {/* Unencrypted backup option */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              backgroundColor: plainBackupDownloaded ? '#e8f5e9' : '#fafafa'
            }}
          >
            <Box display="flex" alignItems="center">
              <PlainIcon style={{ marginRight: 8, color: '#757575' }} />
              <Box>
                <Typography variant="body2" style={{ fontWeight: 500 }}>
                  Unencrypted Backup
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Plain JSON file - anyone can read it
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={
                plainBackupDownloaded ? (
                  <CheckIcon style={{ color: 'green' }} />
                ) : (
                  <DownloadIcon />
                )
              }
              onClick={handleDownloadPlainBackup}
              style={
                plainBackupDownloaded
                  ? { borderColor: 'green', color: 'green' }
                  : undefined
              }
            >
              {plainBackupDownloaded ? 'Downloaded' : 'Download'}
            </Button>
          </Box>

          {/* Encrypted backup option */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e0e0e0',
              backgroundColor: encryptedBackupDownloaded ? '#e8f5e9' : '#fafafa'
            }}
          >
            <Box display="flex" alignItems="center">
              <LockIcon style={{ marginRight: 8, color: '#1976d2' }} />
              <Box>
                <Typography variant="body2" style={{ fontWeight: 500 }}>
                  Encrypted Backup
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Protected with your current password
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              size="small"
              color="primary"
              startIcon={
                encryptedBackupDownloaded ? (
                  <CheckIcon style={{ color: 'green' }} />
                ) : (
                  <LockIcon />
                )
              }
              onClick={() => {
                void handleDownloadEncryptedBackup()
              }}
              disabled={isExporting}
              style={
                encryptedBackupDownloaded
                  ? { borderColor: 'green', color: 'green' }
                  : undefined
              }
            >
              {isExporting
                ? 'Exporting...'
                : encryptedBackupDownloaded
                ? 'Downloaded'
                : 'Download'}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions style={{ padding: 16 }}>
        <Button onClick={handleCancel} color="default">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          style={{ backgroundColor: '#f44336', color: 'white' }}
          startIcon={<UnlockIcon />}
        >
          Disable Encryption
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DecryptionConfirmModal
