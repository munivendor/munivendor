import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'request-outerframe',
    standalone: true,
    templateUrl: './request-outframe.component.html',
    styleUrls: ['./request-outframe.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule]
    
})

export class RequestOutFrameComponent implements OnInit {
    ngOnInit(): void {
    }
}
