import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { TableDetailsComponent } from "../Request/TableDetails/request-tabledetails.component"

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TableDetailsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) { }
  
  ngOnInit(): void {
   
  }
}
