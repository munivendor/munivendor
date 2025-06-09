// import { Component, ViewChild } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { FormsModule, ReactiveFormsModule, FormGroup } from '@angular/forms';
// import { MatInputModule } from '@angular/material/input';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatStepperModule } from '@angular/material/stepper';
// import { MatButtonModule } from '@angular/material/button';
 
// import { ActivatedRoute } from '@angular/router';
// import { ResponseBasicComponent } from '../response-basic.component';
// import { ResponseDetailsComponent } from '../response-details.component';
// import { ResponseDocumentsComponent } from '../response-documents.component';
 
// //import { RequestReviewComponent } from '../request-review.component';
 
// @Component({
//   selector: 'response-stepper',
//   templateUrl: 'response-stepper.component.html',
//   styleUrls: ['response-stepper.component.css'],
//   standalone: true,
//   imports: [
//     MatButtonModule,
//     MatStepperModule,
//     FormsModule,
//     ReactiveFormsModule,
//     MatFormFieldModule,
//     MatInputModule,
//     ResponseBasicComponent,
//     ResponseDetailsComponent,
//     ResponseDetailsComponent,
//     CommonModule,
//     ResponseDocumentsComponent
// ],
// })

// export class ResponseStepper {
//   @ViewChild(ResponseBasicComponent) responseBasicComponent!: ResponseBasicComponent;
//  // @ViewChild(ResponseDetailsComponent) responseDetailsComponent!: ResponseDetailsComponent;
//   @ViewChild(ResponseDocumentsComponent) responseDocumentsComponent!: ResponseDocumentsComponent;
//  // @ViewChild(RequestReviewComponent) requestReviewComponent!: RequestReviewComponent;

//   requestId?: number;
//   idParam?: string | undefined | null;
//   isStepValid = false;

//   constructor(
//     private route: ActivatedRoute,
//   ) {
//     this.route.paramMap.subscribe((params) => {
//       this.idParam = params.get('requestId');
//       this.requestId = this.idParam ? + this.idParam : 0;
//     });
//   }

//   save1() {
//     this.responseBasicComponent.save();
//   }

//   /*saveResponseDetails(): void {
//     this. responseDocumentsComponent.save();
//   }*/

//   save(): void {
//     this.responseDocumentsComponent.save();
//   }

//   /*updateRequestStatusToScheduled(): void {
//     this.requestReviewComponent.onSubmit();
//   }*/
// }





