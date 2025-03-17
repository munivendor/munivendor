import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-political-contributions',
  templateUrl: './political-contributions.component.html',
  //styleUrls: ['./political-contributions.component.scss'],
})
export class PoliticalContributionsComponent implements OnInit {
  politicalContributionsForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.politicalContributionsForm = this.fb.group({
      contributions: this.fb.array([]),
    });

    this.addContribution(); // Add an initial contribution field
  }

  get contributions(): FormArray {
    return this.politicalContributionsForm.get('contributions') as FormArray;
  }

  addContribution(): void {
    const contributionGroup = this.fb.group({
      contributorName: ['', Validators.required],
      recipientName: ['', Validators.required],
      contributionDate: ['', Validators.required],
      dollarAmount: ['', [Validators.required, Validators.min(0)]],
    });

    this.contributions.push(contributionGroup);
  }

  removeContribution(index: number): void {
    this.contributions.removeAt(index);
  }

  onSubmit(): void {
    if (this.politicalContributionsForm.valid) {
      console.log('Political Contributions Submitted:', this.politicalContributionsForm.value);
    }
  }
}
