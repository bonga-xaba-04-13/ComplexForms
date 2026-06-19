import {
  Component, Inject, OnInit, HostListener, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JsonFormControl, ControlOption } from '../../models/form-fields';
import { DynamicForm } from './dynamic-form/dynamic-form';

// ── Option lists ─────────────────────────────────────────────────────────────

const OPT = {
  title: opt(['', 'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof']),
  gender: opt(['', 'Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other']),
  nationality: opt(['', 'South African', 'Zimbabwean', 'Mozambican', 'Malawian', 'Namibian', 'Botswanan', 'Other African', 'Other']),
  idType: opt(['South African ID', 'Passport', 'Asylum Permit', 'Work Permit']),
  race: opt(['', 'African / Black', 'Coloured', 'Indian / Asian', 'White', 'Other'], ['Prefer not to say', 'African / Black', 'Coloured', 'Indian / Asian', 'White', 'Other']),
  language: opt(['', 'isiZulu', 'isiXhosa', 'Afrikaans', 'English', 'Sepedi', 'Setswana', 'Sesotho', 'Xitsonga', 'Tshivenda', 'Other']),
  marital: [
    { value: 'single',   label: 'Single' },
    { value: 'married',  label: 'Married / Partnered' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed',  label: 'Widowed' },
  ] as ControlOption[],
  contact: opt(['Mobile', 'Email', 'WhatsApp', 'Home Phone']),
  province: opt(['', 'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Free State', 'Northern Cape']),
  country: opt(['South Africa', 'Zimbabwe', 'Mozambique', 'Other']),
  yesNo: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }] as ControlOption[],
  frequency: opt(['', 'Once daily', 'Twice daily', 'Three times daily', 'As needed', 'Weekly', 'Monthly']),
  smoke: opt(['', 'Never', 'Former', 'Occasional', 'Daily']),
  alcohol: opt(['', 'Never', 'Rarely', 'Social', 'Moderate', 'Heavy']),
  exercise: opt(['', 'None', '1-2x per week', '3-4x per week', 'Daily']),
  diet: opt(['', 'Omnivore', 'Vegetarian', 'Vegan', 'Halaal', 'Kosher', 'Other']),
  housing: opt(['', 'Own Home', 'Renting', 'Family', 'Government', 'Other']),
  income: opt(['', 'No income', 'R0–R10 000', 'R10 000–R25 000', 'R25 000–R50 000', 'R50 000+', 'Prefer not to say']),
  billing: opt(['', 'Medical Aid', 'Cash', 'Credit Card', 'EFT', 'Company Account']),
  relationship: opt(['', 'Spouse', 'Parent', 'Sibling', 'Child', 'Friend', 'Other']),
};

function opt(values: string[], labels?: string[]): ControlOption[] {
  return values.map((v, i) => ({ value: v, label: (labels ?? values)[i] || 'Select' }));
}

const CONDITIONS_OPTS: ControlOption[] = [
  'Diabetes', 'Hypertension', 'Asthma', 'Heart Disease', 'Cancer',
  'HIV/AIDS', 'Arthritis', 'Depression / Anxiety', 'Epilepsy', 'TB', 'Thyroid Disorder', 'Other',
].map(v => ({ value: v, label: v }));

const ALLERGY_OPTS: ControlOption[] = [
  'Penicillin', 'Sulfa drugs', 'NSAIDs', 'Aspirin', 'Latex', 'Pollen', 'Nuts', 'Shellfish', 'None',
].map(v => ({ value: v, label: v }));

const FAMILY_OPTS: ControlOption[] = [
  'Diabetes', 'Heart Disease', 'Cancer', 'Hypertension', 'Mental Illness', 'None',
].map(v => ({ value: v, label: v }));

const VACCINATION_OPTS: ControlOption[] = [
  'COVID-19', 'Flu Shot', 'Hepatitis B', 'Tetanus', 'Measles / MMR', 'HPV',
].map(v => ({ value: v, label: v }));

// ── Step definition ───────────────────────────────────────────────────────────

export interface StepDef {
  id: string;
  label: string;
  description: string;
  patientControls: JsonFormControl[];
  partnerControls: JsonFormControl[];
}

