import {Injectable} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import { Observable } from 'rxjs';
import { RequestOverview } from 'mssql';
import { RequestOverviewService } from './product.service';

@Injectable ({providedIn: 'root'})

export class RequestOverviewResolver implements Resolve<RequestOverview>
{
    constructor (private requestOverviewService: RequestOverviewService){}

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<RequestOverview> {
        const id = route.paramMap.get('id');
        return this.requestOverviewService.getRequestOverview(id);
        
    }
}