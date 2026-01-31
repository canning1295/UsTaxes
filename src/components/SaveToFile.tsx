import { Button, ButtonProps } from '@material-ui/core'
import { PropsWithChildren, ReactElement } from 'react'
import { useDispatch } from 'react-redux'
import { fsPersist } from 'ustaxes/redux/fs/Actions'

/**
 * SaveToFile component - exports data as plain (unencrypted) JSON.
 *
 * Security Note: Exported files are NEVER encrypted. This is intentional:
 * - Encryption protects data at rest in localStorage
 * - Exported files can be backed up, shared, or transferred between devices
 * - Users can encrypt exports themselves using their preferred tools if needed
 */
const SaveToFile = (props: PropsWithChildren<ButtonProps>): ReactElement => {
  const dispatch = useDispatch()

  const { children, ...rest } = props

  const onClick = (): void => {
    dispatch(fsPersist())
  }

  return (
    <Button {...rest} onClick={onClick}>
      {children}
    </Button>
  )
}

export default SaveToFile
