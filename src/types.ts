import { IFormField } from "@thinknimble/tn-forms";

/**
 * Given an unknown array type. Narrow it down to a tuple of `[[IFormField<Ti>,Ti],[IFormField<Ti+1>,Ti+1],...]` If the type does not match this pattern then it returns never
 */
export type ConvertToFieldTuple<
  T extends readonly unknown[],
  TResult extends readonly unknown[] = []
> = T extends readonly [infer FirstTuple, ...infer Rest]
  ? FirstTuple extends readonly [IFormField<infer TValue>, infer TValueCompare]
    ? FirstTuple extends readonly [IFormField<TValue>, TValue]
      ? ConvertToFieldTuple<
          Rest,
          readonly [...TResult, readonly [IFormField<TValue>, TValueCompare]]
        >
      : never
    : never
  : TResult["length"] extends 0
  ? never
  : TResult;
