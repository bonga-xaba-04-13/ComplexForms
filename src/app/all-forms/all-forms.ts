import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Patientcapture } from '../components/patientcapture/patientcapture';
import { Jointcapture } from '../components/jointcapture/jointcapture';
import { Assetbuycapture } from '../components/assetbuycapture/assetbuycapture';
import { PatientCaptureV2 } from '../components/patient-capture-v2/patient-capture-v2';

@Component({
  selector: 'app-all-forms',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './all-forms.html',
  styleUrl: './all-forms.scss',
})
export class AllForms {
  constructor(public dialog: MatDialog) {}

  openSinglePatientCapture(): void {
    this.dialog.open(Patientcapture, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'custom-dialog-container',
      width: '85%',
      maxWidth: '1100px',
      data: {
        formUrl: 'single_patient.json',
        title: 'Single Patient Capture',
      },
    });
  }

  openMarriedPatientCapture(): void {
    this.dialog.open(Patientcapture, {
      disableClose: true,
      panelClass: 'custom-dialog-container',
      width: '85%',
      maxWidth: '1100px',
      data: {
        formUrl: 'married_patient.json',
        title: 'Married Patient Capture',
      },
    });
  }

  openJointCapture(): void {
    this.dialog.open(Jointcapture, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'custom-dialog-container',
      width: '85%',
      maxWidth: '1100px',
      data: {
        formUrl: 'joint_patient.json',
        title: 'Joint Capture',
      },
    });
  }

  openAssetBuyCapture(): void {
    this.dialog.open(Assetbuycapture, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'custom-dialog-container',
      width: '85%',
      maxWidth: '1100px',
      data: {
        formUrl: 'asset_buy_capture.json',
        title: 'Asset Buy Capture',
      },
    });
  }

  openPatientCaptureV2(): void {
    this.dialog.open(PatientCaptureV2, {
      disableClose: true,
      hasBackdrop: true,
      panelClass: 'full-screen-dialog',
      width: '95vw',
      maxWidth: '1100px',
      height: '92vh',
      data: { title: 'Patient Intake V2' },
    });
  }
}
