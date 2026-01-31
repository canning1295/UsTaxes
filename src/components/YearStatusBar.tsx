import { Button, makeStyles, Typography } from '@material-ui/core'
import { CalendarToday } from '@material-ui/icons'
import { ReactElement, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { YearsTaxesState } from 'ustaxes/redux'
import { TaxYears } from 'ustaxes/core/data'
import YearDropDown from './YearDropDown'

const useStyles = makeStyles((theme) => ({
  container: {
    marginBottom: theme.spacing(2)
  },
  yearButton: {
    borderColor: theme.palette.success.main,
    color: theme.palette.success.main,
    fontWeight: 'bold',
    fontSize: '1rem',
    textTransform: 'none',
    '&:hover': {
      borderColor: theme.palette.success.dark,
      backgroundColor: theme.palette.success.light + '20'
    }
  },
  heading: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1)
  }
}))

const YearStatusBar = (): ReactElement => {
  const classes = useStyles()
  const year = useSelector((state: YearsTaxesState) => state.activeYear)
  const [isOpen, setOpen] = useState(false)
  const isMounted = useRef(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const handleDone = () => {
    if (isMounted.current) {
      setOpen(false)
    }
  }

  const yearButton = (
    <Button
      variant="outlined"
      className={classes.yearButton}
      startIcon={<CalendarToday />}
      data-testid="year-dropdown-button"
      onClick={() => setOpen(true)}
      aria-label={`Change tax year. Currently editing ${TaxYears[year]}`}
    >
      Tax Year {TaxYears[year]}
    </Button>
  )

  return (
    <div className={classes.container}>
      <div className={classes.heading}>
        <Typography variant="h6" component="span">
          Editing Information for:
        </Typography>
        {!isOpen && yearButton}
      </div>
      {isOpen && (
        <>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Select a different tax year to work on:
          </Typography>
          <YearDropDown onDone={handleDone} />
        </>
      )}
    </div>
  )
}

export default YearStatusBar
