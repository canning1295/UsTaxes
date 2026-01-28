import { Dispatch, Fragment, ReactElement, SetStateAction } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { isMobileOnly as isMobile } from 'react-device-detect'
import {
  createStyles,
  makeStyles,
  useTheme,
  Divider,
  SwipeableDrawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListSubheader,
  Theme
} from '@material-ui/core'
import GitHubIcon from '@material-ui/icons/GitHub'
import TwitterIcon from '@material-ui/icons/Twitter'
import { HelpOutlineRounded, Settings, Security } from '@material-ui/icons'
import Urls from 'ustaxes/data/urls'
import { OverallProgressBar, SectionStatusIcon } from './ProgressIndicator'
import { urlToSectionId } from 'ustaxes/hooks'

const drawerWidth = 280

const useStyles = makeStyles<Theme, { isMobile: boolean }>((theme) =>
  createStyles({
    drawer: {
      [theme.breakpoints.up('sm')]: {
        width: drawerWidth,
        flexShrink: 0
      }
    },
    drawerBackdrop: ({ isMobile }) => ({
      top: isMobile ? '56px !important' : undefined,
      height: isMobile ? 'calc(100% - 56px)' : undefined
    }),
    drawerContainer: ({ isMobile }) => ({
      top: isMobile ? '56px !important' : 0
    }),
    drawerPaper: ({ isMobile }) => ({
      top: isMobile ? '56px !important' : undefined,
      width: isMobile ? '100%' : drawerWidth,
      height: isMobile ? 'calc(100% - 56px)' : undefined
    }),
    listSocial: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing(1),
      gap: theme.spacing(0.5)
    },
    listItemSocial: {
      width: 'auto',
      padding: 0
    },
    list: {
      marginLeft: theme.spacing(0),
      paddingLeft: theme.spacing(0)
    },
    listItem: {
      marginLeft: theme.spacing(0),
      paddingLeft: theme.spacing(2)
    },
    sectionHeader: {
      marginLeft: theme.spacing(2)
    }
  })
)

export interface Section {
  title: string
  items: SectionItem[]
}

export interface SectionItem {
  title: string
  url: string
  element: ReactElement
}

export const item = (
  title: string,
  url: string,
  element: ReactElement
): SectionItem => ({
  title,
  url,
  element
})

export interface DrawerItemsProps {
  sections: Section[]
  isOpen: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

function ResponsiveDrawer(props: DrawerItemsProps): ReactElement {
  const classes = useStyles({ isMobile })
  const theme = useTheme()

  const { sections, isOpen, setOpen } = props

  const drawer = (
    <>
      {/* {isMobile && <Toolbar />} */}
      <OverallProgressBar />
      {sections.map(({ title, items }) => (
        <Fragment key={`section ${title}`}>
          <List
            subheader={<ListSubheader disableSticky>{title}</ListSubheader>}
            className={classes.list}
          >
            {items.map((item) => {
              const sectionId = urlToSectionId[item.url]
              return (
                <ListItem
                  button
                  classes={{}}
                  key={item.title}
                  component={NavLink}
                  selected={location.pathname === item.url}
                  to={item.url}
                >
                  <ListItemText primary={item.title} />
                  {sectionId && <SectionStatusIcon sectionId={sectionId} />}
                </ListItem>
              )
            })}
          </List>
          <Divider />
        </Fragment>
      ))}
      <List className={classes.listSocial}>
        <ListItem className={classes.listItemSocial}>
          <Link to={Urls.help}>
            <IconButton color="secondary" aria-label="help, support, feedback">
              <HelpOutlineRounded />
            </IconButton>
          </Link>
        </ListItem>
        <ListItem className={classes.listItemSocial}>
          <IconButton
            color="secondary"
            aria-label="github, opens in new tab"
            component="a"
            href={`https://github.com/ustaxes/UsTaxes`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <GitHubIcon />
          </IconButton>
        </ListItem>
        <ListItem className={classes.listItemSocial}>
          <IconButton
            color="secondary"
            aria-label="twitter, opens in new tab"
            component="a"
            href={`https://www.twitter.com/ustaxesorg`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <TwitterIcon />
          </IconButton>
        </ListItem>
        <ListItem className={classes.listItemSocial}>
          <Link to={Urls.settings}>
            <IconButton color="secondary" aria-label="site user settings">
              <Settings />
            </IconButton>
          </Link>
        </ListItem>
        <ListItem className={classes.listItemSocial}>
          <Link to={Urls.security}>
            <IconButton color="secondary" aria-label="security settings">
              <Security />
            </IconButton>
          </Link>
        </ListItem>
      </List>
    </>
  )

  return (
    <nav className={classes.drawer} aria-label="primary">
      <SwipeableDrawer
        variant={!isMobile ? 'persistent' : undefined}
        anchor={theme.direction === 'rtl' ? 'right' : 'left'}
        open={isOpen}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        classes={{
          root: classes.drawerContainer,
          paper: classes.drawerPaper
        }}
        ModalProps={{
          BackdropProps: {
            classes: { root: classes.drawerBackdrop }
          }
          // Disabling for the time being due to scroll position persisting
          // keepMounted: isMobile ? true : false // Better open performance on mobile.
        }}
      >
        {drawer}
      </SwipeableDrawer>
    </nav>
  )
}

export default ResponsiveDrawer
