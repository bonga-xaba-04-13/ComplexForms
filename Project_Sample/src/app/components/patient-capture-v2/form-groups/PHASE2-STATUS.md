# Phase 2 Status: Form-Group-Specific Components

## ✅ Completed

### Infrastructure Built

1. **Enhanced BaseFormGroup** (`base-form-group.ts`)
   - Added combobox/select suggestion management
   - Added common methods: `onComboboxInput()`, `selectSuggestion()`, `onSelectChange()`
   - Ready for child components to override and extend

2. **FormService Enhanced** (`form.service.ts`)
   - Added `searchComboboxOptions(fieldName, searchQuery)` — DB search for combobox
   - Added `getSelectOptions(fieldName)` — Fetch select options from DB with caching
   - Added `getDependentOptions(fieldName, parentValue)` — Cascade options for dependent fields
   - Added `clearOptionsCache()` — Clear cache on logout/refresh

3. **PersonalInfoForm Component** (Complete Example)
   - Component TypeScript with field-specific options (gender, marital status, ID type)
   - Field dependency handling (marital status change → show/hide spouse fields)
   - Emits marital status change to parent for partner tab management
   - HTML template with all field types (text, select, combobox, radio, checkbox, textarea)
   - SCSS with responsive grid, combobox suggestions UI, error states
   - Method to map field names to their option arrays

4. **Documentation**
   - `PHASE2-GUIDE.md` — Complete guide for creating form components
   - `README.md` — Architecture overview
   - Code examples for DB-driven combobox and select
   - Integration guide with PatientCaptureV2

## 🎯 What PersonalInfoForm Demonstrates

```
PersonalInfoForm Component:
├── Field Dependency Logic
│   └── Listen to maritalStatus changes
│       └── Show/hide spouse fields based on value
├── Hardcoded Select Options
│   ├── genderOptions
│   ├── maritalStatusOptions
│   └── idTypeOptions
├── Method: getOptionsForControl()
│   └── Maps field names to their option arrays
├── Combobox Support
│   └── Inherited from BaseFormGroup
├── Event Emission
│   └── Emits maritalStatus change to parent
└── Template Rendering
    └── All control types (text, select, combobox, radio, check, textarea)
```

## 🚀 Next: Create Remaining Form Components

You now have a **complete template**. Create components for your other 6 forms:

### Quick Copy-Paste Template

For each new form (e.g., `contact-info-form`):

```bash
# 1. Create folder
mkdir src/app/components/patient-capture-v2/form-groups/contact-info-form

# 2. Create files by copying PersonalInfoForm and modifying:
cp src/app/components/patient-capture-v2/form-groups/personal-info-form/personal-info-form.ts \
   src/app/components/patient-capture-v2/form-groups/contact-info-form/contact-info-form.ts

# 3. Then:
# - Rename component class (ContactInfoForm)
# - Change selector (@Component)
# - Replace options arrays with your form's specific options
# - Add form-specific field dependencies
# - Update HTML template file names
```

### Per-Form Customization Points

**For each form component:**

1. **Field-specific options** (in TypeScript)
   ```typescript
   countryOptions = [{ label: 'Kenya', value: 'KE' }, ...];
   cityOptions = [];
   ```

2. **Field dependencies** (in ngOnInit)
   ```typescript
   // Listen to field changes
   this.formGroup?.get('country')?.valueChanges.subscribe(country => {
     // Fetch cities for selected country
   });
   ```

3. **DB-driven select** (override method)
   ```typescript
   override onSelectChange(control, value) {
     if (control.name === 'country') {
       // Fetch dependent cities from DB
     }
   }
   ```

4. **DB-driven combobox** (override method)
   ```typescript
   override onComboboxInput(control, value) {
     if (control.name === 'medicalCondition') {
       // Search DB instead of filtering static options
       this.formService.searchComboboxOptions('medicalCondition', value)
         .subscribe(options => this.suggestionMap[control.name] = options);
     }
   }
   ```

## 📋 Checklist: Create Each Form

For **Form 1 (Personal)** — ✅ Already created as example
For **Form 2 (Contact)** — Use template, add:
  - [ ] Create folder: `contact-info-form/`
  - [ ] Copy PersonalInfoForm files as template
  - [ ] Change class name to `ContactInfoForm`
  - [ ] Add phone validation
  - [ ] Add country/city dependency
  - [ ] Update selector: `app-contact-info-form`

For **Form 3 (Medical)** — Use template, add:
  - [ ] Create folder: `medical-history-form/`
  - [ ] Add `allergyOptions`, `medicationOptions`
  - [ ] Add field dependency: if `hasAllergies=true`, show `allergyDetails`
  - [ ] Override `onComboboxInput()` for DB-driven condition search
  - [ ] Update selector: `app-medical-history-form`

For **Forms 4-7** — Identify them first, then use same template

## 🔧 Integration: Update PatientCaptureV2

Once you create all components, update `patient-capture-v2.html`:

```html
<!-- Current: generic form -->
<app-dynamic-form [controls]="activeControls" [formGroup]="activeFormGroup"></app-dynamic-form>

<!-- New: specific forms based on type -->
<ng-container [ngSwitch]="getFormGroupType(currentStepDef)">
  <app-personal-info-form
    *ngSwitchCase="'personal'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel"
    [isPartner]="activeTab === 'partner'">
  </app-personal-info-form>

  <app-contact-info-form
    *ngSwitchCase="'contact'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel"
    [isPartner]="activeTab === 'partner'">
  </app-contact-info-form>

  <app-medical-history-form
    *ngSwitchCase="'medical'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel"
    [isPartner]="activeTab === 'partner'">
  </app-medical-history-form>

  <!-- Fallback to generic for unimplemented types -->
  <app-dynamic-form
    *ngSwitchDefault
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel">
  </app-dynamic-form>
</ng-container>
```

## 📁 Final Folder Structure

```
form-groups/
├── base-form-group.ts
├── form-group-registry.ts
├── PHASE2-GUIDE.md
├── PHASE2-STATUS.md (this file)
├── README.md
├── personal-info-form/
│   ├── personal-info-form.ts      ✅ Done
│   ├── personal-info-form.html    ✅ Done
│   └── personal-info-form.scss    ✅ Done
├── contact-info-form/             ⏳ TODO
│   ├── contact-info-form.ts
│   ├── contact-info-form.html
│   └── contact-info-form.scss
├── medical-history-form/          ⏳ TODO
│   ├── medical-history-form.ts
│   ├── medical-history-form.html
│   └── medical-history-form.scss
├── demographics-form/             ⏳ TODO (if needed)
└── ... (more components as needed)
```

## Key Benefits Achieved

✅ **No more giant generic component** — Each form has its own logic
✅ **Field-specific dependencies** — Handled independently per form
✅ **DB-driven options** — Combobox/select can fetch from DB
✅ **Easy to extend** — Add new form? Copy PersonalInfoForm template
✅ **Easy to modify** — Change Form 2? Only edit contact-info-form, no side effects
✅ **Clean markup** — No massive `@if` conditionals in template
✅ **Reusable base** — BaseFormGroup provides common utilities
✅ **Testable** — Each component can be tested independently

## 🎯 Recommended Order

1. ✅ PersonalInfoForm (done)
2. **ContactInfoForm** (start here — simpler, good practice)
3. **MedicalHistoryForm** (test DB-driven combobox)
4. **Other forms** (identify what they are first)

Ready to create the remaining components?
