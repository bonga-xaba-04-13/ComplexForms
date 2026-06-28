import { Component, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { JsonFormControl } from '../../../../models/form-fields';
import { FormService } from '../../../../services/form.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-personal-info-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../shared-form.html',
  styleUrl: '../shared-form.scss',
})
export class PersonalInfoForm extends BaseFormGroup implements OnChanges, OnInit, OnDestroy {
  constructor(private formService: FormService) {
    super();
  }

  ngOnInit(): void {
    this.loadFormOptions();

    // Subscribe to maritalStatus changes to emit to parent (for partner tab)
    const maritalControl = this.formGroup?.get('p_maritalStatus');
    if (maritalControl) {
      maritalControl.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => {
          if (value) {
            this.emitFieldChange('maritalStatus', value);
          }
        });
    }
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
    // Load nationality options
    this.formService.getOptionsByCategory('nationality')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('nationality', options));

    // Load language options
    this.formService.getOptionsByCategory('language')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('language', options));
  }

  override onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }

    // Handle nationality/language search from DB
    const categoryId = (control as any).categoryId;
    if (categoryId === 'nationality' || categoryId === 'language') {
      this.formService.searchComboboxOptions(control.name, value)
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
