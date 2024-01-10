import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterModule],
  template: `
    
    <p> The person who signs up will be the Super Admin and have all access to the municiaplity account (Don’t worry you can change it later)</p>
    <br>
    <br>
    <br>
    <br>
    <table class="center">
      <tr>
        <td>
          <input type="text" id="rcorners1" value= 'Work email for the Super Admin and have access to the municipality account'>
        </td>
      </tr>
      <tr>
        <td>
      <input type="text" id="rcorners1" value= 'Firstname'>
         </td>
      </tr>
      <tr>
        <td>
      <input type="text" id="rcorners1" value= 'Lastname'>
        </td>
      </tr>
      <tr>
        <td>
      <input type="text" id="rcorners1" value= 'Title'>
        </td>
      </tr>
      <tr>
        <td>
      <input type="text" id="rcorners1" value= 'Work phone number'>
        </td>
      </tr>
      <table>
        <br>
        <br>
        <br>
     <a [routerLink]="['/second-component']" routerLinkActive="router-link-active" >continue </a>

  `,
  styles: `#rcorners1 {
  border-radius: 10px;
  background: grey;
  padding: 2px; 
  width: 500px;
  height: 10px;  
  }

  table.center {
  margin-left: auto; 
  margin-right: auto;
  }

  .button {
    background-color: blue;
    border: none;
    color: white;
    padding: 20px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
  }

  .button1 {border-radius: 10px;}
  p {text-align: center;}
  `
})

export class SignupComponent {
 

  
}
