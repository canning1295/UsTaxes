import { ReactElement } from 'react'
import { FormProvider, SubmitHandler, useForm } from 'react-hook-form'
import { usePagerWithCompletion } from 'ustaxes/components/usePagerWithCompletion'
import { EstimatedTaxPayments, TaxYear } from 'ustaxes/core/data'
import { intentionallyFloat } from 'ustaxes/core/util'
import { YearsTaxesState } from 'ustaxes/redux'
import { Currency, LabeledInput } from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { FormListContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import { Work } from '@material-ui/icons'
import {
  addEstimatedPayment,
  editEstimatedPayment,
  removeEstimatedPayment
} from 'ustaxes/redux/actions'
import { useDispatch } from 'ustaxes/redux'
import { useSelector } from 'react-redux'
import { useYearSelector } from 'ustaxes/redux/yearDispatch'

interface EstimatedTaxesUserInput {
  label: string
  payment: string
}

interface PagerWithCompletion {
  navButtons: ReactElement | undefined
  onAdvance: () => void
  completionModal: ReactElement
}

const blankUserInput: EstimatedTaxesUserInput = {
  label: '',
  payment: ''
}

const toPayments = (
  formData: EstimatedTaxesUserInput
): EstimatedTaxPayments => ({
  ...formData,
  // Note we are not error checking here because
  // we are already in the input validated happy path
  // of handleSubmit.
  label: formData.label,
  payment: parseInt(formData.payment)
})

const toEstimatedTaxesUserInput = (
  data: EstimatedTaxPayments
): EstimatedTaxesUserInput => ({
  ...blankUserInput,
  ...data,
  label: data.label,
  payment: data.payment.toString()
})

export default function EstimatedTaxes(): ReactElement {
  const defaultValues = blankUserInput
  const activeYear: TaxYear = useSelector(
    (state: YearsTaxesState) => state.activeYear
  )

  const estimatedTaxes = useYearSelector(
    (state) => state.information.estimatedTaxes
  )

  const dispatch = useDispatch()

  const methods = useForm<EstimatedTaxesUserInput>({ defaultValues })
  const { handleSubmit } = methods

  const usePagerWithCompletionTyped =
    usePagerWithCompletion as () => PagerWithCompletion
  const { navButtons, onAdvance, completionModal } =
    usePagerWithCompletionTyped()

  const onSubmitAdd = (formData: EstimatedTaxesUserInput): void => {
    dispatch(addEstimatedPayment(toPayments(formData)))
  }

  const onSubmitEdit =
    (index: number) =>
    (formData: EstimatedTaxesUserInput): void => {
      dispatch(editEstimatedPayment({ index, value: toPayments(formData) }))
    }

  const handleAdvance: SubmitHandler<EstimatedTaxesUserInput> = () => {
    onAdvance()
  }

  const w2sBlock = (
    <FormListContainer<EstimatedTaxesUserInput>
      defaultValues={defaultValues}
      items={estimatedTaxes.map((a) => toEstimatedTaxesUserInput(a))}
      onSubmitAdd={onSubmitAdd}
      onSubmitEdit={onSubmitEdit}
      removeItem={(i) => dispatch(removeEstimatedPayment(i))}
      icon={() => <Work />}
      primary={(estimatedTaxes: EstimatedTaxesUserInput) =>
        estimatedTaxes.label
      }
      secondary={(estimatedTaxes: EstimatedTaxesUserInput) => (
        <span>
          Payment: <Currency value={toPayments(estimatedTaxes).payment} />
        </span>
      )}
    >
      <Grid container spacing={2}>
        <LabeledInput
          name="label"
          label="label or date of this payment"
          patternConfig={Patterns.plain}
          sizes={{ xs: 12, lg: 6 }}
        />
        <LabeledInput
          name="payment"
          label="Estimated tax payment"
          patternConfig={Patterns.currency}
          sizes={{ xs: 12, lg: 6 }}
        />
      </Grid>
    </FormListContainer>
  )

  const form: ReactElement = <>{w2sBlock}</>

  return (
    <FormProvider {...methods}>
      <form
        tabIndex={-1}
        onSubmit={intentionallyFloat(handleSubmit(handleAdvance))}
      >
        <h2>Estimated Taxes</h2>
        <p>
          Did you already make payments towards your {activeYear} taxes this
          year or last year?
        </p>
        {form}
        {navButtons}
      </form>
      {completionModal}
    </FormProvider>
  )
}
