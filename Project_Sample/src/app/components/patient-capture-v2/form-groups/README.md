# Form Groups Architecture

This folder contains form-group-specific components that replace the generic `DynamicForm` component.

## Structure

```
form-groups/
├── base-form-group.ts          # Base class for all form components
├── form-group-registry.ts      # Identifies and maps form types
├── README.md                   # This file
├── personal-info-form/         # (To be created in Phase 2)
│   ├── personal-info-form.ts
│   ├── personal-info-form.html
│   └── personal-info-form.scss
├── medical-history-form/       # (To be created in Phase 2)
│   ├── medical-history-form.ts
│   ├── medical-history-form.html
│   └── medical-history-form.scss
└── ... (more form-group components as needed)
```

## Form Type Identification

The `FormGroupRegistry` automatically identifies form types based on control names:

### Supported Types

- **personal**: firstName, lastName, dateOfBirth, gender, maritalStatus, nationalId, etc.
- **medical**: medicalCondition, allergies, medications, bloodType, previousSurgeries, etc.
- **contact**: email, phone, address, city, country, zipCode, etc.
- **demographics**: occupation, education, religion, ethnicity, language, etc.
- **unknown**: Falls back when no patterns match

### Detection in Action

When forms are loaded, `PatientCaptureV2` logs form type detection:

```
[FormGroupRegistry] Form: "patient_medical_history"
{
  detectedType: "medical",
  confidence: "75%",
  matchedFields: ["medicalCondition", "allergies", "bloodType"],
  totalControls: 8
}
```

## Creating a New Form Group Component

### Template

```typescript
// personal-info-form.ts
import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { JsonFormControl } from '../../../models/form-fields';

@Component({
  standalone: true,
  selector: 'app-personal-info-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-info-form.html',
  styleUrl: './personal-info-form.scss',
})
export class PersonalInfoForm extends BaseFormGroup implements OnChanges {
  ngOnChanges(changes: SimpleChanges): void {
    // Reset state on input changes
    if (changes['controls'] || changes['formGroup']) {
      this.initializeComponent();
    }
  }

  private initializeComponent(): void {
    // Component-specific initialization
  }

  onMaritalStatusChange(value: string): void {
    // Handle marital status specific logic
    this.emitFieldChange('maritalStatus', value);
  }
}
```

### Key Features

Each form-group component:
- Extends `BaseFormGroup`
- Manages form controls specific to that group
- Handles field dependencies (e.g., show spouse field if married)
- Fetches combobox options from DB as needed
- Emits field changes for cross-component communication
- Has isolated styling (no style leakage)

## Integration with PatientCaptureV2

In `patient-capture-v2.html`, replace the generic form with conditional rendering:

```html
<ng-container [ngSwitch]="getFormGroupType(currentStepDef)">
  <app-personal-info-form 
    *ngSwitchCase="'personal'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [isPartner]="activeTab === 'partner'"
    (fieldChanged)="onFieldChanged($event)">
  </app-personal-info-form>
  
  <app-medical-history-form
    *ngSwitchCase="'medical'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [isPartner]="activeTab === 'partner'"
    (fieldChanged)="onFieldChanged($event)">
  </app-medical-history-form>
  
  <!-- Fallback to generic if type unknown -->
  <app-dynamic-form
    *ngSwitchDefault
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [isPartner]="activeTab === 'partner'">
  </app-dynamic-form>
</ng-container>
```

## Extending Form Type Detection

To add custom form type patterns:

```typescript
// In your component or service
FormGroupRegistry.addCustomFormType('insurance', [
  'insuranceProvider',
  'policyNumber',
  'coverageType',
  'deductible'
]);
```

## Next Steps (Phase 2)

1. Check browser console for form type detection logs
2. Identify your actual form types and their field names
3. Create specific components for each type
4. Implement field dependencies and DB-driven options
