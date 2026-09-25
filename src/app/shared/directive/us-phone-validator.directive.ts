import { Directive } from '@angular/core';
import { NG_VALIDATORS, Validator } from '@angular/forms';
import { usPhoneValidator } from '../validators/us-phone.validator';

/**
 * Template-driven-forms counterpart to usPhoneValidator() — attach as an
 * attribute (appUsPhone) on an ngModel input to get the same libphonenumber
 * check reactive forms get from the validator function directly.
 */
@Directive({
  selector: '[appUsPhone]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: UsPhoneValidatorDirective,
      multi: true,
    },
  ],
})
export class UsPhoneValidatorDirective implements Validator {
  private readonly validatorFn = usPhoneValidator();

  validate(control: Parameters<Validator['validate']>[0]) {
    return this.validatorFn(control);
  }
}
