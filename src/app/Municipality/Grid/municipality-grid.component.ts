import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MunicipalityService } from '../Details/services/municipality.service';
import { Municipality } from '../Details/model/municipality.model';

@Component({
  selector: 'app-municipality-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  templateUrl: './municipality-grid.component.html',
  styleUrls: ['./municipality-grid.component.css'],
})
export class MunicipalityGridComponent implements OnInit {
  municipalities: Municipality[] = [];
  displayedColumns: string[] = [
    'municipalityName',
    'municipalityAddress',
    'municipalityCity',
    'municipalityState',
    'municipalityZip',
    'actions',
  ];

  constructor(private municipalityService: MunicipalityService) {}

  ngOnInit(): void {
    this.municipalityService.getMunicipalities().subscribe((data) => {
      this.municipalities = data;
    });
  }

  save(municipality: Municipality): void {
    this.municipalityService.saveMunicipality(municipality).subscribe({
      next: (id) => console.log(`Saved Municipality ID: ${id}`),
      error: (err) => console.error('Error saving municipality:', err),
    });
  }
}
