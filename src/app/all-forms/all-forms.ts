import { Component } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Patientcapture } from '../components/patientcapture/patientcapture';
import { Jointcapture } from '../components/jointcapture/jointcapture';
import { Assetbuycapture } from '../components/assetbuycapture/assetbuycapture';

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
}
