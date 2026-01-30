import { ReactElement, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box
} from '@material-ui/core'
import { Lock as LockIcon } from '@material-ui/icons'
import Alert from '@material-ui/lab/Alert'
import { makeStyles } from '@material-ui/core/styles'

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minWidth: 350
  },
  iconContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: theme.spacing(2)
  },
  lockIcon: {
    fontSize: 48,
    color: theme.palette.primary.main
  },
  passwordField: {
    marginTop: theme.spacing(2)
  }
}))

interface ImportPasswordDialogProps {
  open: boolean
  onClose: () => void
  onPasswordSubmit: (password: string) => Promise<void>
  error?: string | null
  isDecrypting?: boolean
}

export const ImportPasswordDialog = ({
  open,
  onClose,
  onPasswordSubmit,
  error,
  isDecrypting = false
}: ImportPasswordDialogProps): ReactElement => {
  const classes = useStyles()
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)

  const handleSubmit = async (): Promise<void> => {
    if (!password) {
      setLocalError('Please enter your password')
      return
    }
    setLocalError(null)
    await onPasswordSubmit(password)
  }

  const handleClose = (): void => {
    setPassword('')
    setLocalError(null)
    onClose()
  }

  const handleKeyPress = (event: React.KeyboardEvent): void => {
    if (event.key === 'Enter' && password) {
      void handleSubmit()
    }
  }

  const displayError = error ?? localError

  return (
    <Dialog
      open={open}
      onClose={isDecrypting ? undefined : handleClose}
      maxWidth="sm"
      aria-labelledby="import-password-title"
    >
      <DialogTitle id="import-password-title">Encrypted File</DialogTitle>

      <DialogContent className={classes.dialogContent}>
        <Box className={classes.iconContainer}>
          <LockIcon className={classes.lockIcon} />
        </Box>

        <Typography variant="body1" align="center" paragraph>
          This file is encrypted. Please enter the password to decrypt it.
        </Typography>

        <TextField
          className={classes.passwordField}
          label="Password"
          type="password"
          fullWidth
          variant="outlined"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isDecrypting}
          autoFocus
        />

        {displayError && (
          <Alert severity="error" style={{ marginTop: 16 }}>
            {displayError}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="default" disabled={isDecrypting}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            void handleSubmit()
          }}
          color="primary"
          variant="contained"
          disabled={!password || isDecrypting}
        >
          {isDecrypting ? 'Decrypting...' : 'Decrypt & Import'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ImportPasswordDialog
