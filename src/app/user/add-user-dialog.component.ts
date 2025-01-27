import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field'; 
import { MatInput, MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';



@Component({
  selector: 'app-add-user-dialog',
  standalone: true,
  imports:[MatFormFieldModule, MatInput, FormsModule, MatSelectModule],
  template: `
    <h1 mat-dialog-title>Add New User</h1>
    <div mat-dialog-content>
      <mat-form-field appearance="outline">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="user.name" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Email</mat-label>
        <input matInput [(ngModel)]="user.email" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Title</mat-label>
        <input matInput [(ngModel)]="user.title" />
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Role</mat-label>
        <mat-select [(ngModel)]="user.role">
          <mat-option value="Admin">Admin</mat-option>
          <mat-option value="User">User</mat-option>
          <mat-option value="Decision Maker">Decision Maker</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <div mat-dialog-actions>
      <button mat-button (click)="close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()">Save</button>
    </div>
  `,
})
export class AddUserDialogComponent {
  user = { name: '', email: '', title: '', role: '' };

  constructor(public dialogRef: MatDialogRef<AddUserDialogComponent>) {}

  close() {
    this.dialogRef.close();
  }

  save() {
    this.dialogRef.close(this.user);
  }
}
