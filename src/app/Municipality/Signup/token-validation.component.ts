import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from './Services/user.service';

@Component({
  selector: 'token-validation',
  template: '',
  styleUrls: []
})
export class TokenValidationComponent implements OnInit {
 

  constructor(private route: ActivatedRoute, private userService: UserService) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
       let token: string = params.get('token') ?? '';
      console.log('Token:', token);
      this.validateToken(token);
    });
  }

  validateToken(token: string): void {
    this.userService.ValidateEmailToken(token).subscribe(response => {

      console.log('Validation response:', response);
    }, 
    error => {
      console.error('Validation error:', error);
    }
  );
  }
}



