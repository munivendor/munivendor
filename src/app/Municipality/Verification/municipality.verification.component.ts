import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'municipality-verification',
    standalone: true,
    templateUrl: './municipality.verification.component.html',
    styleUrls: ['./municipality.verification.component.css'],
})
export class MunicipalityVerificationComponent implements OnInit, OnDestroy {
    private destroy$ = new Subject<void>();
    email: string | null = null;

    constructor(private route: ActivatedRoute) {}

    ngOnInit() {
      this.route.queryParams
        .pipe(takeUntil(this.destroy$))
        .subscribe(params => {
          this.email = params['email'] || 'your email';
        });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}