import { PropsWithChildren, ReactElement, useState, useCallback } from 'react'
import {
  createStyles,
  makeStyles,
  useMediaQuery,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Box,
  Button,
  Theme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@material-ui/core'
import {
  Delete,
  Edit,
  EditOutlined,
  RestoreOutlined,
  DeleteOutline,
  Warning,
  CheckCircleOutline
} from '@material-ui/icons'
import {
  DefaultValues,
  FieldValues,
  SubmitHandler,
  useFormContext
} from 'react-hook-form'
import _ from 'lodash'
import { ReactNode } from 'react'
import { FormContainerProvider } from './FormContainer/Context'
import { intentionallyFloat } from 'ustaxes/core/util'
import { useAutoSave } from 'ustaxes/hooks/useAutoSave'
import { useSelector } from 'react-redux'
import { YearsTaxesState } from 'ustaxes/redux/data'

interface FormContainerProps {
  onDone: () => void
  onCancel?: () => void
}

export const FormContainer = ({
  onDone,
  onCancel,
  children
}: PropsWithChildren<FormContainerProps>): ReactElement => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  return (
    <div>
      <FormContainerProvider onSubmit={onDone}>
        {children}
      </FormContainerProvider>
      <Box
        display="flex"
        justifyContent="flex-start"
        marginTop={2}
        marginBottom={3}
      >
        <Box marginRight={2}>
          <Button
            type="button"
            onClick={onDone}
            variant="contained"
            color="primary"
          >
            Save
          </Button>
        </Box>
        <Button
          type="button"
          onClick={onCancel}
          color={prefersDarkMode ? 'default' : 'secondary'}
          variant="contained"
        >
          Discard
        </Button>
      </Box>
    </div>
  )
}

interface MutableListItemProps {
  remove?: () => void
  onEdit?: () => void
  primary: string
  secondary?: string | ReactElement
  editing?: boolean
  icon?: ReactElement
  disableEdit?: boolean
  isValid?: boolean
}

export const MutableListItem = ({
  icon,
  primary,
  secondary,
  remove,
  onEdit,
  editing = false,
  disableEdit = false,
  isValid
}: MutableListItemProps): ReactElement => {
  const canEdit = !editing && !disableEdit && onEdit !== undefined
  const canDelete = remove !== undefined && !editing
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')

  const editAction = (() => {
    if (canEdit) {
      return (
        <ListItemIcon>
          <IconButton onClick={onEdit} edge="end" aria-label="edit">
            <Edit />
          </IconButton>
        </ListItemIcon>
      )
    }
  })()

  const deleteAction = (() => {
    if (canDelete) {
      return (
        <ListItemSecondaryAction>
          <IconButton onClick={remove} edge="end" aria-label="delete">
            <Delete />
          </IconButton>
        </ListItemSecondaryAction>
      )
    }
  })()

  // Show "editing..." status text when item is being edited
  const status = editing ? <em>editing...</em> : undefined

  // Validation status icon (! for invalid, ✓ for valid)
  const validationIcon = (() => {
    if (isValid === undefined) return null
    if (isValid) {
      return (
        <ListItemIcon style={{ minWidth: 32 }}>
          <CheckCircleOutline style={{ color: '#4caf50', fontSize: 18 }} />
        </ListItemIcon>
      )
    }
    return (
      <ListItemIcon style={{ minWidth: 32 }}>
        <Warning style={{ color: '#f44336', fontSize: 18 }} />
      </ListItemIcon>
    )
  })()

  // Wrap in a Box for highlighting when editing (top/bottom border only)
  const content = (
    <ListItem>
      {validationIcon}
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText
        primary={<strong>{primary}</strong>}
        secondary={secondary}
      />
      {editAction}
      {deleteAction}
      {status}
    </ListItem>
  )

  if (editing) {
    return (
      <Box
        style={{
          borderTop: '2px solid #4caf50',
          borderBottom: '2px solid #4caf50',
          backgroundColor: prefersDarkMode
            ? 'rgba(76, 175, 80, 0.15)'
            : 'rgba(76, 175, 80, 0.1)',
          margin: '4px 0'
        }}
      >
        {content}
      </Box>
    )
  }

  return content
}

