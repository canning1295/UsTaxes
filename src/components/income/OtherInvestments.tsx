import { ReactElement, useState, useCallback } from 'react'
import { Helmet } from 'react-helmet'
import { useForm, FormProvider } from 'react-hook-form'
import { useDispatch, YearsTaxesState } from 'ustaxes/redux'
import { useSelector } from 'react-redux'
import { addAsset, editAsset } from 'ustaxes/redux/actions'
import { usePager } from 'ustaxes/components/pager'
import { Asset, AssetType, State, TaxYears } from 'ustaxes/core/data'
import {
  GenericLabeledDropdown,
  USStateDropDown,
  LabeledInput
} from 'ustaxes/components/input'
import { Patterns } from 'ustaxes/components/Patterns'
import { OpenableFormContainer } from 'ustaxes/components/FormContainer'
import { Grid } from '@material-ui/core'
import { Alert } from '@material-ui/lab'
import { TransactionImporter } from './assets/TransactionImporter'
import FilteredAssetsTable from './assets/FilteredAssetsTable'
import { DatePicker } from '../input/DatePicker'
import { intentionallyFloat } from 'ustaxes/core/util'
import { useAutoSave } from 'ustaxes/hooks'

const showAssetType = (p: AssetType) => {
  switch (p) {
    case 'Security':
      return 'Security (Stock, bond, option, mutual fund, etc.)'
    case 'Real Estate':
      return 'Real Estate'
  }
}

interface AssetUserInput {
  name: string
  positionType: AssetType
  openDate?: Date
  closeDate?: Date
  openPrice: string
  closePrice?: string
  openFee: string
  closeFee: string
  quantity: string
  state?: State
}

const blankAssetUserInput: AssetUserInput = {
  name: '',
  positionType: 'Security',
  openPrice: '',
  openFee: '',
  closeFee: '',
  quantity: ''
}

// Convert Asset back to form input format for editing
const assetToInput = (asset: Asset<Date>): AssetUserInput => ({
  name: asset.name,
  positionType: asset.positionType,
  openDate: asset.openDate,
  closeDate: asset.closeDate,
  openPrice: asset.openPrice.toString(),
  closePrice: asset.closePrice?.toString() ?? '',
  openFee: asset.openFee.toString(),
  closeFee: (asset.closeFee ?? 0).toString(),
  quantity: asset.quantity.toString(),
  state: asset.state
})

const toAsset = (input: AssetUserInput): Asset<Date> => {
  const {
    name,
    openDate,
    closeDate,
    openPrice,
    closePrice,
    quantity,
    state,
    openFee,
    closeFee,
    positionType
  } = input
  // Use default values for auto-save with incomplete data
  // Ensure dates are either valid Date objects or undefined (not empty strings)
  const validOpenDate =
    openDate && openDate instanceof Date ? openDate : new Date()
  const validCloseDate =
    closeDate && closeDate instanceof Date ? closeDate : undefined
  return {
    positionType,
    name: name || '',
    openDate: validOpenDate,
    closeDate: validCloseDate,
    openFee: Number(openFee) || 0,
    closeFee: Number(closeFee) || 0,
    openPrice: Number(openPrice) || 0,
    closePrice: Number(closePrice) || 0,
    quantity: input.positionType === 'Real Estate' ? 1 : Number(quantity) || 0,
    state
  }
}

