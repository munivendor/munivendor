import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { isValidUsPhoneNumber } from '../utils/us-phone.util';

/**
 * Validates that a control's value is a real, dialable US phone number.
 * Empty values pass (pair with Validators.required for mandatory fields,
 * or leave unpaired to keep the field optional).
 */
export function usPhoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: string = control.value ?? '';
    if (!value) return null;
    return isValidUsPhoneNumber(value) ? null : { invalidPhoneNumber: true };
  };
}