interface FormListContainerProps<A extends FieldValues> {
  onSubmitAdd: SubmitHandler<A>
  onSubmitEdit: (index: number) => SubmitHandler<A>
  onCancel?: () => void

  // same default values passed to useForm
  defaultValues: DefaultValues<A>
  items: A[]
  disableEditing?: boolean
  removeItem?: (v: number) => void
  primary: (a: A) => string
  secondary?: (a: A) => string | ReactElement
  max?: number
  icon?: (a: A) => ReactElement
  grouping?: (a: A) => number
  groupHeaders?: (ReactNode | undefined)[]
  isItemValid?: (a: A) => boolean
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    buttonList: {
      margin: `${theme.spacing(2)}px 0 ${theme.spacing(3)}px`
    },
    dialogButton: {
      marginBottom: theme.spacing(1),
      textTransform: 'none'
    },
    continueEditingButton: {
      borderColor: theme.palette.success.main,
      color: theme.palette.success.main,
      fontWeight: 'bold',
      fontSize: '1rem',
      '&:hover': {
        borderColor: theme.palette.success.dark,
        backgroundColor: theme.palette.success.light + '20'
      }
    },
    discardButton: {
      fontWeight: 'bold',
      fontSize: '1rem'
    },
    deleteButton: {
      fontWeight: 'bold',
      fontSize: '1rem',
      color: theme.palette.error.main,
      borderColor: theme.palette.error.main,
      '&:hover': {
        borderColor: theme.palette.error.dark,
        backgroundColor: theme.palette.error.light + '20'
      }
    }
  })
)

export interface OpenableFormContainerProps<A extends FieldValues> {
  // Return false to prevent closing the form (e.g., when showing a dialog)
  onCancel?: () => boolean | void
  onSave: SubmitHandler<A>
  isOpen?: boolean
  defaultValues: DefaultValues<A>
  onOpenStateChange: (isOpen: boolean) => void
  allowAdd?: boolean
}

export const OpenableFormContainer = <A extends FieldValues>(
  props: PropsWithChildren<OpenableFormContainerProps<A>>
): ReactElement => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const { isOpen = false, allowAdd = true, defaultValues } = props
  const classes = useStyles()

  // Note useFormContext here instead of useForm reuses the
  // existing form context from the parent.
  const { reset, handleSubmit } = useFormContext<A>()

  const closeForm = (): void => {
    props.onOpenStateChange(false)
    reset(defaultValues)
  }

  const onClose = (): void => {
    // onCancel can return false to prevent closing (e.g., when showing a dialog)
    if (props.onCancel !== undefined) {
      const result = props.onCancel()
      if (result === false) {
        return // Don't close the form
      }
    }
    closeForm()
  }

  const onSave: SubmitHandler<A> = (formData): void => {
    props.onSave(formData)
    closeForm()
  }

  const openAddForm = () => {
    props.onOpenStateChange(true)
  }

  return (
    <>
      {(() => {
        if (isOpen) {
          return (
            <FormContainer
              onDone={intentionallyFloat(handleSubmit(onSave))}
              onCancel={onClose}
            >
              {props.children}
            </FormContainer>
          )
        } else if (allowAdd) {
          return (
            <div className={classes.buttonList}>
              <Button
                type="button"
                onClick={openAddForm}
                color={prefersDarkMode ? 'default' : 'secondary'}
                variant="contained"
              >
                Add
              </Button>
            </div>
          )
        }
      })()}
    </>
  )
}

