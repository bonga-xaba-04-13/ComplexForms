import {
  Component, Inject, OnInit, HostListener, ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JsonFormControl } from '../../models/form-fields';
import { DynamicForm } from './dynamic-form/dynamic-form';
import { FormService } from '../../services/form.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-patient-capture-v2',
  imports: [CommonModule, DynamicForm],
  templateUrl: './patient-capture-v2.html',
  styleUrl: './patient-capture-v2.scss',
})
export class PatientCaptureV2 implements OnInit, OnDestroy {
  LoadedSteps: any[][] = [];
  TOTAL = 0;

  currentStep = 0;
  activeTab: 'patient' | 'partner' = 'patient';
  showPartnerTab = false;
  completedSteps = new Set<number>();

  patientForms: FormGroup[] = [];
  partnerForms: FormGroup[] = [];

  toastMsg = '';
  toastVisible = false;

  @ViewChild('panelsScroll') panelsScroll!: ElementRef<HTMLElement>;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private formService: FormService,
    private dialogRef: MatDialogRef<PatientCaptureV2>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string }
  ) {}

  ngOnInit(): void {
    this.loadFormsFromApi();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormsFromApi(): void {
    this.formService.loadStepperWithSubForms()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.initializeLoadedSteps(data.forms);
        },
        error: (err) => {
          console.error('Error loading forms from API:', err);
          this.showToast('Error loading form definition');
        }
      });
  }

  private initializeLoadedSteps(forms: any[]): void {
    this.LoadedSteps = [];
    this.patientForms = [];
    this.partnerForms = [];

    forms.forEach((form: any) => {
      const patientForm = this.buildGroup(form.definition);
      this.patientForms.push(patientForm);

      const stepArray: any[] = [form];

      if (form.allowDynamicParticipants) {
        const partnerForm = this.buildGroup(form.definition);
        this.partnerForms.push(partnerForm);
        stepArray.push(form);
      } else {
        this.partnerForms.push(this.fb.group({}));
      }

      this.LoadedSteps.push(stepArray);
    });

    this.TOTAL = this.LoadedSteps.length;
  }

  private buildGroup(controls: any[]): FormGroup {
    const group: Record<string, any> = {};
    if (!controls) return this.fb.group(group);

    for (const c of controls) {
      const v = c.validators?.['required'] ? [Validators.required] : [];
      group[c.name] = ['', v];
    }
    return this.fb.group(group);
  }

  // ── Computed accessors ──────────────────────────────────────────────────────

  get currentStepDef(): any {
    return this.LoadedSteps[this.currentStep]?.[0];
  }

  get hasPartnerForCurrentStep(): boolean {
    return this.LoadedSteps[this.currentStep]?.length === 2;
  }

  get activeControls(): any[] {
    const def = this.currentStepDef;
    return def?.definition || [];
  }

  get activeFormGroup(): FormGroup {
    return this.activeTab === 'partner'
      ? this.partnerForms[this.currentStep]
      : this.patientForms[this.currentStep];
  }

  get progressPercent(): number {
    return this.TOTAL === 0 ? 0 : Math.round(((this.currentStep + 1) / this.TOTAL) * 100);
  }

  get isFirstStep(): boolean { return this.currentStep === 0; }
  get isLastStep(): boolean  { return this.currentStep === this.TOTAL - 1; }

  get partnerProgress(): string {
    const filled = this.partnerForms.filter(f => f.dirty).length;
    return filled === 0 ? 'Not started' : `${filled} / ${this.TOTAL} steps`;
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  goToStep(index: number): void {
    this.currentStep = index;
    this.activeTab = 'patient';
    this.scrollTop();
  }

  next(): void {
    if (this.isLastStep) return;
    this.completedSteps = new Set([...this.completedSteps, this.currentStep]);
    this.currentStep++;
    this.activeTab = 'patient';
    this.scrollTop();
  }

  previous(): void {
    if (this.isFirstStep) return;
    this.currentStep--;
    this.activeTab = 'patient';
    this.scrollTop();
  }

  switchTab(tab: 'patient' | 'partner'): void {
    this.activeTab = tab;
    this.scrollTop();
  }

  private scrollTop(): void {
    this.panelsScroll?.nativeElement?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Marital status ──────────────────────────────────────────────────────────

  onMaritalChange(status: string): void {
    if (status === 'married' && this.hasPartnerForCurrentStep) {
      this.showPartnerTab = true;
      this.showToast('Spouse / Partner tab enabled — switch tabs to capture their details', 3500);
    } else {
      this.showPartnerTab = false;
      this.activeTab = 'patient';
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  saveDraft(): void {
    this.showToast('Draft saved successfully');
  }

  submitForm(): void {
    const allValid = this.patientForms.every(f => f.valid);
    if (!allValid) {
      this.patientForms.forEach(f => f.markAllAsTouched());
      this.showToast('Please complete all required fields');
      return;
    }
    const payload = {
      patient: this.patientForms.map(f => f.value),
      partner: this.showPartnerTab ? this.partnerForms.map(f => f.value) : null,
    };
    console.log('PatientCaptureV2 submitted:', payload);
    this.showToast('Patient record submitted successfully!');
    setTimeout(() => this.dialogRef.close(payload), 1200);
  }

  close(): void {
    this.dialogRef.close();
  }

  showToast(msg: string, ms = 2800): void {
    this.toastMsg = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), ms);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.close(); }
}
