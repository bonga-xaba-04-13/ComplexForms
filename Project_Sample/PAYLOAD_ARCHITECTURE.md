# PatientCaptureV2 Payload Architecture & Implementation Plan

**Document Date:** 2026-06-28  
**Status:** Planning Phase - Ready for Implementation  
**Scope:** Multi-step stepper with single & married participant capture modes

---

## Table of Contents

1. [Data Flow Overview](#data-flow-overview)
2. [Current State Documentation](#current-state-documentation)
3. [Persistence Strategy](#persistence-strategy)
4. [Payload Formats](#payload-formats)
5. [PayloadBuilder Design](#payloadbuilder-design)
6. [Type Definitions](#type-definitions)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Testing Strategy](#testing-strategy)

---

## Data Flow Overview

### High-Level Architecture

```
API (Database)
    ↓
FormService.loadStepperWithSubForms()
    ↓ Returns: { stepper: {...}, forms: [{definition, keyname, allowDynamicParticipants}, ...] }
    ↓
PatientCaptureV2.initializeLoadedSteps(forms)
    ├─ Creates parallel, index-aligned FormGroup arrays
    ├─ patientForms[i] → always created for every step
    ├─ partnerForms[i] → real FormGroup if allowDynamicParticipants=true
    │                  → empty placeholder if allowDynamicParticipants=false
    └─ LoadedSteps[i] → [form] if single step, [form, form] if married step
    ↓
User navigates through stepper (next/previous/goToStep)
    ├─ FormGroups persist across navigation
    ├─ Values remain in memory
    └─ No rebuild or data loss
    ↓
User fills forms on each step
    ├─ Child components (PersonalInfoForm, ContactInfoForm, etc.) edit values
    ├─ Values written directly to FormGroup in patientForms[currentStep]
    ├─ Or to partnerForms[currentStep] if married tab active
    └─ State survives component recreation on step change
    ↓
User clicks "Submit"
    ↓
Component.submitForm()
    ├─ Validates all patientForms
    ├─ Optionally validates partnerForms if married
    └─ Invalid? Mark touched, show toast, exit
    ↓
Component → PayloadBuilder (new)
    ├─ Converts FormGroup[] arrays → StepSnapshot[]
    └─ Builder transforms snapshots → Format A + Format B payloads
    ↓
dialogRef.close({ backend: formatA, audit: formatB })
    ↓
Caller/Backend receives structured, type-safe payload
```

---

## Current State Documentation

### How FormGroups Are Created

**In `initializeLoadedSteps(forms: any[])`:**

```typescript
forms.forEach((form: any) => {
  const patientForm = this.buildGroup(form.definition);
  this.patientForms.push(patientForm);  // Always

  const stepArray: any[] = [form];

  if (form.allowDynamicParticipants) {
    const partnerForm = this.buildGroup(form.definition);
    this.partnerForms.push(partnerForm);  // Real FormGroup
    stepArray.push(form);  // LoadedSteps[i].length = 2
  } else {
    this.partnerForms.push(this.fb.group({}));  // Empty placeholder
    // LoadedSteps[i].length = 1
  }

  this.LoadedSteps.push(stepArray);
});
```

### Index-Alignment Invariant (Load-Bearing)

For every step `i`:
- **`patientForms[i]`** = FormGroup for patient's fields (always exists, always filled)
- **`partnerForms[i]`** = FormGroup for partner's fields (real if `allowDynamicParticipants=true`, placeholder if false)
- **`LoadedSteps[i][0]`** = form descriptor object (contains `keyname`, `formLabel`, `allowDynamicParticipants`, `definition`)
- **`LoadedSteps[i][1]`** = form descriptor (only present if `allowDynamicParticipants=true`)

This alignment is never broken during the component's lifetime. Breaking it would corrupt navigation and data binding.

### Storage Locations: Single vs Married

| Dimension | Single Mode (per step) | Married Mode (per step) |
|-----------|------------------------|------------------------|
| `allowDynamicParticipants` flag | `false` | `true` |
| `patientForms[i]` | Real FormGroup, user-filled | Real FormGroup, user-filled |
| `partnerForms[i]` | Empty `fb.group({})` placeholder | Real FormGroup, may be filled |
| `LoadedSteps[i].length` | 1 | 2 |
| Tab UI visibility | No partner tab | Partner tab appears after marital status = "married" |
| **Payload implication** | Array of 1 object: `[patient]` | Array of 2 objects: `[patient, partner]` |

**Critical distinction:** Single vs Married is **per-step**, not global. Step 1 might support a partner (`allowDynamicParticipants=true`) while Step 3 does not. The UI toggle (`showPartnerTab`) gates tab visibility, but the underlying FormGroup (real or placeholder) exists regardless.

---

## Persistence Strategy

### How FormGroup State Persists Across Navigation

**The short answer: It already works correctly. No changes needed.**

**Why it works:**

1. **Arrays are created once, live forever:**  
   `patientForms` and `partnerForms` are instantiated in `ngOnInit` → `loadFormsFromApi()` → `initializeLoadedSteps()`. They are **never rebuilt, never destroyed** during the component's lifetime.

2. **Navigation only changes the index, not the arrays:**  
   ```typescript
   next() {
     this.currentStep++;  // Just increment the index
     this.activeTab = 'patient';  // Reset to patient view
   }
   ```
   The arrays themselves are untouched.

3. **Child components receive references, not copies:**  
   ```html
   <app-personal-info-form [formGroup]="activeFormGroup" ...>
   ```
   `activeFormGroup` is:
   ```typescript
   get activeFormGroup(): FormGroup {
     return this.activeTab === 'partner'
       ? this.partnerForms[this.currentStep]
       : this.patientForms[this.currentStep];
   }
   ```
   When the user fills a field in the component, they write directly into the FormGroup object. The value is durably stored in `patientForms[currentStep].value`.

4. **FormGroup state is persistent:**  
   Angular reactive forms automatically maintain:
   - `value` (the entered data)
   - `valid` / `invalid` (validation state)
   - `dirty` / `pristine` (change tracking)
   - `touched` / `untouched` (interaction tracking)
   
   These persist across navigation because the FormGroup object persists.

5. **Component recreation (on `@switch` step change) does NOT destroy form data:**  
   When the step changes, the child component is destroyed and recreated. But it receives the existing, pre-populated FormGroup by reference:
   ```typescript
   ngOnInit() {
     // this.formGroup is the SAME object that was filled in step 1
     // Its value, valid, dirty state are all preserved
   }
   ```

**The only transient state that resets:** component-local caches (e.g., combobox suggestion maps in `BaseFormGroup.suggestionMap`). The canonical data in the FormGroup survives.

### Validation & Marital Status Changes

- **`onMaritalChange(status)` in PatientCaptureV2:**  
  ```typescript
  onMaritalChange(status: string): void {
    if (status === 'married' && this.hasPartnerForCurrentStep) {
      this.showPartnerTab = true;  // Shows the UI
    } else {
      this.showPartnerTab = false;
      this.activeTab = 'patient';
    }
  }
  ```
  This toggles **visibility** of the partner tab, but does not affect the underlying `partnerForms[currentStep]` FormGroup. The user can switch to the partner tab and fill the partner's data.

- **On submit:** Currently only `patientForms` are validated. When implementing partner validation (Phase 3 of the roadmap), validate `partnerForms[i]` for steps where `LoadedSteps[i].length === 2`.

---

## Payload Formats

### Overview

The `PayloadBuilder` service produces two output formats from the same input:

| Format | Name | Use Case |
|--------|------|----------|
| **A** | `StepGroupedPayload` | **Backend contract** — compact, grouped by step name. Sent to server. |
| **B** | `ParticipantPayload` | **Audit/alternative** — participant-centric envelope, includes metadata (capture mode, timestamp). Suitable for audit logs and client-side rehydration. |

Both formats encode the same data but optimized for different consumers.

### Format A: StepGroupedPayload (Backend Contract)

**Purpose:** Direct backend format. Compact, grouped by step `keyname`.

**Structure:**
```typescript
type StepGroupedPayload = Record<string, ParticipantValues[]>;

// ParticipantValues = Record<string, unknown>  (flat object, the FormGroup.value)
```

**Example (Single Mode):**
```json
{
  "personal_info": [
    {
      "p_firstName": "Alice",
      "p_lastName": "Smith",
      "p_dateOfBirth": "1990-05-15",
      "p_maritalStatus": "single"
    }
  ],
  "contact_info": [
    {
      "p_email": "alice@example.com",
      "p_phoneNumber": "+1-555-0101",
      "p_address": "123 Main St"
    }
  ]
}
```

**Example (Married Mode):**
```json
{
  "personal_info": [
    {
      "p_firstName": "Alice",
      "p_lastName": "Smith",
      "p_maritalStatus": "married"
    },
    {
      "p_firstName": "Bob",
      "p_lastName": "Smith",
      "p_maritalStatus": "married"
    }
  ],
  "contact_info": [
    {
      "p_email": "alice@example.com",
      "p_phoneNumber": "+1-555-0101"
    },
    {
      "p_email": "bob@example.com",
      "p_phoneNumber": "+1-555-0202"
    }
  ]
}
```

**Key Rules:**
- Every step name is a top-level key.
- Each key's value is an array.
- **Single step** (`allowDynamicParticipants=false`): array has **1 element** `[patient]`.
- **Married step** (`allowDynamicParticipants=true`): array has **2 elements** `[patient, partner]`.
- Order within the array is `[patient, partner]`.
- Empty fields can be dropped with `omitEmpty: true` option.

### Format B: ParticipantPayload (Participant-Centric)

**Purpose:** Alternative format suitable for audit logs, rehydration, and detailed tracking. Includes metadata.

**Structure:**
```typescript
interface ParticipantPayload {
  captureMode: 'single' | 'married';
  capturedAt: string;  // ISO 8601 timestamp
  participants: ParticipantSection[];
}

interface ParticipantSection {
  role: 'patient' | 'partner';
  steps: ParticipantStepEntry[];
}

interface ParticipantStepEntry {
  stepName: string;
  stepLabel?: string;
  values: ParticipantValues;
}
```

**Example (Single Mode):**
```json
{
  "captureMode": "single",
  "capturedAt": "2026-06-28T14:32:00.000Z",
  "participants": [
    {
      "role": "patient",
      "steps": [
        {
          "stepName": "personal_info",
          "stepLabel": "Personal Information",
          "values": {
            "p_firstName": "Alice",
            "p_lastName": "Smith",
            "p_dateOfBirth": "1990-05-15"
          }
        },
        {
          "stepName": "contact_info",
          "stepLabel": "Contact Details",
          "values": {
            "p_email": "alice@example.com",
            "p_phoneNumber": "+1-555-0101"
          }
        }
      ]
    }
  ]
}
```

**Example (Married Mode):**
```json
{
  "captureMode": "married",
  "capturedAt": "2026-06-28T14:35:00.000Z",
  "participants": [
    {
      "role": "patient",
      "steps": [
        {
          "stepName": "personal_info",
          "stepLabel": "Personal Information",
          "values": {
            "p_firstName": "Alice",
            "p_lastName": "Smith",
            "p_maritalStatus": "married"
          }
        },
        {
          "stepName": "contact_info",
          "stepLabel": "Contact Details",
          "values": {
            "p_email": "alice@example.com"
          }
        }
      ]
    },
    {
      "role": "partner",
      "steps": [
        {
          "stepName": "personal_info",
          "stepLabel": "Personal Information",
          "values": {
            "p_firstName": "Bob",
            "p_lastName": "Smith",
            "p_maritalStatus": "married"
          }
        },
        {
          "stepName": "contact_info",
          "stepLabel": "Contact Details",
          "values": {
            "p_email": "bob@example.com"
          }
        }
      ]
    }
  ]
}
```

**Key Rules:**
- `captureMode` is `'married'` if any step has a populated partner; otherwise `'single'`.
- `capturedAt` is an ISO 8601 timestamp (defaults to `new Date().toISOString()`, overridable for tests).
- `participants` is always an array; for single mode it contains only the patient section.
- Steps are listed in stepper order within each participant.
- Each step includes optional `stepLabel` (human-readable form title).
- Suitable for audit logs, UI re-display, and detecting what data was actually captured.

---

## PayloadBuilder Design

### Overview

**File:** `src/app/components/patient-capture-v2/payload/payload-builder.service.ts`

**Responsibility:** Transform `StepSnapshot[]` (an adapter-supplied array of step data) into `StepGroupedPayload` (Format A) or `ParticipantPayload` (Format B).

**Why a service:**
- Consistent with the project's DI pattern (FormService is root-provided).
- Enables mocking/spying in tests.
- Allows future dependencies without breaking changes.
- Methods are stateless (pure), so a singleton is appropriate.

**Why dependency-free:**
- The builder receives **already-extracted data** as method arguments (FormGroup.value, step metadata).
- It does not call FormService, HTTP, or any other API.
- This makes it trivially testable without TestBed or mocks.

### Interface

```typescript
@Injectable({ providedIn: 'root' })
export class PayloadBuilder {

  /**
   * Format A: Group by step name, array of participants per step.
   * @param steps Array of step snapshots (one per form step)
   * @param options.omitEmpty If true, drop empty/null fields from output
   * @returns Record<stepName, participantValuesArray>
   */
  buildStepGroupedPayload(
    steps: StepSnapshot[],
    options: BuildOptions = {}
  ): StepGroupedPayload;

  /**
   * Format B: Participant-centric envelope with metadata.
   * @param steps Array of step snapshots
   * @param options.omitEmpty If true, drop empty/null fields
   * @param options.now() Override timestamp (for deterministic testing)
   * @returns Envelope with captureMode, capturedAt, participants
   */
  buildParticipantPayload(
    steps: StepSnapshot[],
    options: BuildOptions = {}
  ): ParticipantPayload;
}
```

### Implementation Pseudocode

```typescript
export class PayloadBuilder {

  buildStepGroupedPayload(steps, options): StepGroupedPayload {
    const out = {};
    for (const step of steps) {
      out[step.stepName] = this.participantsForStep(step, options);
    }
    return out;
  }

  buildParticipantPayload(steps, options): ParticipantPayload {
    // Detect if any step has a populated partner → 'married'
    const married = steps.some(
      s => s.allowDynamicParticipants && !!s.partner
    );

    // Build patient section (always present)
    const patientSteps = steps.map(
      s => this.entry(s, s.patient, options)
    );
    const participants = [{ role: 'patient', steps: patientSteps }];

    // Build partner section only if married
    if (married) {
      const partnerSteps = steps
        .filter(s => s.allowDynamicParticipants && s.partner)
        .map(s => this.entry(s, s.partner, options));
      participants.push({ role: 'partner', steps: partnerSteps });
    }

    return {
      captureMode: married ? 'married' : 'single',
      capturedAt: (options.now ?? (() => new Date().toISOString()))(),
      participants,
    };
  }

  // Private helpers: the ONLY place the role-array rule lives
  private participantsForStep(step, options): ParticipantValues[] {
    const arr = [this.clean(step.patient, options)];
    if (step.allowDynamicParticipants && step.partner) {
      arr.push(this.clean(step.partner, options));
    }
    return arr;
  }

  private entry(step, values, options): ParticipantStepEntry {
    return {
      stepName: step.stepName,
      stepLabel: step.stepLabel,
      values: this.clean(values, options),
    };
  }

  private clean(v, options): ParticipantValues {
    if (!options.omitEmpty) return { ...v };
    return Object.fromEntries(
      Object.entries(v).filter(([, val]) => val !== '' && val != null)
    );
  }
}
```

### Handling Single vs Married

**The rule lives in one place:** `if (step.allowDynamicParticipants && step.partner)`.

- **Single step** (`allowDynamicParticipants=false`): partner is `undefined` (from the adapter), so the guard fails. Only patient is included. Format A emits a 1-element array. Format B emits patient steps only.
- **Married step with partner filled** (`allowDynamicParticipants=true` and `step.partner` is provided): guard passes. Both patient and partner are included. Format A emits a 2-element array. Format B includes both participants.
- **Married step with partner not filled** (shouldn't happen if validation is correct, but gracefully handled): guard fails (step.partner is falsy). Behaves as single step.

This single condition is the only place the role/arity rule is encoded, satisfying single-responsibility principle.

---

## Type Definitions

**File:** `src/app/components/patient-capture-v2/payload/payload.types.ts`

### Complete Type Definitions

```typescript
/**
 * One participant's flat field map.
 * Equivalent to FormGroup.value, keyed by control name.
 */
export type ParticipantValues = Record<string, unknown>;

/** Logical role of a participant within a step. */
export type ParticipantRole = 'patient' | 'partner';

/**
 * Normalized input the builder consumes for a single step.
 * Decouples the builder from Angular FormGroup, keeping it pure/testable.
 */
export interface StepSnapshot {
  /** Backend step key, e.g. "personal_info" — used as the payload object key. */
  stepName: string;
  /** Human-readable label, e.g. "Personal Information". */
  stepLabel?: string;
  /** Whether this step supports a partner participant. */
  allowDynamicParticipants: boolean;
  /** Patient field values (always present). */
  patient: ParticipantValues;
  /** Partner field values; present only when allowDynamicParticipants=true AND partner filled. */
  partner?: ParticipantValues;
}

/* ────────── Format A: Backend Grouped-by-Step ────────────────── */

/**
 * { "step_name": [patient] }  or  { "step_name": [patient, partner] }
 * Primary backend contract format.
 */
export type StepGroupedPayload = Record<string, ParticipantValues[]>;

/* ────────── Format B: Participant-Centric Envelope ────────────────── */

/** One step's data for a participant. */
export interface ParticipantStepEntry {
  stepName: string;
  stepLabel?: string;
  values: ParticipantValues;
}

/** All steps for one participant (patient or partner). */
export interface ParticipantSection {
  role: ParticipantRole;
  /** Steps in stepper order. */
  steps: ParticipantStepEntry[];
}

/** Alternative envelope format with metadata. Suitable for audit & rehydration. */
export interface ParticipantPayload {
  /** 'single' if no partner data, 'married' if partner present. */
  captureMode: 'single' | 'married';
  /** ISO 8601 timestamp of capture. */
  capturedAt: string;
  /** Patient always present; partner present only in married mode. */
  participants: ParticipantSection[];
}

/* ────────── Builder Options ────────────────── */

export interface BuildOptions {
  /** Drop controls whose value is '', null, or undefined. Default: false. */
  omitEmpty?: boolean;
  /** Override the timestamp generator (for tests & determinism). */
  now?: () => string;
}
```

### Type Rationale

- **`StepSnapshot`** decouples the builder from FormGroup. The component adapts FormGroup → StepSnapshot (one step), keeping the builder pure and independently testable.
- **`ParticipantValues`** is a plain object (no Angular types), making serialization trivial.
- Both payload formats are **discriminated unions** on `captureMode` (Format B) and array length (Format A), enabling type-safe branching in downstream code.
- **`BuildOptions`** allows the caller to tailor output (drop empties, override time) without method overloads.

---

## Implementation Roadmap

### Phase 1: Types & Builder (Independently Mergeable)

**Goal:** Create all new types and the PayloadBuilder service, fully tested, with zero dependencies on PatientCaptureV2.

**Files to create:**
- `src/app/components/patient-capture-v2/payload/payload.types.ts` — All interfaces from [Type Definitions](#type-definitions).
- `src/app/components/patient-capture-v2/payload/payload-builder.service.ts` — Full `PayloadBuilder` implementation.
- `src/app/components/patient-capture-v2/payload/payload-builder.service.spec.ts` — Unit tests (see [Testing Strategy](#testing-strategy)).

**Risk:** Low. Pure TypeScript, no Angular runtime dependencies.

**Merge criteria:**
- [ ] All type definitions exported.
- [ ] Both builder methods implemented (`buildStepGroupedPayload`, `buildParticipantPayload`).
- [ ] All private helpers implemented (`participantsForStep`, `entry`, `clean`).
- [ ] Build succeeds with zero type errors.
- [ ] Unit tests pass at 100% coverage.

---

### Phase 2: Component Integration (Wiring)

**Goal:** Connect PatientCaptureV2 to the new PayloadBuilder; refactor payload serialization.

**Files to modify:**
- `src/app/components/patient-capture-v2/patient-capture-v2.ts`

**Changes:**
1. **Inject PayloadBuilder:**
   ```typescript
   constructor(
     /* existing ... */
     private payloadBuilder: PayloadBuilder
   ) {}
   ```

2. **Add adapter method:**
   ```typescript
   private toStepSnapshots(): StepSnapshot[] {
     return this.LoadedSteps.map((stepArr, i) => {
       const def = stepArr[0];
       const allow = !!def.allowDynamicParticipants;
       return {
         stepName: def.keyname,              // e.g. "personal_info"
         stepLabel: def.formLabel,            // e.g. "Personal Information"
         allowDynamicParticipants: allow,
         patient: this.patientForms[i].value,
         // Include partner only if this step allows it (excludes placeholder)
         partner: allow ? this.partnerForms[i].value : undefined,
       };
     });
   }
   ```

3. **Refactor submitForm():**
   ```typescript
   submitForm(): void {
     // Validate patient forms (existing)
     if (!this.patientForms.every(f => f.valid)) {
       this.patientForms.forEach(f => f.markAllAsTouched());
       this.showToast('Please complete all required fields');
       return;
     }

     // [PHASE 3] Validate partner forms if married mode
     if (this.showPartnerTab) {
       const invalidSteps = this.LoadedSteps
         .map((_, i) => i)
         .filter(i => this.LoadedSteps[i].length === 2 && !this.partnerForms[i].valid);
       if (invalidSteps.length > 0) {
         invalidSteps.forEach(i => this.partnerForms[i].markAllAsTouched());
         this.showToast('Please complete all required fields for both participants');
         return;
       }
     }

     // Build payloads
     const snapshots = this.toStepSnapshots();
     const backendPayload = this.payloadBuilder.buildStepGroupedPayload(
       snapshots,
       { omitEmpty: true }
     );
     const auditPayload = this.payloadBuilder.buildParticipantPayload(
       snapshots,
       { omitEmpty: true }
     );

     // Return both formats
     this.dialogRef.close({
       backend: backendPayload,
       audit: auditPayload,
     });

     this.showToast('Patient record submitted successfully!');
   }
   ```

4. **Remove old inline payload logic.**

**Risk:** Medium. Must ensure:
- `def.keyname` matches the backend's expected step name key.
- Index alignment is preserved (no off-by-one errors).
- All callers expecting the old `{ patient, partner }` shape are updated.

**Merge criteria:**
- [ ] Component injects PayloadBuilder.
- [ ] `toStepSnapshots()` correctly maps arrays → snapshots, preserving index alignment.
- [ ] `submitForm()` builds both payloads and closes dialog with `{ backend, audit }`.
- [ ] No compilation errors.
- [ ] Dialog return contract documented for callers.

---

### Phase 3: Validation Hardening (Optional)

**Goal:** Validate partner forms when married mode is active.

**File to modify:**
- `src/app/components/patient-capture-v2/patient-capture-v2.ts` (submitForm method)

**Changes:**
- When `showPartnerTab === true`, iterate `LoadedSteps` and validate `partnerForms[i]` for steps where `LoadedSteps[i].length === 2` (multi-participant steps).
- If any partner form is invalid, call `markAllAsTouched()` and reject submission with a toast.

**Implementation note:** This is shown in the `submitForm()` refactor above (Phase 2, step 3).

**Risk:** Low. Pure validation logic, no serialization changes.

**Merge criteria:**
- [ ] Single-mode submits unaffected (no partner validation).
- [ ] Married-mode submits validate both patient and partner.
- [ ] Invalid forms are marked touched, user sees errors.

---

### Phase 4: Component Integration Tests

**Goal:** Verify component correctly integrates PayloadBuilder; test dialog close payload.

**File to create:**
- `src/app/components/patient-capture-v2/patient-capture-v2.spec.ts` (or extend existing)

**Key test scenarios:**
- Single mode submit → `backend[step]` is 1-element array.
- Married mode with both participants filled → 2-element arrays.
- Married mode with one participant empty → behavior TBD (current impl: still emits 2, backend may reject).
- Partner form invalid → submission blocked.
- Dialog closes with `{ backend, audit }` structure.

**Risk:** Low. Integration test, no algorithm changes.

**Merge criteria:**
- [ ] All scenarios pass.
- [ ] 80%+ coverage of submitForm + toStepSnapshots.

---

## Testing Strategy

### Unit Tests (PayloadBuilder)

**File:** `src/app/components/patient-capture-v2/payload/payload-builder.service.spec.ts`

**Test cases (pure, no TestBed needed):**

#### Single Mode Tests
- **Single step, empty partner:** Step has `allowDynamicParticipants=false`, `partner=undefined`.
  - Format A → `{ [stepName]: [patient] }` (length 1).
  - Format B → `captureMode='single'`, one participant section (patient).

- **Multiple single steps:** No step allows a partner.
  - Format A → every key has length 1.
  - Format B → `captureMode='single'`.

#### Married Mode Tests
- **Dynamic step, both filled:** `allowDynamicParticipants=true`, both `patient` and `partner` provided.
  - Format A → `{ [stepName]: [patient, partner] }` (length 2, order preserved).
  - Format B → `captureMode='married'`, both participant sections present, partner section contains partner's steps.

- **Dynamic step, only patient:** `allowDynamicParticipants=true`, but `partner=undefined`.
  - Format A → length 1 (guard `step.partner` prevents inclusion).
  - Format B → `captureMode='single'` (no partner data anywhere).

- **Mixed stepper:** Steps 1 & 2 dynamic with both participants, Step 3 single.
  - Format A → steps 1 & 2 have length 2, step 3 has length 1.
  - Format B → both participants have all steps listed, but partner section has gaps (steps not in their data).

#### Field Handling Tests
- **`omitEmpty=true`:** Fields with `''`, `null`, `undefined` are stripped.
- **`omitEmpty=false` (default):** All fields included (even empty).
- **Falsy but non-empty:** `false`, `0`, empty array `[]` are retained (not stripped).

#### Determinism & Immutability Tests
- **Timestamp override:** `options.now` returns fixed value → same `capturedAt` on repeat calls.
- **No shared references:** Result object is a new tree; mutating `payload.participants[0].steps[0].values.fieldX = "mutated"` does not affect the input snapshots.

#### Edge Cases
- **Empty stepper:** `steps=[]` → `{ }` / empty participants array, no error.
- **Malformed snapshots:** Missing `stepName` → handled gracefully (or typed as error).
- **Falsy snapshots:** `null` step in array → skipped or raises (TBD based on validation).

**Coverage target:** 100% line and branch coverage. The builder is small and pure; full coverage is achievable and necessary for confidence.

### Integration Tests (PatientCaptureV2)

**File:** `src/app/components/patient-capture-v2/patient-capture-v2.spec.ts` (or extend existing)

**Test scenarios:**

- **Single mode submit:**
  - Fill patient forms for all steps.
  - Click submit.
  - Dialog closes with `{ backend, audit }`.
  - Assert `backend[stepName].length === 1` for all steps.
  - Assert `audit.captureMode === 'single'`.

- **Married mode submit:**
  - Fill patient forms for all steps.
  - Trigger marital status = "married" on Step 1 (personal).
  - Switch to partner tab.
  - Fill partner data for at least one step.
  - Click submit.
  - Assert `backend[stepName].length === 2` for dynamic steps.
  - Assert `audit.captureMode === 'married'`.
  - Assert partner section in audit has correct steps.

- **Married mode, invalid partner:**
  - Fill patient forms.
  - Trigger marital, switch to partner.
  - Leave partner form empty/invalid.
  - Click submit.
  - Assert submission blocked, toast shown.
  - Dialog does NOT close.

- **Index alignment:**
  - Verify `toStepSnapshots()` uses correct `keyname` for each step.
  - Verify patient/partner FormGroup values correctly mapped.
  - No off-by-one errors.

**Coverage target:** 80%+ of `submitForm()` and `toStepSnapshots()` paths.

### Manual Testing Checklist

- [ ] Open app, launch PatientCaptureV2 dialog.
- [ ] Fill all 7 steps (single mode).
- [ ] Submit, inspect console log or network payload.
- [ ] Assert all steps present, all arrays length 1.
- [ ] Reload, trigger marital status on Step 1.
- [ ] Switch to partner tab, fill partner data for 2–3 steps.
- [ ] Submit, inspect payload.
- [ ] Assert mixed arrays (1 for single steps, 2 for married).
- [ ] Assert captureMode in audit payload matches expectation.

---

## File Organization

### New Files

```
src/app/components/patient-capture-v2/payload/
├── payload.types.ts                    (new — type definitions)
├── payload-builder.service.ts          (new — injectable service)
└── payload-builder.service.spec.ts     (new — unit tests)
```

### Modified Files

```
src/app/components/patient-capture-v2/patient-capture-v2.ts
├── + import PayloadBuilder
├── + inject PayloadBuilder in constructor
├── + add toStepSnapshots(): StepSnapshot[]
├── + refactor submitForm() to call builder
└── ~ remove inline { patient, partner } payload logic

src/app/components/patient-capture-v2/patient-capture-v2.spec.ts (extend or create)
├── + test single mode submit
├── + test married mode submit
├── + test partner validation
└── + test index alignment
```

### Unchanged Files

- `patient-capture-v2.html` — No changes to template.
- `form.service.ts` — No changes.
- Child form components — No changes.
- `form-fields.ts` — No changes (already has `keyname`, `formLabel`, `allowDynamicParticipants` on loaded form objects).

---

## Success Criteria

### Phase 1 Complete
- [ ] `payload.types.ts` exports all 10+ type definitions without errors.
- [ ] `PayloadBuilder` service compiles, is injectable, has both build methods.
- [ ] Unit tests pass at 100% coverage.

### Phase 2 Complete
- [ ] `PatientCaptureV2` injects `PayloadBuilder`.
- [ ] `toStepSnapshots()` correctly converts FormGroup arrays.
- [ ] `submitForm()` calls both builders, closes dialog with `{ backend, audit }`.
- [ ] Component compiles with zero errors.
- [ ] Existing callers (launcher) updated or aware of new payload shape.

### Phase 3 Complete
- [ ] Partner forms validated on submit when married.
- [ ] Single-mode submits unaffected.
- [ ] Invalid partner blocks submission.

### Phase 4 Complete
- [ ] Component integration tests pass.
- [ ] 80%+ coverage of serialization logic.

### Overall Success
- [ ] Single-mode submit → all Format A arrays length 1, all Format B single-participant.
- [ ] Married-mode submit → Format A arrays correctly sized by `allowDynamicParticipants`, Format B includes both participants.
- [ ] All forms have zero build errors.
- [ ] All new tests pass.
- [ ] Code follows Angular style guide and project conventions.
- [ ] PayloadBuilder is independently testable (no mocks or TestBed needed).

---

## Key Design Decisions

### 1. Two Payload Formats
**Why:** Backend needs compact, grouped-by-step (Format A). Audit/UX benefit from metadata-rich, participant-centric (Format B). One builder, two outputs, full flexibility.

### 2. `PayloadBuilder` as Injectable Service
**Why:** Consistent DI style, mockable in tests, extensible for future requirements.

### 3. No Dependencies in Builder
**Why:** Builder is pure transformation. Passing data in (parameter injection) over field injection keeps it testable without mocks or TestBed.

### 4. Single Guard for Role/Arity Rule
**Why:** `if (allowDynamicParticipants && step.partner)` is the only place the rule lives. Single source of truth, easier to reason about, easier to change.

### 5. Index-Aligned Arrays Persist
**Why:** Current design is correct; no refactoring needed. FormGroups live for component lifetime. Navigation only changes the index pointer.

### 6. `keyname` as Step Identifier
**Why:** Backend's form definitions already include `keyname` (unique step identifier). Reuse it as the payload object key to maintain alignment with backend schema.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `keyname` field name differs on backend | Confirm field name in API response; make it a parameter of `toStepSnapshots()` if renaming is needed later. |
| Changing dialog return shape breaks launcher | Grep all callers of `MatDialogRef.afterClosed()` for PatientCaptureV2; update or return both old and new keys transitionally. |
| Empty partner placeholder leaks into payload | Filtered at `toStepSnapshots()` via `partner: allow ? ... : undefined`. |
| Partner validation missing → invalid data submitted | Phase 3 adds explicit validation; tests verify block on invalid partner. |
| Index misalignment (off-by-one) | `toStepSnapshots()` uses `map((_, i) => this.LoadedSteps[i][0])` to preserve index. Test with stepper > 3 steps. |
| Timestamp non-deterministic in tests | `BuildOptions.now` override allows fixed timestamp in unit tests. |

---

## References

- **Current PatientCaptureV2:** `/home/man-gee/Documents/Angular/ComplexFormsJsonDriven/Project_Sample/src/app/components/patient-capture-v2/patient-capture-v2.ts`
- **Form Service:** `/home/man-gee/Documents/Angular/ComplexFormsJsonDriven/Project_Sample/src/app/services/form.service.ts`
- **Form Models:** `/home/man-gee/Documents/Angular/ComplexFormsJsonDriven/Project_Sample/src/app/models/form-fields.ts`
- **Memory File:** `/home/man-gee/.claude/projects/-home-man-gee-Documents-Angular-ComplexFormsJsonDriven/memory/implementation-complete.md`

---

**Document prepared for:** Multi-step stepper payload implementation in PatientCaptureV2  
**Ready for:** Phase 1 — Type definitions & PayloadBuilder service
