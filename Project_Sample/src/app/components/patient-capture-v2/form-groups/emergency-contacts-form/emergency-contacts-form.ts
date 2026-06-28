import { Component, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { JsonFormControl } from '../../../../models/form-fields';
import { FormService } from '../../../../services/form.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-emergency-contacts-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../shared-form.html',
  styleUrl: '../shared-form.scss',
})
export class EmergencyContactsForm extends BaseFormGroup implements OnChanges, OnInit, OnDestroy {
  constructor(private formService: FormService) {
    super();
  }

  ngOnInit(): void {
    // Relationship is loaded on demand via combobox search
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['controls'] || changes['formGroup']) {
      this.initializeComponent();
    }
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
  }

  private initializeComponent(): void {
    this.suggestionMap = {};
    this.activeCombobox = null;
  }

  override onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }

    // Handle relationship search from DB
    if ((control as any).categoryId === 'relationship') {
      this.formService.searchOptions('relationship', value)
        .pipe(takeUntil(this.destroy$))
        .subscribe(options => {
          this.suggestionMap[control.name] = options.slice(0, 8);
          this.activeCombobox = control.name;
        });
    } else {
      super.onComboboxInput(control, value);
    }
  }
}
