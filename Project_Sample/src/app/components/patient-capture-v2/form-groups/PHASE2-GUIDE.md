# Phase 2: Creating Form-Group-Specific Components

This guide shows how to create independent form components with custom logic for combobox/select handling, field dependencies, and DB-driven options.

## Why Separate Components?

Each form group component can independently manage:
- **Combobox fields** (type: "combobox") — User types → DB search → matches displayed → selection populates entire object
- **Select fields** (type: "select") — Fixed options OR DB-driven → selection cascades data to dependent fields
- **Field dependencies** — Show/hide/enable/disable fields based on other field values
- **Custom validation** — Form-specific rules without cluttering shared logic
- **Styling** — Isolated styles per form type

## Component Structure

### File Layout
```
form-groups/
├── personal-info-form/
│   ├── personal-info-form.ts      (component logic)
│   ├── personal-info-form.html    (template)
│   └── personal-info-form.scss    (styles)
├── contact-info-form/
│   ├── contact-info-form.ts
│   ├── contact-info-form.html
│   └── contact-info-form.scss
├── medical-history-form/
│   ├── medical-history-form.ts
│   ├── medical-history-form.html
│   └── medical-history-form.scss
└── ... more form components
```

## Creating a Form Component

### Step 1: Component TypeScript

```typescript
// personal-info-form.ts
import { Component, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { JsonFormControl } from '../../../models/form-fields';
import { FormService } from '../../../services/form.service';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-personal-info-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-info-form.html',
  styleUrl: './personal-info-form.scss',
})
export class PersonalInfoForm extends BaseFormGroup implements OnChanges, OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Personal-form-specific state
  genderOptions: any[] = [
    { label: 'Male', value: 'M' },
    { label: 'Female', value: 'F' },
    { label: 'Other', value: 'O' }
  ];

  maritalStatusOptions: any[] = [
    { label: 'Single', value: 'single' },
    { label: 'Married', value: 'married' },
    { label: 'Divorced', value: 'divorced' },
    { label: 'Widowed', value: 'widowed' }
  ];

  showSpouseFields = false;

  constructor(private formService: FormService) {
    super();
  }

  ngOnInit(): void {
    // Subscribe to maritalStatus changes to show/hide spouse fields
    this.formGroup?.get('p_maritalstatus')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.handleMaritalStatusChange(value);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['controls'] || changes['formGroup']) {
      this.initializeComponent();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeComponent(): void {
    this.suggestionMap = {};
    this.activeCombobox = null;
  }

  /**
   * Handle marital status change - show spouse fields if married.
   * This is a PERSONAL form-specific dependency.
   */
  private handleMaritalStatusChange(status: string): void {
    this.showSpouseFields = status === 'married' && this.isPartner === false;
  }
}
```

### Step 2: Component Template

