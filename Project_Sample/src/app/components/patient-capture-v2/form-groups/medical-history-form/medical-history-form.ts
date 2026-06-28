import { Component, OnChanges, SimpleChanges, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BaseFormGroup } from '../base-form-group';
import { FormService } from '../../../../services/form.service';
import { takeUntil } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'app-medical-history-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: '../shared-form.html',
  styleUrl: '../shared-form.scss',
})
export class MedicalHistoryForm extends BaseFormGroup implements OnChanges, OnInit, OnDestroy {
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
    // Load conditions
    this.formService.getOptionsByCategory('conditions')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('conditions', options));

    // Load allergies
    this.formService.getOptionsByCategory('allergy')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('allergy', options));

    // Load family history
    this.formService.getOptionsByCategory('family_history')
      .pipe(takeUntil(this.destroy$))
      .subscribe(options => this.setCategoryOptions('family_history', options));
  }
}
