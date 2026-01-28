import { ReactElement } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  useTheme
} from '@material-ui/core'

interface CompletionModalProps {
  open: boolean
  sectionName: string
  onMarkComplete: () => void
  onContinueWithoutMarking: () => void
}

/**
 * Modal that asks the user if they want to mark a section as complete
 * after saving a form.
 */
export const CompletionModal = ({
  open,
  sectionName,
  onMarkComplete,
  onContinueWithoutMarking
}: CompletionModalProps): ReactElement => {
  const theme = useTheme()

  return (
    <Dialog open={open} onClose={onContinueWithoutMarking}>
      <DialogTitle>Mark Section Complete?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Do you want to mark &quot;{sectionName}&quot; as complete?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onContinueWithoutMarking}
          style={{
            color: theme.palette.grey[600]
          }}
        >
          No
        </Button>
        <Button
          onClick={onMarkComplete}
          variant="contained"
          style={{
            backgroundColor: theme.palette.success.main,
            color: '#fff'
          }}
        >
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default CompletionModal