function ctrl(
  name: string, label: string, description: string,
  type: JsonFormControl['type'],
  extra: Partial<JsonFormControl> = {}
): JsonFormControl {
  return { name, label, description, type, validators: {}, ...extra };
}

function required(c: JsonFormControl): JsonFormControl {
  return { ...c, validators: { ...c.validators, required: true } };
}

// Base personal controls shared between patient and partner (no marital field for partner)
function personalBase(prefix: string): JsonFormControl[] {
  return [
    ctrl(`${prefix}title`,         'Title',                 'Select title',                    'select', { options: OPT.title }),
    required(ctrl(`${prefix}firstName`,    'First Name',            'e.g. Sipho',                      'text')),
    ctrl(`${prefix}middleName`,    'Middle Name',           'Optional',                        'text'),
    required(ctrl(`${prefix}lastName`,     'Last Name / Surname',   'e.g. Dlamini',                    'text')),
    ctrl(`${prefix}preferredName`, 'Preferred Name',        'If different from first name',     'text'),
    required(ctrl(`${prefix}dob`,          'Date of Birth',         '',                                'date')),
    required(ctrl(`${prefix}gender`,       'Gender',                'Select',                          'select', { options: OPT.gender })),
    ctrl(`${prefix}nationality`,   'Nationality',           'Select',                          'select', { options: OPT.nationality }),
    ctrl(`${prefix}idType`,        'ID Type',               'Select',                          'select', { options: OPT.idType }),
    required(ctrl(`${prefix}idNumber`,     'ID / Passport Number',  '13-digit SA ID or passport',      'text', { span2: true })),
    ctrl(`${prefix}race`,          'Race / Population Group','Optional — used for equitable health reporting', 'select', { options: OPT.race }),
    ctrl(`${prefix}language`,      'Home Language',         'Select',                          'select', { options: OPT.language }),
  ];
}

function contactBase(prefix: string): JsonFormControl[] {
  return [
    required(ctrl(`${prefix}mobile`,          'Mobile Number',          '+27 82 000 0000',             'tel')),
    ctrl(`${prefix}altPhone`,        'Alternate Phone',        '',                            'tel'),
    required(ctrl(`${prefix}email`,            'Email Address',          'patient@example.com',         'email')),
    ctrl(`${prefix}preferredContact`, 'Preferred Contact Method','Select',                   'select', { options: OPT.contact }),
    required(ctrl(`${prefix}street`,           'Street Address / Unit',  'e.g. 12 Oak Ave, Unit 3B',    'text',   { span2: true })),
    ctrl(`${prefix}suburb`,          'Suburb / Township',      '',                            'text'),
    required(ctrl(`${prefix}city`,             'City / Town',            '',                            'text')),
    ctrl(`${prefix}province`,        'Province',               'Select',                      'select', { options: OPT.province }),
    ctrl(`${prefix}postalCode`,      'Postal Code',            '4-digit code',                'text'),
    ctrl(`${prefix}country`,         'Country',                'Select',                      'select', { options: OPT.country }),
  ];
}

function medHistoryControls(prefix: string): JsonFormControl[] {
  return [
    ctrl(`${prefix}conditions`,          'Pre-existing Conditions',       'Select all that apply',                    'check', { options: CONDITIONS_OPTS }),
    ctrl(`${prefix}conditionsOther`,     'Other / Additional Diagnoses',  'List additional conditions or details…',   'textarea'),
    ctrl(`${prefix}allergies`,           'Known Allergies',               'Select all that apply',                    'check', { options: ALLERGY_OPTS }),
    ctrl(`${prefix}allergyDescription`,  'Describe Allergic Reactions',   'Reaction type and severity…',              'textarea'),
    ctrl(`${prefix}familyHistory`,       'Family Medical History',        'Select all that apply',                    'check', { options: FAMILY_OPTS }),
    ctrl(`${prefix}surgeries`,           'Previous Surgeries / Hospitalisations', 'List with approximate dates…',     'textarea'),
  ];
}

