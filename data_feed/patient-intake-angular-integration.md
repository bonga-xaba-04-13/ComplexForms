# Patient Intake Form — Angular Integration Guide

> Complete walkthrough for migrating `patient-intake-form_version_3.html` and `patient-intake-view-modal.html` into a production Angular project, including component architecture, SCSS strategy, reusable patterns, and extension recipes.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Directory Structure](#2-directory-structure)
3. [Design Tokens — Global SCSS Variables](#3-design-tokens--global-scss-variables)
4. [Global Shared Styles](#4-global-shared-styles)
5. [Data Models & Interfaces](#5-data-models--interfaces)
6. [State Service](#6-state-service)
7. [Parent `<modal>` Shell Component](#7-parent-modal-shell-component)
8. [Reusable `<app-form>` Child Component](#8-reusable-app-form-child-component)
9. [Section Panel Components](#9-section-panel-components)
10. [View-Only Modal](#10-view-only-modal)
11. [Patient / Partner Tab System](#11-patient--partner-tab-system)
12. [Routing & Lazy Loading](#12-routing--lazy-loading)
13. [Reusing Template Patterns Elsewhere](#13-reusing-template-patterns-elsewhere)
14. [Where Styles Live — Quick Reference](#14-where-styles-live--quick-reference)
15. [Complete File Listing](#15-complete-file-listing)

---

## 1. Project Setup

```bash
# Create a new Angular workspace (v17+, standalone-first)
ng new patient-app --routing --style=scss --standalone
cd patient-app

# Add Angular Material (optional, used only for overlay/dialog utilities)
ng add @angular/material

# Generate all components up-front
ng g c features/intake/modal          --standalone
ng g c features/intake/form           --standalone
ng g c features/intake/view-modal     --standalone

ng g c features/intake/sections/personal-info   --standalone
ng g c features/intake/sections/contact-details --standalone
ng g c features/intake/sections/medical-history --standalone
ng g c features/intake/sections/medications     --standalone
ng g c features/intake/sections/lifestyle       --standalone
ng g c features/intake/sections/insurance       --standalone
ng g c features/intake/sections/emergency       --standalone

ng g c shared/components/topbar        --standalone
ng g c shared/components/sidebar       --standalone
ng g c shared/components/footer        --standalone
ng g c shared/components/field-row     --standalone
ng g c shared/components/tag-chip      --standalone
ng g c shared/components/section-divider --standalone
ng g c shared/components/combobox      --standalone
ng g c shared/components/info-banner   --standalone

ng g s features/intake/intake-state
ng g s features/intake/patient-lookup
```

---

## 2. Directory Structure

```
src/
├── styles/
│   ├── _tokens.scss          ← design tokens (colours, spacing, radii)
│   ├── _layout.scss          ← modal shell, grid, sidebar, overlay
│   ├── _fields.scss          ← input, select, textarea, label, hint
│   ├── _buttons.scss         ← .btn variants
│   ├── _combobox.scss        ← autocomplete dropdown
│   ├── _chips.scss           ← tag chips, consent icons
│   ├── _toast.scss           ← toast notification
│   └── _view.scss            ← view-only display fields
│
├── app/
│   ├── features/
│   │   └── intake/
│   │       ├── modal/
│   │       │   ├── modal.component.ts
│   │       │   ├── modal.component.html
│   │       │   └── modal.component.scss
│   │       ├── form/
│   │       │   ├── form.component.ts
│   │       │   ├── form.component.html
│   │       │   └── form.component.scss
│   │       ├── view-modal/
│   │       │   ├── view-modal.component.ts
│   │       │   ├── view-modal.component.html
│   │       │   └── view-modal.component.scss
│   │       ├── sections/
│   │       │   ├── personal-info/
│   │       │   ├── contact-details/
│   │       │   ├── medical-history/
│   │       │   ├── medications/
│   │       │   ├── lifestyle/
│   │       │   ├── insurance/
│   │       │   └── emergency/
│   │       ├── intake-state.service.ts
│   │       ├── patient-lookup.service.ts
│   │       └── models/
│   │           ├── patient.model.ts
│   │           └── intake-form.model.ts
│   │
│   └── shared/
│       └── components/
│           ├── topbar/
│           ├── sidebar/
│           ├── footer/
│           ├── field-row/
│           ├── tag-chip/
│           ├── section-divider/
│           ├── combobox/
│           └── info-banner/
```

---

## 3. Design Tokens — Global SCSS Variables

**`src/styles/_tokens.scss`**

This file is the single source of truth for every colour, radius, and spacing value used in the original HTML. All component SCSS files import this.

```scss
// ─── Colour Palette ───────────────────────────────────────────────────────────
$color-navy:        #1a3a5c;   // primary brand — header, active states, primary btn
$color-navy-dark:   #15304d;   // hover on navy
$color-navy-light:  #e8f0f8;   // active sidebar item bg, light tint
$color-navy-muted:  #a8c4de;   // header sub-text, muted on dark bg
$color-navy-border: #c5d8ed;   // borders on navy-tinted elements

$color-teal:        #4db6ac;   // progress fill, success accents
$color-green:       #1a7a5e;   // success button, completed step indicator
$color-green-dark:  #15664f;   // hover on green
$color-green-light: #d1fae5;   // success screen icon bg

$color-amber:       #f59e0b;   // edit/warning button
$color-amber-dark:  #d97706;

$color-red:         #c0392b;   // required asterisk, remove button, error

$color-blue-info:   #1e40af;   // info banner text
$color-blue-bg:     #eff6ff;   // info banner background
$color-blue-border: #bfdbfe;   // info banner border

$color-amber-chip-bg:   #fef3c7;  // medication type chip
$color-amber-chip-text: #92400e;

// ─── Neutral Scale ────────────────────────────────────────────────────────────
$color-text-primary:   #1a1a1a;
$color-text-secondary: #374151;
$color-text-muted:     #5a6478;
$color-text-faint:     #8a94a6;
$color-text-empty:     #b0b7c3;

$color-bg-page:        #f0f2f5;
$color-bg-sidebar:     #f8f9fa;
$color-bg-white:       #ffffff;
$color-bg-view-field:  #f8f9fa;
$color-bg-hero:        linear-gradient(135deg, #f0f5fb 0%, #e8f0f8 100%);

$color-border-default: #d0d5dd;
$color-border-light:   #e4e7ec;

// ─── Typography ──────────────────────────────────────────────────────────────
$font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
$font-size-base: 14px;

$font-size-xs:   10px;
$font-size-sm:   11px;
$font-size-body: 13px;
$font-size-md:   14px;
$font-size-lg:   15px;
$font-size-xl:   16px;
$font-size-2xl:  17px;
$font-size-3xl:  20px;

// ─── Spacing ─────────────────────────────────────────────────────────────────
$space-2:   2px;
$space-4:   4px;
$space-6:   6px;
$space-8:   8px;
$space-10:  10px;
$space-12:  12px;
$space-14:  14px;
$space-16:  16px;
$space-20:  20px;
$space-24:  24px;
$space-28:  28px;
$space-32:  32px;
$space-48:  48px;

// ─── Shape ───────────────────────────────────────────────────────────────────
$radius-sm:   3px;
$radius-md:   4px;
$radius-lg:   6px;
$radius-full: 50%;
$radius-pill: 20px;

// ─── Modal Dimensions ────────────────────────────────────────────────────────
$modal-max-width:  1080px;
$modal-max-height: 840px;
$modal-height:     90vh;
$sidebar-width:    214px;

// ─── Z-index Stack ───────────────────────────────────────────────────────────
$z-overlay:  1000;
$z-dropdown: 2000;
$z-toast:    9999;

// ─── Transitions ─────────────────────────────────────────────────────────────
$transition-fast:   .15s ease;
$transition-normal: .3s ease;
```

---

## 4. Global Shared Styles

**`src/styles.scss`** — import everything at the root level.

```scss
@use 'styles/tokens' as *;   // makes all $vars available everywhere

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: $font-family;
  font-size: $font-size-base;
  color: $color-text-primary;
  background: $color-bg-page;
}

// ── Import all partials ───────────────────────────────────────────────────────
@use 'styles/layout';
@use 'styles/fields';
@use 'styles/buttons';
@use 'styles/combobox';
@use 'styles/chips';
@use 'styles/toast';
@use 'styles/view';
```

---

**`src/styles/_layout.scss`** — overlay, modal shell, sidebar, progress bar.

```scss
@use 'tokens' as *;

// ── Overlay ──────────────────────────────────────────────────────────────────
.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .5);
  z-index: $z-overlay;
  align-items: center;
  justify-content: center;
  padding: $space-16;

  &.is-visible { display: flex; }
}

// ── Modal shell ──────────────────────────────────────────────────────────────
.modal-shell {
  background: $color-bg-white;
  width: 100%;
  max-width: $modal-max-width;
  height: $modal-height;
  max-height: $modal-max-height;
  border-radius: $radius-md;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid $color-border-default;
}

// ── Header ───────────────────────────────────────────────────────────────────
.modal-header {
  background: $color-navy;
  padding: $space-16 $space-24 0;
  flex-shrink: 0;

  &__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $space-14;
  }

  &__title {
    color: $color-bg-white;
    font-size: $font-size-lg;
    font-weight: 600;
  }

  &__sub {
    color: $color-navy-muted;
    font-size: $font-size-sm;
    margin-top: 1px;
  }

  &__badges {
    display: flex;
    align-items: center;
    gap: $space-8;
  }
}

.badge-view-only {
  background: rgba(77, 182, 172, .2);
  color: $color-teal;
  font-size: $font-size-xs;
  font-weight: 700;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 3px $space-10;
  border-radius: $radius-pill;
  border: 1px solid rgba(77, 182, 172, .35);
}

.badge-ref {
  background: rgba(255, 255, 255, .1);
  color: $color-navy-muted;
  font-size: $font-size-xs;
  font-weight: 600;
  font-family: monospace;
  letter-spacing: .05em;
  padding: 3px $space-10;
  border-radius: $radius-pill;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: $color-navy-muted;
  font-size: 22px;
  cursor: pointer;
  line-height: 1;
  padding: $space-2;

  &:hover { color: $color-bg-white; }
}

// ── Progress bar ─────────────────────────────────────────────────────────────
.progress-bar {
  height: 3px;
  background: rgba(255, 255, 255, .15);
  border-radius: $radius-sm;
  overflow: hidden;

  &__fill {
    height: 100%;
    background: $color-teal;
    border-radius: $radius-sm;
    transition: width $transition-normal;
  }
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  padding: $space-6 0 $space-12;

  &__label { color: $color-navy-muted; font-size: $font-size-sm; }
  &__pct   { color: $color-teal; font-size: $font-size-sm; font-weight: 600; }
}

// ── Body (sidebar + main) ────────────────────────────────────────────────────
.modal-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
.modal-sidebar {
  width: $sidebar-width;
  flex-shrink: 0;
  background: $color-bg-sidebar;
  border-right: 1px solid $color-border-light;
  overflow-y: auto;
  padding: $space-12 0;

  &::-webkit-scrollbar       { width: 4px; }
  &::-webkit-scrollbar-thumb { background: $color-border-default; border-radius: $radius-sm; }

  &__heading {
    font-size: $font-size-xs;
    font-weight: 600;
    color: $color-text-faint;
    letter-spacing: .08em;
    text-transform: uppercase;
    padding: 0 $space-16 $space-8;
  }
}

.step-btn {
  display: flex;
  align-items: center;
  gap: $space-10;
  width: 100%;
  padding: 9px $space-16;
  background: transparent;
  border: none;
  border-left: 2px solid transparent;
  cursor: pointer;
  text-align: left;
  color: $color-text-muted;
  font-size: $font-size-body;
  font-family: $font-family;
  transition: background $transition-fast, color $transition-fast;

  &:hover { background: #eef0f3; color: $color-navy; }

  &.is-active {
    background: $color-navy-light;
    color: $color-navy;
    border-left-color: $color-navy;
    font-weight: 500;

    .step-num { background: $color-navy; color: $color-bg-white; }
  }

  &.is-complete {
    color: $color-green;
    .step-num { background: $color-green; color: $color-bg-white; }
  }
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: $radius-full;
  background: $color-border-light;
  color: $color-text-muted;
  font-size: $font-size-sm;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-label { font-size: 12.5px; line-height: 1.3; flex: 1; }

// ── Tab bar (Patient / Partner) ───────────────────────────────────────────────
.tab-bar {
  display: none;
  border-bottom: 1px solid $color-border-light;
  background: $color-bg-white;
  padding: 0 $space-24;
  flex-shrink: 0;

  &.is-visible { display: flex; }
}

.tab-btn {
  padding: $space-10 $space-20;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: $font-size-body;
  color: $color-text-muted;
  font-weight: 500;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 7px;
  font-family: $font-family;
  transition: color $transition-fast;

  &:hover { color: $color-navy; }

  &.is-active {
    color: $color-navy;
    border-bottom-color: $color-navy;
  }
}

.tab-badge {
  font-size: $font-size-xs;
  background: $color-border-light;
  color: $color-text-muted;
  border-radius: $radius-pill;
  padding: 1px 7px;

  .tab-btn.is-active & { background: #d6e4f0; color: $color-navy; }
}

// ── Form panels area ──────────────────────────────────────────────────────────
.modal-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.panels-scroll {
  flex: 1;
  overflow-y: auto;
  padding: $space-24;

  &::-webkit-scrollbar       { width: 4px; }
  &::-webkit-scrollbar-thumb { background: $color-border-default; border-radius: $radius-sm; }
}

// ── Section divider ───────────────────────────────────────────────────────────
.section-divider {
  display: flex;
  align-items: center;
  gap: $space-10;
  margin: $space-20 0 $space-16;

  span {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $color-text-faint;
    text-transform: uppercase;
    letter-spacing: .07em;
    white-space: nowrap;
  }

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: $color-border-light;
  }
}

// ── Footer ────────────────────────────────────────────────────────────────────
.modal-footer {
  border-top: 1px solid $color-border-light;
  padding: $space-14 $space-24;
  display: flex;
  align-items: center;
  gap: $space-10;
  background: $color-bg-white;
  flex-shrink: 0;

  &__left  { display: flex; gap: $space-8; align-items: center; }
  &__right { margin-left: auto; display: flex; gap: $space-8; align-items: center; }
  &__info  { font-size: $font-size-sm; color: $color-text-faint; }
}

// ── Info banner ───────────────────────────────────────────────────────────────
.info-banner {
  background: $color-blue-bg;
  border: 1px solid $color-blue-border;
  border-radius: $radius-md;
  padding: $space-10 $space-14;
  font-size: 12.5px;
  color: $color-blue-info;
  margin-bottom: $space-16 + 2px;
  display: flex;
  align-items: flex-start;
  gap: $space-8;
}
```

---

**`src/styles/_fields.scss`** — all form field primitives.

```scss
@use 'tokens' as *;

// ── Field layout ─────────────────────────────────────────────────────────────
.field-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $space-14 $space-16;
  margin-bottom: $space-14;
}

.field        { display: flex; flex-direction: column; gap: 5px; }
.field--span2 { grid-column: 1 / -1; }

// ── Label ────────────────────────────────────────────────────────────────────
.field-label {
  font-size: $font-size-sm;
  font-weight: 500;
  color: $color-text-secondary;
  display: flex;
  align-items: center;
  gap: 3px;
}

.field-required { color: $color-red; font-size: $font-size-sm; }

.field-hint { font-size: $font-size-sm; color: $color-text-faint; line-height: 1.4; }

// ── Shared control base ───────────────────────────────────────────────────────
%control-base {
  padding: $space-8 $space-10;
  border: 1px solid $color-border-default;
  border-radius: $radius-md;
  font-size: $font-size-body;
  color: $color-text-primary;
  background: $color-bg-white;
  outline: none;
  width: 100%;
  font-family: $font-family;
  transition: border-color $transition-fast;

  &:focus {
    border-color: $color-navy;
    box-shadow: 0 0 0 3px rgba(26, 58, 92, .08);
  }
}

// ── Controls ─────────────────────────────────────────────────────────────────
.field-input    { @extend %control-base; }
.field-textarea {
  @extend %control-base;
  resize: vertical;
  min-height: 80px;
}

.field-select {
  @extend %control-base;
  appearance: none;
  // CSS-only chevron arrow — no SVG path needed
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%235a6478' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right $space-10 center;
  padding-right: $space-28;
}

// ── Radio / Checkbox groups ───────────────────────────────────────────────────
.radio-group,
.check-group {
  display: flex;
  flex-wrap: wrap;
  gap: $space-8;
  margin-top: $space-2;
}

.radio-item,
.check-item {
  display: flex;
  align-items: flex-start;
  gap: $space-6;
  font-size: $font-size-body;
  cursor: pointer;
  color: $color-text-secondary;

  input {
    cursor: pointer;
    accent-color: $color-navy;
    margin-top: $space-2;
    flex-shrink: 0;
  }
}

// ── Status toggle (pill radio group) ─────────────────────────────────────────
.status-toggle {
  display: flex;
  border: 1px solid $color-border-default;
  border-radius: $radius-md;
  overflow: hidden;
  width: fit-content;
  margin-top: $space-4;

  input[type='radio'] { display: none; }

  label {
    padding: $space-8 $space-16;
    font-size: $font-size-body;
    cursor: pointer;
    color: $color-text-muted;
    border-right: 1px solid $color-border-default;
    transition: background $transition-fast, color $transition-fast;
    user-select: none;

    &:last-of-type { border-right: none; }
  }

  input[type='radio']:checked + label {
    background: $color-navy;
    color: $color-bg-white;
    font-weight: 500;
  }
}

// ── Medication row card ───────────────────────────────────────────────────────
.med-row {
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  padding: $space-14;
  margin-bottom: $space-12;
}

.med-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-10;
  font-size: $font-size-sm;
  font-weight: 600;
  color: $color-text-faint;
  text-transform: uppercase;
  letter-spacing: .06em;
}

// ── Contact card ─────────────────────────────────────────────────────────────
.contact-card {
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  padding: $space-14 $space-16;
  margin-bottom: $space-12;
  background: #fdfdfe;
}

.contact-card-header {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $color-text-faint;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: $space-12;
}
```

---

**`src/styles/_buttons.scss`**

```scss
@use 'tokens' as *;

%btn-base {
  padding: $space-8 $space-16 + 2px;
  border-radius: $radius-md;
  font-size: $font-size-body;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  font-family: $font-family;
  display: inline-flex;
  align-items: center;
  gap: $space-6;
  transition: background $transition-fast, border-color $transition-fast, color $transition-fast;

  &:disabled { opacity: .45; cursor: not-allowed; }
}

.btn-ghost {
  @extend %btn-base;
  background: transparent;
  border-color: $color-border-default;
  color: $color-text-secondary;
  &:hover:not(:disabled) { background: #f3f4f6; }
}

.btn-primary {
  @extend %btn-base;
  background: $color-navy;
  color: $color-bg-white;
  border-color: $color-navy;
  &:hover:not(:disabled) { background: $color-navy-dark; }
}

.btn-success {
  @extend %btn-base;
  background: $color-green;
  color: $color-bg-white;
  border-color: $color-green;
  &:hover:not(:disabled) { background: $color-green-dark; }
}

.btn-warning {
  @extend %btn-base;
  background: $color-amber;
  color: $color-bg-white;
  border-color: $color-amber;
  &:hover:not(:disabled) { background: $color-amber-dark; }
}
```

---

**`src/styles/_view.scss`** — view-only display field styles.

```scss
@use 'tokens' as *;

// ── View field ────────────────────────────────────────────────────────────────
.vfield        { display: flex; flex-direction: column; gap: $space-4; }

.vlabel {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $color-text-faint;
  text-transform: uppercase;
  letter-spacing: .06em;
}

.vvalue {
  font-size: $font-size-body;
  color: $color-text-primary;
  padding: $space-8 $space-10;
  background: $color-bg-view-field;
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  line-height: 1.5;
  min-height: 36px;

  &--empty   { color: $color-text-empty; font-style: italic; }
  &--tall    { min-height: 72px; white-space: pre-wrap; }
  &--signature { font-style: italic; font-size: $font-size-2xl; color: $color-navy; }
}

// ── Tag chips (selected checkboxes) ──────────────────────────────────────────
.vtags {
  display: flex;
  flex-wrap: wrap;
  gap: $space-6;
  padding: $space-8;
  background: $color-bg-view-field;
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  min-height: 36px;
}

.vtag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: $color-navy-light;
  color: $color-navy;
  border: 1px solid $color-navy-border;
  border-radius: $radius-sm;
  font-size: $font-size-body - 1px;
  font-weight: 500;
  padding: 3px 9px;
}

.vtag-check {
  width: 13px;
  height: 13px;
  background: $color-navy;
  border-radius: $radius-sm - 1px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: $color-bg-white;
  font-size: 9px;
  flex-shrink: 0;
}

// ── Consent list ─────────────────────────────────────────────────────────────
.vconsent-list { display: flex; flex-direction: column; gap: $space-8; }

.vconsent-item {
  display: flex;
  align-items: flex-start;
  gap: $space-10;
  font-size: $font-size-body;
  color: $color-text-secondary;
  line-height: 1.5;
}

.vconsent-icon {
  width: 18px;
  height: 18px;
  border-radius: $radius-sm;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
  font-size: $font-size-sm;
  font-weight: 700;

  &--checked   { background: $color-green; color: $color-bg-white; }
  &--unchecked { background: $color-border-light; color: $color-text-faint; }
}

// ── Patient hero card (top of view step 1) ────────────────────────────────────
.patient-hero {
  display: flex;
  align-items: center;
  gap: $space-16;
  padding: $space-16;
  background: $color-bg-hero;
  border: 1px solid $color-navy-border;
  border-radius: $radius-lg;
  margin-bottom: $space-20;
}

.patient-avatar {
  width: 52px;
  height: 52px;
  border-radius: $radius-full;
  background: $color-navy;
  color: $color-bg-white;
  font-size: 20px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.patient-name { font-size: $font-size-2xl; font-weight: 700; }
.patient-meta { font-size: $font-size-sm; color: $color-text-muted; margin-top: 2px; }

.patient-id {
  margin-left: auto;
  font-family: monospace;
  font-size: $font-size-sm;
  color: $color-text-faint;
  background: rgba(255,255,255,.7);
  border: 1px solid $color-border-default;
  border-radius: $radius-md;
  padding: $space-4 $space-10;
}

// ── Medication view card ──────────────────────────────────────────────────────
.vmed-card {
  border: 1px solid $color-border-light;
  border-radius: $radius-md;
  padding: $space-14;
  margin-bottom: $space-12;
  background: #fdfdfe;
}

.vmed-header {
  font-size: $font-size-sm;
  font-weight: 600;
  color: $color-text-faint;
  text-transform: uppercase;
  letter-spacing: .06em;
  margin-bottom: $space-10;
  display: flex;
  align-items: center;
  gap: $space-8;
}

.vmed-pill {
  background: $color-amber-chip-bg;
  color: $color-amber-chip-text;
  font-size: $font-size-xs;
  padding: 2px $space-8;
  border-radius: $radius-pill;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}
```

---

## 5. Data Models & Interfaces

**`src/app/features/intake/models/patient.model.ts`**

```typescript
export interface PatientPersonal {
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  preferredName?: string;
  dob: string;          // ISO date
  gender: string;
  nationality: string;
  idType: string;
  idNumber: string;
  race?: string;
  language: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
}

export interface PatientContact {
  mobile: string;
  altPhone?: string;
  email: string;
  preferredContact?: string;
  street: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface MedicalHistory {
  conditions: string[];
  conditionsOther?: string;
  surgeries?: string;
  allergies: string[];
  allergyDescription?: string;
  familyHistory: string[];
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  prescribingDoctor: string;
  condition: string;
}

export interface Medications {
  onMeds: boolean;
  medicationList: Medication[];
  herbal: boolean;
  herbalDescription?: string;
  vaccinations: string[];
}

export interface Lifestyle {
  smoking: string;
  alcohol: string;
  drugs: string;
  exercise: string;
  diet: string;
  occupation: string;
  housing: string;
  employer: string;
  dependants: number;
  income: string;
  pregnancy: string;
  contraceptive: string;
}

export interface Insurance {
  hasMedicalAid: boolean;
  scheme?: string;
  plan?: string;
  membershipNumber?: string;
  dependantCode?: string;
  mainMember?: string;
  authNumber?: string;
  gapProvider?: string;
  gapPolicy?: string;
  lifeInsurer?: string;
  lifePolicy?: string;
  billingMethod: string;
  billingEmail?: string;
}

export interface EmergencyContact {
  fullName: string;
  relationship: string;
  mobile: string;
  phone?: string;
  email?: string;
}

export interface ConsentRecord {
  treatmentConsent: boolean;
  popiaConsent: boolean;
  billingAuth: boolean;
  emergencyDisclosure: boolean;
  signature: string;
  signDate: string;
}

export interface PatientRecord {
  refNumber: string;
  submittedAt?: string;
  personal: PatientPersonal;
  contact: PatientContact;
  medicalHistory: MedicalHistory;
  medications: Medications;
  lifestyle: Lifestyle;
  insurance: Insurance;
  primaryContact: EmergencyContact;
  secondaryContact?: EmergencyContact;
  consent: ConsentRecord;
}

export interface IntakeFormData {
  patient: PatientRecord;
  partner?: PatientRecord;   // present when marital status is married/partnered
}
```

---

## 6. State Service

**`src/app/features/intake/intake-state.service.ts`**

```typescript
import { Injectable, signal, computed } from '@angular/core';
import { IntakeFormData, PatientRecord } from './models/patient.model';

export type ActiveTab   = 'patient' | 'partner';
export type ModalMode   = 'capture' | 'view';
export const SECTION_LABELS = [
  'Personal Information',
  'Contact Details',
  'Medical History',
  'Current Medications',
  'Lifestyle & Social',
  'Insurance & Financial',
  'Emergency Contacts',
] as const;

export const TOTAL_SECTIONS = SECTION_LABELS.length;

@Injectable({ providedIn: 'root' })
export class IntakeStateService {

  // ── Modal visibility ───────────────────────────────────────────────────────
  readonly modalOpen  = signal(false);
  readonly modalMode  = signal<ModalMode>('capture');

  // ── Navigation ─────────────────────────────────────────────────────────────
  readonly currentStep     = signal(0);
  readonly completedSteps  = signal(new Set<number>());
  readonly activeTab       = signal<ActiveTab>('patient');
  readonly showPartnerTab  = signal(false);

  // ── Form data ──────────────────────────────────────────────────────────────
  readonly formData        = signal<Partial<IntakeFormData>>({});
  readonly viewRecord      = signal<PatientRecord | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly progressPercent = computed(() =>
    Math.round(((this.currentStep() + 1) / TOTAL_SECTIONS) * 100)
  );

  readonly currentLabel = computed(() =>
    SECTION_LABELS[this.currentStep()]
  );

  readonly isFirstStep = computed(() => this.currentStep() === 0);
  readonly isLastStep  = computed(() => this.currentStep() === TOTAL_SECTIONS - 1);

  // ── Actions ────────────────────────────────────────────────────────────────
  openCapture(): void {
    this.currentStep.set(0);
    this.completedSteps.set(new Set());
    this.activeTab.set('patient');
    this.modalMode.set('capture');
    this.modalOpen.set(true);
  }

  openView(record: PatientRecord): void {
    this.viewRecord.set(record);
    this.currentStep.set(0);
    this.modalMode.set('view');
    this.modalOpen.set(true);
  }

  closeModal(): void { this.modalOpen.set(false); }

  goToStep(step: number): void {
    this.currentStep.set(step);
  }

  nextStep(): void {
    if (this.isLastStep()) return;
    const done = new Set(this.completedSteps());
    done.add(this.currentStep());
    this.completedSteps.set(done);
    this.currentStep.update(s => s + 1);
  }

  prevStep(): void {
    if (this.isFirstStep()) return;
    this.currentStep.update(s => s - 1);
  }

  setTab(tab: ActiveTab): void { this.activeTab.set(tab); }

  enablePartnerTab(): void { this.showPartnerTab.set(true); }
  disablePartnerTab(): void {
    this.showPartnerTab.set(false);
    this.activeTab.set('patient');
  }

  patchPatient(patch: Partial<PatientRecord>): void {
    this.formData.update(d => ({
      ...d,
      patient: { ...d.patient, ...patch } as PatientRecord
    }));
  }
}
```

---

## 7. Parent `<modal>` Shell Component

The `ModalComponent` owns the overlay, header (topbar), sidebar, and footer. It renders `<app-form>` in its content area. It does **not** contain any form field HTML.

**`modal.component.html`**

```html
<!-- OVERLAY -->
<div
  class="modal-overlay"
  [class.is-visible]="state.modalOpen()"
  (click)="onOverlayClick($event)"
  id="modal-overlay">

  <div class="modal-shell" role="dialog" aria-modal="true" aria-labelledby="modal-title">

    <!-- ── TOPBAR ─────────────────────────────────────────────────────── -->
    <div class="modal-header">
      <div class="modal-header__top">
        <div>
          <div class="modal-header__badges" *ngIf="state.modalMode() === 'view'">
            <span class="modal-header__title" id="modal-title">Patient Record</span>
            <span class="badge-view-only">&#128274; View Only</span>
            <span class="badge-ref">{{ viewRef }}</span>
          </div>
          <span class="modal-header__title" id="modal-title"
            *ngIf="state.modalMode() === 'capture'">
            Patient Intake Registration
          </span>
          <div class="modal-header__sub">
            Step {{ state.currentStep() + 1 }} of {{ TOTAL }} — {{ state.currentLabel() }}
          </div>
        </div>
        <button class="modal-close-btn" (click)="state.closeModal()" aria-label="Close">
          &times;
        </button>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar">
        <div
          class="progress-bar__fill"
          [style.width.%]="state.progressPercent()">
        </div>
      </div>
      <div class="progress-meta">
        <span class="progress-meta__label">{{ state.currentLabel() }}</span>
        <span class="progress-meta__pct">{{ state.progressPercent() }}%</span>
      </div>
    </div>

    <!-- ── BODY (sidebar + main) ────────────────────────────────────── -->
    <div class="modal-body">

      <!-- SIDEBAR -->
      <app-sidebar
        [currentStep]="state.currentStep()"
        [completedSteps]="state.completedSteps()"
        [labels]="SECTION_LABELS"
        (stepSelected)="state.goToStep($event)">
      </app-sidebar>

      <!-- MAIN (tabs + scrollable panels) -->
      <div class="modal-main">

        <!-- Patient / Partner tab bar — only when married -->
        <div class="tab-bar" [class.is-visible]="state.showPartnerTab()">
          <button
            class="tab-btn"
            [class.is-active]="state.activeTab() === 'patient'"
            (click)="state.setTab('patient')">
            Patient <span class="tab-badge">Active</span>
          </button>
          <button
            class="tab-btn"
            [class.is-active]="state.activeTab() === 'partner'"
            (click)="state.setTab('partner')">
            Spouse / Partner
            <span class="tab-badge">{{ partnerBadgeLabel }}</span>
          </button>
        </div>

        <!-- PANELS — rendered by <app-form> -->
        <div class="panels-scroll" #panelsScroll>
          <app-form
            [step]="state.currentStep()"
            [tab]="state.activeTab()"
            [mode]="state.modalMode()"
            [record]="state.viewRecord()"
            (maritalChanged)="onMaritalChanged($event)">
          </app-form>
        </div>

      </div>
    </div>

    <!-- ── FOOTER ───────────────────────────────────────────────────── -->
    <div class="modal-footer">
      <div class="modal-footer__left">
        <ng-container *ngIf="state.modalMode() === 'capture'">
          <button class="btn-ghost" (click)="saveDraft()">Save Draft</button>
        </ng-container>
        <ng-container *ngIf="state.modalMode() === 'view'">
          <button class="btn-ghost"  (click)="cloneRecord()">&#10064; Clone</button>
          <button class="btn-warning" (click)="editRecord()">&#9998; Edit</button>
        </ng-container>
      </div>
      <div class="modal-footer__right">
        <span class="modal-footer__info">
          Section {{ state.currentStep() + 1 }} of {{ TOTAL }}
        </span>
        <button
          class="btn-ghost"
          [disabled]="state.isFirstStep()"
          (click)="state.prevStep()">
          &#8592; Previous
        </button>
        <button
          class="btn-primary"
          *ngIf="!state.isLastStep()"
          (click)="state.nextStep()">
          Next &#8594;
        </button>
        <button
          class="btn-success"
          *ngIf="state.isLastStep() && state.modalMode() === 'capture'"
          (click)="submitForm()">
          &#10003; Submit
        </button>
        <button
          class="btn-ghost"
          *ngIf="state.isLastStep() && state.modalMode() === 'view'"
          (click)="state.closeModal()">
          Close
        </button>
      </div>
    </div>

  </div>
</div>

<div class="auto__toast" [class.auto__toast-show]="toastVisible">{{ toastMsg }}</div>
```

**`modal.component.ts`**

```typescript
import {
  Component, ViewChild, ElementRef, inject, HostListener
} from '@angular/core';
import { CommonModule }      from '@angular/common';
import { IntakeStateService, SECTION_LABELS, TOTAL_SECTIONS } from '../intake-state.service';
import { AppFormComponent }  from '../form/form.component';
import { SidebarComponent }  from '../../../shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, AppFormComponent, SidebarComponent],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
})
export class ModalComponent {
  readonly state         = inject(IntakeStateService);
  readonly SECTION_LABELS = SECTION_LABELS;
  readonly TOTAL          = TOTAL_SECTIONS;

  toastMsg     = '';
  toastVisible = false;

  get viewRef(): string {
    return 'PAT-' + Date.now().toString().slice(-6);
  }

  get partnerBadgeLabel(): string {
    // You could compute this from form completeness
    return 'Incomplete';
  }

  @ViewChild('panelsScroll') panelsScroll!: ElementRef<HTMLElement>;

  @HostListener('document:keydown.escape')
  onEsc(): void { this.state.closeModal(); }

  onOverlayClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).id === 'modal-overlay') this.state.closeModal();
  }

  onMaritalChanged(status: string): void {
    if (status === 'married') this.state.enablePartnerTab();
    else this.state.disablePartnerTab();
  }

  saveDraft(): void { this.showToast('Draft saved successfully'); }

  cloneRecord(): void { this.showToast('Record cloned — new intake form opened'); }

  editRecord(): void {
    this.state.closeModal();
    // Re-open in capture mode with pre-filled data
    this.showToast('Opening in edit mode…');
  }

  submitForm(): void {
    this.showToast('Form submitted successfully!');
    // emit to parent / call service
  }

  showToast(msg: string, ms = 2800): void {
    this.toastMsg     = msg;
    this.toastVisible = true;
    setTimeout(() => (this.toastVisible = false), ms);
  }
}
```

**`modal.component.scss`** — component-level overrides only; all base styles come from globals.

```scss
// modal.component.scss — keep this thin; global partials handle everything.
// Only add truly component-scoped overrides here.

:host {
  // No display needed — the overlay is fixed-position
}

// If you need to scope any .modal-* rule to this component only:
// (prefer global _layout.scss for shared rules)
```

---

## 8. Reusable `<app-form>` Child Component

`AppFormComponent` is the **router** — it receives `step` and `tab` as inputs and renders the correct section component. All form field HTML lives in the section components.

**`form.component.ts`**

```typescript
import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PersonalInfoComponent }   from '../sections/personal-info/personal-info.component';
import { ContactDetailsComponent } from '../sections/contact-details/contact-details.component';
import { MedicalHistoryComponent } from '../sections/medical-history/medical-history.component';
import { MedicationsComponent }    from '../sections/medications/medications.component';
import { LifestyleComponent }      from '../sections/lifestyle/lifestyle.component';
import { InsuranceComponent }      from '../sections/insurance/insurance.component';
import { EmergencyComponent }      from '../sections/emergency/emergency.component';
import { PatientRecord }           from '../models/patient.model';

export type ModalMode = 'capture' | 'view';
export type ActiveTab  = 'patient' | 'partner';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [
    CommonModule,
    PersonalInfoComponent,
    ContactDetailsComponent,
    MedicalHistoryComponent,
    MedicationsComponent,
    LifestyleComponent,
    InsuranceComponent,
    EmergencyComponent,
  ],
  template: `
    <ng-container [ngSwitch]="step">

      <app-personal-info
        *ngSwitchCase="0"
        [tab]="tab"
        [mode]="mode"
        [data]="record"
        (maritalChanged)="maritalChanged.emit($event)">
      </app-personal-info>

      <app-contact-details
        *ngSwitchCase="1"
        [tab]="tab"
        [mode]="mode"
        [data]="record">
      </app-contact-details>

      <app-medical-history
        *ngSwitchCase="2"
        [tab]="tab"
        [mode]="mode"
        [data]="record">
      </app-medical-history>

      <app-medications
        *ngSwitchCase="3"
        [tab]="tab"
        [mode]="mode"
        [data]="record">
      </app-medications>

      <app-lifestyle
        *ngSwitchCase="4"
        [tab]="tab"
        [mode]="mode"
        [data]="record">
      </app-lifestyle>

      <app-insurance
        *ngSwitchCase="5"
        [tab]="tab"
        [mode]="mode"
        [data]="record">
      </app-insurance>

      <app-emergency
        *ngSwitchCase="6"
        [tab]="tab"
        [mode]="mode"
        [data]="record">
      </app-emergency>

    </ng-container>
  `,
})
export class AppFormComponent {
  @Input() step!: number;
  @Input() tab!: ActiveTab;
  @Input() mode!: ModalMode;
  @Input() record: PatientRecord | null = null;

  @Output() maritalChanged = new EventEmitter<string>();
}
```

---

## 9. Section Panel Components

Each section component has the same interface contract. Here are two fully fleshed examples — `personal-info` (capture + view) and `medical-history` (capture + view). The rest follow the same pattern.

### 9.1 Personal Information

**`personal-info.component.ts`**

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { PatientRecord }   from '../../models/patient.model';

@Component({
  selector: 'app-personal-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './personal-info.component.html',
  styleUrls: ['./personal-info.component.scss'],
})
export class PersonalInfoComponent {
  @Input() tab!: 'patient' | 'partner';
  @Input() mode!: 'capture' | 'view';
  @Input() data: PatientRecord | null = null;

  @Output() maritalChanged = new EventEmitter<string>();

  readonly titleOptions    = ['', 'Mr', 'Mrs', 'Ms', 'Miss', 'Dr', 'Prof'];
  readonly genderOptions   = ['', 'Male', 'Female', 'Non-binary', 'Prefer not to say', 'Other'];
  readonly nationalityOpts = ['', 'South African', 'Zimbabwean', 'Mozambican', 'Malawian', 'Other'];
  readonly idTypeOptions   = ['South African ID', 'Passport', 'Asylum Permit', 'Work Permit'];
  readonly raceOptions     = ['Prefer not to say', 'African / Black', 'Coloured', 'Indian / Asian', 'White', 'Other'];
  readonly languageOptions = ['', 'isiZulu', 'isiXhosa', 'Afrikaans', 'English', 'Sepedi', 'Setswana', 'Sesotho', 'Other'];
  readonly maritalOptions  = [
    { value: 'single',   label: 'Single' },
    { value: 'married',  label: 'Married / Partnered' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed',  label: 'Widowed' },
  ];

  get initials(): string {
    if (!this.data?.personal) return '??';
    const p = this.data.personal;
    return `${p.firstName?.[0] ?? ''}${p.lastName?.[0] ?? ''}`.toUpperCase();
  }

  get fullName(): string {
    if (!this.data?.personal) return '';
    const p = this.data.personal;
    return [p.title, p.firstName, p.lastName].filter(Boolean).join(' ');
  }

  get heroMeta(): string {
    if (!this.data?.personal) return '';
    const p = this.data.personal;
    const age = p.dob
      ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 864e5))
      : null;
    return [p.gender, age ? `${age} yrs` : null, p.nationality]
      .filter(Boolean).join(' · ');
  }

  onMaritalChange(value: string): void {
    this.maritalChanged.emit(value);
  }
}
```

**`personal-info.component.html`**

```html
<!-- ── PATIENT HERO (view mode only) ────────────────────────────────────── -->
<div class="patient-hero" *ngIf="mode === 'view'">
  <div class="patient-avatar">{{ initials }}</div>
  <div>
    <div class="patient-name">{{ fullName }}</div>
    <div class="patient-meta">{{ heroMeta }}</div>
  </div>
  <div class="patient-id">ID&nbsp;{{ data?.personal?.idNumber }}</div>
</div>

<!-- ── PANEL HEADER ─────────────────────────────────────────────────────── -->
<div class="panel-title">
  {{ tab === 'partner' ? 'Spouse / Partner — ' : '' }}Personal Information
</div>
<div class="panel-desc">
  <ng-container *ngIf="tab === 'partner'">
    <div class="info-banner">
      <span>&#8505;</span>
      Legal name and identification details for the spouse or partner.
    </div>
  </ng-container>
  <ng-container *ngIf="tab === 'patient'">
    Search for an existing patient record to auto-fill, or enter new details below.
  </ng-container>
</div>

<!-- ══════════════════════════════════════════════════════════════════════════
     CAPTURE MODE
══════════════════════════════════════════════════════════════════════════ -->
<ng-container *ngIf="mode === 'capture'">

  <div class="field-row">
    <div class="field">
      <label class="field-label">Title</label>
      <select class="field-select" [formControl]="...">
        <option *ngFor="let o of titleOptions" [value]="o">{{ o || 'Select' }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">First Name <span class="field-required">*</span></label>
      <input class="field-input" type="text" placeholder="e.g. Sipho" />
    </div>
    <div class="field">
      <label class="field-label">Middle Name</label>
      <input class="field-input" type="text" placeholder="Optional" />
    </div>
    <div class="field">
      <label class="field-label">Last Name <span class="field-required">*</span></label>
      <input class="field-input" type="text" placeholder="e.g. Dlamini" />
    </div>
    <div class="field">
      <label class="field-label">Preferred Name</label>
      <input class="field-input" type="text" />
    </div>
  </div>

  <div class="section-divider"><span>Identity &amp; Demographics</span></div>

  <div class="field-row">
    <div class="field">
      <label class="field-label">Date of Birth <span class="field-required">*</span></label>
      <input class="field-input" type="date" />
    </div>
    <div class="field">
      <label class="field-label">Gender <span class="field-required">*</span></label>
      <select class="field-select">
        <option *ngFor="let o of genderOptions" [value]="o">{{ o || 'Select' }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">Nationality</label>
      <select class="field-select">
        <option *ngFor="let o of nationalityOpts" [value]="o">{{ o || 'Select' }}</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label">ID Type</label>
      <select class="field-select">
        <option *ngFor="let o of idTypeOptions" [value]="o">{{ o }}</option>
      </select>
    </div>
    <div class="field field--span2">
      <label class="field-label">ID / Passport Number <span class="field-required">*</span></label>
      <input class="field-input" type="text" placeholder="13-digit SA ID or passport number" />
    </div>
  </div>

  <!-- Marital status — only on patient tab -->
  <ng-container *ngIf="tab === 'patient'">
    <div class="section-divider"><span>Marital Status</span></div>
    <div class="field-row">
      <div class="field field--span2">
        <label class="field-label">Marital Status <span class="field-required">*</span></label>
        <div class="status-toggle">
          <ng-container *ngFor="let opt of maritalOptions">
            <input type="radio" name="marital" [id]="'ms_' + opt.value" [value]="opt.value"
              (change)="onMaritalChange(opt.value)" />
            <label [for]="'ms_' + opt.value">{{ opt.label }}</label>
          </ng-container>
        </div>
        <span class="field-hint">
          Selecting "Married / Partnered" enables the spouse/partner tab throughout all sections.
        </span>
      </div>
    </div>
  </ng-container>

</ng-container>

<!-- ══════════════════════════════════════════════════════════════════════════
     VIEW MODE
══════════════════════════════════════════════════════════════════════════ -->
<ng-container *ngIf="mode === 'view'">

  <div class="field-row">
    <div class="vfield">
      <div class="vlabel">Title</div>
      <div class="vvalue" [class.vvalue--empty]="!data?.personal?.title">
        {{ data?.personal?.title || 'Not provided' }}
      </div>
    </div>
    <div class="vfield">
      <div class="vlabel">First Name</div>
      <div class="vvalue">{{ data?.personal?.firstName }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">Middle Name</div>
      <div class="vvalue" [class.vvalue--empty]="!data?.personal?.middleName">
        {{ data?.personal?.middleName || 'Not provided' }}
      </div>
    </div>
    <div class="vfield">
      <div class="vlabel">Last Name</div>
      <div class="vvalue">{{ data?.personal?.lastName }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">Date of Birth</div>
      <div class="vvalue">{{ data?.personal?.dob | date:'dd MMM yyyy' }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">Gender</div>
      <div class="vvalue">{{ data?.personal?.gender }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">ID Type</div>
      <div class="vvalue">{{ data?.personal?.idType }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">ID / Passport Number</div>
      <div class="vvalue">{{ data?.personal?.idNumber }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">Marital Status</div>
      <div class="vvalue">{{ data?.personal?.maritalStatus | titlecase }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">Home Language</div>
      <div class="vvalue">{{ data?.personal?.language }}</div>
    </div>
  </div>

</ng-container>
```

---

### 9.2 Medical History

**`medical-history.component.html`** — shows the checkbox-to-chip pattern in view mode.

```html
<div class="panel-title">Medical History</div>
<div class="panel-desc">Pre-existing conditions, surgical history, allergies, and family background.</div>

<!-- ── CAPTURE ────────────────────────────────────────────────────────────── -->
<ng-container *ngIf="mode === 'capture'">

  <div class="section-divider"><span>Pre-existing Conditions</span></div>
  <div class="field-row">
    <div class="field field--span2">
      <label class="field-label">Diagnosed Conditions</label>
      <div class="check-group">
        <label class="check-item" *ngFor="let c of conditionOptions">
          <input type="checkbox" [value]="c" (change)="onConditionToggle(c, $event)" />
          {{ c }}
        </label>
      </div>
    </div>
    <div class="field field--span2">
      <label class="field-label">Other / Additional Diagnoses</label>
      <textarea class="field-textarea" placeholder="List additional conditions…"></textarea>
    </div>
  </div>

  <div class="section-divider"><span>Allergies</span></div>
  <div class="field-row">
    <div class="field field--span2">
      <label class="field-label">Known Allergies</label>
      <div class="check-group">
        <label class="check-item" *ngFor="let a of allergyOptions">
          <input type="checkbox" [value]="a" />
          {{ a }}
        </label>
      </div>
    </div>
    <div class="field field--span2">
      <label class="field-label">Describe Allergic Reactions</label>
      <textarea class="field-textarea" style="min-height: 60px"
        placeholder="Reaction type and severity for each allergy…"></textarea>
    </div>
  </div>

</ng-container>

<!-- ── VIEW ───────────────────────────────────────────────────────────────── -->
<ng-container *ngIf="mode === 'view'">

  <div class="section-divider"><span>Pre-existing Conditions</span></div>
  <div class="field-row">
    <div class="vfield field--span2">
      <div class="vlabel">Diagnosed Conditions</div>
      <!-- chip list replaces checkboxes -->
      <div class="vtags">
        <ng-container *ngIf="data?.medicalHistory?.conditions?.length; else noConditions">
          <span class="vtag" *ngFor="let c of data?.medicalHistory?.conditions">
            <span class="vtag-check">&#10003;</span> {{ c }}
          </span>
        </ng-container>
        <ng-template #noConditions>
          <span class="vvalue vvalue--empty">None recorded</span>
        </ng-template>
      </div>
    </div>
    <div class="vfield field--span2">
      <div class="vlabel">Other Diagnoses</div>
      <div class="vvalue vvalue--tall"
        [class.vvalue--empty]="!data?.medicalHistory?.conditionsOther">
        {{ data?.medicalHistory?.conditionsOther || 'Not provided' }}
      </div>
    </div>
  </div>

  <div class="section-divider"><span>Allergies</span></div>
  <div class="field-row">
    <div class="vfield field--span2">
      <div class="vlabel">Known Allergies</div>
      <div class="vtags">
        <span class="vtag" *ngFor="let a of data?.medicalHistory?.allergies">
          <span class="vtag-check">&#10003;</span> {{ a }}
        </span>
      </div>
    </div>
    <div class="vfield field--span2">
      <div class="vlabel">Allergic Reaction Description</div>
      <div class="vvalue vvalue--tall"
        [class.vvalue--empty]="!data?.medicalHistory?.allergyDescription">
        {{ data?.medicalHistory?.allergyDescription || 'Not provided' }}
      </div>
    </div>
  </div>

</ng-container>
```

---

## 10. View-Only Modal

The view modal reuses the **same** `<app-modal>` shell — you simply call `state.openView(record)` instead of `state.openCapture()`. The mode signal drives the conditional rendering in the template.

```typescript
// In any component that has a "View" button:
import { IntakeStateService } from '../intake/intake-state.service';
import { PatientRecord }      from '../intake/models/patient.model';

@Component({ ... })
export class PatientListComponent {
  private state = inject(IntakeStateService);

  viewPatient(record: PatientRecord): void {
    this.state.openView(record);
  }
}
```

```html
<!-- patient-list.component.html -->
<button class="btn-primary" (click)="viewPatient(patient)">View Record</button>

<!-- The single modal lives at the app root level -->
<app-modal></app-modal>
```

Put `<app-modal>` once in `app.component.html`. It handles both capture and view.

---

## 11. Patient / Partner Tab System

The tab bar is driven by the `showPartnerTab` and `activeTab` signals in `IntakeStateService`. The key wiring happens when the marital status radio changes:

```typescript
// modal.component.ts
onMaritalChanged(status: string): void {
  status === 'married'
    ? this.state.enablePartnerTab()
    : this.state.disablePartnerTab();
}
```

Each section component renders different content based on `tab`:

```html
<!-- Inside any section component — e.g. contact-details.component.html -->
<div class="panel-title">
  {{ tab === 'partner' ? 'Spouse / Partner — ' : '' }}Contact Details
</div>

<div class="info-banner" *ngIf="tab === 'partner'">
  <span>&#8505;</span> Contact information for the spouse or partner.
</div>

<!-- Field groups are the same for patient and partner; prefix IDs differ in a real FormGroup -->
<div class="field-row">
  <div class="field">
    <label class="field-label">Mobile Number <span class="field-required">*</span></label>
    <input class="field-input" type="tel" placeholder="+27 82 000 0000" />
  </div>
  <!-- ... -->
</div>
```

For **reactive forms**, use a `FormGroup` per tab and swap them on tab change:

```typescript
// intake-state.service.ts — add form management
readonly patientForm  = signal<FormGroup | null>(null);
readonly partnerForm  = signal<FormGroup | null>(null);

readonly activeForm = computed(() =>
  this.activeTab() === 'partner' ? this.partnerForm() : this.patientForm()
);
```

---

## 12. Routing & Lazy Loading

```typescript
// app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'intake',
    loadComponent: () =>
      import('./features/intake/modal/modal.component')
        .then(m => m.ModalComponent),
  },
  {
    path: 'patients',
    loadComponent: () =>
      import('./features/patients/patient-list.component')
        .then(m => m.PatientListComponent),
  },
  { path: '', redirectTo: 'patients', pathMatch: 'full' },
];
```

The modal overlay is always in the DOM (via `app.component.html`) — you open it programmatically, so you don't need to route to it directly. Only route to full pages.

---

## 13. Reusing Template Patterns Elsewhere

The design system built above produces a set of reusable building blocks. Here is how each one maps to new use cases.

---

### 13.1 Any New Modal / Drawer

Copy the overlay + shell skeleton. Import `_layout.scss` — you already have everything:

```html
<!-- e.g. appointment-modal.component.html -->
<div class="modal-overlay" [class.is-visible]="isOpen">
  <div class="modal-shell">

    <div class="modal-header">
      <div class="modal-header__top">
        <span class="modal-header__title">Book Appointment</span>
        <button class="modal-close-btn" (click)="close()">&times;</button>
      </div>
      <!-- No progress bar needed — omit those elements -->
    </div>

    <div class="modal-body">
      <!-- No sidebar needed — omit the <app-sidebar> -->
      <div class="modal-main">
        <div class="panels-scroll">
          <!-- Your content here using field-row, field-input, etc. -->
        </div>
      </div>
    </div>

    <div class="modal-footer">
      <div class="modal-footer__right">
        <button class="btn-ghost" (click)="close()">Cancel</button>
        <button class="btn-primary" (click)="confirm()">Confirm Booking</button>
      </div>
    </div>
  </div>
</div>
```

---

### 13.2 A Standalone Data-Entry Form (no modal)

Use the field primitives directly on a page — no overlay needed:

```html
<!-- referral-form.component.html -->
<div class="panels-scroll" style="max-width: 760px; margin: 0 auto;">

  <div class="panel-title">Referral Form</div>
  <div class="panel-desc">Complete the details below to refer a patient.</div>

  <div class="section-divider"><span>Patient Details</span></div>

  <div class="field-row">
    <div class="field">
      <label class="field-label">Patient Name <span class="field-required">*</span></label>
      <input class="field-input" type="text" />
    </div>
    <div class="field">
      <label class="field-label">ID Number</label>
      <input class="field-input" type="text" />
    </div>
    <div class="field field--span2">
      <label class="field-label">Reason for Referral</label>
      <textarea class="field-textarea"></textarea>
    </div>
  </div>

  <div class="section-divider"><span>Referring Doctor</span></div>

  <!-- Combobox reuse — see section 13.4 -->
  <app-combobox
    placeholder="Search doctor by name…"
    [type]="'doctor'"
    (selected)="onDoctorSelected($event)">
  </app-combobox>

  <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 8px;">
    <button class="btn-ghost">Cancel</button>
    <button class="btn-primary">Send Referral</button>
  </div>

</div>
```

---

### 13.3 Topbar (standalone, outside modal)

The `modal-header` classes work as a page topbar too:

```html
<!-- app-topbar.component.html -->
<header class="modal-header" style="padding-bottom: 0;">
  <div class="modal-header__top" style="padding-bottom: 14px;">
    <div>
      <span class="modal-header__title">Patient Management System</span>
      <div class="modal-header__sub">Mediclinic Sandton · Dr A. Nkosi</div>
    </div>
    <div class="modal-header__badges">
      <span class="badge-view-only">Admin</span>
    </div>
  </div>
</header>
```

---

### 13.4 Combobox / Autocomplete Dropdown

Extract the combobox as a generic component so it works for patients, doctors, employers, and schemes:

**`combobox.component.ts`**

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ComboItem {
  id: string;
  label: string;
  sublabel?: string;
  badge?: string;
  iconClass?: string;
}

@Component({
  selector: 'app-combobox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './combobox.component.html',
  styleUrls: ['./combobox.component.scss'],
})
export class ComboboxComponent {
  @Input() placeholder = 'Search…';
  @Input() type: 'patient' | 'doctor' | 'scheme' | 'employer' | 'medication' = 'patient';
  @Input() items: ComboItem[] = [];

  @Output() selected   = new EventEmitter<ComboItem>();
  @Output() createNew  = new EventEmitter<string>();
  @Output() queryChange = new EventEmitter<string>();

  query       = '';
  isOpen      = false;
  isLoading   = false;
  selectedItem: ComboItem | null = null;

  onInput(q: string): void {
    this.query = q;
    this.queryChange.emit(q);
    this.isOpen   = q.length > 0;
    this.isLoading = true;
    // Parent fills `items` via service call; loading clears when items arrive
  }

  select(item: ComboItem): void {
    this.selectedItem = item;
    this.query        = item.label;
    this.isOpen       = false;
    this.selected.emit(item);
  }

  clear(): void {
    this.selectedItem = null;
    this.query        = '';
    this.isOpen       = false;
  }

  onCreateNew(): void { this.createNew.emit(this.query); }
}
```

**`combobox.component.html`**

```html
<div class="combo-wrap">
  <div class="combo-input-row" [class.has-focus]="isOpen">
    <input
      class="combo-input"
      type="text"
      [placeholder]="placeholder"
      [(ngModel)]="query"
      (input)="onInput(query)"
      autocomplete="off" />

    <!-- Loading spinner — CSS animation, no SVG path -->
    <span class="combo-spinner" *ngIf="isLoading">&#9696;</span>

    <!-- Clear button -->
    <button class="combo-clear" *ngIf="query" (click)="clear()" aria-label="Clear">
      &times;
    </button>
  </div>

  <!-- Dropdown -->
  <div class="combo-drop" *ngIf="isOpen && items.length">
    <div class="combo-item" *ngFor="let item of items" (click)="select(item)">
      <div class="combo-icon" [class]="item.iconClass ?? 'icon-' + type">
        {{ item.label[0] }}
      </div>
      <div class="combo-body">
        <div class="combo-name">{{ item.label }}</div>
        <div class="combo-sub" *ngIf="item.sublabel">{{ item.sublabel }}</div>
      </div>
      <span class="combo-badge" *ngIf="item.badge">{{ item.badge }}</span>
    </div>
    <div class="combo-create" (click)="onCreateNew()">
      + Create new "{{ query }}"
    </div>
  </div>

  <!-- Selected card -->
  <div class="combo-selected" *ngIf="selectedItem && !isOpen">
    <div class="combo-sel-header">
      <span class="combo-sel-name">{{ selectedItem.label }}</span>
      <span class="combo-sel-id">{{ selectedItem.id }}</span>
      <button class="combo-deselect" (click)="clear()">&times;</button>
    </div>
    <div class="combo-sel-detail" *ngIf="selectedItem.sublabel">
      {{ selectedItem.sublabel }}
    </div>
  </div>
</div>
```

**`combobox.component.scss`** — pulls the combobox rules out of `_combobox.scss`:

```scss
@use '../../../../styles/tokens' as *;
// The .combo-* rules live in src/styles/_combobox.scss (global).
// This file is intentionally empty for scoped-only overrides.
// Add type-specific icon colours here if needed:

.icon-patient  { background: #dbeafe; color: #1e40af; }
.icon-doctor   { background: #dcfce7; color: #166534; }
.icon-scheme   { background: #ffe4e6; color: #9f1239; }
.icon-employer { background: #f3e8ff; color: #6b21a8; }
.icon-medication { background: $color-amber-chip-bg; color: $color-amber-chip-text; }
```

---

### 13.5 Read-Only Record Card (outside the modal)

Use the `.vfield` / `.vvalue` pattern anywhere you want to display labelled data:

```html
<!-- patient-summary-card.component.html -->
<div style="border: 1px solid #e4e7ec; border-radius: 6px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 600; margin-bottom: 12px;">
    Patient Summary
  </div>

  <div class="field-row">
    <div class="vfield">
      <div class="vlabel">Full Name</div>
      <div class="vvalue">{{ patient.personal.firstName }} {{ patient.personal.lastName }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">ID Number</div>
      <div class="vvalue">{{ patient.personal.idNumber }}</div>
    </div>
    <div class="vfield">
      <div class="vlabel">Medical Scheme</div>
      <div class="vvalue" [class.vvalue--empty]="!patient.insurance.scheme">
        {{ patient.insurance.scheme || 'Self-pay' }}
      </div>
    </div>
    <div class="vfield">
      <div class="vlabel">Known Allergies</div>
      <div class="vtags">
        <span class="vtag" *ngFor="let a of patient.medicalHistory.allergies">
          <span class="vtag-check">&#10003;</span> {{ a }}
        </span>
      </div>
    </div>
  </div>
</div>
```

---

### 13.6 Section Divider as a Shared Component

```typescript
// section-divider.component.ts
@Component({
  selector: 'app-section-divider',
  standalone: true,
  template: `
    <div class="section-divider">
      <span><ng-content></ng-content></span>
    </div>
  `,
})
export class SectionDividerComponent {}
```

Usage:
```html
<app-section-divider>Allergies</app-section-divider>
<app-section-divider>Emergency Contacts</app-section-divider>
```

---

### 13.7 Footer as a Standalone Component for Any Modal

```typescript
// modal-footer.component.ts
@Component({
  selector: 'app-modal-footer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-footer">
      <div class="modal-footer__left">
        <ng-content select="[slot=left]"></ng-content>
      </div>
      <div class="modal-footer__right">
        <ng-content select="[slot=right]"></ng-content>
      </div>
    </div>
  `,
})
export class ModalFooterComponent {}
```

Usage:
```html
<app-modal-footer>
  <button slot="left" class="btn-ghost">Save Draft</button>
  <button slot="right" class="btn-ghost" [disabled]="isFirst" (click)="prev()">
    &#8592; Previous
  </button>
  <button slot="right" class="btn-primary" (click)="next()">
    Next &#8594;
  </button>
</app-modal-footer>
```

---

### 13.8 Info Banner Component

```typescript
// info-banner.component.ts
@Component({
  selector: 'app-info-banner',
  standalone: true,
  template: `
    <div class="info-banner">
      <span>&#8505;</span>
      <ng-content></ng-content>
    </div>
  `,
})
export class InfoBannerComponent {}
```

Usage:
```html
<app-info-banner>
  This section applies to the spouse or partner only.
</app-info-banner>
```

---

## 14. Where Styles Live — Quick Reference

| Style concern | File | Scope |
|---|---|---|
| Design tokens (colours, spacing, radii) | `src/styles/_tokens.scss` | Global — `@use`d by all partials |
| Overlay, modal shell, sidebar, tabs, footer | `src/styles/_layout.scss` | Global |
| Input, select, textarea, label, radio, checkbox | `src/styles/_fields.scss` | Global |
| Button variants | `src/styles/_buttons.scss` | Global |
| Combobox dropdown | `src/styles/_combobox.scss` | Global |
| Tag chips, consent icons | `src/styles/_chips.scss` | Global |
| Toast notification | `src/styles/_toast.scss` | Global |
| View-only field, vtag, vvalue, patient hero | `src/styles/_view.scss` | Global |
| Component-specific layout tweaks only | `*.component.scss` | Scoped to component |
| Icon colour variants (patient/doctor/etc.) | `combobox.component.scss` | Scoped |

> **Rule:** If two or more components share a class name, that class belongs in a global partial. Component SCSS files should rarely exceed 30 lines.

---

## 15. Complete File Listing

```
src/
├── styles.scss
├── styles/
│   ├── _tokens.scss
│   ├── _layout.scss
│   ├── _fields.scss
│   ├── _buttons.scss
│   ├── _combobox.scss
│   ├── _chips.scss
│   ├── _toast.scss
│   └── _view.scss
│
└── app/
    ├── app.component.html           ← mounts <app-modal> once here
    ├── app.routes.ts
    │
    ├── features/
    │   └── intake/
    │       ├── models/
    │       │   ├── patient.model.ts
    │       │   └── intake-form.model.ts
    │       ├── intake-state.service.ts
    │       ├── patient-lookup.service.ts
    │       │
    │       ├── modal/               ← PARENT SHELL
    │       │   ├── modal.component.ts
    │       │   ├── modal.component.html
    │       │   └── modal.component.scss   (minimal)
    │       │
    │       ├── form/                ← ROUTER CHILD
    │       │   ├── form.component.ts
    │       │   └── (no template file — inline template)
    │       │
    │       └── sections/            ← CONTENT CHILDREN
    │           ├── personal-info/
    │           │   ├── personal-info.component.ts
    │           │   ├── personal-info.component.html
    │           │   └── personal-info.component.scss
    │           ├── contact-details/
    │           ├── medical-history/
    │           ├── medications/
    │           ├── lifestyle/
    │           ├── insurance/
    │           └── emergency/
    │
    └── shared/
        └── components/
            ├── sidebar/             ← step-btn list
            ├── combobox/            ← autocomplete with dropdown
            ├── section-divider/     ← hr with centred label
            ├── info-banner/         ← blue info strip
            ├── tag-chip/            ← vtag for view mode
            └── modal-footer/        ← slot-based footer
```

---

## Key Angular Patterns Used

- **Signals** (`signal`, `computed`) for reactive state — no RxJS needed for UI state.
- **`NgSwitch`** in `<app-form>` to swap section components without route changes.
- **Content projection** (`ng-content` with `slot=`) for footer actions.
- **Global SCSS partials + `@use 'tokens' as *`** — tokens available in every component without re-importing.
- **`@extend %btn-base`** in `_buttons.scss` — DRY button variants.
- **Standalone components throughout** — no `NgModule` needed.
- **Lazy loading** only at the route level; the modal itself is always in the DOM.
