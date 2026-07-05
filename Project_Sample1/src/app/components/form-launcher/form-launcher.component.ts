import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { StepperFormModalComponent } from '../stepper-form-modal/stepper-form-modal.component';
import { CaptureMode } from '../../models/capture-mode.model';

@Component({
  selector: 'app-form-launcher',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
  templateUrl: './form-launcher.component.html',
  styleUrls: ['./form-launcher.component.scss'],
})
export class FormLauncherComponent {
  constructor(private dialog: MatDialog) {}

  openPatientIntakeForm(mode: CaptureMode = 'single'): void {
    const dialogRef = this.dialog.open(StepperFormModalComponent, {
      width: '90%',
      maxWidth: '1080px',
      height: '90vh',
      maxHeight: '840px',
      disableClose: false,
      panelClass: 'stepper-form-dialog',
      data: { captureMode: mode },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log(`Form submitted (${mode} mode) with data:`, result);
        // Handle the form submission here
      }
    });
  }
}
