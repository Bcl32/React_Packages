/**
 * @bcl32/forms/validate — one validation semantics for admin forms, customer
 * forms and the server-side checks that must agree with them.
 *
 * Pure and Node-safe: no React, no DOM, no dayjs, no react-query. It imports
 * only `@bcl32/data-utils/numbers`. Nothing here runs unless called, so the
 * existing forms (and `fieldErrors`) behave exactly as before.
 */
export { validate, validateField, textLength, isEmptyValue } from "./validate/rules";
export { issueText } from "./validate/issueText";
export type {
  CharsetPolicy,
  CrossFieldRule,
  CustomIssue,
  FieldBase,
  FieldIssue,
  FieldIssueCode,
  NumberIssueCode,
  RuleRegistry,
  RuleSource,
  ValidateOptions,
} from "./validate/types";
