import { Check, Save as SaveIcon } from '@material-ui/icons'
import {
  Box,
  FormControlLabel,
  Switch,
  Typography,
  makeStyles
} from '@material-ui/core'
import { ReactElement, useState } from 'react'
import { useDispatch as useReduxDispatch, useSelector } from 'react-redux'
import { fsRecover } from 'ustaxes/redux/fs/Actions'
import { LoadRaw } from 'ustaxes/redux/fs/Load'
import { toggleAutoSave } from 'ustaxes/redux/actions'
import { YearsTaxesState } from 'ustaxes/redux'
import SaveToFile from './SaveToFile'
import ClearLocalStorage from './ClearLocalStorage'

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

const UserSettings = (): ReactElement => {
  const classes = useStyles()
  const dispatch = useReduxDispatch()
  const [done, setDone] = useState(false)

  const activeYear = useSelector((state: YearsTaxesState) => state.activeYear)
  const autoSaveEnabled = useSelector(
    (state: YearsTaxesState) => state.appSettings.autoSaveEnabled ?? false
  )

  const handleAutoSaveToggle = (): void => {
    dispatch(toggleAutoSave(!autoSaveEnabled)(activeYear))
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
      <SaveToFile variant="contained" color="primary">
        Save data to file
      </SaveToFile>
      <h3>Load data</h3>
      <p>
        Load your saved data from a file. Warning, this will overwrite present
        state.
      </p>
      <LoadRaw
        startIcon={done ? <Check /> : undefined}
        accept="*.json"
        handleData={(state) => {
          if (!done) {
            dispatch(fsRecover(state))
            setDone(true)
          }
        }}
        variant="contained"
        color="primary"
      >
        Load
      </LoadRaw>
      <h3>Delete data</h3>
      <ClearLocalStorage variant="contained" color="primary">
        Clear Local Storage
      </ClearLocalStorage>
    </>
  )
}

export default UserSettings
