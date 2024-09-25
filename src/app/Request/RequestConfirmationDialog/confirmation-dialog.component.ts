import {Component, Inject} from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogTitle, MatDialogContent, MatDialogActions } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface DialogData {
  action: string;
  item: any;
}

@Component({
  selector: 'confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatButtonModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions
  ],
})
export class ConfirmationDialog {
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
  ) {}

   // Function to get the confirmation message based on the action
   getConfirmationMessage(): string {
    switch (this.data.action) {
      case 'cancel':
        return 'Are you sure you want to cancel this request?';
      case 'delete':
        return 'Are you sure you want to delete this request? If you delete this request your progress will not be saved.';
      case 'edit':
        return 'Are you sure you want to edit this request?';
      default:
        return `Are you sure you want to ${this.data.action} this request?`;
    }
  }
 
  onNoClick(): void {
    console.log("DialogData", this.data)
    this.dialogRef.close(false); // Close the dialog with 'false' value
  }

  confirm(): void {
    this.dialogRef.close(true); // Close the dialog with 'true' value
  }
}