function medicationControls(prefix: string): JsonFormControl[] {
  return [
    ctrl(`${prefix}onMeds`,             'Currently on Medication?',    'Select',             'radio', { options: OPT.yesNo }),
    ctrl(`${prefix}medicationName`,     'Medication Name',             '',                   'text'),
    ctrl(`${prefix}dosage`,             'Dosage',                      'e.g. 10 mg',         'text'),
    ctrl(`${prefix}frequency`,          'Frequency',                   'Select',             'select', { options: OPT.frequency }),
    ctrl(`${prefix}prescribingDoctor`,  'Prescribing Doctor',          '',                   'text'),
    ctrl(`${prefix}conditionTreated`,   'Condition Being Treated',     '',                   'text'),
    ctrl(`${prefix}herbal`,             'Using Herbal / Supplements?', 'Select',             'radio', { options: OPT.yesNo }),
    ctrl(`${prefix}herbalDescription`,  'Describe Herbal / Supplements','Names and dosages…','textarea'),
    ctrl(`${prefix}vaccinations`,       'Vaccination History',          'Select all received','check', { options: VACCINATION_OPTS }),
  ];
}

function lifestyleControls(prefix: string): JsonFormControl[] {
  return [
    ctrl(`${prefix}smoking`,     'Smoking Status',     'Select',  'select', { options: OPT.smoke }),
    ctrl(`${prefix}alcohol`,     'Alcohol Use',        'Select',  'select', { options: OPT.alcohol }),
    ctrl(`${prefix}exercise`,    'Exercise Frequency', 'Select',  'select', { options: OPT.exercise }),
    ctrl(`${prefix}diet`,        'Dietary Preference', 'Select',  'select', { options: OPT.diet }),
    ctrl(`${prefix}occupation`,  'Occupation',         '',         'text'),
    ctrl(`${prefix}employer`,    'Employer',           '',         'text'),
    ctrl(`${prefix}housing`,     'Housing Situation',  'Select',  'select', { options: OPT.housing }),
    ctrl(`${prefix}dependants`,  'Number of Dependants','',        'number'),
    ctrl(`${prefix}income`,      'Monthly Income Range','Select',  'select', { options: OPT.income }),
  ];
}

function insuranceControls(prefix: string): JsonFormControl[] {
  return [
    ctrl(`${prefix}hasMedicalAid`,      'Has Medical Aid?',           'Select',             'radio',  { options: OPT.yesNo }),
    ctrl(`${prefix}scheme`,             'Medical Aid Scheme',         'e.g. Discovery',     'text'),
    ctrl(`${prefix}plan`,               'Plan / Option',              '',                   'text'),
    ctrl(`${prefix}membershipNumber`,   'Membership Number',          '',                   'text'),
    ctrl(`${prefix}dependantCode`,      'Dependant Code',             '00 for main member', 'text'),
    ctrl(`${prefix}mainMember`,         'Main Member Name',           '',                   'text'),
    ctrl(`${prefix}authNumber`,         'Authorisation Number',       '',                   'text'),
    ctrl(`${prefix}billingMethod`,      'Billing Method',             'Select',             'select', { options: OPT.billing }),
    ctrl(`${prefix}billingEmail`,       'Billing Email',              '',                   'email', { span2: true }),
  ];
}

function emergencyControls(prefix: string): JsonFormControl[] {
  return [
    required(ctrl(`${prefix}ec1FullName`,      'Contact 1 — Full Name',    '',               'text')),
    required(ctrl(`${prefix}ec1Relationship`,  'Relationship',              'Select',         'select', { options: OPT.relationship })),
    required(ctrl(`${prefix}ec1Mobile`,        'Mobile Number',             '+27 82 000 0000','tel')),
    ctrl(`${prefix}ec1Phone`,        'Home Phone',                '',               'tel'),
    ctrl(`${prefix}ec1Email`,        'Email',                     '',               'email'),
    ctrl(`${prefix}ec2FullName`,     'Contact 2 — Full Name',    '',               'text'),
    ctrl(`${prefix}ec2Relationship`, 'Relationship',              'Select',         'select', { options: OPT.relationship }),
    ctrl(`${prefix}ec2Mobile`,       'Mobile Number',             '',               'tel'),
    ctrl(`${prefix}ec2Email`,        'Email',                     '',               'email'),
  ];
}

