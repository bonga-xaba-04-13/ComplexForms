import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { FormControlRendererComponent } from './shared/form-control-renderer.component';
import { StepperFormDefinition, StepDefinition, Payload } from './models/index';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-patient-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormControlRendererComponent],
  templateUrl: './patient-registration.component.html',
  styleUrl: './patient-registration.component.scss',
})
export class PatientRegistrationComponent implements OnInit, OnDestroy {
  currentStep = 0;
  completedSteps = new Set<number>();
  forms: FormGroup[] = [];
  steps: StepDefinition[] = [];

  toastMessage = '';
  toastVisible = false;
  toastType: 'success' | 'error' | 'info' = 'success';

  errorModalVisible = false;
  errorModalMessage = '';
  errorModalDetails: string[] = [];

  loadingForms = true;
  loadError = false;

  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.loadFormDefinition();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormDefinition() {
    // Simulate API call - will be replaced with actual HTTP call
    setTimeout(() => {
      const mockStepper = this.getMockStepperDefinition();
      this.initializeSteps(mockStepper);
      this.loadingForms = false;
    }, 500);
  }

  private getMockStepperDefinition(): StepperFormDefinition {
    return {
      totalSteps: 3,
      steps: [
        {
          stepId: 0,
          title: 'Personal Information',
          subtitle: 'Enter your personal details',
          fields: [
            {
              name: 'firstName',
              label: 'First Name',
              type: 'text',
              placeholder: 'John',
              required: true,
            },
            {
              name: 'lastName',
              label: 'Last Name',
              type: 'text',
              placeholder: 'Doe',
              required: true,
            },
            {
              name: 'middleName',
              label: 'Middle Name',
              type: 'text',
              placeholder: 'Optional',
              required: false,
            },
            {
              name: 'email',
              label: 'Email Address',
              type: 'email',
              placeholder: 'john@example.com',
              required: true,
            },
            {
              name: 'phone',
              label: 'Phone Number',
              type: 'tel',
              placeholder: '+1 (555) 123-4567',
              required: true,
            },
            {
              name: 'dob',
              label: 'Date of Birth',
              type: 'date',
              required: true,
            },
            {
              name: 'gender',
              label: 'Gender',
              type: 'select',
              required: true,
              options: [
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
                { label: 'Other', value: 'other' },
              ],
            },
            {
              name: 'address',
              label: 'Address',
              type: 'text',
              placeholder: '123 Main Street',
              required: true,
            },
            {
              name: 'city',
              label: 'City',
              type: 'text',
              placeholder: 'New York',
              required: true,
            },
            {
              name: 'postalCode',
              label: 'Postal Code',
              type: 'text',
              placeholder: '10001',
              required: true,
            },
            {
              name: 'preferredLanguage',
              label: 'Preferred Language',
              type: 'select',
              required: false,
              options: [
                { label: 'English', value: 'english' },
                { label: 'Spanish', value: 'spanish' },
                { label: 'Mandarin', value: 'mandarin' },
              ],
            },
            {
              name: 'maritalStatus',
              label: 'Marital Status',
              type: 'select',
              required: false,
              options: [
                { label: 'Single', value: 'single' },
                { label: 'Married', value: 'married' },
                { label: 'Divorced', value: 'divorced' },
              ],
            },
          ],
        },
        {
          stepId: 1,
          title: 'Medical & Insurance Details',
          subtitle: 'Provide your medical and insurance information',
          fields: [
            {
              name: 'currentMedications',
              label: 'Current Medications',
              type: 'textarea',
              placeholder: 'List medications...',
              rows: 4,
            },
            {
              name: 'drugAllergies',
              label: 'Drug Allergies',
              type: 'textarea',
              placeholder: 'List drug allergies...',
              rows: 4,
            },
            {
              name: 'chronicConditions',
              label: 'Chronic Conditions',
              type: 'checkgroup',
              options: [
                { label: 'Diabetes', value: 'diabetes' },
                { label: 'Hypertension', value: 'hypertension' },
                { label: 'Asthma', value: 'asthma' },
                { label: 'Heart Disease', value: 'heart-disease' },
                { label: 'Arthritis', value: 'arthritis' },
                { label: 'COPD', value: 'copd' },
              ],
            },
            {
              name: 'insuranceProvider',
              label: 'Insurance Provider Name',
              type: 'text',
              placeholder: 'Blue Cross',
            },
            {
              name: 'insuranceType',
              label: 'Insurance Type',
              type: 'select',
              options: [
                { label: 'HMO', value: 'hmo' },
                { label: 'PPO', value: 'ppo' },
                { label: 'Medicare', value: 'medicare' },
              ],
            },
            {
              name: 'policyNumber',
              label: 'Policy Number',
              type: 'text',
              placeholder: 'Your policy number',
            },
            {
              name: 'primaryCarePhysician',
              label: 'Primary Care Physician Name',
              type: 'text',
              placeholder: 'Dr. Smith',
            },
          ],
        },
        {
          stepId: 2,
          title: 'Consent & Additional Information',
          subtitle: 'Complete authorization and preferences',
          fields: [
            {
              name: 'emergencyContactName',
              label: 'Emergency Contact Name',
              type: 'text',
              placeholder: 'Contact Name',
              required: true,
            },
            {
              name: 'emergencyContactPhone',
              label: 'Emergency Contact Phone',
              type: 'tel',
              placeholder: '+1 (555) 987-6543',
              required: true,
            },
            {
              name: 'relationship',
              label: 'Relationship',
              type: 'select',
              required: true,
              options: [
                { label: 'Spouse', value: 'spouse' },
                { label: 'Parent', value: 'parent' },
                { label: 'Child', value: 'child' },
                { label: 'Sibling', value: 'sibling' },
              ],
            },
            {
              name: 'consentToTreatment',
              label: 'I consent to medical treatment',
              type: 'radio',
              required: true,
              options: [
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ],
            },
            {
              name: 'medicalRecordsAuthorization',
              label: 'I authorize access to my medical records',
              type: 'checkbox',
              required: true,
            },
            {
              name: 'hipaaAuthorization',
              label: 'I acknowledge HIPAA privacy notice',
              type: 'checkbox',
              required: true,
            },
            {
              name: 'preferredContactMethod',
              label: 'Preferred Contact Method',
              type: 'radio',
              required: true,
              options: [
                { label: 'Phone Call', value: 'phone' },
                { label: 'Email', value: 'email' },
                { label: 'Text Message', value: 'text' },
              ],
            },
          ],
        },
      ],
    };
  }

