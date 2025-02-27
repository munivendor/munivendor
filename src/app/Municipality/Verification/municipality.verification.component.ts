
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'

@Component({
    selector: 'municipality-verification',
    standalone: true,
    templateUrl: './municipality.verification.component.html',
    styleUrls: ['./municipality.verification.component.css'],
})

export class MunicipalityVerificationComponent implements OnInit {
    email: string | null = null;

    constructor(private route: ActivatedRoute) {}

    ngOnInit() {
      this.route.queryParams.subscribe(params => {
        this.email = params['email'] || 'your email';
      });
    }
}
