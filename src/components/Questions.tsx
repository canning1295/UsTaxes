import { ReactElement, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { Grid, List, ListItem } from '@material-ui/core'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'
import { QuestionTagName, Responses } from 'ustaxes/core/data'
import { getRequiredQuestions } from 'ustaxes/core/data/questions'
import { LabeledCheckbox, LabeledInput } from './input'
import { answerQuestion } from 'ustaxes/redux/actions'
import { FormProvider, useForm } from 'react-hook-form'
import { usePagerWithCompletion } from './usePagerWithCompletion'
import _ from 'lodash'
import { intentionallyFloat } from 'ustaxes/core/util'
import { useAutoSave } from 'ustaxes/hooks'

const emptyQuestions: Responses = {
  CRYPTO: false,
  FOREIGN_ACCOUNT_EXISTS: false,
  FINCEN_114: false,
  FINCEN_114_ACCOUNT_COUNTRY: '',
  FOREIGN_TRUST_RELATIONSHIP: false,
  LIVE_APART_FROM_SPOUSE: false
}

const Questions = (): ReactElement => {
  const information = useSelector((state: TaxesState) => state.information)

  const stateAnswers: Responses = {
    ...emptyQuestions,
    ...information.questions
  }

  const methods = useForm<Responses>({ defaultValues: stateAnswers })

  const {
    handleSubmit,
    getValues,
    reset,
    watch,
    formState: { isDirty }
  } = methods

  const currentValues = getValues()

  const { navButtons, onAdvance, completionModal } = usePagerWithCompletion()

  const questions = getRequiredQuestions({
    ...information,
    questions: {
      ...information.questions,
      ...currentValues
    }
  })

  const dispatch = useDispatch()

  // Auto-save handler
  const handleAutoSave = useCallback(
    (formData: Responses) => {
      try {
        // fix to remove unrequired answers:
        const qtags = questions.map((q) => q.tag)
        const unrequired = Object.keys(formData).filter(
          (rtag) =>
            qtags.find((t) => t === (rtag as QuestionTagName)) === undefined
        )

        const newResponses = {
          ...formData,
          ...Object.fromEntries(unrequired.map((k) => [k, undefined]))
        }

        dispatch(answerQuestion(newResponses))
      } catch (e) {
        // Ignore validation errors during auto-save
        console.debug('Auto-save skipped due to validation:', e)
      }
    },
    [dispatch, questions]
  )

  // Enable auto-save
  useAutoSave({ watch, onSave: handleAutoSave })

  const currentAnswers: Responses = { ...emptyQuestions, ...currentValues }

  // This form can be rerendered because the global state was modified by
  // another control.
  useEffect(() => {
    if (!isDirty && !_.isEqual(currentAnswers, stateAnswers)) {
      reset(stateAnswers)
    }
  }, [])

  const onSubmit = (responses: Responses): void => {
    // fix to remove unrequired answers:
    const qtags = questions.map((q) => q.tag)
    const unrequired = Object.keys(responses).filter(
      (rtag) => qtags.find((t) => t === (rtag as QuestionTagName)) === undefined
    )

    const newResponses = {
      ...responses,
      ...Object.fromEntries(unrequired.map((k) => [k, undefined]))
    }

    dispatch(answerQuestion(newResponses))
    onAdvance()
  }

  const page = (
    <form tabIndex={-1} onSubmit={intentionallyFloat(handleSubmit(onSubmit))}>
      <Helmet>
        <title>Informational Questions | Results | UsTaxes.org</title>
      </Helmet>
      <h2>Informational Questions</h2>
      <p>
        Based on your prior responses, responses to these questions are
        required.
      </p>
      <Grid container spacing={2}>
        <List>
          {questions.map((q, i) => (
            <ListItem key={i}>
              {(() => {
                if (q.valueTag === 'boolean') {
                  return <LabeledCheckbox name={q.tag} label={q.text} />
                }
                return <LabeledInput name={q.tag} label={q.text} />
              })()}
            </ListItem>
          ))}
        </List>
      </Grid>
      {navButtons}
    </form>
  )
  return (
    <FormProvider {...methods}>
      {page}
      {completionModal}
    </FormProvider>
  )
}

export default Questions