```html
<!-- personal-info-form.html -->
<div class="form-container">
  <div class="form-header">
    <h2>{{ stepLabel }}</h2>
    <p>{{ stepDescription }}</p>
  </div>

  <form [formGroup]="formGroup" class="form-grid">

    <!-- Iterate through all controls -->
    @for (control of controls; track control.name) {
      <!-- TEXT INPUT -->
      @if (control.type === 'text') {
        <div class="form-group" [class.span-2]="isSpan2(control)">
          <label [for]="control.name">{{ control.label }}</label>
          <input
            [id]="control.name"
            type="text"
            [formControlName]="control.name"
            [class.invalid]="isInvalid(control.name)"
            [disabled]="!isEditing"
            placeholder="Enter {{ control.label | lowercase }}" />
          @if (isInvalid(control.name)) {
            <span class="error-msg">{{ control.label }} is required</span>
          }
        </div>
      }

      <!-- COMBOBOX (User types → DB search) -->
      @if (control.type === 'combobox') {
        <div class="form-group" [class.span-2]="isSpan2(control)">
          <label [for]="control.name">{{ control.label }}</label>
          <div class="combobox-wrapper">
            <input
              [id]="control.name"
              type="text"
              [formControlName]="control.name"
              (input)="onComboboxInput(control, $any($event.target).value)"
              (blur)="closeSuggestions(control.name)"
              [class.invalid]="isInvalid(control.name)"
              [disabled]="!isEditing"
              autocomplete="off"
              placeholder="Type to search..." />

            <!-- Show suggestions when available -->
            @if ((suggestionMap[control.name] || []).length > 0) {
              <ul class="suggestions-list" [class.active]="activeCombobox === control.name">
                @for (option of suggestionMap[control.name]; track option.value) {
                  <li>
                    <button
                      type="button"
                      (click)="selectSuggestion(control, option)"
                      (mousedown)="$event.preventDefault()">
                      {{ option.label }}
                    </button>
                  </li>
                }
              </ul>
            }

            @if (isInvalid(control.name)) {
              <span class="error-msg">{{ control.label }} is required</span>
            }
          </div>
        </div>
      }

      <!-- SELECT (Hardcoded or DB options) -->
      @if (control.type === 'select') {
        <div class="form-group" [class.span-2]="isSpan2(control)">
          <label [for]="control.name">{{ control.label }}</label>
          <select
            [id]="control.name"
            [formControlName]="control.name"
            (change)="onSelectChange(control, $any($event.target).value)"
            [class.invalid]="isInvalid(control.name)"
            [disabled]="!isEditing">
            <option value="">-- Select {{ control.label }} --</option>
            @for (option of control.options; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
          @if (isInvalid(control.name)) {
            <span class="error-msg">{{ control.label }} is required</span>
          }
        </div>
      }

      <!-- TEXTAREA -->
      @if (control.type === 'textarea') {
        <div class="form-group span-2">
          <label [for]="control.name">{{ control.label }}</label>
          <textarea
            [id]="control.name"
            [formControlName]="control.name"
            [class.invalid]="isInvalid(control.name)"
            [disabled]="!isEditing"
            rows="4"
            placeholder="Enter {{ control.label | lowercase }}"></textarea>
          @if (isInvalid(control.name)) {
            <span class="error-msg">{{ control.label }} is required</span>
          }
        </div>
      }

      <!-- CHECKBOX -->
      @if (control.type === 'check') {
        <div class="form-group form-check span-2">
          <input
            type="checkbox"
            [id]="control.name"
            [formControlName]="control.name"
            [disabled]="!isEditing" />
          <label [for]="control.name">{{ control.label }}</label>
        </div>
      }

      <!-- RADIO BUTTONS -->
      @if (control.type === 'radio') {
        <div class="form-group span-2">
          <label>{{ control.label }}</label>
          <div class="radio-group">
            @for (option of control.options; track option.value) {
              <label class="radio-label">
                <input
                  type="radio"
                  [value]="option.value"
                  [formControlName]="control.name"
                  [disabled]="!isEditing" />
                {{ option.label }}
              </label>
            }
          </div>
          @if (isInvalid(control.name)) {
            <span class="error-msg">{{ control.label }} is required</span>
          }
        </div>
      }
    }

    <!-- CONDITIONAL: Show spouse fields if married -->
    @if (showSpouseFields && isPartner === false) {
      <div class="spouse-section">
        <h3>Spouse / Partner Information</h3>
        <!-- Can add spouse-specific fields here if needed -->
      </div>
    }

  </form>
</div>
```

### Step 3: Component Styling

