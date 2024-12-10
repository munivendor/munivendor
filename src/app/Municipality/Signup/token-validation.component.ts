import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UserService } from './Services/user.service';

@Component({
  selector: 'app-validate',
  template:'',
  styles: '',
  standalone: true
})
export class TokenValidationComponent implements OnInit {
  token: string | null = null;

  constructor(private route: ActivatedRoute, private userService: UserService,) { }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.token = params.get('token');
      console.log('Token:', this.token); 

      
    });
  }
}