export const STEP_DEFS: StepDef[] = [
  {
    id: 'personal',
    label: 'Personal Information',
    description: 'Search for an existing patient record to auto-fill, or enter new details below.',
    patientControls: [
      ...personalBase('p_'),
      {
        name: 'p_maritalStatus',
        label: 'Marital Status',
        description: 'Selecting "Married / Partnered" enables the spouse/partner tab throughout all sections.',
        type: 'radio',
        validators: { required: true },
        options: OPT.marital,
        span2: true,
      },
    ],
    partnerControls: personalBase('s_'),
  },
  {
    id: 'contact',
    label: 'Contact Details',
    description: 'Primary contact information, address, and referring practitioner.',
    patientControls: contactBase('p_'),
    partnerControls: contactBase('s_'),
  },
  {
    id: 'medical',
    label: 'Medical History',
    description: 'Pre-existing conditions, surgical history, allergies, and family background.',
    patientControls: medHistoryControls('p_'),
    partnerControls: medHistoryControls('s_'),
  },
  {
    id: 'medications',
    label: 'Current Medications',
    description: 'List all current medications, supplements, and vaccination history.',
    patientControls: medicationControls('p_'),
    partnerControls: medicationControls('s_'),
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle & Social',
    description: 'Lifestyle habits, social context, and occupational details.',
    patientControls: lifestyleControls('p_'),
    partnerControls: lifestyleControls('s_'),
  },
  {
    id: 'insurance',
    label: 'Insurance & Financial',
    description: 'Medical aid, gap cover, and billing preferences.',
    patientControls: insuranceControls('p_'),
    partnerControls: insuranceControls('s_'),
  },
  {
    id: 'emergency',
    label: 'Emergency Contacts',
    description: 'Provide at least one emergency contact person.',
    patientControls: emergencyControls('p_'),
    partnerControls: emergencyControls('s_'),
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  standalone: true,
  selector: 'app-patient-capture-v2',
  imports: [CommonModule, DynamicForm],
  templateUrl: './patient-capture-v2.html',
  styleUrl: './patient-capture-v2.scss',
})
export class PatientCaptureV2 implements OnInit {
  readonly STEP_DEFS = STEP_DEFS;
  readonly TOTAL = STEP_DEFS.length;

  currentStep = 0;
  activeTab: 'patient' | 'partner' = 'patient';
  showPartnerTab = false;
  completedSteps = new Set<number>();

  patientForms: FormGroup[] = [];
  partnerForms: FormGroup[] = [];

  toastMsg = '';
  toastVisible = false;

  @ViewChild('panelsScroll') panelsScroll!: ElementRef<HTMLElement>;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PatientCaptureV2>,
    @Inject(MAT_DIALOG_DATA) public data: { title?: string }
  ) {}

  ngOnInit(): void {
    this.patientForms = STEP_DEFS.map(step => this.buildGroup(step.patientControls));
    this.partnerForms = STEP_DEFS.map(step => this.buildGroup(step.partnerControls));
  }

  private buildGroup(controls: JsonFormControl[]): FormGroup {
    const group: Record<string, any> = {};
    for (const c of controls) {
      const v = c.validators?.['required'] ? [Validators.required] : [];
      group[c.name] = ['', v];
    }
    return this.fb.group(group);
  }

  // ── Computed accessors ──────────────────────────────────────────────────────

  get currentStepDef(): StepDef {
    return STEP_DEFS[this.currentStep];
  }

  get activeControls(): JsonFormControl[] {
    return this.activeTab === 'partner'
      ? this.currentStepDef.partnerControls
      : this.currentStepDef.patientControls;
  }

  get activeFormGroup(): FormGroup {
    return this.activeTab === 'partner'
      ? this.partnerForms[this.currentStep]
      : this.patientForms[this.currentStep];
  }

  get progressPercent(): number {
    return Math.round(((this.currentStep + 1) / this.TOTAL) * 100);
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
    if (status === 'married') {
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
