import { Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { UserService } from '../shared/service/user.service'; 
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { UserSearchResults } from '../shared/model/usersearchresult.model';
import { User } from '../shared/model/user.model';



/*export interface User {
  name: string;
  email: string;
  title: string;
  role: string;
  designation: string;
  status: string;
  tags: string[];
}*/


@Component({
  selector: 'app-user-grid',
  templateUrl: './user-grid.component.html',
  styleUrls: ['./user-grid.component.css'],
  standalone: true,
  imports: [MatFormFieldModule, MatTableModule, MatPaginatorModule]
})
export class UserGridComponent implements OnInit {
  displayedColumns: string[] = ['name', 'email', 'title', 'role', 'designation', 'status', 'tags'];
  dataSource = new MatTableDataSource<User>();
  filterValue: string = '';
  users!: UserSearchResults;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private userService: UserService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.userService.getUsers(this.filterValue, this.paginator?.pageIndex || 0, this.paginator?.pageSize || 10)
      .subscribe(users => {
        this.dataSource.data = users.users;
      });
  }

  applyFilter(event: Event): void {
    this.filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.paginator.firstPage();
    this.loadUsers();
  }

  onPageChange(): void {
    this.loadUsers();
  }

  /*openTagDialog(user: User): void {
    const dialogRef = this.dialog.open(TagDialogComponent, {
      width: '300px',
      data: { user }
    });

    dialogRef.afterClosed().subscribe(updatedTags => {
      if (updatedTags) {
        user.tags = updatedTags;
      }
    });
  }*/

  addNewUser(): void {
    // Actions to add a new user
    // For instance, navigate to a new page or open a dialog
  }
}
