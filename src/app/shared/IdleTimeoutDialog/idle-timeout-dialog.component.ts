import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-idle-timeout-dialog',
  templateUrl: './idle-timeout-dialog.component.html',
  styleUrls: ['./idle-timeout-dialog.component.css'],
  standalone: true,
  imports: [MatButtonModule, MatDialogModule],
})
export class IdleTimeoutDialogComponent {
  constructor(private dialogRef: MatDialogRef<IdleTimeoutDialogComponent>) {}

  close(result: 'continue' | 'logout'): void {
    this.dialogRef.close(result);
  }
}