export const OtherInvestments = (): ReactElement => {
  const year = useSelector((state: YearsTaxesState) => state.activeYear)
  const assets = useSelector((state: YearsTaxesState) => state.assets)
  const autoSaveEnabled = useSelector(
    (state: YearsTaxesState) => state.appSettings.autoSaveEnabled ?? false
  )
  const [isOpen, setOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | undefined>(
    undefined
  )
  // Track if auto-save has created a new asset that we should now edit
  const [autoSavedNewIndex, setAutoSavedNewIndex] = useState<
    number | undefined
  >(undefined)
  const defaultValues = blankAssetUserInput
  const methods = useForm<AssetUserInput>({ defaultValues })
  const { handleSubmit, watch, reset } = methods
  const positionType = watch('positionType')
  const openDate = watch('openDate')
  const closeDate = watch('closeDate')
  const dispatch = useDispatch()

  const { onAdvance, navButtons } = usePager()

  // Get the current editing index (either explicit edit or auto-saved new)
  const currentEditingIndex = editingIndex ?? autoSavedNewIndex

  // Handle editing - populate form with asset data
  const handleEdit = useCallback(
    (index: number) => {
      const asset = assets[index]
      if (asset) {
        reset(assetToInput(asset))
        setEditingIndex(index)
        setAutoSavedNewIndex(undefined)
        setOpen(true)
      }
    },
    [assets, reset]
  )

  const onSubmitAdd = (formData: AssetUserInput): void => {
    const payload = toAsset(formData)
    if (currentEditingIndex !== undefined) {
      // Editing existing asset
      dispatch(editAsset({ index: currentEditingIndex, value: payload }))
      setEditingIndex(undefined)
      setAutoSavedNewIndex(undefined)
    } else {
      // Adding new asset
      dispatch(addAsset(payload))
    }
  }

  // Handle open state change - save instantly on Add click when auto-save is enabled
  const handleOpenStateChange = useCallback(
    (newIsOpen: boolean) => {
      // If closing the form, reset editing state
      if (!newIsOpen) {
        setEditingIndex(undefined)
        setAutoSavedNewIndex(undefined)
        reset(defaultValues)
      }
      // If opening the form (Add clicked) and auto-save is enabled, save immediately
      if (
        newIsOpen &&
        !isOpen &&
        editingIndex === undefined &&
        autoSaveEnabled
      ) {
        try {
          const payload = toAsset(defaultValues)
          dispatch(addAsset(payload))
          // Track that we created a new asset, so subsequent auto-saves edit it
          setAutoSavedNewIndex(assets.length) // This will be the index of the new asset
        } catch (e) {
          console.debug('Auto-add skipped due to validation:', e)
        }
      }
      setOpen(newIsOpen)
    },
    [
      isOpen,
      editingIndex,
      autoSaveEnabled,
      dispatch,
      defaultValues,
      reset,
      assets.length
    ]
  )

  // Auto-save handler - only saves when form is open and has some data
  const handleAutoSave = useCallback(
    (formData: AssetUserInput) => {
      if (!isOpen) return
      // Only save if user has entered some data
      if (formData.name || formData.openPrice || formData.quantity) {
        try {
          const payload = toAsset(formData)
          if (currentEditingIndex !== undefined) {
            // Update existing asset
            dispatch(editAsset({ index: currentEditingIndex, value: payload }))
          } else {
            // Create new asset and track its index for future edits
            dispatch(addAsset(payload))
            setAutoSavedNewIndex(assets.length)
          }
        } catch (e) {
          console.debug('Auto-save skipped due to validation:', e)
        }
      }
    },
    [dispatch, isOpen, currentEditingIndex, assets.length]
  )

  // Enable auto-save
  useAutoSave({ watch, onSave: handleAutoSave })

  const form: ReactElement | undefined = (
    <OpenableFormContainer
      defaultValues={defaultValues}
      isOpen={isOpen}
      onOpenStateChange={handleOpenStateChange}
      onSave={onSubmitAdd}
    >
      <Grid container spacing={2}>
        <h3>{editingIndex !== undefined ? 'Edit Asset' : 'Add Assets'}</h3>
        <GenericLabeledDropdown<AssetType, AssetUserInput>
          label="Asset Type"
          name="positionType"
          dropDownData={['Security', 'Real Estate']}
          keyMapping={(x) => x}
          textMapping={showAssetType}
          valueMapping={(x) => x}
        />
        <LabeledInput
          label={positionType === 'Real Estate' ? 'Address' : 'Name'}
          name="name"
        />
        <DatePicker
          maxDate={new Date()}
          label="Date acquired"
          name="openDate"
        />
        <DatePicker
          maxDate={new Date()}
          minDate={openDate}
          label="Date sold or disposed of"
          name="closeDate"
        />
        {(() => {
          if (positionType === 'Real Estate') {
            return (
              <>
                <LabeledInput
                  label="Cost basis"
                  patternConfig={Patterns.currency}
                  name="openPrice"
                />
                <LabeledInput
                  label="Proceeds (sales price)"
                  patternConfig={Patterns.currency}
                  name="closePrice"
                />
                <USStateDropDown label="Property state" name="state" />
              </>
            )
          } else {
            return (
              <>
                <LabeledInput
                  label="Price per unit"
                  patternConfig={Patterns.currency}
                  name="openPrice"
                />
                <LabeledInput
                  label="Quantity"
                  patternConfig={Patterns.number}
                  name="quantity"
                />
                <LabeledInput
                  label="Fee / comissions at purchase"
                  patternConfig={Patterns.number}
                  name="openFee"
                />
                <LabeledInput
                  label="Proceeds (sales price)"
                  patternConfig={Patterns.currency}
                  name="closePrice"
                />
                <LabeledInput
                  label="Fee / comissions at sale"
                  patternConfig={Patterns.number}
                  name="closeFee"
                />
              </>
            )
          }
        })()}
        {(() => {
          if (
            closeDate !== undefined &&
            closeDate.getFullYear() !== TaxYears[year]
          ) {
            return (
              <Alert severity="warning">
                This asset will not be included in the current year&apos;s
                return because you have not selected a date in the current year.
              </Alert>
            )
          }
        })()}
      </Grid>
    </OpenableFormContainer>
  )

  return (
    <>
      <Helmet>
        <title>Other Investments | Income | UsTaxes.org</title>
      </Helmet>
      <h2>Other Investments</h2>
      <FilteredAssetsTable
        onEdit={handleEdit}
        editingIndex={currentEditingIndex}
      />
      <FormProvider {...methods}>
        <form
          tabIndex={-1}
          onSubmit={intentionallyFloat(handleSubmit(onAdvance))}
        >
          {form}
          {navButtons}
        </form>
      </FormProvider>
      <TransactionImporter />
    </>
  )
}

export default OtherInvestments
