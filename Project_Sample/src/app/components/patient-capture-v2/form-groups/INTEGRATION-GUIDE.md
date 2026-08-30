# Integration Guide: Using Form Components in PatientCaptureV2

## ✅ All 7 Form Components Created

```
form-groups/
├── personal-info-form/
│   └── personal-info-form.ts              ✅
├── contact-info-form/
│   └── contact-info-form.ts               ✅
├── medical-history-form/
│   └── medical-history-form.ts            ✅
├── medications-form/
│   └── medications-form.ts                ✅
├── lifestyle-form/
│   └── lifestyle-form.ts                  ✅
├── insurance-form/
│   └── insurance-form.ts                  ✅
├── emergency-contacts-form/
│   └── emergency-contacts-form.ts         ✅
├── shared-form.html                       ✅ (used by all)
├── shared-form.scss                       ✅ (used by all)
└── base-form-group.ts                     ✅ (base class)
```

## How to Integrate

### Step 1: Import All Form Components in PatientCaptureV2

```typescript
// patient-capture-v2.ts
import { PersonalInfoForm } from './form-groups/personal-info-form/personal-info-form';
import { ContactInfoForm } from './form-groups/contact-info-form/contact-info-form';
import { MedicalHistoryForm } from './form-groups/medical-history-form/medical-history-form';
import { MedicationsForm } from './form-groups/medications-form/medications-form';
import { LifestyleForm } from './form-groups/lifestyle-form/lifestyle-form';
import { InsuranceForm } from './form-groups/insurance-form/insurance-form';
import { EmergencyContactsForm } from './form-groups/emergency-contacts-form/emergency-contacts-form';

@Component({
  standalone: true,
  imports: [
    CommonModule,
    // Add all form components
    PersonalInfoForm,
    ContactInfoForm,
    MedicalHistoryForm,
    MedicationsForm,
    LifestyleForm,
    InsuranceForm,
    EmergencyContactsForm,
    // Keep DynamicForm as fallback
    DynamicForm
  ],
  // ... rest of component
})
export class PatientCaptureV2 { ... }
```

### Step 2: Update the Template

Replace the generic form with conditional rendering:

```html
<!-- OLD: Generic form for all types -->
<!-- <app-dynamic-form
  [controls]="activeControls"
  [formGroup]="activeFormGroup"
  (maritalChanged)="onMaritalChange($event)">
</app-dynamic-form> -->

<!-- NEW: Form-specific components -->
<ng-container [ngSwitch]="getFormGroupType(currentStepDef)">
  <!-- Personal Information -->
  <app-personal-info-form
    *ngSwitchCase="'personal'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true"
    (fieldChanged)="onFieldChanged($event)">
  </app-personal-info-form>

  <!-- Contact Details -->
  <app-contact-info-form
    *ngSwitchCase="'contact'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true">
  </app-contact-info-form>

  <!-- Medical History -->
  <app-medical-history-form
    *ngSwitchCase="'medical'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true">
  </app-medical-history-form>

  <!-- Medications -->
  <app-medications-form
    *ngSwitchCase="'medications'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true">
  </app-medications-form>

  <!-- Lifestyle & Social -->
  <app-lifestyle-form
    *ngSwitchCase="'lifestyle'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true">
  </app-lifestyle-form>

  <!-- Insurance & Financial -->
  <app-insurance-form
    *ngSwitchCase="'insurance'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true">
  </app-insurance-form>

  <!-- Emergency Contacts -->
  <app-emergency-contacts-form
    *ngSwitchCase="'emergency'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    [isEditing]="true">
  </app-emergency-contacts-form>

  <!-- Fallback to generic for unknown types -->
  <app-dynamic-form
    *ngSwitchDefault
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel || ''"
    [stepDescription]="currentStepDef?.formDescription || ''"
    [isPartner]="activeTab === 'partner'"
    (maritalChanged)="onMaritalChange($event)">
  </app-dynamic-form>
</ng-container>
```

### Step 3: Update Form Type Detection

