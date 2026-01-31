import { AnyAction, Reducer } from 'redux'
import { migrateEachYear, migrateAgeAndBlindness } from '../migration'
import { download, stateToString, stringToState } from '.'
import { USTState } from '../store'
import { FSPersist, FSRecover } from './Actions'

type PersistActions = FSPersist | FSRecover

/**
 * Prepare state for export by removing sensitive security data.
 * Password hashes and security question answers should NEVER be exported.
 */
const sanitizeStateForExport = <S extends USTState>(state: S): S => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { security, ...restState } = state

  // Return state without the security key entirely
  // Security settings (password, session timeout, biometrics) are device-specific
  // and should not be transferred between devices or included in backups
  return restState as S
}

/**
 * Extends a reducer to persist and load data
 * to/from an external JSON file.
 * This behaves like a Redux "Middleware", which
 * is basically just a function from reducer to reducer.
 * It will overwrite whatever state exists with whatever
 * state it finds, but needs none of its own state.
 */
export const fsReducer = <S extends USTState, A extends AnyAction>(
  filename: string,
  reducer: Reducer<S, A>
): Reducer<S, A & PersistActions> => {
  return (state: S | undefined, action: A & PersistActions): S => {
    const newState = reducer(state, action)

    switch (action.type) {
      case 'fs/recover': {
        // we know now that the action is a FSRecover,
        // so we can safely cast it to a FSRecover<USTSerializedState>.
        return {
          ...newState,
          ...migrateAgeAndBlindness(
            migrateEachYear(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              stringToState(action.data)
            )
          )
        } as S // migrations return any, must coerce.
      }
      case 'fs/persist': {
        // Remove security data (password hash, security questions) before export
        const sanitizedState = sanitizeStateForExport(newState)
        download(filename, stateToString(sanitizedState))
        return newState
      }
      default: {
        return newState
      }
    }
  }
}
