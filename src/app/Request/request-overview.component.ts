import { Component, Output, EventEmitter, OnInit, Input } from '@angular/core';
import { FormArray, FormGroup, Validators, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RequestSection } from './model/requestsection.model';

@Component({
  selector: 'request-overview',
  standalone: true,
  templateUrl: './request-overview.component.html',
  styleUrls: ['./request-overview.component.css'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    CommonModule,
    MatIconModule,
    ReactiveFormsModule,
  ],
})
export class RequestOverviewComponent implements OnInit {
  @Input() parentProposalsOverviewFormGroup!: FormGroup;
  @Output() proposalOverviewData = new EventEmitter<RequestSection[]>();

  constructor(private fb: FormBuilder) {}

  get proposalSections(): FormArray {
    return this.parentProposalsOverviewFormGroup.get("proposalSections") as FormArray;
  }

  ngOnInit(): void {}

  emitRequestSections(): void {
    if (this.parentProposalsOverviewFormGroup.valid) {
      this.proposalOverviewData.emit(this.parentProposalsOverviewFormGroup.value);
    }
  }

  addSection() {
    const newSection = this.fb.group({
      requestId: [0],
      requestSectionId: [null],
      requestSectionTitle: ['', Validators.required],
      requestSectionContent: ['']
    });
    this.proposalSections.push(newSection);
    this.proposalOverviewData.emit(this.parentProposalsOverviewFormGroup.value.proposalSections);
  }
}
