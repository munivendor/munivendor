import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { RequestService } from './request-service.service';

@Component({
  selector: 'app-request',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.css']
})
export class RequestComponent implements OnInit {
    constructor(private route: ActivatedRoute, private router: Router, private requestService: RequestService ) { }
    ngOnInit(): void {
        
    }
}