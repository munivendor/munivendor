import { Component, OnInit } from '@angular/core';
import { RouterLink, RouterModule } from '@angular/router';
import { FormGroup,FormBuilder, ReactiveFormsModule, Validators, FormArray, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';

@Component({
    selector: 'request-outerframe',
    standalone: true,
    templateUrl: './request-outframe.component.html',
    styleUrls: ['./request-outframe.component.css'],
    imports: [ReactiveFormsModule, RouterModule, RouterLink, CommonModule]
    
})

export class RequestOutFrameComponent implements OnInit {
    ngOnInit(): void {
        //throw new Error('Method not implemented.');
    }
}
