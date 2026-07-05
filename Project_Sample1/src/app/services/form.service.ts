import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private apiBaseUrl = 'http://localhost:8080/api/forms';

  constructor(private http: HttpClient) {}

  getStepperForm(formKey: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}/${formKey}`);
  }

  getFormDefinition(formKey: string): Observable<any> {
    return this.http.get<any>(`${this.apiBaseUrl}/${formKey}`);
  }
}
