import { Routes } from '@angular/router';
import { AllForms } from './all-forms/all-forms';

export const routes: Routes = [
  { path: '', component: AllForms },
  { path: '**', redirectTo: '' },
];