  private initializeSteps(stepper: StepperFormDefinition) {
    this.steps = stepper.steps;
    this.forms = stepper.steps.map(() => this.fb.group({}));
  }

  goToStep(stepIndex: number) {
    if (this.isStepAccessible(stepIndex) && this.validateCurrentStep()) {
      this.saveStepData();
      this.currentStep = stepIndex;
    }
  }

  previousStep() {
    if (this.currentStep > 0) {
      this.saveStepData();
      this.currentStep--;
    }
  }

  nextStep() {
    if (this.validateCurrentStep()) {
      this.saveStepData();
      this.completedSteps.add(this.currentStep);
      if (this.currentStep < this.steps.length - 1) {
        this.currentStep++;
      }
    }
  }

  submitForm() {
    if (this.validateCurrentStep()) {
      this.saveStepData();
      const payload = this.buildPayload();
      this.showToast('Form submitted successfully!', 'success');
      console.log('Form Payload:', payload);
      // Here you would send the payload to your backend
    }
  }

  private validateCurrentStep(): boolean {
    const form = this.forms[this.currentStep];
    if (!form.valid) {
      const errors = this.getFormErrors(form);
      this.showErrorModal('Please fill in all required fields', errors);
      return false;
    }
    return true;
  }

  private isCurrentStepComplete(): boolean {
    return this.completedSteps.has(this.currentStep);
  }

  private saveStepData() {
    // Form data is automatically managed by FormGroup
  }

  private buildPayload(): Payload {
    const payload: any = {
      step1: {},
      step2: {},
      step3: {},
      timestamp: new Date().toISOString(),
      completed: true,
    };

    this.forms.forEach((form, index) => {
      const stepKey = `step${index + 1}`;
      payload[stepKey] = form.value;
    });

    return payload;
  }

  private getFormErrors(form: FormGroup): string[] {
    const errors: string[] = [];
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control && control.invalid && control.touched) {
        errors.push(`${key}: Invalid value`);
      }
    });
    return errors;
  }

  private showErrorModal(message: string, details: string[]) {
    this.errorModalMessage = message;
    this.errorModalDetails = details;
    this.errorModalVisible = true;
  }

  closeErrorModal() {
    this.errorModalVisible = false;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.toastVisible = true;
    setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }

  get currentStepData(): StepDefinition | null {
    return this.steps[this.currentStep] || null;
  }

  get canProceed(): boolean {
    return this.currentStep < this.steps.length - 1;
  }

  get isLastStep(): boolean {
    return this.currentStep === this.steps.length - 1;
  }

  get stepProgress(): string {
    return `Step ${this.currentStep + 1} of ${this.steps.length}`;
  }

  isStepAccessible(stepIndex: number): boolean {
    if (stepIndex <= this.currentStep) return true;
    if (stepIndex === this.currentStep + 1 && this.isCurrentStepComplete()) return true;
    return false;
  }
}
