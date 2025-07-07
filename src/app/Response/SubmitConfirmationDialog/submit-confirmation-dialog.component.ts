import { Component, Inject, OnDestroy } from "@angular/core";
import { MatDialogRef, MatDialogModule, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";
import { Subject, takeUntil } from "rxjs";
import { RequestService } from "../../Request/services/request.service";
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from "@angular/router";

@Component({
    selector: 'submit-confirmation-dialog',
    templateUrl: './submit-confirmation-dialog.component.html',
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule
    ]
})
export class SubmitConfirmationDialogComponent implements OnDestroy {
    private destroy$ = new Subject<void>();
    constructor(
        private requestService: RequestService,
        private snackBar: MatSnackBar,
        private router: Router,
        private dialogRef: MatDialogRef<SubmitConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { responseId: string }) { }

    cancel(): void {
        this.dialogRef.close(false);

    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    confirm(): void {
        const requestId = this.data.responseId ? +this.data.responseId : 0;
        this.requestService.UpdateRequestStatus(requestId, 2)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (response: any) => {
                    console.log('Request status updated successfully:', response);
                    this.snackBar.open('Request successfully submitted!', '', {
                        duration: 5000,
                        verticalPosition: 'top'
                    });
                    this.router.navigate(['/requests-view']);
                    this.dialogRef.close(true);
                },
                error: (err: any) => {
                    console.error('Failed to update request status:', err);
                }
            });
    }
}