The form type detection in `FormGroupRegistry` now returns these types:
- `'personal'` → PersonalInfoForm
- `'contact'` → ContactInfoForm  
- `'medical'` → MedicalHistoryForm
- `'medications'` → MedicationsForm
- `'lifestyle'` → LifestyleForm
- `'insurance'` → InsuranceForm
- `'emergency'` → EmergencyContactsForm

If detection doesn't match, you may need to add custom patterns in `FormGroupRegistry.addCustomFormType()`.

### Step 4: Add Parent Method to Handle Field Changes

Optional: If you want to handle field changes from child components:

```typescript
// In PatientCaptureV2
onFieldChanged(event: { fieldName: string; value: any }): void {
  // Handle marital status change to enable/disable partner tab
  if (event.fieldName === 'maritalStatus') {
    this.onMaritalChange(event.value);
  }
  // Handle other field changes as needed
}
```

## What Each Component Handles

### PersonalInfoForm
- Title, first name, middle name, last name, preferred name
- Date of birth, gender
- Nationality (combobox with DB search)
- ID type, ID number
- Race / Population group
- Language (combobox with DB search)
- Marital status (emits to parent for partner tab)
- **DB Fields**: nationality, language

### ContactInfoForm
- Mobile, alternate phone
- Email
- Preferred contact method (select from DB)
- Street address, suburb
- City (combobox with DB search)
- Province (select from DB)
- Postal code
- Country (select from DB)
- **DB Fields**: province, country, contact_method, city

### MedicalHistoryForm
- Pre-existing conditions (checkboxes from DB)
- Other diagnoses (textarea)
- Allergies (checkboxes from DB)
- Allergy description (textarea)
- Family medical history (checkboxes from DB)
- Previous surgeries (textarea)
- **DB Fields**: conditions, allergy, family_history

### MedicationsForm
- Currently on medication? (radio)
- Medication name (combobox with DB search)
- Dosage, frequency (select from DB)
- Prescribing doctor
- Condition treated
- Using herbal/supplements? (radio)
- Herbal description (textarea)
- Vaccinations (checkboxes from DB)
- **DB Fields**: medication, frequency, vaccination

### LifestyleForm
- Smoking status (select from DB)
- Alcohol use (select from DB)
- Exercise frequency (select from DB)
- Dietary preference (select from DB)
- Occupation (combobox with DB search)
- Employer (text)
- Housing situation (select from DB)
- Number of dependants (number)
- Monthly income range (select from DB)
- **DB Fields**: smoking, alcohol, exercise, diet, housing, income, occupation

### InsuranceForm
- Has medical aid? (radio)
- Medical aid scheme (combobox with DB search)
- Plan / Option
- Membership number, dependant code
- Main member name
- Authorization number
- Billing method (select from DB)
- Billing email
- **DB Fields**: medical_scheme, billing_method

### EmergencyContactsForm
- Contact 1: Full name, relationship (combobox search), mobile, phone, email
- Contact 2: Same fields as contact 1
- **DB Fields**: relationship (on-demand search)

## Key Features

✅ **Form-specific logic** — Each component manages its own field dependencies
✅ **DB-driven options** — Components fetch options from DB using categoryId
✅ **Combobox search** — User types to search, results from DB
✅ **Select cascading** — Some selects fetch dependent options
✅ **Shared template** — All components reuse the same responsive HTML/SCSS
✅ **Clean parent** — PatientCaptureV2 unchanged except for template update
✅ **Fallback support** — DynamicForm still available for unknown types

## API Requirements

Your backend must support:

```
GET /api/options/category/{categoryId}
  → Returns: [{ label: string, value: string }, ...]

GET /api/options/combobox?field={fieldName}&q={searchQuery}
  → Returns: [{ label: string, value: string, ... }, ...]
```

The FormService handles these calls and caches results automatically.

## Build Status

✅ **No errors, builds successfully**

## Next: Testing

Run your app and:
1. Verify form type detection logs in console (should show form types now)
2. Test each form component appears for its type
3. Test combobox search works (types → DB search → results)
4. Test select options load from DB
5. Test marital status change enables partner tab (PersonalInfoForm)
6. Test form submission collects all data correctly
