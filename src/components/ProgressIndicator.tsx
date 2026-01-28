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
import { CheckCircle, RadioButtonUnchecked, Remove } from '@material-ui/icons'
import { useProgress, SectionStatus } from 'ustaxes/hooks'

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
    // Not started: dark grey dash
    notStartedIcon: {
      color: theme.palette.grey[500],
      fontSize: '1rem'
    },
    // In progress: lighter green circle
    inProgressIcon: {
      color: theme.palette.success.light,
      fontSize: '1rem'
    },
    // Complete: theme green checkmark (same as Tax Year button)
    completedIcon: {
      color: theme.palette.success.main,
      fontSize: '1rem'
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
          {progress.overallPercentage}%
        </Typography>
      </Box>
      <Tooltip
        title={`${progress.completedCount}/${progress.totalCount} sections complete`}
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
 * Get the appropriate tooltip text based on section status
 */
const getStatusTooltip = (
  status: SectionStatus,
  itemCount?: number
): string => {
  switch (status) {
    case 'complete':
      return itemCount !== undefined
        ? `Complete (${itemCount} item${itemCount !== 1 ? 's' : ''})`
        : 'Complete'
    case 'in-progress':
      return 'In progress - incomplete data'
    case 'not-started':
    default:
      return 'Not started'
  }
}

/**
 * Icon to show completion status of a menu item
 * - Not started: dark grey dash (—)
 * - In progress: lighter green circle (○)
 * - Complete: theme green checkmark (✓)
 */
export const SectionStatusIcon = ({
  sectionId
}: SectionStatusIconProps): ReactElement | null => {
  const classes = useStyles()
  const progress = useProgress()

  const section = progress.sections.find((s) => s.id === sectionId)
  if (!section) return null

  const tooltip = getStatusTooltip(section.status, section.itemCount)

  switch (section.status) {
    case 'complete':
      return (
        <Tooltip title={tooltip}>
          <CheckCircle className={classes.completedIcon} />
        </Tooltip>
      )

    case 'in-progress':
      return (
        <Tooltip title={tooltip}>
          <RadioButtonUnchecked className={classes.inProgressIcon} />
        </Tooltip>
      )

    case 'not-started':
    default:
      return (
        <Tooltip title={tooltip}>
          <Remove className={classes.notStartedIcon} />
        </Tooltip>
      )
  }
}

export default OverallProgressBar
