import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Api {
  base_url = environment.BASE_URL;

  constructor(private http: HttpClient){}


  getForms(url: string): Observable<any> {
    return this.http.get('/assets/forms/'+url);
  }

}
