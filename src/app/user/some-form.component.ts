import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UserFormComponent } from './user-form.component';

@Component({
  selector: 'app-some-component',
  template: `<button mat-button (click)="openUserForm()">Open Form</button>`
})
export class SomeComponent {
  constructor(private dialog: MatDialog) {}

  openUserForm(): void {
    const dialogRef = this.dialog.open(UserFormComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Handle the returned data
        console.log('Dialog result:', result);
        // e.g., this.userService.saveUser(result).subscribe();
      }
    });
  }
}
