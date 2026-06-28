import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FormService {
  private apiUrl = 'http://localhost:8080/api/forms';

  constructor(private http: HttpClient) {}

  getStepperForm(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stepper_form`);
  }

  getSubForm(keyname: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${keyname}`);
  }

  loadAllSubForms(definition: any[]): Observable<any[]> {
    if (!definition || definition.length === 0) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    const requests = definition.map(item => this.getSubForm(item.form_keyname));
    return forkJoin(requests);
  }

  loadStepperWithSubForms(): Observable<{ stepper: any; forms: any[] }> {
    return this.getStepperForm().pipe(
      switchMap(stepperForm => {
        return this.loadAllSubForms(stepperForm.definition).pipe(
          map(forms => ({
            stepper: stepperForm,
            forms: forms
          }))
        );
      })
    );
  }
}
