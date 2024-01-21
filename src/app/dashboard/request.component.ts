import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { RequestService } from './request-service.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-request',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './request.component.html',
  styleUrls: ['./request.component.css']
})
export class RequestComponent implements OnInit {
    requests = new Array<any>();
    constructor(private route: ActivatedRoute, private router: Router, private requestService: RequestService ) { }
    ngOnInit(): void {
        this.getURequests ();
    }
    public getURequests() {
      return this.requestService.loadRequests().subscribe(response => {
        this.requests = response.data;
    });  
  }
}