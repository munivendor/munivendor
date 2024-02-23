import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
 


@Component({
    selector: 'app-root',
    standalone: true,
    template: `
    <div class="topnav">
      <a routerLink="/first-component" routerLinkActive="active" ariaCurrentWhenActive="page">Signup</a>
      <a routerLink="/second-component" routerLinkActive="active" ariaCurrentWhenActive="page">Password </a>
      <a routerLink="/dashboard-component" routerLinkActive="active" ariaCurrentWhenActive="page">Dashboard</a>
      <a routerLink="/request-basic-component" routerLinkActive="active" ariaCurrentWhenActive="page">Basic Request</a>
      <a routerLink="/request-proposal-component" routerLinkActive="active" ariaCurrentWhenActive="page">Proposal</a>
      <a routerLink="/request-overview-component" routerLinkActive="active" ariaCurrentWhenActive="page">Review</a>
    </div>
    

    <h1>Welcome to {{title}}!</h1>
  
    <router-outlet></router-outlet>
  `,
    styles: `.topnav {
      overflow: hidden;
      background-color: blue;
    }
    
    .topnav a {
      float: left;
      color: #f2f2f2;
      text-align: center;
      padding: 14px 16px;
      text-decoration: none;
      font-size: 17px;
    }
    
    .topnav a:hover {
      background-color: #ddd;
      color: black;
    }
    
    .topnav a.active {
      background-color: #04AA6D;
      color: white;
    }`,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive]
})
export class AppComponent {
  title = 'munivendor';
}
