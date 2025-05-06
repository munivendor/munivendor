import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'verification',
    standalone: true,
    templateUrl: './verification.component.html',
    styleUrls: ['./verification.component.css'],
})
export class EmailVerification implements OnInit, OnDestroy {
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