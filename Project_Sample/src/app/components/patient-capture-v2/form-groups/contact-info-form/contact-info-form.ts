import { Component, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { JsonFormControl } from '../../../../models/form-fields';
import { FormService } from '../../../../services/form.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-contact-info-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../shared-form.html',
  styleUrl: '../shared-form.scss',
})
export class ContactInfoForm extends BaseFormGroup implements OnChanges, OnInit, OnDestroy {
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
    // Load province options
    this.formService.getOptionsByCategory('province')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('province', options));

    // Load country options
    this.formService.getOptionsByCategory('country')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('country', options));

    // Load preferred contact method options
    this.formService.getOptionsByCategory('contact_method')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('contact_method', options));
  }

  override onComboboxInput(control: JsonFormControl, value: string): void {
    const min = control.minChars ?? 3;
    if (value.length < min) {
      this.suggestionMap[control.name] = [];
      this.activeCombobox = null;
      return;
    }

    // Handle city search from DB
    if ((control as any).categoryId === 'city') {
      this.formService.searchComboboxOptions('p_city', value)
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
