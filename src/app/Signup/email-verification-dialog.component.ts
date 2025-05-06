import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
 import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-email-verification-dialog',
  templateUrl: './email-verification-dialog.component.html',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule]
})
export class EmailVerificationDialogComponent {
  constructor(private dialogRef: MatDialogRef<EmailVerificationDialogComponent>) {}

  closeDialog(): void {
    this.dialogRef.close();
  }
}

