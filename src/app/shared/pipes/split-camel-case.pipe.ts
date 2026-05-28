import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'splitCamelCase', standalone: true })
export class SplitCamelCasePipe implements PipeTransform {
  transform(value: string): string {
    return value?.replace(/([A-Z])/g, ' $1').trim() ?? '';
  }
}
