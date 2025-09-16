import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormField } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'offeror-profile-page.component.ts',
  templateUrl: 'offeror-profile-page.component.html',
  styleUrls: ['./offeror-profile-page.component.css'],
  standalone: true,
  imports: [CommonModule, MatFormField, MatInputModule],
})
export class OfferorProfilePageComponent {}
