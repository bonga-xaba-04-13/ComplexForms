import { Component, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { JsonFormControl } from '../../../../models/form-fields';
import { FormService } from '../../../../services/form.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-insurance-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../shared-form.html',
  styleUrl: '../shared-form.scss',
})
export class InsuranceForm extends BaseFormGroup implements OnChanges, OnInit, OnDestroy {
  constructor(private formService: FormService) {
    super();
  }

  ngOnInit(): void {
    this.loadFormOptions();
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

  private loadFormOptions(): void {
    // Load billing method options
    this.formService.getOptionsByCategory('billing_method')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('billing_method', options));
  }

  override onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }

    // Handle medical scheme search from DB
    if ((control as any).categoryId === 'medical_scheme') {
      this.formService.searchComboboxOptions('p_scheme', value)
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
