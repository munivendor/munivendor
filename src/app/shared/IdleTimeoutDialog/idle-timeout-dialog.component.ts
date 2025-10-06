// src/app/core/components/session-timeout-dialog/session-timeout-dialog.component.ts
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-session-timeout-dialog',
  templateUrl: './idle-timeout-dialog.component.html',
  styleUrls: ['./idle-timeout-dialog.component.css'],
})
export class IdleTimeoutDialogComponent {
  constructor(private dialogRef: MatDialogRef<IdleTimeoutDialogComponent>) {}

  close(result: 'continue' | 'logout') {
    this.dialogRef.close(result);
  }
}
