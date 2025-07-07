// import { Component } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { FormsModule } from '@angular/forms';
// import { MatButtonModule } from '@angular/material/button';
// import { MatInputModule } from '@angular/material/input';

// @Component({
//   selector: 'app-bid-proposal-form',
//   templateUrl: './bid-proposal-form.component.html',
//   standalone: true,
//   imports: [
//     CommonModule,
//     MatDialogModule,
//     MatFormFieldModule,
//     FormsModule,
//     MatButtonModule,
//     MatInputModule
//   ]
// })
// export class BidProposalFormDialogComponent {
//   bidAmountWords: string = '';
//   bidAmountNumbers: string = '';

//   constructor(private dialogRef: MatDialogRef<BidProposalFormDialogComponent>) { }

//   close(): void {
//     this.dialogRef.close(); // You can also send null or status
//   }

//   save(): void {
//     const formData = {
//       bidAmountWords: this.bidAmountWords,
//       bidAmountNumbers: this.bidAmountNumbers,
//     };
//     this.dialogRef.close(formData); // Pass back data to parent if needed
//   }
// }