const FormListContainer = <A extends FieldValues>(
  props: PropsWithChildren<FormListContainerProps<A>>
): ReactElement => {
  const classes = useStyles()
  const {
    children,
    items,
    icon,
    max,
    primary,
    defaultValues,
    secondary,
    disableEditing = false,
    removeItem,
    onSubmitAdd,
    onSubmitEdit,
    onCancel = () => {
      // default do nothing
    },
    grouping = () => 0,
    groupHeaders = [],
    isItemValid
  } = props
  const [isOpen, setOpen] = useState(false)
  const [editing, setEditing] = useState<number | undefined>(undefined)
  // Track if we've auto-added an item so we can edit it instead of add
  const [autoAddedIndex, setAutoAddedIndex] = useState<number | undefined>(
    undefined
  )
  // State for the discard confirmation dialog
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  // Store the original item data before editing for comparison
  const [originalItemData, setOriginalItemData] = useState<A | undefined>(
    undefined
  )

  const autoSaveEnabled = useSelector(
    (state: YearsTaxesState) => state.appSettings.autoSaveEnabled
  )

  const allowAdd = max === undefined || items.length < max

  // Use the provided grouping function to split the input
  // array into an array of groups. Each group has a title
  // and a list of items, along with their original index.
  const groups: [ReactNode, [A, number][]][] = _.chain(items)
    .map<[A, number]>((x, n) => [x, n])
    .groupBy(([x]) => grouping(x))
    .toPairs()
    .map<[ReactNode, [A, number][]]>(([k, xs]) => [
      groupHeaders[parseInt(k)],
      xs
    ])
    .value()

  // Note useFormContext here instead of useForm reuses the
  // existing form context from the parent.
  const { reset, watch } = useFormContext<A>()

  const closeForm = (): void => {
    setEditing(undefined)
    setAutoAddedIndex(undefined)
    setOriginalItemData(undefined)
    setOpen(false)
    reset(defaultValues)
  }

  // Check if this is a new item (auto-added with no original data)
  const isNewItem =
    autoAddedIndex !== undefined && originalItemData === undefined

  // Return false to prevent closing the form (when showing dialog)
  const cancel = (): boolean => {
    // If this is a new auto-added item (no previous data), delete it directly
    if (isNewItem && removeItem !== undefined) {
      removeItem(autoAddedIndex)
      closeForm()
      onCancel()
      return true
    } else if (editing !== undefined && originalItemData !== undefined) {
      // Editing an existing item - show the discard dialog
      setShowDiscardDialog(true)
      return false // Don't close the form yet
    } else {
      // No editing, just close
      closeForm()
      onCancel()
      return true
    }
  }

  // Handle dialog actions
  const handleDialogCancel = (): void => {
    // User chose to continue editing
    setShowDiscardDialog(false)
  }

  const handleDialogDiscard = (): void => {
    // User chose to discard changes - restore original data
    if (editing !== undefined && originalItemData !== undefined) {
      onSubmitEdit(editing)(originalItemData)
    }
    setShowDiscardDialog(false)
    closeForm()
    onCancel()
  }

  const handleDialogDelete = (): void => {
    // User chose to delete the item
    if (editing !== undefined && removeItem !== undefined) {
      removeItem(editing)
    }
    setShowDiscardDialog(false)
    closeForm()
    onCancel()
  }

  // Handler for when the form open state changes (e.g., clicking Add button)
  const handleOpenStateChange = useCallback(
    (newIsOpen: boolean) => {
      setOpen(newIsOpen)
      // When opening for a new item (not editing) and auto-save is enabled,
      // immediately add an empty item so it's saved right away
      if (newIsOpen && editing === undefined && autoSaveEnabled) {
        try {
          onSubmitAdd(defaultValues as A)
          setAutoAddedIndex(items.length)
          setEditing(items.length)
        } catch (e) {
          // If validation fails on empty form, silently skip the immediate add
          // The form will still be added when user fills in data
          console.debug('Auto-add skipped due to validation:', e)
        }
      }
    },
    [editing, autoSaveEnabled, onSubmitAdd, defaultValues, items.length]
  )

  const onSave: SubmitHandler<A> = (formData): void => {
    if (editing !== undefined) {
      onSubmitEdit(editing)(formData)
    } else if (autoAddedIndex !== undefined) {
      // Already auto-added, just update it
      onSubmitEdit(autoAddedIndex)(formData)
    } else {
      onSubmitAdd(formData)
    }
    closeForm()
  }

  // Auto-save handler for editing existing items
  const handleAutoSave = useCallback(
    (formData: A) => {
      if (editing !== undefined) {
        // When editing an existing item, auto-save the changes
        onSubmitEdit(editing)(formData)
      } else if (autoAddedIndex !== undefined) {
        // Already auto-added, update it
        onSubmitEdit(autoAddedIndex)(formData)
      } else if (isOpen) {
        // Adding a new item - first add it, then switch to edit mode
        onSubmitAdd(formData)
        // The new item will be at the end of the items array
        setAutoAddedIndex(items.length)
        setEditing(items.length)
      }
    },
    [editing, autoAddedIndex, isOpen, items.length, onSubmitAdd, onSubmitEdit]
  )

  // Use auto-save hook when form is open
  useAutoSave({
    watch,
    onSave: handleAutoSave,
    debounceMs: autoSaveEnabled && isOpen ? 1500 : 0 // Only active when form is open
  })

  const openEditForm = (n: number): (() => void) | undefined => {
    if (!disableEditing && editing === undefined) {
      return () => {
        // Store the original item data before editing
        setOriginalItemData({ ...items[n] })
        setEditing(n)
        setOpen(true)
        reset(items[n])
      }
    }
  }

  const itemDisplay = (() => {
    if (items.length > 0) {
      return (
        <List dense={true}>
          {groups.map(([title, group], i) => (
            <div key={`group-${i}`}>
              {title}
              {group.map(([item, originalIndex], k) => (
                <MutableListItem
                  key={k}
                  primary={primary(item)}
                  secondary={
                    secondary !== undefined ? secondary(item) : undefined
                  }
                  onEdit={openEditForm(originalIndex)}
                  disableEdit={isOpen}
                  editing={editing === originalIndex}
                  remove={
                    removeItem !== undefined
                      ? () => removeItem(originalIndex)
                      : undefined
                  }
                  icon={icon !== undefined ? icon(item) : undefined}
                  isValid={
                    isItemValid !== undefined ? isItemValid(item) : undefined
                  }
                />
              ))}
            </div>
          ))}
        </List>
      )
    }
  })()

  return (
    <>
      {itemDisplay}
      <OpenableFormContainer
        allowAdd={allowAdd}
        defaultValues={defaultValues}
        onSave={onSave}
        isOpen={isOpen}
        onOpenStateChange={handleOpenStateChange}
        onCancel={cancel}
      >
        {children}
      </OpenableFormContainer>

      {/* Discard confirmation dialog for editing existing items */}
      <Dialog open={showDiscardDialog} onClose={handleDialogCancel}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. What would you like to do?
          </DialogContentText>
        </DialogContent>
        <DialogActions
          style={{
            flexDirection: 'column',
            alignItems: 'stretch',
            padding: '16px 24px'
          }}
        >
          <Button
            onClick={handleDialogCancel}
            variant="outlined"
            startIcon={<EditOutlined />}
            className={`${classes.dialogButton} ${classes.continueEditingButton}`}
          >
            Continue Editing
          </Button>
          <Button
            onClick={handleDialogDiscard}
            variant="outlined"
            color="default"
            startIcon={<RestoreOutlined />}
            className={`${classes.dialogButton} ${classes.discardButton}`}
          >
            Discard Changes
          </Button>
          {removeItem !== undefined && (
            <Button
              onClick={handleDialogDelete}
              variant="outlined"
              startIcon={<DeleteOutline />}
              className={`${classes.dialogButton} ${classes.deleteButton}`}
            >
              Delete Item
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  )
}

export default FormContainer
export { FormListContainer }
