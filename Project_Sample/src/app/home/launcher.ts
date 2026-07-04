import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { PatientCaptureV2 } from '../components/patient-capture-v2/patient-capture-v2';
import { PatientRegistrationComponent } from '../components/patient-registration/patient-registration.component';
import { Router } from '@angular/router';
import { MockAuthService } from '../auth/mock-auth.service';

@Component({
  standalone: true,
  selector: 'app-launcher',
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  templateUrl: './launcher.html',
  styleUrl: './launcher.scss'
})
export class Launcher {
  constructor(
    private dialog: MatDialog,
    private router: Router,
    private auth: MockAuthService
  ) {}

  openPatientCapture(): void {
    this.dialog.open(PatientCaptureV2, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'full-screen-dialog',
      width: '95vw',
      maxWidth: '1100px',
      height: '92vh',
      data: { title: 'Patient Capture' }
    });
  }

  openPatientRegistration(): void {
    this.dialog.open(PatientRegistrationComponent, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'full-screen-dialog',
      width: '95vw',
      maxWidth: '1100px',
      height: '92vh',
      data: { title: 'Patient Registration' }
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
