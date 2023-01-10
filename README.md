# Thinknimble React tn-forms utils

## Motivation

React has a particular way of handling state. React's state strongly depends on referential equality rather than deep-equality. Thus, working with `thinknimble/tn-forms` Form classes don't work out of the box as state.

We put together some utils that could come in handy when using tn-forms with React so that we don't have to repeat ourselves whenever we use it.

## Core utils

### `FormProvider`

This is a context provider which allows us to use a `tn-forms` Form class as state in any of the descendant components within this wrapper.

Sample use:

```tsx
//...
return (
  <FormProvider<TSampleFormInputs> formClass={SampleForm}>
    <DescendantComponent>
  </FormProvider>
)
```

`TSampleFormInputs` is the type of the inputs of the `SampleForm`.

### `useTnForm`

Hook to consume the form state while inside a descendant component of `FormProvider`

Sample use:

```tsx
const DescendantComponent = () => {
  // ...
  const {
    form,
    createFormFieldChangeHandler,
    overrideForm,
    setFields,
    validate,
  } = useTnForm<TSampleForm>();
  //..
  return <></>;
};
```

The generic type in this case is the combination of both `TSampleFormInputs` and `SampleForm`. But will allow for most of the returned values from the hook to be properly typed to your current form.

Note this makes the hook to potentially shoot yourself in the foot **if you don't provide the right type here**. At compile type you will not see errors, but if the form you're using is not the one that matches the type you passed to `useTnForm` you will get runtime errors or undefined access issues.

`createFormFieldChangeHandler` allows you to create a handler to perform changes to a form value. To keep immutability safe, you should not try to modify `form` in any other way that is not through this method. This function accepts an IFormField and returns a handler which can be used as an event handler. Beware that the created handler resembles `(v:T)=>void` and does not consider react's Event.

IG:
Consider a regular `input` that has React event attached to its `onChange` callback.

And also take a `CustomInput` that wraps around an input but already processes the event and expects a `(v:string)=>void` callback. Then we could skip wrapping around our handler and simply pass it to the `onChange` prop.

```tsx
const DescendantComponent = ()=>{
  //...
  const {form, createFormFieldChangeHandler} = useTnForm<TSampleForm>()

  const onMyFieldChange = (e:ChangeEvent<HTMLInputElement>)=>{
    createFormFieldChangeHandler(form.myField)(e.target.value)
  }

  return (
    <input value={form.myField.value} onChange={onMyFieldChange}/>
    <CustomInput value={form.anotherField.value} onChange={createFormFieldChangeHandler(form.anotherField)}/>
  )
}
```

`form` is the piece of state you can use then in your form components. This variable will keep track of changes of the form class instance and will rerender the component accordingly as long as you use the `createFormFieldChangeHandler` to create the onChange event handlers on the form components.
