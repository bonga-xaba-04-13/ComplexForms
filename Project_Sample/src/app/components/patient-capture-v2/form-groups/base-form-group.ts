import { Directive, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { JsonFormControl, ControlOption } from '../../../models/form-fields';
import { Subject } from 'rxjs';

@Directive()
export abstract class BaseFormGroup implements OnChanges, OnDestroy {
  @Input() controls: JsonFormControl[] = [];
  @Input() formGroup!: FormGroup;
  @Input() stepLabel = '';
  @Input() stepDescription = '';
  /** Participant index (0-based) — replaces the old isPartner boolean. */
  @Input() participantIndex = 0;
  @Input() isEditing = true;

  @Output() fieldChanged = new EventEmitter<{ fieldName: string; value: any }>();

  // State management for combobox/select suggestions
  suggestionMap: Record<string, ControlOption[]> = {};
  activeCombobox: string | null = null;

  // Options cache for category-based fields
  categoryOptionsMap: Record<string, ControlOption[]> = {};
  protected destroy$ = new Subject<void>();

  abstract ngOnChanges(changes: SimpleChanges): void;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isInvalid(name: string): boolean {
    const ctrl = this.formGroup?.get(name);
    return !!(ctrl && ctrl.invalid && ctrl.touched);
  }

  isSpan2(control: JsonFormControl): boolean {
    return control.span2 === true || control.type === 'textarea' || control.type === 'check';
  }

  protected emitFieldChange(fieldName: string, value: any): void {
    this.fieldChanged.emit({ fieldName, value });
  }

  /**
   * Handle combobox input - filter options from control's options array.
   * Override in child components to implement DB-driven searches.
   */
  onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }
    const q = value.toLowerCase();
    this.suggestionMap[control.name] = (control.options ?? [])
      .filter(o => o.label.toLowerCase().includes(q))
      .slice(0, 8);
    this.activeCombobox = control.name;
  }

  /**
   * Handle combobox selection - populate form and cascade data.
   * If control has optionsSource.populates, fill those fields with selected object data.
   */
  selectSuggestion(control: JsonFormControl, opt: ControlOption): void {
    this.formGroup.get(control.name)?.setValue(opt.value);
    this.suggestionMap[control.name] = [];
    this.activeCombobox = null;

    // Populate dependent fields from selected object
    if (control.optionsSource?.populates) {
      for (const [targetField, sourceKey] of Object.entries(control.optionsSource.populates)) {
        if (opt[sourceKey as keyof typeof opt] !== undefined) {
          this.formGroup.get(targetField)?.setValue(opt[sourceKey as keyof typeof opt]);
        }
      }
    }

    this.emitFieldChange(control.name, opt);
  }

  /**
   * Close combobox suggestions after delay (allows click registration).
   */
  closeSuggestions(name: string): void {
    setTimeout(() => {
      if (this.activeCombobox === name) {
        this.activeCombobox = null;
        this.suggestionMap[name] = [];
      }
    }, 180);
  }

  /**
   * Get options for a control from static options or category cache.
   * Child components use this in templates.
   */
  getOptionsForControl(control: JsonFormControl): ControlOption[] {
    // If control has categoryId, return cached options for that category
    if ((control as any).categoryId) {
      return this.categoryOptionsMap[(control as any).categoryId] || [];
    }
    // Otherwise return static options
    return control.options || [];
  }

  /**
   * Store options for a categoryId.
   * Child components call this when loading options from FormService.
   */
  protected setCategoryOptions(categoryId: string, options: ControlOption[]): void {
    this.categoryOptionsMap[categoryId] = options;
  }

  /**
   * Handle select change - populate form and cascade data if configured.
   * For DB-driven selects, override onSelectChange() in child components.
   */
  onSelectChange(control: JsonFormControl, selectedValue: any): void {
    const selectedOption = (control.options ?? []).find(o => o.value === selectedValue);
    if (!selectedOption) return;

    this.formGroup.get(control.name)?.setValue(selectedValue);

    // Populate dependent fields from selected object
    if (control.optionsSource?.populates) {
      for (const [targetField, sourceKey] of Object.entries(control.optionsSource.populates)) {
        if (selectedOption[sourceKey as keyof typeof selectedOption] !== undefined) {
          this.formGroup.get(targetField)?.setValue(selectedOption[sourceKey as keyof typeof selectedOption]);
        }
      }
    }

    this.emitFieldChange(control.name, selectedOption);
  }
}
