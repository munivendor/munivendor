import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-tooltip-dialog',
  template: `
    <h1 mat-dialog-title class="dialog-title">Remember</h1>
    <div mat-dialog-content class="dialog-content">
      <p>
        <strong>Decision Makers</strong> - these are people who make decisions pertaining to submitted responses from prospective vendors, such as your Mayor, your Business Administrator, Councilmembers, Department Heads, and other personnel assigned to a decision making committee. Decision Makers do not ever log into the MuniVendor platform. Instead, they receive an email with the full contents of the submissions for which they are decision makers on the closing date/time.
      </p>
      <p>
        <strong>User</strong> - these are people who actively utilize the MuniVendor platform to manage all the opportunities originating from your local government organization. This almost always includes your Qualified Purchasing Agent and other members of your Purchasing Department. In some cases, it may also include your Business Administrator, and/or other team members who are actively involved in writing and preparing the opportunity before publication.
      </p>
    </div>
    <div mat-dialog-actions>
      <button mat-button (click)="closeDialog()">Close</button>
    </div>
  `,
  styles: [`
    .dialog-title {
      text-align: center;
      margin-bottom: 16px;
    }
    .dialog-content {
      max-width: 500px; /* Adjust as needed */
      white-space: pre-wrap;
      margin: 10px 16px; /* Add margin to the left and right */
    }
  `]
})
export class TooltipDialogComponent {
  constructor(public dialogRef: MatDialogRef<TooltipDialogComponent>) {}

  closeDialog(): void {
    this.dialogRef.close();
  }
}
