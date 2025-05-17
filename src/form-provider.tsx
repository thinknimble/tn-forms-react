import React from "react";
import { Form, IFormField, IFormArray } from "@thinknimble/tn-forms";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { ConvertToFieldTuple } from "./types";

type FormState<T> = {
  form: T;
  /**
   * Changes the current value of the field, validates it and refreshes the form reference
   * @returns whether the changed field is valid after the change
   */
  createFormFieldChangeHandler: <T>(
    field: IFormField<T>
  ) => (value: T) => boolean;
  /**
   * Cast your array of field-value tuples as `const` and pass the typeof that object to this method to get a fully type-safe call.
   * We make sure you call this method with the right set of tuples of `[IFormField<T>,T]`
   * @example 
   const tupleFields = [
        [form.address, ''],
        [form.state, 0],
      ] as const
      setFields<typeof tupleFields>(tupleFields)
   */
  setFields: <TFieldTuples extends readonly unknown[]>(
    fieldValueTuple: ConvertToFieldTuple<TFieldTuples>
  ) => void;
  overrideForm: (form: T) => void;
  /**
   * Validates the whole form and refreshes the form reference. Especially useful when validation across multiple fields is required (such as MustMatchValidator)
   */
  validate: () => void;
  /**
   * Updates fields in a FormArray group
   */
  setFormArrayGroupFields: (
    formArrayField: IFormArray<any>,
    groupIndex: number,
    fieldValueTuples: [IFormField<any>, any][]
  ) => void;
  /**
   * Returns a change handler for a field inside a FormArray group
   */
  createFormFieldChangeHandlerForFormArrayGroup: <T>(
    formArray: IFormArray<any>,
    groupIndex: number,
    field: IFormField<T>
  ) => (value: T) => boolean;
  /**
   * Sets the value of a field inside a FormArray group directly
   */
  setFormArrayGroupField: <T>(
    formArray: IFormArray<any>,
    groupIndex: number,
    field: IFormField<T>,
    value: T
  ) => void;
};

const defaultValue: FormState<any> = {
  form: null,
  createFormFieldChangeHandler: () => () => false,
  overrideForm: () => undefined,
  setFields: () => undefined,
  validate: () => undefined,
  setFormArrayGroupFields: () => undefined,
  createFormFieldChangeHandlerForFormArrayGroup: () => () => false,
  setFormArrayGroupField: () => undefined,
};

const FormContext = createContext(defaultValue);

export const useTnForm = <TForm,>() => {
  const unknownCtx: unknown = useContext(FormContext);
  if (!unknownCtx) throw new Error("Hook must be used within a FormProvider");
  return unknownCtx as FormState<TForm>;
};

type BaseFormInputs = Record<string, IFormField>;
type FormLevelValidators = Record<
  string,
  Parameters<Form<any>["addFormLevelValidator"]>[1]
>;

const addFormLevelValidatorsMutate = <
  TInputs extends BaseFormInputs,
  TForm extends Form<TInputs> = Form<TInputs>
>(
  form: TForm,
  validators: FormLevelValidators
) => {
  Object.entries(validators).forEach(([fieldName, validator]) => {
    form.addFormLevelValidator(fieldName, validator);
  });
};

export const FormProvider = <TFormInputs extends BaseFormInputs>({
  children,
  formClass,
  formLevelValidators = {},
}: {
  children: ReactNode;
  formClass: { create(): Form<TFormInputs> };
  /**
   * Reference which validators you want to persist through form replication
   */
  formLevelValidators?: FormLevelValidators;
}) => {
  const [form, setForm] = useState(formClass.create());

  const customReplicate = useCallback(() => {
    const newForm = form.replicate();
    addFormLevelValidatorsMutate<TFormInputs>(newForm, formLevelValidators);
    return newForm;
  }, [form, formLevelValidators]);

  const createFormFieldChangeHandler = useCallback(
    <T,>(field: IFormField<T>) =>
      (value: T) => {
        field.value = value;
        field.validate();
        field.isTouched = true;
        const newForm = customReplicate();
        setForm(newForm);
        return field.isValid;
      },
    [customReplicate]
  );

  const createFormFieldChangeHandlerForFormArrayGroup = useCallback(
    <T,>(formArray: IFormArray<any>, groupIndex: number, field: IFormField<T>) =>
      (value: T) => {
        const group = formArray.groups[groupIndex]
        if (!group) return false
        // Find the field in the current group by name
        const groupField = group.field[field.name]
        if (!groupField) return false
        groupField.value = value
        groupField.validate()
        groupField.isTouched = true

        // Replicate the form
        const newForm = customReplicate()

        // Force a new reference for the group and groups array
        const newGroups = formArray.replicate().groups

        // Find the corresponding formArray in the newForm and update its groups
        //@ts-ignore
        const newFormArray = newForm.field[formArray.name] as IFormArray<any>
        if (newFormArray) {
          newFormArray.groups = newGroups
        }

        setForm(newForm)
        return groupField.isValid
      },
    [customReplicate],
  );
  
  const setFormArrayGroupField = useCallback(
    <T,>(formArray: IFormArray<any>, groupIndex: number, field: IFormField<T>, value: T) => {
      const group = formArray.groups[groupIndex];
      if (!group) return;
      const groupField = group.field[field.name];
      if (!groupField) return;
      groupField.value = value;
      groupField.validate();
      groupField.isTouched = true;
      const newForm = customReplicate();
      setForm(newForm);
    },
    [customReplicate]
  );

  const overrideForm = useCallback((newForm: Form<TFormInputs>) => {
    setForm(newForm);
  }, []);
  const setFields = useCallback(
    <TFieldTuples extends readonly unknown[]>(
      fieldValueTuples: ConvertToFieldTuple<TFieldTuples>
    ) => {
      if (Array.isArray(fieldValueTuples))
        (
          fieldValueTuples as readonly [field: IFormField, value: unknown][]
        ).forEach(([field, value]) => {
          field.value = value;
          field.validate();
          field.isTouched = true;
        });
      const newForm = customReplicate();
      setForm(newForm);
    },
    [customReplicate]
  );

  const setFormArrayGroupFields = useCallback(
    (
      formArrayField: IFormArray<any>,
      groupIndex: number,
      fieldValueTuples: [IFormField<any>, any][]
    ) => {
      const group = formArrayField.groups[groupIndex];
      if (!group) return;
      fieldValueTuples.forEach(([field, value]) => {
        field.value = value;
        field.validate();
        field.isTouched = true;
      });
      const newForm = customReplicate();
      setForm(newForm);
    },
    [customReplicate]
  );

  const validate = useCallback(() => {
    form.validate();
    const newForm = customReplicate();
    setForm(newForm);
  }, [customReplicate, form]);

  const value: FormState<Form<TFormInputs>> & {
    createFormFieldChangeHandlerForFormArrayGroup: typeof createFormFieldChangeHandlerForFormArrayGroup;
    setFormArrayGroupField: typeof setFormArrayGroupField;
  } = useMemo(() => {
    return {
      form,
      createFormFieldChangeHandler,
      overrideForm,
      setFields,
      validate,
      setFormArrayGroupFields,
      createFormFieldChangeHandlerForFormArrayGroup,
      setFormArrayGroupField,
    };
  }, [createFormFieldChangeHandler, form, overrideForm, setFields, validate, setFormArrayGroupFields, createFormFieldChangeHandlerForFormArrayGroup, setFormArrayGroupField]);

  return <FormContext.Provider value={value}>{children}</FormContext.Provider>;
};