```scss
// personal-info-form.scss
.form-container {
  padding: 20px;
  background: #f9f9f9;
  border-radius: 8px;
}

.form-header {
  margin-bottom: 24px;

  h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: #666;
    font-size: 14px;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;

  &.span-2 {
    grid-column: 1 / -1;
  }

  label {
    margin-bottom: 6px;
    font-weight: 500;
    font-size: 14px;
    color: #333;
  }

  input,
  select,
  textarea {
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #2196f3;
      box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    }

    &:disabled {
      background-color: #f5f5f5;
      color: #999;
      cursor: not-allowed;
    }

    &.invalid {
      border-color: #f44336;
    }
  }

  .error-msg {
    margin-top: 4px;
    font-size: 12px;
    color: #f44336;
  }
}

.combobox-wrapper {
  position: relative;

  .suggestions-list {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 240px;
    overflow-y: auto;
    margin: 4px 0 0 0;
    padding: 0;
    list-style: none;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;

    &.active {
      display: block;
    }

    li {
      button {
        width: 100%;
        padding: 10px 12px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        font-size: 14px;
        color: #333;

        &:hover {
          background-color: #f0f0f0;
        }

        &:focus {
          background-color: #e3f2fd;
          outline: none;
        }
      }
    }
  }
}

.form-check {
  flex-direction: row;
  align-items: center;

  input {
    width: 18px;
    height: 18px;
    margin-right: 8px;
  }

  label {
    margin: 0;
    font-weight: normal;
  }
}

.radio-group {
  display: flex;
  gap: 16px;
  flex-direction: row;

  .radio-label {
    display: flex;
    align-items: center;
    font-weight: normal;
    cursor: pointer;

    input {
      margin-right: 6px;
      width: auto;
    }
  }
}

.spouse-section {
  grid-column: 1 / -1;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #ddd;

  h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }
}
```

## Advanced: DB-Driven Combobox

For forms with combobox that fetch from DB, override `onComboboxInput()`:

```typescript
// Example: Medical history form with DB-driven condition search
export class MedicalHistoryForm extends BaseFormGroup {
  constructor(private formService: FormService) {
    super();
  }

  override onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }

    // Call FormService to search DB
    this.formService.searchComboboxOptions(control.name, value)
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => {
        this.suggestionMap[control.name] = options.slice(0, 8);
        this.activeCombobox = control.name;
      });
  }
}
```

## Advanced: DB-Driven Select

For selects that fetch options from DB:

```typescript
export class ContactInfoForm extends BaseFormGroup {
  countryOptions: any[] = [];

  constructor(private formService: FormService) {
    super();
  }

  ngOnInit(): void {
    // Load countries from DB on init
    this.formService.getSelectOptions('country')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => {
        this.countryOptions = options;
      });
  }

  override onSelectChange(control: JsonFormControl, selectedValue: any): void {
    // For country select, fetch cities after selection
    if (control.name === 'country') {
      this.formService.getCitiesForCountry(selectedValue)
        .pipe(takeUntil(this.destroy$))
        .subscribe(cities => {
          const cityControl = this.controls.find(c => c.name === 'city');
          if (cityControl) {
            cityControl.options = cities;
          }
        });
    }

    super.onSelectChange(control, selectedValue);
  }
}
```

## Integration with PatientCaptureV2

The parent component stays unchanged and uses `ngSwitch` to render form-specific components:

```html
<ng-container [ngSwitch]="getFormGroupType(currentStepDef)">
  <app-personal-info-form
    *ngSwitchCase="'personal'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel"
    [stepDescription]="currentStepDef?.formDescription"
    [isPartner]="activeTab === 'partner'"
    (fieldChanged)="onFieldChanged($event)">
  </app-personal-info-form>

  <app-contact-info-form
    *ngSwitchCase="'contact'"
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel"
    [stepDescription]="currentStepDef?.formDescription"
    [isPartner]="activeTab === 'partner'"
    (fieldChanged)="onFieldChanged($event)">
  </app-contact-info-form>

  <!-- Fallback to generic for unknown types -->
  <app-dynamic-form
    *ngSwitchDefault
    [controls]="activeControls"
    [formGroup]="activeFormGroup"
    [stepLabel]="currentStepDef?.formLabel"
    (maritalChanged)="onMaritalChange($event)">
  </app-dynamic-form>
</ng-container>
```

## Summary

Each form component:
1. **Extends BaseFormGroup** for common utilities
2. **Has its own TypeScript logic** for DB searches, field dependencies, custom validation
3. **Has its own HTML template** — no cluttered conditionals
4. **Has isolated styles** — no style conflicts
5. **Can override methods** like `onComboboxInput()` for DB-driven behavior
6. **Emits field changes** for parent to listen to if needed

This is **extensible, maintainable, and scalable** — adding a new form type or changing one requires only edits to that component, never touching others.
