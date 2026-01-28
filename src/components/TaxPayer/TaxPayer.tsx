import { ReactElement, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { FormProvider, useForm } from 'react-hook-form'
import _ from 'lodash'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'

import {
  savePrimaryPersonInfo,
  saveStateResidencyInfo,
  saveContactInfo
} from 'ustaxes/redux/actions'
import {
  Address,
  ContactInfo,
  PersonRole,
  PrimaryPerson,
  State,
  StateResidency,
  TaxPayer
} from 'ustaxes/core/data'
import { PersonFields } from './PersonFields'
import { usePager } from 'ustaxes/components/pager'
import {
  LabeledCheckbox,
  USStateDropDown,
  LabeledInput
} from 'ustaxes/components/input'
import AddressFields from './Address'
import { Grid } from '@material-ui/core'
import { Patterns } from 'ustaxes/components/Patterns'
import { intentionallyFloat } from 'ustaxes/core/util'
import { useAutoSave } from 'ustaxes/hooks/useAutoSave'

interface TaxPayerUserForm {
  firstName: string
  lastName: string
  ssid: string
  contactPhoneNumber?: string
  contactEmail?: string
  role: PersonRole
  address: Address
  isForeignCountry: boolean
  isTaxpayerDependent: boolean
  stateResidency?: State
  isBlind: boolean
  dateOfBirth?: Date
}

const defaultTaxpayerUserForm: TaxPayerUserForm = {
  firstName: '',
  lastName: '',
  ssid: '',
  contactPhoneNumber: '',
  contactEmail: '',
  role: PersonRole.PRIMARY,
  isForeignCountry: false,
  address: {
    address: '',
    city: '',
    aptNo: '',
    state: undefined,
    zip: undefined
  },
  isTaxpayerDependent: false,
  isBlind: false,
  dateOfBirth: undefined
}

const asPrimaryPerson = (formData: TaxPayerUserForm): PrimaryPerson<string> => {
  // Use current date as placeholder if dateOfBirth is not yet set (for auto-save)
  const dateOfBirth = formData.dateOfBirth ?? new Date()

  // Clean address based on whether it's foreign or domestic
  // This ensures stale fields from the other address type are removed
  const cleanedAddress: Address = formData.isForeignCountry
    ? {
        // Foreign address - clear domestic fields
        address: formData.address.address,
        aptNo: formData.address.aptNo,
        city: formData.address.city,
        state: undefined,
        zip: undefined,
        foreignCountry: formData.address.foreignCountry,
        province: formData.address.province,
        postalCode: formData.address.postalCode
      }
    : {
        // Domestic address - clear foreign fields
        address: formData.address.address,
        aptNo: formData.address.aptNo,
        city: formData.address.city,
        state: formData.address.state,
        zip: formData.address.zip,
        foreignCountry: undefined,
        province: undefined,
        postalCode: undefined
      }

  return {
    address: cleanedAddress,
    firstName: formData.firstName,
    lastName: formData.lastName,
    ssid: formData.ssid.replace(/-/g, ''),
    isTaxpayerDependent: formData.isTaxpayerDependent,
    role: PersonRole.PRIMARY,
    dateOfBirth: dateOfBirth.toISOString(),
    isBlind: formData.isBlind
  }
}

const asContactInfo = (formData: TaxPayerUserForm): ContactInfo => ({
  contactPhoneNumber: formData.contactPhoneNumber,
  contactEmail: formData.contactEmail
})

const asTaxPayerUserForm = (person: PrimaryPerson): TaxPayerUserForm => ({
  ...person,
  isForeignCountry: person.address.foreignCountry !== undefined,
  role: PersonRole.PRIMARY,
  dateOfBirth: new Date(person.dateOfBirth)
})

export default function PrimaryTaxpayer(): ReactElement {
  // const variable dispatch to allow use inside function
  const dispatch = useDispatch()

  const { onAdvance, navButtons } = usePager()

  const taxPayer: TaxPayer | undefined = useSelector((state: TaxesState) => {
    return state.information.taxPayer
  })

  const stateResidency: StateResidency[] = useSelector(
    (state: TaxesState) => state.information.stateResidencies
  )

  const newTpForm: TaxPayerUserForm = {
    ...defaultTaxpayerUserForm,
    ...(taxPayer.primaryPerson !== undefined
      ? {
          ...asTaxPayerUserForm(taxPayer.primaryPerson),
          contactPhoneNumber: taxPayer.contactPhoneNumber,
          contactEmail: taxPayer.contactEmail,
          stateResidency:
            stateResidency[0]?.state ?? taxPayer.primaryPerson.address.state
        }
      : {})
  }

  const methods = useForm<TaxPayerUserForm>({
    defaultValues: newTpForm
  })

  const {
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { isDirty }
  } = methods

  // Auto-save handler - saves form data when auto-save is enabled
  const handleAutoSave = useCallback(
    (form: TaxPayerUserForm) => {
      // Save partial data for auto-save - don't require all fields to be complete
      // This allows the form to be saved even with only some fields filled in
      try {
        // Only save primary person info if we have at least some data
        if (form.firstName || form.lastName || form.ssid || form.dateOfBirth) {
          dispatch(savePrimaryPersonInfo(asPrimaryPerson(form)))
        }
        // Always try to save contact info
        dispatch(saveContactInfo(asContactInfo(form)))
        if (form.stateResidency) {
          dispatch(saveStateResidencyInfo({ state: form.stateResidency }))
        }
      } catch (e) {
        // Silently ignore errors during auto-save for partial data
        console.debug('Auto-save skipped due to incomplete data:', e)
      }
    },
    [dispatch]
  )

  // Enable auto-save for this form
  useAutoSave({
    watch,
    onSave: handleAutoSave
  })

  // This form can be rerendered because the global state was modified by
  // another control.
  const currentValues = { ...defaultTaxpayerUserForm, ...getValues() }

  useEffect(() => {
    if (!isDirty && !_.isEqual(currentValues, newTpForm)) {
      return reset(newTpForm)
    }
  })

  const onSubmit = (form: TaxPayerUserForm): void => {
    dispatch(savePrimaryPersonInfo(asPrimaryPerson(form)))
    dispatch(saveContactInfo(asContactInfo(form)))
    dispatch(saveStateResidencyInfo({ state: form.stateResidency as State }))
    onAdvance()
  }

  const page = (
    <form tabIndex={-1} onSubmit={intentionallyFloat(handleSubmit(onSubmit))}>
      <Helmet>
        <title>Primary Taxpayer Information | Personal | UsTaxes.org</title>
      </Helmet>
      <h2>Primary Taxpayer Information</h2>
      <Grid container spacing={2}>
        <PersonFields />
        <LabeledInput
          label="Contact phone number"
          patternConfig={Patterns.usPhoneNumber}
          name="contactPhoneNumber"
        />
        <LabeledInput
          label="Contact email address"
          required={true}
          name="contactEmail"
        />
        <LabeledCheckbox
          label="Check if you are a dependent"
          name="isTaxpayerDependent"
        />
        <AddressFields checkboxText="Do you have a foreign address?" />
        <USStateDropDown label="Residency State" name="stateResidency" />
      </Grid>
      {navButtons}
    </form>
  )
  return <FormProvider {...methods}>{page}</FormProvider>
}
