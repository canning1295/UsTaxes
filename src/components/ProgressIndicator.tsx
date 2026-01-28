import { ReactElement } from 'react'
import {
  makeStyles,
  createStyles,
  Theme,
  LinearProgress,
  Box,
  Typography,
  Tooltip
} from '@material-ui/core'
import { CheckCircle, RadioButtonUnchecked } from '@material-ui/icons'
import { useProgress, SectionProgress } from 'ustaxes/hooks'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    progressBar: {
      height: 8,
      borderRadius: 4,
      marginBottom: theme.spacing(1)
    },
    progressBarColorPrimary: {
      backgroundColor: theme.palette.success.light + '40'
    },
    progressBarBar: {
      backgroundColor: theme.palette.success.main,
      borderRadius: 4
    },
    progressContainer: {
      padding: theme.spacing(1, 2),
      borderBottom: `1px solid ${theme.palette.divider}`
    },
    progressText: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing(0.5)
    },
    percentage: {
      fontWeight: 'bold',
      color: theme.palette.success.main
    },
    sectionIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      marginRight: theme.spacing(1)
    },
    completedIcon: {
      color: theme.palette.success.main,
      fontSize: '1rem'
    },
    incompleteIcon: {
      color: theme.palette.grey[400],
      fontSize: '1rem'
    },
    itemBadge: {
      backgroundColor: theme.palette.success.main,
      color: theme.palette.common.white,
      borderRadius: '50%',
      minWidth: 18,
      height: 18,
      fontSize: '0.7rem',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: theme.spacing(0.5)
    }
  })
)

/**
 * Overall progress bar shown at the top of the drawer
 */
export const OverallProgressBar = (): ReactElement => {
  const classes = useStyles()
  const progress = useProgress()

  return (
    <Box className={classes.progressContainer}>
      <Box className={classes.progressText}>
        <Typography variant="body2" color="textSecondary">
          Tax Form Progress
        </Typography>
        <Typography variant="body2" className={classes.percentage}>
          {Math.round(progress.overallPercentage)}%
        </Typography>
      </Box>
      <Tooltip
        title={`${progress.completedRequired}/${progress.totalRequired} required sections complete, ${progress.completedOptional} optional sections filled`}
      >
        <LinearProgress
          variant="determinate"
          value={progress.overallPercentage}
          className={classes.progressBar}
          classes={{
            colorPrimary: classes.progressBarColorPrimary,
            bar: classes.progressBarBar
          }}
        />
      </Tooltip>
    </Box>
  )
}

interface SectionStatusIconProps {
  sectionId: string
}

/**
 * Small icon to show completion status of a menu item
 */
export const SectionStatusIcon = ({
  sectionId
}: SectionStatusIconProps): ReactElement | null => {
  const classes = useStyles()
  const progress = useProgress()

  const section = progress.sections.find((s) => s.id === sectionId)
  if (!section) return null

  if (section.completed) {
    return (
      <Tooltip title={`${section.itemCount ?? 1} item(s) added`}>
        <span className={classes.sectionIndicator}>
          <CheckCircle className={classes.completedIcon} />
          {section.itemCount !== undefined && section.itemCount > 0 && (
            <span className={classes.itemBadge}>{section.itemCount}</span>
          )}
        </span>
      </Tooltip>
    )
  }

  if (section.required) {
    return (
      <Tooltip title="Required - not yet completed">
        <RadioButtonUnchecked className={classes.incompleteIcon} />
      </Tooltip>
    )
  }

  return null
}

interface ItemCountBadgeProps {
  section: SectionProgress
}

/**
 * Badge showing the number of items in a section
 */
export const ItemCountBadge = ({
  section
}: ItemCountBadgeProps): ReactElement | null => {
  const classes = useStyles()

  if (!section.completed || section.itemCount === undefined) {
    return null
  }

  return (
    <Tooltip title={`${section.itemCount} item(s)`}>
      <span className={classes.itemBadge}>{section.itemCount}</span>
    </Tooltip>
  )
}

export default OverallProgressBar
