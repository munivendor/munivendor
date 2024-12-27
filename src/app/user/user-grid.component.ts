import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms'; // Reactive forms
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips'; // Import MatChipsModule
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipListbox, MatChip } from '@angular/material/chips'; // Import Chip Components
import { CommonModule } from '@angular/common';
import { AddUserDialogComponent } from './add-user-dialog.component'; // Ensure the path is correct

@Component({
  selector: 'app-user-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
    MatChipsModule, // Explicitly declare the component
    MatChip,
    ReactiveFormsModule
],
  templateUrl: './user-grid.component.html',
  styleUrls: ['./user-grid.component.css'],
})
export class UserGridComponent {
  searchControl = new FormControl(''); // Reactive form control
  displayedColumns: string[] = [
    'nameEmail',
    'title',
    'role',
    'designee',
    'status',
    'tags',
    'actions',
  ];

  users = [
    {
      name: 'John Doe',
      email: 'john.doe@email.com',
      title: 'Manager',
      role: 'Admin',
      designee: 'QPA',
      status: 'Active',
      tags: ['Finance', 'Project Management'],
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@email.com',
      title: 'Analyst',
      role: 'User',
      designee: 'Municipal Clerk',
      status: 'Pending',
      tags: ['Budget', 'Analysis'],
    },
  ];

  filteredUsers = [...this.users];

  constructor(public dialog: MatDialog) {
    // Filter results based on input in the search field
    this.searchControl.valueChanges.subscribe((searchValue) => {
      this.applyFilter(searchValue || '');
    });
  }

  // Filter method
  applyFilter(filterValue: string) {
    const lowerCaseFilter = filterValue.toLowerCase();
    this.filteredUsers = this.users.filter(
      (user) =>
        user.name.toLowerCase().includes(lowerCaseFilter) ||
        user.email.toLowerCase().includes(lowerCaseFilter)
    );
  }

  // Open Add User dialog
  addUser() {
    const dialogRef = this.dialog.open(AddUserDialogComponent);

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.users.push(result); // Add new user
        this.applyFilter(this.searchControl.value || '');
      }
    });
  }
}
