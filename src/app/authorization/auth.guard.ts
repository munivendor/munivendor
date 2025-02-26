// import { inject } from '@angular/core';
// import { CanActivateFn } from '@angular/router';
// import { AuthService } from './auth.service';
// import { Router } from '@angular/router';
// import { map, Observable } from 'rxjs';

// export const AuthGuard: CanActivateFn = () => {
//   const authService = inject(AuthService);
//   const router = inject(Router);

//   return authService.user$.pipe(
//     map((user) => {
//       if (user) {
//         return true; // Allow access
//       } else {
//         router.navigate(['/signup']); // Redirect to sign-up/login page
//         return false;
//       }
//     })
//   ) as Observable<boolean>;
// };

import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Adjust the import path as needed

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(private authService: AuthService, private router: Router) {}

    canActivate(): Observable<boolean> {
        return this.authService.isAuthenticated().pipe(
            map(isAuthenticated => isAuthenticated || this.redirectToLogin()),
            catchError( async () => this.redirectToLogin())
        );
    }

    private redirectToLogin(): boolean {
        this.router.navigate(['/login']);
        return false;
    }
}
