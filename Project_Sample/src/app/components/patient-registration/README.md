# Patient Registration Component

**Branch:** `mock-dev2` (completely isolated from `mock-dev1`)

## Overview

A standalone Angular patient registration form component with 3 steps:
1. **Personal Information** - Demographics, contact details
2. **Medical & Insurance** - Medical history, insurance information
3. **Consent & Additional Info** - Emergency contact, authorizations

## Structure

```
patient-registration/
├── patient-registration.component.ts         Main orchestrator component
├── patient-registration.component.html       Template
├── patient-registration.component.scss       Component styles (imports shared)
├── models/
│   └── index.ts                            Minimal interfaces (4 only)
├── shared/
│   ├── form-control-renderer.component.ts  Generic control renderer
│   └── patient-registration-styles.scss    Shared SCSS variables & styles
└── index.ts                                Export barrel
```

## Key Features

### Minimal Interfaces (Only 4)

1. **FormFieldControl** - Individual field definition
2. **StepDefinition** - Step structure with fields
3. **StepperFormDefinition** - Complete stepper from backend
4. **Payload** - Output structure (step1, step2, step3)

### Generic Child Component

**FormControlRendererComponent** handles all control types:
- Text, Email, Tel, Number, Date inputs
- Textarea, Select dropdown
- Checkbox (single), Checkgroup (multiple), Radio buttons

### State Management

- **Minimum state**: currentStep, completedSteps, forms array
- Form validation happens before step advancement
- Error modal for validation failures
- Toast notifications for user feedback

## Usage

```typescript
import { PatientRegistrationComponent } from './components/patient-registration';

@Component({
  imports: [PatientRegistrationComponent],
  template: `<app-patient-registration></app-patient-registration>`
})
export class YourComponent {}
```

## API Integration (Next Phase)

Currently uses mock data. To integrate backend API:

1. Replace `getMockStepperDefinition()` with HTTP call:
```typescript
this.httpClient.get<StepperFormDefinition>(
  '/api/forms/patient_registration_stepper'
)
```

2. Pass stepper definition to `initializeSteps()`

## Control Types Supported

- `text` - Single-line text input
- `email` - Email input
- `tel` - Telephone input
- `date` - Date picker
- `number` - Numeric input
- `textarea` - Multi-line text
- `select` - Dropdown list
- `checkbox` - Single checkbox
- `checkgroup` - Multiple checkboxes
- `radio` - Radio buttons

## Form State

Each step maintains its own FormGroup:
```typescript
forms[0] = FormGroup({firstName, lastName, email, ...})
forms[1] = FormGroup({medications, allergies, insurance, ...})
forms[2] = FormGroup({emergencyContact, consents, ...})
```

## Validation

- **Required fields** marked with `*`
- Validation occurs before advancing to next step
- Error modal shows field-level validation errors
- Submit blocked until all required fields complete

## Output

Payload structure on submit:
```typescript
{
  step1: { firstName: 'John', lastName: 'Doe', ... },
  step2: { medications: '...', allergies: '...', ... },
  step3: { emergencyContact: 'Jane', ... },
  timestamp: '2026-07-04T...',
  completed: true
}
```

## Styling

- **SCSS-based** - No Material Design for forms
- **Responsive** - Breakpoints at 1024px and 768px
- **CSS variables** - Colors defined in shared SCSS
- **Standalone** - No shared styles with mock-dev1

## Next Steps

### Phase 2: Services
- `FormLoaderService` - Backend form definition loading
- `FormStateService` - Centralized state management
- `PayloadBuilderService` - Payload assembly logic

### Phase 3: Features
- Draft saving/restoration
- Conditional field visibility
- Custom validators (insurance type → policy field enable/disable)
- Joint/partner capture mode (if needed)

## Testing

Unit tests should cover:
- Form step navigation
- Validation before advancement
- Payload generation
- Control rendering for each type
- Error modal display

## Notes

- **Complete isolation** - No shared services with mock-dev1
- **Mock data** - Replace with backend API calls in Phase 2
- **Extensible** - Easy to add new fields or steps
- **Type-safe** - TypeScript interfaces for all data structures

## Current Phase Status

✅ **Phase 1 Complete**
- Component scaffold
- Generic form control renderer
- SCSS styling
- Mock stepper definition
- Basic form navigation & validation

⏳ **Phase 2 (Next)**
- Form loader service
- Form state service
- Backend API integration
