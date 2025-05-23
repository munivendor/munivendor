// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';
// import { MatTableModule } from '@angular/material/table';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatInputModule } from '@angular/material/input';
// import { MatButtonModule } from '@angular/material/button';
// import { OrganizationService } from '../Details/services/organization.service';
// import { Organization } from '../Details/model/organization.model';

// @Component({
//   selector: 'app-organization-grid',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     MatTableModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatButtonModule,
//   ],
//   templateUrl: './municipality-grid.component.html',
//   styleUrls: ['./municipality-grid.component.css'],
// })
// export class OrganizationGridComponent implements OnInit {
//   municipalities: Organization[] = [];
//   displayedColumns: string[] = [
//     'organizationName',
//     'organizationAddress',
//     'organizationCity',
//     'organizationState',
//     'organizationZip',
//     'actions',
//   ];

//   constructor(private organizationService: OrganizationService) {}

//   ngOnInit(): void {
//     this.organizationService.getMunicipalities().subscribe((data) => {
//       this.municipalities = data;
//     });
//   }

//   save(organization: Organization): void {
//     this.organizationService.saveOrganization(organization).subscribe({
//       next: (id) => console.log(`Saved Organization ID: ${id}`),
//       error: (err) => console.error('Error saving organization:', err),
//     });
//   }
// }
