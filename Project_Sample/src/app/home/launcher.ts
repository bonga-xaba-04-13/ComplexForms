import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { PatientCaptureV2 } from '../components/patient-capture-v2/patient-capture-v2';
import { MockAuthService } from '../auth/mock-auth.service';

@Component({
  standalone: true,
  selector: 'app-launcher',
  imports: [
    CommonModule,
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatToolbarModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './launcher.html',
  styleUrl: './launcher.scss',
})
export class Launcher {
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly auth = inject(MockAuthService);

  openPatientCapture(): void {
    this.dialog.open(PatientCaptureV2, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'full-screen-dialog',
      width: '95vw',
      maxWidth: '1100px',
      height: '92vh',
      data: { title: 'Patient Capture' },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}