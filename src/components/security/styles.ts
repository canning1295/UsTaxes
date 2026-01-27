import { createStyles, makeStyles, Theme } from '@material-ui/core'

const useStyles = makeStyles(({ palette, spacing }: Theme) =>
  createStyles({
    root: {
      padding: spacing(3)
    },
    section: {
      marginBottom: spacing(3)
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: spacing(1),
      marginBottom: spacing(2)
    },
    formControl: {
      minWidth: 200,
      marginTop: spacing(2)
    },
    buttonGroup: {
      display: 'flex',
      gap: spacing(2),
      marginTop: spacing(2),
      flexWrap: 'wrap'
    },
    infoText: {
      marginTop: spacing(1)
    },
    dialogContent: {
      minWidth: 300
    },
    passwordStrength: {
      marginTop: spacing(1),
      marginBottom: spacing(1)
    },
    strengthWeak: {
      color: palette.error.main
    },
    strengthMedium: {
      color: palette.warning.main
    },
    strengthStrong: {
      color: palette.success.main
    }
  })
)

export default useStyles
