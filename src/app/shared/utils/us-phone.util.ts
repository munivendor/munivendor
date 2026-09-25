import { isValidPhoneNumber } from 'libphonenumber-js';

const REGION = 'US';

/**
 * True only for real, dialable US/NANP numbers (correct area code, exchange,
 * length, etc.) — not just "10 digits". Empty/whitespace input is not valid;
 * callers that treat the field as optional should short-circuit on blank
 * themselves before calling this.
 */
export function isValidUsPhoneNumber(value: string | null | undefined): boolean {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return false;
  try {
    return isValidPhoneNumber(digits, REGION);
  } catch {
    return false;
  }
}

/**
 * Formats a partial or complete digit string the way a user is typing it,
 * e.g. "201" -> "(201", "2015551" -> "(201) 555-1". Always groups
 * positionally (3-3-4) regardless of whether the digits form a real,
 * dialable number — libphonenumber's own AsYouTypeFormatter only groups
 * once it recognizes a plausible area code, which leaves fax numbers and
 * other atypical input unformatted while typing. isValidUsPhoneNumber()
 * is the source of truth for whether the number is actually valid.
 */
export function formatUsPhoneAsYouType(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

/** Formats a complete 10-digit US number as "(xxx) xxx-xxxx"; returns the input unchanged for other lengths. */
export function formatUsPhoneNational(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 10) return value ?? '';
  return formatUsPhoneAsYouType(digits);
}
