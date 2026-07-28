import { Pipe, PipeTransform } from '@angular/core';
import { formatUsPhoneNational } from '../utils/us-phone.util';

@Pipe({ name: 'phone', standalone: true })
export class PhonePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    return formatUsPhoneNational(value);
  }
}
